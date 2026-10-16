<?php
/** Synthetic unit harness; no network, real customer, WordPress site or mail. */
define( 'ABSPATH', __DIR__ ); define( 'ALO_COUPONS_ENABLED', true );
$admin = true; $meta = array(); $post_types = array(); $filters = array(); $ref = array( 'exists' => true, 'activationReady' => true, 'prelaunch' => false, 'mappingBlocked' => false, 'readinessVersion' => 1, 'normalPriceVnd' => 800000, 'pricingMode' => 'fixed' );
function add_action( ...$a ) {} function add_filter( $k, $f, ...$a ) { global $filters; $filters[$k][] = $f; }
function current_user_can( $cap ) { global $admin; return $admin; } function get_current_user_id() { return 7; }
function clean_post_cache( $id ) {} function wp_cache_delete( ...$a ) {} function get_post_type( $id ) { global $post_types; return $post_types[$id] ?? ''; }
function get_post_meta( $id, $k, $single = true ) { global $meta; return $meta[$id][$k] ?? ''; }
function add_post_meta( $id, $k, $v, $unique = false ) { global $meta,$filters; foreach ( $filters['add_post_metadata'] ?? array() as $f ) if ( false === $f( null, $id, $k, $v ) ) return false; if ( isset( $meta[$id][$k] ) ) return false; $meta[$id][$k] = $v; return true; }
function wp_json_encode( $v ) { return json_encode( $v ); } function is_wp_error( $e ) { return $e instanceof WP_Error; }
function rest_ensure_response( $d ) { return new WP_REST_Response( $d, 200 ); }
class WP_Error { function __construct( public $code, public $message, public $data ) {} }
class WP_REST_Response { public $headers=array(); function __construct( public $data, public $status ) {} function header( $k,$v ) { $this->headers[$k]=$v; } }
class Request { function __construct( public array $params ) {} function get_json_params() { return $this->params; } function get_param( $key ) { return $this->params[$key] ?? null; } }
class Gocar_Empty_Leg { static function reference( $s ) { global $ref; return $ref; } }
class Database {
 public $options='wp_options', $last_error='', $rows=array(), $seq=6, $race=null;
 function suppress_errors($v=true){return false;}
 function prepare( $q, ...$args ) { return json_encode( array($q,$args) ); }
 function get_row( $q ) { [, $a]=json_decode($q,true); $this->last_error=''; return isset($this->rows[$a[0]]) ? (object)$this->rows[$a[0]] : null; }
 function query( $q ) {
  [$sql,$a]=json_decode($q,true);$this->last_error='';
  if(str_starts_with($sql,'INSERT')) {if(isset($this->rows[$a[0]]))return 0;$this->rows[$a[0]]=array('option_id'=>++$this->seq,'option_value'=>$a[1]);return 1;}
  if(str_starts_with($sql,'UPDATE')) {
   if($this->race){$r=$this->race;$this->race=null;$r($this,$a);}
   if(!isset($this->rows[$a[1]])||$this->rows[$a[1]]['option_value']!==$a[2])return 0;
   $this->rows[$a[1]]['option_value']=$a[0];return 1;
  }
  throw new Exception('Unexpected SQL');
 }
}
$wpdb=new Database();
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-promotion-model.php';
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-coupon.php';
$checks=0;function check($c,$label){global $checks;$checks++;if(!$c)throw new Exception('FAIL: '.$label);}
$scope=array('route_id'=>1001,'direction'=>'outbound','vehicle_id'=>2001,'package_key'=>'one_way');
$config=array('code'=>'SYNTHETIC10','name'=>'Synthetic only','status'=>'active','kind'=>'fixed_discount','value'=>100000,'cap_vnd'=>null,'minimum_vnd'=>500000,'limit'=>1,'start_date'=>'2000-01-01','end_date'=>'2099-12-31','departure_start'=>null,'departure_end'=>null,'scopes'=>array($scope));
function save_config($c,$rev=0){return Gocar_Coupon::save(new Request(array('config'=>$c,'expected_revision'=>$rev)));}
function stored_data($code='SYNTHETIC10'){global $wpdb;return json_decode($wpdb->rows['_alo_coupon_v1_'.$code]['option_value'],true);}
function replace_data($d,$code='SYNTHETIC10'){global $wpdb;$wpdb->rows['_alo_coupon_v1_'.$code]['option_value']=json_encode($d);}
$r=save_config($config);check(!is_wp_error($r),'save valid active');check($r->data['revision']===1,'revision');check($r->headers['Cache-Control']==='private, no-store','private response');
check(is_wp_error(save_config($config)),'duplicate code');
$admin=false;check(is_wp_error(save_config($config)),'admin only');$admin=true;
foreach(array('A','<script>','A B',123,null)as$bad)check(Gocar_Coupon::code($bad)===null,'invalid code');check(Gocar_Coupon::code(' synthetic10 ')==='SYNTHETIC10','normalized');
$receipt=array('coupon_id'=>7,'code'=>'SYNTHETIC10','revision'=>1,'quote_key'=>str_repeat('a',64));
check(Gocar_Coupon::valid_receipt($receipt),'valid receipt');$bad=$receipt;$bad['code']=null;check(!Gocar_Coupon::valid_receipt($bad),'null code rejected');
$s=json_decode(file_get_contents(__DIR__.'/fixtures/promotion-snapshot.json'),true)['applied'];$s['promotion']['promotion_id']=7;$s['promotion']['revision']=1;$s['promotion']['discount_amount']=100000;$s['promotion']['promotional_estimated_total']=800000;$s['promotion']['type']='fixed_discount';$s['promotion']['target']='base_price';$s['promotion']['window']=stored_data()['model']['window'];$s['rule_versions']=array('surcharge'=>0,'modifier'=>0,'condition'=>0);
check(true===Gocar_Coupon::check($receipt,$s,array('ngay_di'=>'2026-10-20')),'check claim');
foreach(array('prelaunch','mappingBlocked')as$key){$ref[$key]=true;check(is_wp_error(Gocar_Coupon::check($receipt,$s,array())),'gate '.$key);$ref[$key]=false;}
$ref['normalPriceVnd']=900000;check(is_wp_error(Gocar_Coupon::check($receipt,$s,array())),'price changed');$ref['normalPriceVnd']=800000;
$bad=$s;$bad['promotion']['discount_amount']=1;check(is_wp_error(Gocar_Coupon::check($receipt,$bad,array())),'forged money');
$before=stored_data();$r=Gocar_Coupon::lookup(new Request(array('code'=>'synthetic10')));check(!is_wp_error($r),'lookup');check(stored_data()===$before,'apply does not write or reserve');
$key=str_repeat('b',64);check(true===Gocar_Coupon::hold($receipt,$s,array(),$key),'hold');$d=stored_data();check(count($d['uses'])===1&&$d['uses'][$key]['lead_id']===0,'pending is not used');
check(true===Gocar_Coupon::hold($receipt,$s,array(),$key),'same key hold once');check(is_wp_error(Gocar_Coupon::hold($receipt,$s,array(),str_repeat('c',64))),'last slot not oversold');
$post_types[42]='booking_request';$meta[42]['_gocar_lead_request_key_hash']=$key;
check(true===Gocar_Coupon::settle($receipt,$key,42),'settle');check(true===Gocar_Coupon::settle($receipt,$key,42),'replay settle');check(count(stored_data()['uses'])===1,'once only');check(Gocar_Coupon::receipt(42)===$receipt,'receipt private stored');check(false===Gocar_Coupon::guard(null,42,'_alo_coupon_receipt_v1'),'meta write protected');
$paused=$config;$paused['status']='paused';$ref['mappingBlocked']=true;$r=save_config($paused,1);check(!is_wp_error($r),'pause even if mapping is withdrawn');$ref['mappingBlocked']=false;
check(true===Gocar_Coupon::settle($receipt,$key,42),'old receipt survives pause/revision');check(is_wp_error(Gocar_Coupon::lookup(new Request(array('code'=>'SYNTHETIC10')))),'pause blocks new use');
$under=$paused;$under['limit']=0;check(is_wp_error(save_config($under,2)),'invalid limit');
// Simulate a competing worker taking the last slot after the first worker reads SQL.
$other=$config;$other['code']='SYNTHETICRACE';check(!is_wp_error(save_config($other)),'race setup');$raceReceipt=$receipt;$raceReceipt['coupon_id']=8;$raceReceipt['code']='SYNTHETICRACE';$raceSnapshot=$s;$raceSnapshot['promotion']['promotion_id']=8;
$wpdb->race=function($db,$args)use($raceReceipt){$d=json_decode($db->rows[$args[1]]['option_value'],true);$d['uses']['winner']=array('lead_id'=>99,'receipt'=>$raceReceipt);$db->rows[$args[1]]['option_value']=json_encode($d);};
check(is_wp_error(Gocar_Coupon::hold($raceReceipt,$raceSnapshot,array(),str_repeat('d',64))),'CAS loser rechecks availability');check(count(stored_data('SYNTHETICRACE')['uses'])===1,'winner preserved');
foreach(array(array('kind'=>'percent_discount','value'=>1000,'cap_vnd'=>100000),array('kind'=>'fixed_discount','value'=>100000,'cap_vnd'=>null))as$discount){$c=array_merge($config,$discount);check(!is_wp_error(Gocar_Coupon::configuration($c,1)),'two discount types');}
foreach(array(array('value'=>500000),array('start_date'=>'2026-02-30'),array('departure_start'=>'2026-11-01','departure_end'=>'2026-10-01'),array('kind'=>'percent_discount','value'=>1000,'cap_vnd'=>null))as$patch)check(is_wp_error(Gocar_Coupon::configuration(array_merge($config,$patch),1)),'invalid config');
echo "PASS: $checks coupon checks; synthetic only, no emails.\n";
