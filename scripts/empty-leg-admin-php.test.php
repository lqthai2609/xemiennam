<?php
// Synthetic isolated SQL/WordPress doubles. Never CMS/MySQL runtime evidence.
define( 'ABSPATH', __DIR__ );
class WP_Error { public function __construct(public $code, public $message, public $data=array()) {} }
class Request implements ArrayAccess {
    public function __construct(public array $body, public int $id=0) {}
    public function get_json_params() { return $this->body; }
    public function offsetExists($o): bool { return $o==='id'; }
    public function offsetGet($o): mixed { return $this->id; }
    public function offsetSet($o,$v): void {}
    public function offsetUnset($o): void {}
}
$actor=7; $editor=true; $publisher=true; $types=array(); $registrations=array(); $cache=array();
function add_action(...$a) {}
function add_filter(...$a) {}
function current_user_can($cap) { global $editor,$publisher; return $cap==='publish_posts' ? $publisher : $editor; }
function get_current_user_id() { global $actor; return $actor; }
function rest_ensure_response($data) { return $data; }
function is_wp_error($data) { return $data instanceof WP_Error; }
function wp_json_encode($data,$flags=0) { return json_encode($data,$flags); }
function clean_post_cache($id) { global $cache; $cache[]=$id; }
function get_post($id) { global $wpdb; return $wpdb->records[$id] ?? null; }
function get_post_type($id) { return get_post($id)->post_type ?? null; }
function get_post_status($id) { return get_post($id)->post_status ?? null; }
function get_the_title($id) { return get_post($id)->post_title ?? 'Synthetic'; }
function get_post_meta($id,$key,$single=true) { global $wpdb; return $wpdb->refs[$id][$key] ?? ''; }
function get_posts($args) { global $wpdb; return array_values(array_filter($wpdb->records,fn($p)=>$p->post_type===$args['post_type'] && (!isset($args['author']) || $p->post_author===$args['author']))); }
function register_rest_route($ns,$path,$config) { global $registrations; $registrations[$path]=$config; }
function wp_insert_post($data,$error=false) { global $wpdb; $id=++$wpdb->counter; $wpdb->records[$id]=(object)array_merge($data,array('ID'=>$id)); return $id; }
class Database {
    public $posts='wp_posts'; public $postmeta='wp_postmeta'; public $counter=4000;
    public $records=array(); public $refs=array(); public $rows=array(); public $trace=array(); public $snapshot;
    public $engine='InnoDB'; public $lock=1; public $fail='';
    public function prepare($sql,...$args) { return array($sql,$args); }
    public function get_var($query) {
        [$sql,$a]=$query; $this->trace[]=$sql;
        if(str_contains($sql,'ENGINE')) return $this->engine;
        if(str_contains($sql,'GET_LOCK')) return $this->lock;
        if(str_contains($sql,'RELEASE_LOCK')) return 1;
        foreach($this->records as $p) if($p->post_type===$a[0] && $p->post_name===$a[1]) return $p->ID;
        return null;
    }
    public function get_row($query) { [$sql,$a]=$query; $this->trace[]=$sql; return $this->records[$a[0]] ?? null; }
    public function get_results($query) { [$sql,$a]=$query; $this->trace[]=$sql; return array_map(fn($r)=>(object)$r,array_values(array_filter($this->rows,fn($r)=>$r['post_id']===$a[0] && in_array($r['meta_key'],array($a[1],$a[2]),true)))); }
    public function query($sql) {
        $this->trace[]=$sql;
        if($this->fail===$sql) return false;
        if($sql==='START TRANSACTION') $this->snapshot=serialize(array($this->records,$this->rows,$this->counter));
        if($sql==='ROLLBACK' && $this->snapshot) [$this->records,$this->rows,$this->counter]=unserialize($this->snapshot);
        if($sql==='COMMIT' || $sql==='ROLLBACK') $this->snapshot=null;
        return 0;
    }
    public function insert($table,$data) { if($this->fail===$data['meta_key']) return false; $this->rows[]=$data; return 1; }
    public function update($table,$data,$where) {
        if($this->fail==='update') return false;
        $n=0; foreach($this->rows as &$row) if($row['post_id']===$where['post_id'] && $row['meta_key']===$where['meta_key']) { $row=array_merge($row,$data); $n++; } return $n;
    }
}
$wpdb=new Database();
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-empty-leg.php';
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-admin-api.php';
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-empty-leg-admin.php';
$f=json_decode(file_get_contents(__DIR__.'/fixtures/empty-leg.json'),true);
$checks=0;
function check($ok,$name) { global $checks; $checks++; if(!$ok) { fwrite(STDERR,"FAIL: $name\n"); exit(1); } }
function err($value,$code,$name) { check($value instanceof WP_Error && $value->code===$code,$name); }
function payload($model,$expected=0,$action='save',$key='synthetic-operation-0001') { return array('model'=>$model,'expected_revision'=>$expected,'action'=>$action,'reason'=>'Synthetic test reason','operation_key'=>$key); }
$draft=Gocar_Empty_Leg::draft(); $now=strtotime('2029-12-31T00:00:00Z'); $resolver=fn($s)=>$f['reference'];
$out=Gocar_Empty_Leg_Admin::prepare(payload($draft),null,false,7,$resolver,$now);
check($out['model']['revision']===1 && $out['confirmation']===null,'editor draft no approval stamp');
$base=$f['base'];
$out=Gocar_Empty_Leg_Admin::prepare(payload($base,0,'confirm'),null,true,7,$resolver,$now);
check($out['confirmation']===array('actor'=>7,'at'=>'2029-12-31T00:00:00Z','revision'=>1,'source_ref'=>$base['approval']['source_ref']),'server owns confirmation time actor revision');
err(Gocar_Empty_Leg_Admin::prepare(payload($base,0,'confirm'),null,false,7,$resolver,$now),'confirmation_forbidden','editor cannot confirm');
err(Gocar_Empty_Leg_Admin::prepare(payload($base),null,true,7,$resolver,$now),'confirmation_required','save cannot claim confirmation');
$forged=payload($base,0,'confirm'); $forged['confirmed_at']='2030-01-01';
err(Gocar_Empty_Leg_Admin::prepare($forged,null,true,7,$resolver,$now),'payload_invalid','forged stamp rejected');
foreach(array(1,-1,1.5,'0',true) as $revision) { $p=payload($draft); $p['expected_revision']=$revision; check(is_wp_error(Gocar_Empty_Leg_Admin::prepare($p,null,true,7,$resolver,$now)),'bad expected revision'); }
foreach(array('',str_repeat('a',501),'<script>',"bad\nreason", "\xff") as $reason) { $p=payload($draft); $p['reason']=$reason; err(Gocar_Empty_Leg_Admin::prepare($p,null,true,7,$resolver,$now),'payload_invalid','unsafe audit reason'); }
foreach(array('contact','disabled') as $mode) { $ref=$f['reference']; $ref['pricingMode']=$mode; err(Gocar_Empty_Leg_Admin::prepare(payload($base,0,'confirm'),null,true,7,fn($s)=>$ref,$now),'model_invalid','no confirmation '.$mode); }
foreach(array('prelaunch'=>true,'mappingBlocked'=>true,'activationReady'=>false,'readinessVersion'=>2,'normalPriceVnd'=>999999) as $key=>$value) { $ref=$f['reference']; $ref[$key]=$value; err(Gocar_Empty_Leg_Admin::prepare(payload($base,0,'confirm'),null,true,7,fn($s)=>$ref,$now),'model_invalid','source gate '.$key); }
foreach(array(strtotime($base['expires_at']),strtotime($base['expires_at'])+1) as $time) err(Gocar_Empty_Leg_Admin::prepare(payload($base,0,'confirm'),null,true,7,$resolver,$time),'expired','half open confirmation expiry');
err(Gocar_Empty_Leg_Admin::prepare(payload($base,1,'confirm'),$base,false,7,$resolver,$now),'confirmation_forbidden','editor cannot modify confirmed');
$m=$base; $m['status']='completed'; err(Gocar_Empty_Leg_Admin::prepare(payload($m,1,'confirm'),$base,true,7,$resolver,$now),'transition_invalid','no completion without reservation');
$reserved=$base; $reserved['status']='reserved';
check(!is_wp_error(Gocar_Empty_Leg_Admin::prepare(payload($m,1,'confirm'),$reserved,true,7,$resolver,strtotime($base['expires_at'])+1)),'reserved may complete after expiry');
$changed=$reserved; $changed['prices']['special_price_vnd']=600000;
err(Gocar_Empty_Leg_Admin::prepare(payload($changed,1,'confirm'),$reserved,true,7,$resolver,$now),'reserved_frozen','reserved snapshot frozen');
foreach(array('completed','cancelled') as $status) { $before=$base; $before['status']=$status; err(Gocar_Empty_Leg_Admin::prepare(payload($base,1,'confirm'),$before,true,7,$resolver,$now),'transition_invalid','terminal cannot reopen'); }
foreach(array(1001=>'route',2001=>'vehicle',3001=>'location',3002=>'location') as $id=>$type) $wpdb->records[$id]=(object)array('ID'=>$id,'post_type'=>$type,'post_status'=>'publish','post_name'=>'synthetic-'.$id,'post_author'=>7);
$wpdb->refs[1001]=array('origin_location_id'=>3001,'destination_location_id'=>3002,'pricing_model_version'=>2,'pricing_packages_v2'=>array(array('direction'=>'inbound','vehicle_id'=>2001,'package_key'=>'one_way','pricing_mode'=>'fixed','price'=>'1000000')),'content_service_state'=>'live','content_mapping_state'=>'clear','content_readiness_version'=>1,'inbound_enabled'=>'1');
$request=new Request(payload($draft));
$saved=Gocar_Empty_Leg_Admin::save($request); check(is_array($saved) && $saved['id']===4001,'create private trip');
check($wpdb->records[4001]->post_status==='private' && count($wpdb->rows)===2 && $saved['history'][0]['before']===null,'private model and audit committed together');
$again=Gocar_Empty_Leg_Admin::save($request); check($again['id']===4001 && count($wpdb->rows)===2 && $wpdb->counter===4001,'create retry no duplicate');
$p=$request->body; $p['reason']='different'; err(Gocar_Empty_Leg_Admin::save(new Request($p)),'operation_conflict','key conflict no overwrite');
$read=Gocar_Empty_Leg_Admin::read(new Request(array(),4001)); check($read['model']===$draft,'fresh SQL read');
$editor=false; err(Gocar_Empty_Leg_Admin::save($request),'forbidden','callback enforces auth independent of REST'); $editor=true;
$publisher=false; $actor=8; err(Gocar_Empty_Leg_Admin::read(new Request(array(),4001)),'not_found','foreign record hidden'); err(Gocar_Empty_Leg_Admin::save(new Request(payload($draft,1),4001)),'not_found','foreign record not writable');
check(count(Gocar_Empty_Leg_Admin::listing()['items'])===0,'editor list hides other authors');
$publisher=true; $actor=7;
$confirm=new Request(payload($base,1,'confirm','synthetic-operation-0002'),4001);
$saved=Gocar_Empty_Leg_Admin::save($confirm); check($saved['model']['revision']===2 && $saved['confirmation']['revision']===2 && $saved['confirmation']['actor']===7,'confirm creates server revision');
check(count($saved['history'])===2 && $saved['history'][1]['before']===$draft,'immutable before after audit');
$snapshot=serialize(array($wpdb->records,$wpdb->rows));
$stale=new Request(payload($draft,1,'save','synthetic-operation-0003'),4001); err(Gocar_Empty_Leg_Admin::save($stale),'revision_conflict','stale worker rejected'); check($snapshot===serialize(array($wpdb->records,$wpdb->rows)),'stale rejection leaves storage intact');
$replayed=Gocar_Empty_Leg_Admin::save($confirm); check($replayed['model']['revision']===2 && count($wpdb->rows)===3,'update retry does not append audit');
$publisher=false; err(Gocar_Empty_Leg_Admin::save($confirm),'confirmation_forbidden','editor cannot replay confirmed write'); $publisher=true;
$inactive=$saved['model']; $inactive['status']='inactive'; $inactive['approval']['status']='draft';
$next=new Request(payload($inactive,2,'save','synthetic-operation-0004'),4001);
foreach(array(Gocar_Empty_Leg::HISTORY_KEY,'update','COMMIT') as $failure) { $wpdb->fail=$failure; err(Gocar_Empty_Leg_Admin::save($next),'write_failed','atomic failure '.$failure); check($snapshot===serialize(array($wpdb->records,$wpdb->rows)),'rollback restores model history '.$failure); }
$wpdb->fail=''; $saved=Gocar_Empty_Leg_Admin::save($next); check($saved['model']['revision']===3 && $saved['confirmation']===null,'withdraw approval clears stamp');
$old=Gocar_Empty_Leg_Admin::save($confirm); check($old['model']['revision']===2 && count($old['history'])===2,'retry older operation returns original saved result');
check(Gocar_Empty_Leg_Admin::read(new Request(array(),4001))['model']['revision']===3,'replay never rolls back current record');
$wpdb->fail=Gocar_Empty_Leg::HISTORY_KEY; $new=new Request(payload($draft,0,'save','synthetic-operation-0005')); $before=serialize(array($wpdb->records,$wpdb->rows)); err(Gocar_Empty_Leg_Admin::save($new),'write_failed','create audit failure'); check($before===serialize(array($wpdb->records,$wpdb->rows)),'create failure leaves no orphan'); $wpdb->fail='';
$wpdb->engine='MyISAM'; err(Gocar_Empty_Leg_Admin::save($new),'storage_unavailable','nontransactional storage refused'); $wpdb->engine='InnoDB';
$wpdb->lock=0; err(Gocar_Empty_Leg_Admin::save($new),'write_busy','worker contention refused'); $wpdb->lock=1;
check(in_array('START TRANSACTION',$wpdb->trace,true) && in_array('COMMIT',$wpdb->trace,true) && in_array('ROLLBACK',$wpdb->trace,true),'transaction boundaries');
check(count(array_filter($wpdb->trace,fn($q)=>str_contains($q,'FOR UPDATE')))>0 && count(array_filter($wpdb->trace,fn($q)=>str_contains($q,'RELEASE_LOCK')))>0,'row lock and advisory release');
check(Gocar_Admin_API::operational_route_blocked(9095,3001,3002),'D35 route ID hard gate');
check(Gocar_Admin_API::operational_route_blocked(1001,9118,9119),'D35 endpoint hard gate');
check(!Gocar_Admin_API::operational_route_blocked(1001,3001,3002),'unrelated routes unaffected');
foreach(array(9102,9154) as $id) { $wpdb->records[$id]=(object)array('post_type'=>'location','post_status'=>'publish','post_name'=>'synthetic-long-thanh'); $wpdb->refs[1001]['origin_location_id']=$id; check(Gocar_Empty_Leg::reference($base['scope'])['prelaunch']===true,'Long Thanh hard id '.$id); }
Gocar_Empty_Leg_Admin::register_routes();
check(count($registrations)===3,'three private admin routes');
foreach($registrations as $path=>$routes) { check(str_starts_with($path,'/admin/'),'only admin endpoints'); foreach(isset($routes['methods'])?array($routes):$routes as $route) check($route['permission_callback']===array(Gocar_Empty_Leg_Admin::class,'can_edit'),'every route authenticated'); }
echo "PASS: $checks PHP dispatch policy/persistence/permission/audit checks (isolated doubles)\n";
