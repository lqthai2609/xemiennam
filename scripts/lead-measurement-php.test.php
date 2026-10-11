<?php
/** Synthetic WordPress behavior harness. No network, mail, production credentials or customer data. */
require __DIR__ . '/gocar-lead-lifecycle-php.test.php';
define( 'DAY_IN_SECONDS', 86400 ); define( 'HOUR_IN_SECONDS', 3600 );
function register_post_type( $type, $args ) { $GLOBALS['registered'][$type] = $args; }
function wp_next_scheduled() { return false; }
function wp_schedule_event() {}
function is_wp_error( $value ) { return $value instanceof WP_Error; }
function delete_post_meta( $id, $key ) { unset( $GLOBALS['meta'][$id][$key] ); return true; }
function wp_delete_post( $id, $force ) { unset( $GLOBALS['posts'][$id], $GLOBALS['meta'][$id] ); return true; }
function wp_insert_post( $record, $error ) {
    if ( 'gocar_intent' !== $record['post_type'] ) throw new Exception( 'intent tried to create a booking' );
    $id = 1000 + ( $GLOBALS['intent_inserts'] = ( $GLOBALS['intent_inserts'] ?? 0 ) + 1 );
    $GLOBALS['posts'][$id] = $record['post_type']; $GLOBALS['post_status'][$id] = $record['post_status'];
    foreach ( $record['meta_input'] as $key => $value ) add_post_meta( $id, $key, $value, true );
    return $id;
}
class WP_REST_Response {
    public array $headers = array();
    public function __construct( public array $data ) {}
    public function header( $key, $value ) { $this->headers[$key] = $value; }
}
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-lead-measurement.php';
$GLOBALS['meta'] = $GLOBALS['posts'] = $GLOBALS['options'] = $GLOBALS['post_status'] = array();
$GLOBALS['creates'] = $GLOBALS['fake_mail_calls'] = 0; unset( $GLOBALS['mail_receipt'], $GLOBALS['response_mode'] );
$input = array( 'consent_state' => 'granted', 'policy_version' => 'visit_30d_v1', 'landing_path' => '/', 'referrer_origin' => 'https://www.google.com/search?q=private' );
$checks = 0;
function verify_measurement( $ok, $message ) { ++$GLOBALS['checks']; check( $ok, $message ); }
foreach ( array(
    array( $input, 'organic_search' ),
    array( array_merge( $input, array( 'utm_source' => 'google', 'utm_medium' => 'cpc' ) ), 'paid_search' ),
    array( array_merge( $input, array( 'utm_source' => 'partner', 'utm_medium' => 'referral' ) ), 'referral' ),
    array( array_merge( $input, array( 'utm_source' => 'newsletter', 'utm_medium' => 'email' ) ), 'email' ),
    array( array_merge( $input, array( 'referrer_origin' => 'https://partner.example/path?phone=private' ) ), 'referral' ),
    array( array_merge( $input, array( 'referrer_origin' => 'https://alodatxe.com/' ) ), 'direct' ),
    array( array_merge( $input, array( 'referrer_origin' => 'https://alodatxe.com/', 'utm_source' => 'google', 'utm_medium' => 'organic' ) ), 'unknown' ),
    array( array_merge( $input, array( 'paid_marker_present' => true ) ), 'unknown' ),
    array( array_merge( $input, array( 'utm_source' => 'bing', 'utm_medium' => 'organic' ) ), 'unknown' ),
    array( array_merge( $input, array( 'consent_state' => 'denied' ) ), 'unknown' ),
) as $fixture ) {
    $snapshot = Gocar_Lead_Lifecycle::attribution( $fixture[0] );
    verify_measurement( $fixture[1] === $snapshot['lead_touch']['channel_group'], 'channel: ' . $fixture[1] );
    verify_measurement( ! str_contains( json_encode( $snapshot ), 'q=private' ), 'no raw referrer query' );
}
$snapshot = Gocar_Lead_Lifecycle::attribution( $input );
verify_measurement( 'current_visit_v1' === $snapshot['attribution_model'] && 0 === $snapshot['lookback_days'], 'does not claim 30-day visit history' );
Gocar_Lead_Measurement::register();
verify_measurement( false === $GLOBALS['registered']['gocar_intent']['public'] && false === $GLOBALS['registered']['gocar_intent']['show_in_rest'], 'intent CPT is private' );
$request = new WP_REST_Request();
$request->set_body_params( array( 'event_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'event_name' => 'contact_click', 'channel' => 'phone', 'acquisition' => $input ) );
$first = Gocar_Lead_Measurement::contact( $request ); $second = Gocar_Lead_Measurement::contact( $request );
verify_measurement( true === $first['accepted'] && true === $second['accepted'] && 1 === $GLOBALS['intent_inserts'], 'repeated event creates one intent' );
verify_measurement( 0 === $GLOBALS['creates'] && 0 === $GLOBALS['fake_mail_calls'], 'contact intent creates no lead and sends no email' );
$request->set_param( 'channel', 'zalo' );
verify_measurement( Gocar_Lead_Measurement::contact( $request ) instanceof WP_Error, 'changed event cannot overwrite existing intent' );
$request->set_param( 'acquisition', array( 'consent_state' => 'denied' ) );
verify_measurement( Gocar_Lead_Measurement::contact( $request ) instanceof WP_Error && 1 === $GLOBALS['intent_inserts'], 'denied consent writes no intent' );
$lead = new WP_REST_Request();
$lead->set_body_params( array( 'idempotency_key' => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'booking' => array( 'title' => 'Synthetic only', 'meta' => array( 'so_dien_thoai' => '0300000000' ) ), 'acquisition' => $input ) );
$created = Gocar_Lead_Lifecycle::create( $lead ); $replayed = Gocar_Lead_Lifecycle::create( $lead );
verify_measurement( 200 === $created['id'] && 200 === $replayed['id'] && true === $replayed['replayed'] && 1 === $GLOBALS['creates'], 'same lead replay remains one record' );
verify_measurement( 1 === count( get_post_meta( 200, '_gocar_lead_attribution_v1', false ) ), 'one immutable attribution snapshot' );
verify_measurement( 'https://www.google.com' === get_post_meta( 200, '_gocar_lead_attribution_v1', true )['attributed_touch']['referrer_origin'], 'saved source is normalized' );
verify_measurement( abs( (int) get_post_meta( 200, '_gocar_measurement_expires_at', true ) - time() - 30 * DAY_IN_SECONDS ) <= 1, 'new source gets 30-day expiry' );
$report = Gocar_Lead_Measurement::report()->data;
verify_measurement( 1 === $report['contact_clicks']['phone'] && 1 === $report['saved_requests'] && 1 === $report['by_channel']['organic_search'], 'intent and saved requests are separate and reconcile' );
add_post_meta( 1001, '_gocar_measurement_test', 1, true );
verify_measurement( 0 === Gocar_Lead_Measurement::report()->data['contact_clicks']['phone'], 'synthetic/internal marker excluded from default report' );
update_post_meta( 200, '_gocar_measurement_expires_at', time() - 1 );
$read = new WP_REST_Request(); $read->set_param( 'id', 200 );
$record = Gocar_Lead_Lifecycle::read( $read );
verify_measurement( 'retention_expired' === $record['attribution']['attribution_status'] && ! str_contains( json_encode( $record['attribution'] ), 'google' ), 'expired source is inaccessible before cron runs' );
update_post_meta( 1001, '_gocar_measurement_expires_at', time() - 1 );
$history = get_post_meta( 200, '_gocar_lead_history_v1', false );
Gocar_Lead_Measurement::cleanup();
verify_measurement( 'booking_request' === get_post_type( 200 ) && $history === get_post_meta( 200, '_gocar_lead_history_v1', false ), 'expiry keeps operational lead and history' );
verify_measurement( 'expired' === get_post_meta( 200, '_gocar_lead_attribution_v1', true )['retention_status'], 'expiry physically scrubs source metadata' );
verify_measurement( null === get_post_type( 1001 ), 'expired intent record removed' );
verify_measurement( 1 === Gocar_Lead_Measurement::report()->data['by_channel']['retention_expired'], 'expired source remains visible as its own report bucket' );
$GLOBALS['cap']['edit_posts'] = false;
verify_measurement( false === Gocar_Lead_Lifecycle::can_create(), 'intent write and report require WordPress permission' );
echo "PASS: $checks measurement checks, synthetic data only, no external calls.\n";
