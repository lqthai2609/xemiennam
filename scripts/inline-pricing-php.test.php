<?php
/** Isolated behavioral coverage: no WordPress instance, real prices, booking or email. */
define( 'ABSPATH', __DIR__ );
class WP_Error {
    public function __construct( public string $code, public string $message, public array $data = array() ) {}
}
class WP_REST_Response { public function __construct( public $data ) {} }
class WP_Post {
    public function __construct( public int $ID, public string $post_type, public string $post_title, public string $post_status = 'publish', public string $post_name = 'synthetic', public string $post_content = '' ) {}
}
class WP_REST_Request implements ArrayAccess {
    private array $params = array();
    private string $body = '{}';
    public function __construct( private string $method = 'POST' ) {}
    public function get_method() { return $this->method; }
    public function set_body( $body ) { $this->body = $body; }
    public function set_header( ...$args ) {}
    public function get_json_params() { return json_decode( $this->body, true ); }
    public function get_param( $key ) { return $this->params[$key] ?? null; }
    public function offsetExists( mixed $key ): bool { return isset( $this->params[$key] ); }
    public function offsetGet( mixed $key ): mixed { return $this->params[$key] ?? null; }
    public function offsetSet( mixed $key, mixed $value ): void { $this->params[$key] = $value; }
    public function offsetUnset( mixed $key ): void { unset( $this->params[$key] ); }
}
$actor = (object) array( 'ID' => 7, 'roles' => array('administrator'), 'display_name' => 'SYNTHETIC administrator', 'user_login' => 'synthetic' );
$posts = array( 100 => new WP_Post(100, 'location', 'SYNTHETIC A'), 200 => new WP_Post(200, 'location', 'SYNTHETIC B'), 300 => new WP_Post(300, 'vehicle', 'SYNTHETIC 4'), 301 => new WP_Post(301, 'vehicle', 'SYNTHETIC 7'), 400 => new WP_Post(400, 'route', 'SYNTHETIC A B') );
$meta = array(400 => array('origin_location_id' => 100, 'destination_location_id' => 200, 'outbound_enabled' => true, 'inbound_enabled' => true, 'pricing_model_version' => 2, 'pricing_packages_v2' => array(
    array('direction'=>'outbound','vehicle_id'=>300,'package_key'=>'one_way','pricing_mode'=>'fixed','price'=>1000000,'package_label'=>'SYNTHETIC label','extra_condition'=>'keep'),
    array('direction'=>'inbound','vehicle_id'=>300,'package_key'=>'one_way','pricing_mode'=>'fixed','price'=>900000),
    array('direction'=>'outbound','vehicle_id'=>301,'package_key'=>'one_way','pricing_mode'=>'contact'),
    array('direction'=>'outbound','vehicle_id'=>300,'package_key'=>'3d2n','pricing_mode'=>'contact'),
    array('direction'=>'outbound','vehicle_id'=>300,'package_key'=>'round_trip_day','pricing_mode'=>'disabled'),
)));
$audit_fail = false;
function add_action(...$args) {} function add_filter(...$args) {}
function absint($v) { return abs((int)$v); }
function sanitize_key($v) { return preg_replace('/[^a-z0-9_-]/', '', strtolower((string)$v)); }
function sanitize_title($v) { return sanitize_key($v); }
function sanitize_text_field($v) { return trim(strip_tags((string)$v)); }
function sanitize_textarea_field($v) { return sanitize_text_field($v); }
function rest_sanitize_boolean($v) { return filter_var($v,FILTER_VALIDATE_BOOLEAN); }
function remove_accents($v) { return $v; }
function wp_json_encode($v,$flags=0) { return json_encode($v,$flags); }
function is_wp_error($v) { return $v instanceof WP_Error; }
function rest_ensure_response($v) { return $v instanceof WP_REST_Response ? $v : new WP_REST_Response($v); }
function wp_get_current_user() { global $actor; return $actor; }
function get_current_user_id() { return wp_get_current_user()->ID; }
function get_userdata($id) { global $actor; return $actor->ID === $id ? $actor : null; }
function user_can($user,$cap) { return $user->ID > 0 && ($cap !== 'manage_options' || in_array('administrator',$user->roles,true)); }
function current_user_can($cap,...$args) { return user_can(wp_get_current_user(),$cap); }
function get_post($id) { global $posts; return $posts[(int)$id] ?? null; }
function get_post_meta($id,$key,$single=true) { global $meta; return $meta[(int)$id][$key] ?? ''; }
function update_post_meta($id,$key,$value) { global $meta; $meta[(int)$id][$key]=$value; return true; }
function delete_post_meta($id,$key) { global $meta; unset($meta[(int)$id][$key]); }
function current_time($format,$gmt=false) { return '2026-10-13T00:00:00Z'; }
function wp_update_post($args) { $post=get_post($args['ID']); foreach($args as $k=>$v) $post->$k=$v; return $post->ID; }
function wp_insert_post($args,$errors=false) {
    global $posts,$audit_fail;
    if($audit_fail) return new WP_Error('synthetic_failure','SYNTHETIC audit failure',array());
    $id=1000+count($posts);
    $posts[$id]=new WP_Post($id,$args['post_type'],$args['post_title'],$args['post_status'],'synthetic',$args['post_content']);
    return $id;
}
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-admin-api.php';
function check($ok,$message) { if(!$ok) { fwrite(STDERR,"FAIL: $message\n"); exit(1); } }
function request($body=array(),$method='POST') { $r=new WP_REST_Request($method); $r['id']=400; $r->set_body(json_encode($body)); return $r; }
function version() { return Gocar_Admin_API::inline_pricing(request(array(),'GET'))->data['backendVersion']; }
function payload($changes=array()) { return array_merge(array('vehicleId'=>300,'pricingDirection'=>'outbound','packageKey'=>'one_way','priceMode'=>'fixed','priceAmount'=>1100000,'baseVersion'=>version(),'reason'=>'SYNTHETIC update'),$changes); }
function denied($result,$status,$message) { check($result instanceof WP_Error && $result->data['status']===$status,$message); }

