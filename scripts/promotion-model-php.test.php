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
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-promotion-model.php';
$checks = 0;
function check( $condition, $name ) { global $checks; $checks++; if ( ! $condition ) { fwrite( STDERR, "FAIL: $name\n" ); exit( 1 ); } }
$fixtures = json_decode( file_get_contents( __DIR__ . '/fixtures/promotion-model.json' ), true );
foreach ( $fixtures['cases'] as $case ) {
    $ref = array_merge( array( 'exists' => true, 'readinessVersion' => 1, 'activationReady' => true, 'surchargeExists' => true ), $case['reference'] ?? array() );
    $result = Gocar_Promotion_Model::validate( $case['model'], static fn() => $ref );
    check( $result['valid'] === $case['valid'], $case['name'] . ': ' . json_encode( $result ) );
    if ( ! $result['valid'] && ! empty( $case['field'] ) ) check( (bool) array_filter( $result['errors'], static fn( $error ) => str_starts_with( $error['field'], $case['field'] ) ), $case['name'] . ' field error' );
    if ( $result['valid'] && ! array_key_exists( 'enabled', $case['model'] ) ) check( false === $result['model']['enabled'], 'default disabled' );
}
foreach ( array( NAN, INF, -INF, null, array(), true ) as $bad ) {
    $m = $fixtures['base']; $m['discount']['rate_bps'] = $bad;
    check( ! Gocar_Promotion_Model::validate( $m )['valid'], 'bad numeric value' );
}
foreach ( array( null, false, array(), 'promotion' ) as $bad ) check( ! Gocar_Promotion_Model::validate( $bad )['valid'], 'bad root' );
foreach ( array( array( '0.01', 1 ), array( '99.99', 9999 ), array( '10', 1000 ), array( '1.2', 120 ), array( '0', null ), array( '100', null ), array( '1.001', null ), array( '1e1', null ), array( 10, null ), array( true, null ) ) as $case ) check( Gocar_Promotion_Model::parse_percent( $case[0] ) === $case[1], 'percent precision' );
$window = Gocar_Promotion_Model::window( $fixtures['base']['window'] );
check( 951670800000 === $window['startAt'], 'start Vietnam midnight' );
check( 951843600000 === $window['endExclusive'], 'whole leap end date' );
check( false === Gocar_Promotion_Model::COMMERCIAL_ENABLED, 'commercial hard off' );
Gocar_Promotion_Model::register_meta(); Gocar_Promotion_Model::register_routes();
check( false === $registered_meta[ Gocar_Promotion_Model::META_KEY ]['show_in_rest'], 'private approval evidence' );
check( 2 === count( $routes['/admin/promotions/(?P<id>\d+)/model'] ), 'admin GET and PUT' );
foreach ( array( 'add', 'update', 'delete' ) as $action ) check( false === meta_check( $action, 3001, Gocar_Promotion_Model::META_KEY, '{}' ), 'no generic meta bypass' );
// Real reference lookup, not the injected fixture callback.
$db[1001] = array( 'pricing_packages_v2' => array( array( 'direction' => 'outbound', 'vehicle_id' => 2001, 'package_key' => 'one_way', 'pricing_mode' => 'fixed', 'price' => 1000 ) ),
    'content_readiness_version' => 1, 'content_service_state' => 'live', 'content_mapping_state' => 'clear', 'outbound_enabled' => true );
