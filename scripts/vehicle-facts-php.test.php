<?php
// Isolated synthetic fixtures. No network, WordPress installation or public records.
define( 'ABSPATH', __DIR__ );
$filters = array(); $registered_meta = array(); $routes = array();
$db = array(); $options = array(); $admin = true; $editor = true; $write_fails = false;
$posts = array( 1001 => (object) array( 'post_type' => 'route', 'post_status' => 'publish' ),
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
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-vehicle-facts.php';
$checks = 0;
function check( $condition, $name ) { global $checks; $checks++; if ( ! $condition ) { fwrite( STDERR, "FAIL: $name\n" ); exit( 1 ); } }
$fixture = json_decode( file_get_contents( __DIR__ . '/fixtures/vehicle-facts.json' ), true );
foreach ( $fixture['cases'] as $case ) check( $case['valid'] === Gocar_Vehicle_Facts::validate( $case['model'] )['valid'], $case['name'] );
foreach ( array( NAN, INF, -INF, true, '6', array() ) as $value ) {
    $m = $fixture['base']; $m['passenger_capacity'] = $value;
    check( ! Gocar_Vehicle_Facts::validate( $m )['valid'], 'invalid capacity' );
}
foreach ( array( null, false, array(), 'record' ) as $value ) check( ! Gocar_Vehicle_Facts::validate( $value )['valid'], 'invalid root' );
$m = $fixture['base']; $m['approval']['approved_at'] = '2020-01-01T00:00:00Z';
check( ! Gocar_Vehicle_Facts::validate( $m )['valid'], 'client cannot forge review stamp' );
Gocar_Vehicle_Facts::register_meta(); Gocar_Vehicle_Facts::register_routes();
check( false === $registered_meta[Gocar_Vehicle_Facts::META_KEY]['show_in_rest'], 'private meta' );
check( 2 === count( $routes['/admin/vehicles/(?P<id>\d+)/facts'] ), 'GET PUT routes' );
foreach ( array( 'add', 'update', 'delete' ) as $action ) check( false === meta_check( $action, 2001, Gocar_Vehicle_Facts::META_KEY, '{}' ), 'protected generic meta' );
check( null === Gocar_Vehicle_Facts::public_facts( 2001 ), 'legacy not confirmed' );
check( null === Gocar_Vehicle_Facts::read( new Fixture_Request( 2001 ) )->data['record'], 'legacy no backfill' );
check( 'private, no-store' === Gocar_Vehicle_Facts::read( new Fixture_Request( 2001 ) )->headers['Cache-Control'], 'private response' );
$m = $fixture['base']; $m['approval'] = array( 'status' => 'draft', 'source_ref' => null );
$admin = false;
$r = Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 0, 'model' => $m ) ) );
check( $r instanceof WP_REST_Response, 'editor saves unconfirmed revision' );
check( null === Gocar_Vehicle_Facts::public_facts( 2001 ), 'draft never public' );
$m = $fixture['base']; $m['revision'] = 2;
$r = Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 1, 'model' => $m ) ) );
check( 'approval_forbidden' === $r->code, 'editor cannot confirm' );
$editor = false;
check( 'forbidden' === Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array() ) )->code, 'object permission enforced' );
$editor = true; $admin = true;
check( ! Gocar_Vehicle_Facts::can_edit( new Fixture_Request( 1001 ) ), 'wrong post type' );
$r = Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 1, 'model' => $m ) ) );
check( $r instanceof WP_REST_Response && 9001 === $r->data['record']['actor_id'], 'server records reviewer' );
$p = Gocar_Vehicle_Facts::public_facts( 2001 );
check( 2 === $p['revision'] && 2001 === $p['vehicle_id'] && 'confirmed' === $p['status'], 'confirmed projection' );
check( ! isset( $p['approval'] ) && ! isset( $p['actor_id'] ), 'private evidence not public' );
check( 6 === $p['passenger_capacity'] && 2 === count( $p['load_profiles'] ), 'joint profiles persist' );
$raw = get_post_meta( 2001, Gocar_Vehicle_Facts::META_KEY, true );
check( 'revision_conflict' === Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 1, 'model' => $m ) ) )->code, 'stale edit rejected' );
$m['revision'] = 3; $m['approval']['status'] = 'draft'; $admin = false;
check( 'approval_forbidden' === Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 2, 'model' => $m ) ) )->code, 'editor cannot withdraw confirmed facts' );
$admin = true; $options['gocar_vehicle_facts_lock_2001'] = 1;
check( 'vehicle_facts_busy' === Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 2, 'model' => $m ) ) )->code, 'competing writer rejected' );
unset( $options['gocar_vehicle_facts_lock_2001'] ); $write_fails = true;
check( 'save_failed' === Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 2, 'model' => $m ) ) )->code, 'failure not success' );
check( $raw === get_post_meta( 2001, Gocar_Vehicle_Facts::META_KEY, true ), 'failed write preserves facts' );
check( ! isset( $options['gocar_vehicle_facts_lock_2001'] ), 'lock released' );
check( false === meta_check( 'update', 2001, Gocar_Vehicle_Facts::META_KEY, '{}' ), 'guard restored' );
$write_fails = false;
$r = Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 2, 'model' => $m ) ) );
check( $r instanceof WP_REST_Response && null === Gocar_Vehicle_Facts::public_facts( 2001 ), 'withdrawal hides old confirmation' );
$m['revision'] = 4; $m['approval']['status'] = 'confirmed';
$r = Gocar_Vehicle_Facts::save( new Fixture_Request( 2001, array( 'expected_revision' => 3, 'model' => $m ) ) );
check( $r instanceof WP_REST_Response && 4 === Gocar_Vehicle_Facts::public_facts( 2001 )['revision'], 'new revision needs explicit new confirmation' );
$good_raw = get_post_meta( 2001, Gocar_Vehicle_Facts::META_KEY, true );
foreach ( array( array( 'vehicle_id', 2002 ), array( 'reviewed_at', '9999-01-01T00:00:00Z' ), array( 'reviewed_at', '2020-02-30T00:00:00Z' ), array( 'actor_id', 0 ) ) as $patch ) {
    $record = json_decode( $good_raw, true ); $record[$patch[0]] = $patch[1];
    $db[2001][Gocar_Vehicle_Facts::META_KEY] = json_encode( $record );
    check( null === Gocar_Vehicle_Facts::public_facts( 2001 ), 'bad stored evidence hidden' );
}
$db[2001][Gocar_Vehicle_Facts::META_KEY] = $good_raw;
$posts[2001]->post_status = 'draft';
check( null === Gocar_Vehicle_Facts::public_facts( 2001 ), 'unpublished vehicle facts hidden' );
$posts[2001]->post_status = 'trash';
check( ! Gocar_Vehicle_Facts::can_edit( new Fixture_Request( 2001 ) ), 'trashed vehicle cannot change' );
echo "PASS: $checks PHP vehicle facts validation/persistence checks\n";
