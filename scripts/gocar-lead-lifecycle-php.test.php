<?php
declare(strict_types=1);
define( 'ABSPATH', __DIR__ );
$GLOBALS['meta'] = array(); $GLOBALS['posts'] = array(); $GLOBALS['options'] = array(); $GLOBALS['cap'] = array( 'edit_posts' => true, 'publish_posts' => true );
function add_action() {} function add_filter() {} function register_rest_route() {}
function absint( $x ) { return abs( (int) $x ); }
function current_user_can( $cap, $id = 0 ) { return $GLOBALS['cap'][ $cap ] ?? ( 'edit_post' === $cap ); }
function get_current_user_id() { return 7; }
function get_post_type( $id ) { return $GLOBALS['posts'][ $id ] ?? null; }
function get_post_meta( $id, $key, $single = true ) { $values = $GLOBALS['meta'][ $id ][ $key ] ?? array(); return $single ? ( $values[0] ?? '' ) : $values; }
function add_post_meta( $id, $key, $value, $unique = false ) { if ( $unique && isset( $GLOBALS['meta'][ $id ][ $key ] ) ) return false; $GLOBALS['meta'][ $id ][ $key ][] = $value; return true; }
function update_post_meta( $id, $key, $value ) { $GLOBALS['meta'][ $id ][ $key ] = array( $value ); return true; }
function sanitize_text_field( $value ) { return trim( strip_tags( (string) $value ) ); }
function wp_json_encode( $value ) { return json_encode( $value ); }
function wp_parse_url( $value ) { return parse_url( $value ); }
function get_option( $key ) { return $GLOBALS['options'][ $key ] ?? false; }
function add_option( $key, $value ) { if ( isset( $GLOBALS['options'][ $key ] ) ) return false; $GLOBALS['options'][ $key ] = $value; return true; }
function update_option( $key, $value ) { $GLOBALS['options'][ $key ] = $value; return true; }
function delete_option( $key ) { unset( $GLOBALS['options'][ $key ] ); }
function rest_ensure_response( $x ) { return $x; }
function rest_do_request( $request ) {
    if ( 'error' === ( $GLOBALS['response_mode'] ?? '' ) ) return new FakeResponse( array(), true );
    $GLOBALS['creates'] = ( $GLOBALS['creates'] ?? 0 ) + 1;
    $id = 199 + $GLOBALS['creates'];
    $GLOBALS['posts'][ $id ] = 'booking_request';
    Gocar_Lead_Lifecycle::legacy_create( new WP_Post( $id, 'booking_request' ), $request, true );
    return new FakeResponse( 'malformed' === ( $GLOBALS['response_mode'] ?? '' ) ? array() : array( 'id' => $id ) );
}
function wp_cache_delete() {}
class WP_Error { public function __construct( public string $code, public string $message, public array $details ) {} }
class WP_Post { public function __construct( public int $ID, public string $post_type ) {} }
class FakeResponse { public function __construct( private array $data, private bool $error = false ) {} public function is_error() { return $this->error; } public function get_data() { return $this->data; } public function as_error() { return new WP_Error( 'upstream_failed', 'Upstream failed.', array( 'status' => 502 ) ); } }
class WP_REST_Request implements ArrayAccess {
    private array $params = array();
    public function __construct( $method = '', $route = '' ) {}
    public function set_body_params( $params ) { $this->params = $params; }
    public function set_param( $key, $value ) { $this->params[ $key ] = $value; }
    public function get_param( $key ) { return $this->params[ $key ] ?? null; }
    public function offsetExists( mixed $offset ): bool { return isset( $this->params[ $offset ] ); }
    public function offsetGet( mixed $offset ): mixed { return $this->get_param( $offset ); }
    public function offsetSet( mixed $offset, mixed $value ): void { $this->set_param( $offset, $value ); }
    public function offsetUnset( mixed $offset ): void { unset( $this->params[ $offset ] ); }
}
class FakeDB { public string $posts = 'wp_posts'; public array $queries = array(); public function query( $sql ) { $this->queries[] = $sql; } public function prepare( $sql, $value ) { return sprintf( $sql, $value ); } public function get_var( $sql ) { return 200; } }
$GLOBALS['wpdb'] = new FakeDB();
require_once __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-lead-lifecycle.php';
function check( $condition, $message ) { if ( ! $condition ) { fwrite( STDERR, "FAIL: $message\n" ); exit( 1 ); } }
check( Gocar_Lead_Lifecycle::context( array( 'source' => 'google', 'medium' => 'cpc', 'campaign' => 'airport_q4', 'landing_path' => '/tuyen/sai-gon-vung-tau/' ) )['campaign'] === 'airport_q4', 'paid context retained' );
$unsafe = Gocar_Lead_Lifecycle::context( array( 'campaign' => 'customer@example.com', 'utm_term' => '0901234567', 'landing_path' => '/booking/private/' ) );
check( null === $unsafe['campaign'] && null === $unsafe['utm_term'] && null === $unsafe['landing_path'], 'PII and private path rejected' );
check( null === Gocar_Lead_Lifecycle::context( array() )['source'], 'missing context remains unknown' );
$organic = Gocar_Lead_Lifecycle::attribution( array( 'consent_state' => 'granted', 'referrer_origin' => 'https://www.google.com/search?q=private', 'landing_path' => '/tuyen-duong/vung-tau/' ) );
check( 'organic_search' === $organic['lead_touch']['channel_group'] && 'attributed' === $organic['attribution_status'], 'allowlisted organic referrer is classified' );
check( 'https://www.google.com' === $organic['lead_touch']['referrer_origin'] && null === $organic['lead_touch']['landing_cluster_id'], 'referrer query is removed and unmapped cluster remains explicit' );
$spoofed = Gocar_Lead_Lifecycle::attribution( array( 'utm_source' => 'google', 'utm_medium' => 'organic', 'landing_path' => '/tuyen-duong/vung-tau/' ) );
check( 'unknown' === $spoofed['lead_touch']['channel_group'] && null === $spoofed['first_eligible_organic_touch'], 'organic UTM alone cannot claim organic attribution' );
$paid = Gocar_Lead_Lifecycle::attribution( array( 'utm_source' => 'google', 'utm_medium' => 'cpc', 'landing_path' => '/tuyen-duong/vung-tau/' ) );
check( 'paid_search' === $paid['lead_touch']['channel_group'], 'paid UTM remains distinct from organic' );
$referral = Gocar_Lead_Lifecycle::attribution( array( 'referrer_origin' => 'https://example.org/path?email=private', 'landing_path' => '/' ) );
check( 'referral' === $referral['lead_touch']['channel_group'] && 'https://example.org' === $referral['lead_touch']['referrer_origin'], 'external referral is classified without query persistence' );
$direct = Gocar_Lead_Lifecycle::attribution( array( 'referrer_origin' => 'https://alodatxe.com/', 'landing_path' => '/' ) );
check( 'direct' === $direct['lead_touch']['channel_group'], 'first-party referrer without campaign is direct' );
$denied = Gocar_Lead_Lifecycle::attribution( array( 'consent_state' => 'denied', 'utm_source' => 'google', 'referrer_origin' => 'https://www.google.com/search?q=private' ) );
check( 'privacy_rejected' === $denied['attribution_status'] && null === $denied['lead_touch']['source'] && null === $denied['lead_touch']['referrer_origin'], 'denied consent redacts marketing context' );
check( 0 === ( $GLOBALS['creates'] ?? 0 ), 'contact click does not create a lead' );
$key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$req = new WP_REST_Request(); $req->set_body_params( array( 'idempotency_key' => $key, 'booking' => array( 'title' => 'Test', 'meta' => array( 'so_dien_thoai' => '0900000000' ) ), 'acquisition' => array( 'source' => 'google', 'medium' => 'cpc' ) ) );
$first = Gocar_Lead_Lifecycle::create( $req ); $second = Gocar_Lead_Lifecycle::create( $req );
check( $first['lead_id'] === 200 && $second['replayed'] && 1 === $GLOBALS['creates'], 'retry creates exactly one lead' );
$collision = new WP_REST_Request(); $collision->set_body_params( array( 'idempotency_key' => $key, 'booking' => array( 'title' => 'Other', 'meta' => array() ) ) );
check( Gocar_Lead_Lifecycle::create( $collision ) instanceof WP_Error, 'same key with different payload is rejected' );
check( 'new' === Gocar_Lead_Lifecycle::state( 200 ), 'create starts new' );
check( false === Gocar_Lead_Lifecycle::guard_legacy_meta( null, 200, '_gocar_lead_context_v1', array(), null ), 'acquisition cannot be overwritten through post meta' );
check( count( get_post_meta( 200, '_gocar_lead_history_v1', false ) ) === 1, 'initial history appended' );
$GLOBALS['posts'][201] = 'booking_request'; $GLOBALS['meta'][201]['trang_thai_booking'] = array( 'bao_gia' );
check( 'quote' === Gocar_Lead_Lifecycle::state( 201 ), 'legacy status maps to lifecycle' );
$transition = new WP_REST_Request(); $transition->set_body_params( array( 'id' => 200, 'from' => 'new', 'to' => 'quote', 'reason' => 'Operator verified request', 'source' => 'admin' ) );
check( Gocar_Lead_Lifecycle::can_access( $transition ), 'owner can access booking record' );
check( Gocar_Lead_Lifecycle::transition( $transition )['state'] === 'quote', 'valid transition succeeds' );
check( Gocar_Lead_Lifecycle::transition( $transition ) instanceof WP_Error, 'stale transition rejected' );
check( count( get_post_meta( 200, '_gocar_lead_history_v1', false ) ) === 2, 'history remains append-only' );
check( get_post_meta( 200, '_gocar_lead_context_v1', true )['source'] === 'google', 'context remains immutable after transition' );
check( false === Gocar_Lead_Lifecycle::guard_legacy_meta( null, 200, '_gocar_lead_attribution_v1', array(), null ), 'attribution snapshot cannot be overwritten through legacy metadata' );
check( count( get_post_meta( 200, '_gocar_lead_attribution_v1', false ) ) === 1, 'replay does not append a second attribution snapshot' );
$transition->set_param( 'from', 'quote' ); $transition->set_param( 'to', 'sent' );
check( Gocar_Lead_Lifecycle::transition( $transition )['state'] === 'sent', 'quote can be sent' );
$transition->set_param( 'from', 'sent' ); $transition->set_param( 'to', 'agreed' );
$GLOBALS['cap']['publish_posts'] = false;
check( Gocar_Lead_Lifecycle::transition( $transition ) instanceof WP_Error, 'editor cannot confirm agreement' );
check( count( get_post_meta( 200, '_gocar_lead_history_v1', false ) ) === 3, 'unauthorized action leaves history untouched' );
$GLOBALS['cap']['publish_posts'] = true;
foreach ( array( 'agreed', 'deposit', 'assigned', 'complete' ) as $target ) {
    $transition->set_param( 'from', Gocar_Lead_Lifecycle::state( 200 ) ); $transition->set_param( 'to', $target );
    check( Gocar_Lead_Lifecycle::transition( $transition )['state'] === $target, "transition to $target succeeds" );
}
$transition->set_param( 'from', 'complete' ); $transition->set_param( 'to', 'lost' );
check( Gocar_Lead_Lifecycle::transition( $transition ) instanceof WP_Error, 'terminal state cannot be lost' );
check( count( get_post_meta( 200, '_gocar_lead_history_v1', false ) ) === 7, 'all transitions append history' );
check( get_post_meta( 200, '_gocar_lead_attribution_v1', true )['attribution_status'] === 'unknown', 'unknown acquisition is never upgraded to a conversion channel' );
$GLOBALS['response_mode'] = 'malformed';
$malformed = new WP_REST_Request(); $malformed->set_body_params( array( 'idempotency_key' => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'booking' => array( 'title' => 'Test 2', 'meta' => array() ) ) );
check( Gocar_Lead_Lifecycle::create( $malformed ) instanceof WP_Error, 'malformed post response is never acknowledged as lead success' );
check( Gocar_Lead_Lifecycle::create( $malformed ) instanceof WP_Error && 2 === $GLOBALS['creates'], 'uncertain post outcome remains pending and does not duplicate on retry' );
$GLOBALS['response_mode'] = 'error';
$failed = new WP_REST_Request(); $failed->set_body_params( array( 'idempotency_key' => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'booking' => array( 'title' => 'Test 3', 'meta' => array() ) ) );
check( Gocar_Lead_Lifecycle::create( $failed ) instanceof WP_Error && 2 === $GLOBALS['creates'], 'definite upstream failure is not counted as a lead' );
check( ! get_option( '_gocar_lead_key_' . hash( 'sha256', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' ) ), 'definite failure releases reservation for retry' );
echo "Lead lifecycle behavioral tests passed.\n";