check( Gocar_Promotion_Model::validate( $fixtures['base'] )['valid'], 'exact V2 row reference' );
$m = $fixtures['base']; $m['scopes'][0]['direction'] = 'inbound';
check( ! Gocar_Promotion_Model::validate( $m )['valid'], 'outbound never supplies inbound' );
$m = $fixtures['base']; $m['activation'] = $fixtures['activation'];
check( Gocar_Promotion_Model::validate( $m )['valid'], 'exact approved activation' );
$db[1001]['origin_location_id'] = 9102;
check( ! Gocar_Promotion_Model::validate( $m )['valid'], 'Long Thanh airport cannot activate' );
unset( $db[1001]['origin_location_id'] ); $db[1001]['content_mapping_state'] = 'd35_10_blocked';
check( ! Gocar_Promotion_Model::validate( $m )['valid'], 'mapping gate applies only promotion scope' );
$db[1001]['content_mapping_state'] = 'clear';
$m = $fixtures['base']; $m['discount'] = array( 'kind' => 'free_surcharge', 'target' => 'surcharge', 'rule_key' => 'fixture_fee', 'policy_version' => 1 );
$db[1001]['surcharge_policy_version'] = 1;
$db[1001]['zone_surcharge_rules_v2'] = array( array( 'rule_key' => 'fixture_fee', 'surcharge_mode' => 'fixed', 'amount' => 100 ) );
check( Gocar_Promotion_Model::validate( $m )['valid'], 'exact surcharge key version' );
$db[1001]['surcharge_policy_version'] = 2;
check( ! Gocar_Promotion_Model::validate( $m )['valid'], 'no stale surcharge version' );
$db[1001]['surcharge_policy_version'] = 1; $db[1001]['zone_surcharge_rules_v2'][0]['surcharge_mode'] = 'contact';
check( ! Gocar_Promotion_Model::validate( $m )['valid'], 'no unknown surcharge amount' );
// Persistence and authority: synthetic records only.
$read = Gocar_Promotion_Model::read( new Fixture_Request( 3001 ) );
check( null === $read->data['model'] && false === $read->data['commercial_enabled'], 'no implicit legacy migration' );
check( 'private, no-store' === $read->headers['Cache-Control'], 'no public cache of approval evidence' );
$model = $fixtures['base'];
$saved = Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 0, 'model' => $model ) ) );
check( $saved instanceof WP_REST_Response && 1 === $saved->data['model']['revision'], 'first revision saved' );
$raw = get_post_meta( 3001, Gocar_Promotion_Model::META_KEY, true );
$invalid = $model; $invalid['discount']['rate_bps'] = 0;
$bad_save = Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 1, 'model' => $invalid ) ) );
check( $bad_save instanceof WP_Error && 'invalid_promotion' === $bad_save->code && $raw === get_post_meta( 3001, Gocar_Promotion_Model::META_KEY, true ), 'invalid input preserves original data' );
$stale = Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 0, 'model' => $model ) ) );
check( $stale instanceof WP_Error && 'revision_conflict' === $stale->code && $raw === get_post_meta( 3001, Gocar_Promotion_Model::META_KEY, true ), 'stale revision cannot overwrite' );
$model['revision'] = 2; $model['approval']['status'] = 'approved'; $model['approval']['approved_at'] = '2000-01-01T00:00:00Z';
$admin = false;
$denied = Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 1, 'model' => $model ) ) );
check( $denied instanceof WP_Error && 'approval_forbidden' === $denied->code, 'editor cannot approve' );
$editor = false;
check( Gocar_Promotion_Model::save( new Fixture_Request( 3001, array() ) )->code === 'forbidden', 'object permission enforced in handler' );
$editor = true; $admin = true;
$model['enabled'] = true; $model['activation'] = $fixtures['activation'];
$saved = Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 1, 'model' => $model ) ) );
check( $saved instanceof WP_REST_Response && false === $saved->data['commercial_enabled'], 'authorized enabled program persisted with commerce still off' );
$model['revision'] = 3; $model['discount']['rate_bps'] = 500;
$reapproval = Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 2, 'model' => $model ) ) );
check( $reapproval instanceof WP_Error && 'reapproval_required' === $reapproval->code, 'edited policy cannot inherit old approval' );
$model['approval']['status'] = 'draft'; $model['approval']['approved_at'] = null;
$model['enabled'] = false;
$options['gocar_promotion_model_lock_3001'] = 1;
check( 'promotion_busy' === Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 2, 'model' => $model ) ) )->code, 'concurrent writer lock' );
unset( $options['gocar_promotion_model_lock_3001'] ); $write_fails = true;
check( 'save_failed' === Gocar_Promotion_Model::save( new Fixture_Request( 3001, array( 'expected_revision' => 2, 'model' => $model ) ) )->code, 'write failure reported' );
check( ! isset( $options['gocar_promotion_model_lock_3001'] ), 'lock released after failure' );
check( false === meta_check( 'update', 3001, Gocar_Promotion_Model::META_KEY, '{}' ), 'write bypass reset after failure' );
echo "PASS: $checks PHP promotion contract and persistence checks\n";
