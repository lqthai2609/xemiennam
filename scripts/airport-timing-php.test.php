<?php
// Isolated synthetic fixtures. No network, WordPress installation or public records.
define( 'ABSPATH', __DIR__ );
$filters = array(); $registered_meta = array(); $routes = array();
$db = array(); $options = array(); $admin = true; $editor = true; $write_fails = false;
$posts = array( 1001 => (object) array( 'post_type' => 'route', 'post_status' => 'publish', 'post_name' => 'synthetic-route' ),
    2001 => (object) array( 'post_type' => 'vehicle', 'post_status' => 'publish' ),
    3001 => (object) array( 'post_type' => 'promotion', 'post_status' => 'publish' ) );
function add_action( ...$args ) {}
function add_filter( $key, $callback, ...$args ) { global $filters; $filters[ $key ] = $callback; }
function register_post_meta( $type, $key, $schema ) { global $registered_meta; $registered_meta[ $key ] = $schema; }
function register_rest_field( ...$args ) {}
function register_rest_route( $ns, $path, $handlers ) { global $routes; $routes[ $path ] = $handlers; }
function get_post( $id ) { global $posts; return $posts[ $id ] ?? null; }
function get_post_type( $id ) { return get_post( $id )->post_type ?? null; }
function get_post_status( $id ) { return get_post( $id )->post_status ?? null; }
function current_user_can( $cap, ...$args ) { global $admin, $editor; return 'manage_options' === $cap ? $admin : $editor; }
function get_current_user_id() { return 9001; }
function get_post_meta( $id, $key, $single = true ) { global $db; return $db[ $id ][ $key ] ?? ''; }
function wp_slash( $value ) { return $value; }
function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags ); }
function add_option( $key, $value, ...$args ) { global $options; if ( isset( $options[ $key ] ) ) return false; $options[ $key ] = $value; return true; }
function delete_option( $key ) { global $options; unset( $options[ $key ] ); }
function meta_check( $action, $id, $key, $value ) { global $filters; return $filters[ $action . '_post_metadata' ]( null, $id, $key, $value, null ); }
function update_post_meta( $id, $key, $value ) { global $db, $write_fails; if ( false === meta_check( 'update', $id, $key, $value ) || $write_fails ) return false; $db[ $id ][ $key ] = $value; return true; }
function add_post_meta( $id, $key, $value ) { global $db; if ( false === meta_check( 'add', $id, $key, $value ) ) return false; $db[ $id ][ $key ][] = $value; return true; }
class WP_Error { public function __construct( public $code, public $message, public $data ) {} }
class WP_REST_Response { public $headers = array(); public function __construct( public $data, public $status ) {} public function header( $name, $value ) { $this->headers[ $name ] = $value; } }
class Fixture_Request implements ArrayAccess {
    public function __construct( private int $id, private array $body = array() ) {}
    public function offsetExists( mixed $key ): bool { return 'id' === $key; }
    public function offsetGet( mixed $key ): mixed { return $this->id; }
    public function offsetSet( mixed $key, mixed $value ): void {}
    public function offsetUnset( mixed $key ): void {}
    public function get_json_params(): array { return $this->body; }
}
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-airport-timing.php';
$checks = 0;
function check( $ok, $name ) { global $checks; $checks++; if ( ! $ok ) { fwrite( STDERR, "FAIL: $name\n" ); exit( 1 ); } }
$fixture = json_decode( file_get_contents( __DIR__ . '/fixtures/airport-timing.json' ), true );
foreach ( $fixture['cases'] as $c ) check( $c['valid'] === Gocar_Airport_Timing::validate( $c['model'] )['valid'], $c['name'] );
$posts[8001] = (object) array( 'post_type' => 'location', 'post_status' => 'publish', 'post_name' => 'synthetic-airport' );
$posts[8002] = (object) array( 'post_type' => 'location', 'post_status' => 'publish', 'post_name' => 'synthetic-origin' );
$posts[8003] = (object) array( 'post_type' => 'location', 'post_status' => 'publish', 'post_name' => 'different-city' );
$db[8003]['location_type']='city';
$db[8001]['location_type'] = 'airport'; $db[8002]['location_type'] = 'city';
$db[1001] = array( 'origin_location_id' => 8002, 'destination_location_id' => 8001, 'outbound_enabled' => true, 'inbound_enabled' => true, 'content_readiness_version' => 1, 'content_service_state' => 'live', 'content_mapping_state' => 'clear' );
Gocar_Airport_Timing::register_meta(); Gocar_Airport_Timing::register_routes();
check( false === $registered_meta[Gocar_Airport_Timing::META_KEY]['show_in_rest'], 'private model' );
foreach ( array( 'add', 'update', 'delete' ) as $a ) check( false === meta_check( $a, 1001, Gocar_Airport_Timing::META_KEY, '{}' ), 'generic writes blocked' );
check( array() === Gocar_Airport_Timing::public_rules(1001)['rules'], 'legacy no rules' );
$m = $fixture['base']; $m['approval'] = array( 'status' => 'draft', 'source_ref' => null ); $admin = false;
$r = Gocar_Airport_Timing::save( new Fixture_Request(1001, array('expected_revision'=>0,'model'=>$m)) );
check( $r instanceof WP_REST_Response, 'editor draft' );
check( array() === Gocar_Airport_Timing::public_rules(1001)['rules'], 'draft no public' );
$m = $fixture['base']; $m['revision'] = 2;
check( 'approval_forbidden' === Gocar_Airport_Timing::save( new Fixture_Request(1001,array('expected_revision'=>1,'model'=>$m)) )->code, 'editor no approval' );
$admin = true;
$r = Gocar_Airport_Timing::save( new Fixture_Request(1001,array('expected_revision'=>1,'model'=>$m)) );
check( $r instanceof WP_REST_Response && 9001 === $r->data['record']['actor_id'], 'server reviewer' );
check( 2 === Gocar_Airport_Timing::public_rules(1001)['revision'], 'confirmed revision' );
check( ! str_contains(json_encode(Gocar_Airport_Timing::public_rules(1001)), 'source_ref') && ! str_contains(json_encode(Gocar_Airport_Timing::public_rules(1001)), 'actor_id'), 'safe projection' );
check( 'revision_conflict' === Gocar_Airport_Timing::save( new Fixture_Request(1001,array('expected_revision'=>1,'model'=>$m)) )->code, 'stale writer' );
foreach ( array( array('outbound_enabled',false),array('content_service_state','prelaunch'),array('content_mapping_state','d35_10_blocked'),array('content_readiness_version',2),array('destination_location_id',8002),array('origin_location_id',8003) ) as $change ) {
 $old=$db[1001][$change[0]]; $db[1001][$change[0]]=$change[1];
 check(array()===Gocar_Airport_Timing::public_rules(1001)['rules'],'fresh readiness withdrawal');
 $db[1001][$change[0]]=$old;
}
$posts[8001]->post_name='san-bay-long-thanh'; check(array()===Gocar_Airport_Timing::public_rules(1001)['rules'],'Long Thanh slug guard'); $posts[8001]->post_name='synthetic-airport';
$posts[8001]->post_status='draft'; check(array()===Gocar_Airport_Timing::public_rules(1001)['rules'],'airport unpublished'); $posts[8001]->post_status='publish';
$m['revision']=3;$m['rules'][0]['direction']='inbound';
check('invalid_timing_scope'===Gocar_Airport_Timing::save(new Fixture_Request(1001,array('expected_revision'=>2,'model'=>$m)))->code,'no reverse clone');
$m['rules'][0]['direction']='outbound';$m['approval']['status']='draft';$admin=false;
check('approval_forbidden'===Gocar_Airport_Timing::save(new Fixture_Request(1001,array('expected_revision'=>2,'model'=>$m)))->code,'editor no withdrawal');$admin=true;
$options['gocar_airport_timing_lock_1001']=1;
check('airport_timing_busy'===Gocar_Airport_Timing::save(new Fixture_Request(1001,array('expected_revision'=>2,'model'=>$m)))->code,'writer lock');unset($options['gocar_airport_timing_lock_1001']);
$write_fails=true;check('save_failed'===Gocar_Airport_Timing::save(new Fixture_Request(1001,array('expected_revision'=>2,'model'=>$m)))->code,'failed write');$write_fails=false;
check(2===Gocar_Airport_Timing::public_rules(1001)['revision'],'write failure preserves approval');check(!count($options),'lock released');
check(Gocar_Airport_Timing::save(new Fixture_Request(1001,array('expected_revision'=>2,'model'=>$m))) instanceof WP_REST_Response,'admin withdrawal');
check(array()===Gocar_Airport_Timing::public_rules(1001)['rules'],'withdrawal clears public rules');
$editor=false;check('forbidden'===Gocar_Airport_Timing::read(new Fixture_Request(1001))->code,'object read permission');
echo "Airport timing PHP: $checks checks passed\n";