$body=payload(); $original=$meta;
foreach(array('guest','subscriber','author','editor') as $role) {
    $actor->ID=$role==='guest'?0:7; $actor->roles=array($role);
    check(!Gocar_Admin_API::can_edit_pricing(),"$role has no price permission");
    denied(Gocar_Admin_API::inline_pricing(request($body)),403,"$role inline endpoint denied");
    denied(Gocar_Admin_API::direct_apply(request(array_merge($body,array('operation'=>'update_pricing','routeId'=>400)))),403,"$role old direct-apply denied");
    denied(Gocar_Admin_API::save_draft(request(array('payload'=>array_merge($body,array('operation'=>'update_pricing','routeId'=>400))))),403,"$role pricing draft denied");
    check(!Gocar_Admin_API::validate_payload(array_merge($body,array('operation'=>'update_pricing','routeId'=>400)))['valid'],"$role approval denied");
    check(Gocar_Admin_API::protect_pricing_meta(array('edit_posts'),'edit_post_meta',7,array(400,'pricing_packages_v2'))===array('do_not_allow'),"$role standard REST price meta denied");
    check($meta===$original,"$role produces no writes");
}
$actor->ID=7; $actor->roles=array('administrator');
check(Gocar_Admin_API::can_edit_pricing(),'administrator allowed');
check(Gocar_Admin_API::protect_pricing_meta(array('edit_posts'),'edit_post_meta',7,array(400,'pricing_packages_v2'))===array('edit_posts'),'administrator meta allowed');
$result=Gocar_Admin_API::inline_pricing(request($body));
check($result instanceof WP_REST_Response,'administrator saves successfully');
$rows=$meta[400]['pricing_packages_v2'];
check($rows[0]['price']===1100000,'target price updated');
check(array_slice($rows,1)===array_slice($original[400]['pricing_packages_v2'],1),'other direction, vehicle and package unchanged');
check($rows[0]['extra_condition']==='keep' && $rows[0]['package_label']==='SYNTHETIC label','row conditions and labels preserved');
$audit=json_decode($posts[$result->data['auditId']]->post_content,true);
check($audit['actor']['id']===7 && $audit['before']['meta']['pricing_packages_v2'][0]['price']===1000000 && $audit['after']['meta']['pricing_packages_v2'][0]['price']===1100000,'audit contains actor and old/new snapshots');
denied(Gocar_Admin_API::inline_pricing(request($body)),422,'stale version rejected');
$contact=Gocar_Admin_API::inline_pricing(request(payload(array('priceMode'=>'contact','priceAmount'=>null))));
check($contact instanceof WP_REST_Response && !isset($meta[400]['pricing_packages_v2'][0]['price']),'contact removes amount');
check(Gocar_Admin_API::inline_pricing(request(payload(array('priceAmount'=>1200000)))) instanceof WP_REST_Response,'contact can become fixed');
foreach(array(0,-100,1.5,'-100',null) as $amount) denied(Gocar_Admin_API::inline_pricing(request(payload(array('priceAmount'=>$amount)))),422,'invalid amount rejected');
foreach(array(array('pricingDirection'=>'wrong'),array('priceMode'=>'wrong'),array('vehicleId'=>-300)) as $delta) denied(Gocar_Admin_API::inline_pricing(request(payload($delta))),422,'invalid selection rejected');
denied(Gocar_Admin_API::inline_pricing(request(payload(array('packageKey'=>'round_trip_day')))),409,'disabled row cannot be activated');
denied(Gocar_Admin_API::inline_pricing(request(payload(array('packageKey'=>'missing')))),409,'missing row cannot be created');
check(Gocar_Admin_API::inline_pricing(request(payload(array('packageKey'=>'3d2n','priceAmount'=>3000000)))) instanceof WP_REST_Response,'3d2n current contact row editable');
$before=$meta; $audit_fail=true;
$failure=Gocar_Admin_API::inline_pricing(request(payload(array('priceAmount'=>1300000))));
check($failure instanceof WP_Error && $failure->code==='synthetic_failure','audit failure fails save');
check($meta[400]['pricing_packages_v2']===$before[400]['pricing_packages_v2'],'audit failure restores previous prices'); $audit_fail=false;
$meta[400]['inbound_enabled']=false;
denied(Gocar_Admin_API::inline_pricing(request(payload(array('pricingDirection'=>'inbound')))),422,'disabled direction cannot publish');
$meta[400]['inbound_enabled']=true;
$meta[400]['pricing_packages_v2'][]=$meta[400]['pricing_packages_v2'][0];
denied(Gocar_Admin_API::inline_pricing(request(payload())),409,'duplicate tuple fails closed');
array_pop($meta[400]['pricing_packages_v2']);
$meta[400]['content_mapping_state']='d35_10_blocked';
denied(Gocar_Admin_API::inline_pricing(request($body)),403,'locked route denied');
$posts[41]=new WP_Post(41,'route','SYNTHETIC historic route');
$posts[9118]=new WP_Post(9118,'location','SYNTHETIC origin');
$posts[9115]=new WP_Post(9115,'location','SYNTHETIC destination');
$meta[41]=array_merge($meta[400],array('content_mapping_state'=>'clear','route_model_version'=>2,'origin_location_id'=>9118,'destination_location_id'=>9115));
$read=request(array(),'GET');$read['id']=41;
$current=Gocar_Admin_API::inline_pricing($read);
check($current instanceof WP_REST_Response && $current->data['locked']===false,'historic published clear mapping reads existing pricing');
$historic=array_merge($body,array('baseVersion'=>$current->data['backendVersion'],'routeId'=>41,'operation'=>'update_pricing','existing_pricing_only'=>true));
denied(Gocar_Admin_API::direct_apply(request($historic)),422,'client flag cannot bypass legacy route operation lock');
$before=$meta[41];$write=request($historic);$write['id']=41;
$saved=Gocar_Admin_API::inline_pricing($write);
check($saved instanceof WP_REST_Response,'historic clear mapping saves only existing inline tuple');
check($meta[41]['content_mapping_state']==='clear' && get_post(41)->post_status==='publish','price edit keeps mapping and publication unchanged');
check($meta[41]['pricing_packages_v2'][0]['price']===$historic['priceAmount'],'existing tuple price updated');
check(array_slice($meta[41]['pricing_packages_v2'],1)===array_slice($before['pricing_packages_v2'],1),'other historic tuples unchanged');
$meta[41]['content_mapping_state']='d35_10_blocked';
denied(Gocar_Admin_API::inline_pricing($read),403,'explicit mapping block still denied');
$meta[41]['content_mapping_state']='missing';
denied(Gocar_Admin_API::inline_pricing($read),403,'unresolved historic mapping still denied');
$meta[41]['content_mapping_state']='clear';$meta[41]['origin_location_id']=9102;
denied(Gocar_Admin_API::inline_pricing($read),403,'Long Thanh remains blocked for inline pricing');
$meta[41]['origin_location_id']=9118;get_post(41)->post_status='draft';
denied(Gocar_Admin_API::inline_pricing($read),404,'draft historic route cannot use inline exception');
echo "PASS: historic route/pair lock isolated from existing published clear-mapping price edits; no client bypass; unresolved/explicit/prelaunch/draft locks retained.\n";
echo "PASS: administrator-only pricing, old API/drafts/meta denied, exact tuple, audit, conflict, fixed/contact, 3d2n, invalid/disabled/missing/duplicate/locked, audit rollback. Synthetic data only.\n";
