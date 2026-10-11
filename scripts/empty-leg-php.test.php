<?php
// Isolated synthetic fixtures. No CMS, network, booking or email.
define( 'ABSPATH', __DIR__ );
$types = array(); $meta = array(); $filters = array(); $db = array(); $posts = array();
function add_action( ...$args ) {}
function add_filter( $name, $callback, ...$args ) { global $filters; $filters[$name] = $callback; }
function register_post_type( $type, $config ) { global $types; $types[$type] = $config; }
function register_post_meta( $type, $key, $config ) { global $meta; $meta[$key] = $config; }
function get_post( $id ) { global $posts; return $posts[$id] ?? null; }
function get_post_type( $id ) { return get_post( $id )->post_type ?? null; }
function get_post_status( $id ) { return get_post( $id )->post_status ?? null; }
function get_post_meta( $id, $key, $single = true ) { global $db; return $db[$id][$key] ?? ''; }
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-empty-leg.php';
$checks = 0;
function check( $ok, $name ) { global $checks; $checks++; if ( ! $ok ) { fwrite( STDERR, "FAIL: $name\n" ); exit(1); } }
$f = json_decode( file_get_contents( __DIR__ . '/fixtures/empty-leg.json' ), true );
$resolver = static fn( $scope ) => $f['reference'];
foreach ( $f['cases'] as $case ) {
    $ref = $case['reference'] ?? $f['reference'];
    $result = Gocar_Empty_Leg::validate( $case['model'], static fn( $scope ) => $ref );
    check( $case['valid'] === $result['valid'], $case['name'] . ' ' . json_encode($result) );
}
check( $f['draft'] === Gocar_Empty_Leg::draft(), 'empty draft nulls' );
check( 'draft' === Gocar_Empty_Leg::assess( $f['draft'] )['state'], 'draft inactive' );
check( strtotime('2030-01-01T17:30:00Z') === Gocar_Empty_Leg::departure_at($f['base']['departure']), 'Vietnam midnight crosses UTC date' );
check( strtotime('2028-02-28T17:00:00Z') === Gocar_Empty_Leg::departure_at(array('date'=>'2028-02-29','time'=>'00:00','timezone'=>'Asia/Ho_Chi_Minh')), 'leap day' );
$start = strtotime( $f['base']['valid_from'] ); $end = strtotime( $f['base']['expires_at'] );
foreach ( array(array($start-1,'not_yet_available'),array($start,'eligible'),array($end-1,'eligible'),array($end,'expired'),array($end+1,'expired')) as [$now,$state] ) {
    $out = Gocar_Empty_Leg::assess($f['base'],$resolver,$now);
    check( $out === array('state'=>$state,'sellable'=>false,'commercial_enabled'=>false,'robots'=>'noindex,nofollow','sitemap'=>false,'public_url'=>null), 'half open state '.$state );
}
foreach ( array('reserved','completed','cancelled','inactive') as $state ) { $m=$f['base']; $m['status']=$state; check($state === Gocar_Empty_Leg::assess($m,$resolver,$start)['state'], 'status '.$state); }
foreach ( array(NAN,INF,-INF,true,'700000',9007199254740992,array()) as $v ) { $m=$f['base']; $m['prices']['special_price_vnd']=$v; check(!Gocar_Empty_Leg::validate($m,$resolver)['valid'],'invalid money'); }
foreach ( array(null,false,array(),'legacy') as $v ) check(!Gocar_Empty_Leg::validate($v,$resolver)['valid'],'invalid root');
$m=$f['base']; $m['scope']['route_id']=1001.0;
check(Gocar_Empty_Leg::validate($m,$resolver)['valid'],'integer JSON floats same as JS numbers');
check(!Gocar_Empty_Leg::validate($f['base'],static function(){throw new RuntimeException('offline');})['valid'],'failed read closed');
Gocar_Empty_Leg::register_storage();
$type = $types[Gocar_Empty_Leg::POST_TYPE];
foreach ( array('public','publicly_queryable','show_ui','show_in_rest','show_in_nav_menus','rewrite','query_var','has_archive') as $key ) check(false === $type[$key], 'private storage '.$key);
check(true === $type['exclude_from_search'],'no search');
check(array('route'=>true) === $filters['wp_sitemaps_post_types'](array('route'=>true,Gocar_Empty_Leg::POST_TYPE=>true)),'exclude only inventory sitemap');
foreach ( array(Gocar_Empty_Leg::META_KEY,Gocar_Empty_Leg::HISTORY_KEY) as $key ) {
    check(false === $meta[$key]['show_in_rest'] && false === $meta[$key]['auth_callback'](),'private meta');
    foreach ( array('add','update','delete') as $action ) check(false === $filters[$action.'_post_metadata'](null,4001,$key,'{}',null),'no generic '.$action);
}
check(null === Gocar_Empty_Leg::guard_meta(null,1001,'pricing_packages_v2',array()),'base pricing untouched');
foreach ( array(1001=>'route',2001=>'vehicle',3001=>'location',3002=>'location') as $id=>$type ) $posts[$id]=(object)array('post_type'=>$type,'post_status'=>'publish','post_name'=>'synthetic-'.$id);
$db[1001]=array('origin_location_id'=>3001,'destination_location_id'=>3002,'pricing_model_version'=>2,'pricing_packages_v2'=>array(array('direction'=>'inbound','vehicle_id'=>2001,'package_key'=>'one_way','pricing_mode'=>'fixed','price'=>'1000000')),'content_service_state'=>'live','content_mapping_state'=>'clear','content_readiness_version'=>1,'inbound_enabled'=>'1');
$original = $db;
check(Gocar_Empty_Leg::validate($f['base'])['valid'],'fresh WordPress reference validates exact inbound');
check($original === $db,'validation never writes or replaces base price');
foreach ( array(array('pricing_model_version',1),array('inbound_enabled',''),array('inbound_enabled',false),array('content_service_state','prelaunch'),array('content_mapping_state','d35_10_blocked'),array('content_readiness_version',2),array('origin_location_id',3002)) as [$key,$v] ) {
    $db=$original; $db[1001][$key]=$v; check(!Gocar_Empty_Leg::validate($f['base'])['valid'],'changed reference '.$key);
}
foreach ( array('contact','disabled','unknown',null) as $v ) { $db=$original; $db[1001]['pricing_packages_v2'][0]['pricing_mode']=$v; check(!Gocar_Empty_Leg::validate($f['base'])['valid'],'nonfixed mode'); }
$db=$original; $db[1001]['pricing_packages_v2'][]=$db[1001]['pricing_packages_v2'][0];
check(!Gocar_Empty_Leg::validate($f['base'])['valid'],'duplicate price tuple closed');
$db=$original; $db[1001]['pricing_packages_v2'][0]['price']='999999';
check(!Gocar_Empty_Leg::validate($f['base'])['valid'],'new base price requires confirmation, no recompute');
$db=$original; $posts[3001]->post_name='san-bay-long-thanh';
check(!Gocar_Empty_Leg::validate($f['base'])['valid'],'Long Thanh slug blocked');
$posts[3001]->post_name='synthetic-3001';
foreach ( array(1001,2001,3001,3002) as $id ) { $posts[$id]->post_status='draft'; check(!Gocar_Empty_Leg::validate($f['base'])['valid'],'unpublished reference '.$id); $posts[$id]->post_status='publish'; }
$posts[9102]=(object)array('post_type'=>'location','post_status'=>'publish','post_name'=>'synthetic-long-thanh');
$db=$original; $db[1001]['origin_location_id']=9102; $m=$f['base']; $m['scope']['destination_location_id']=9102;
check(!Gocar_Empty_Leg::validate($m)['valid'],'Long Thanh id blocked');
$m['status']='draft'; $m['approval']=array('status'=>'draft','source_ref'=>null);
check(Gocar_Empty_Leg::validate($m)['valid'],'prelaunch can remain unconfirmed draft');
echo "PASS: $checks PHP empty-leg model/storage/reference checks\n";
