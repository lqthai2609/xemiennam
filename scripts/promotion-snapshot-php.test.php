<?php
/** In-memory WordPress harness: no real booking, database, mail or external calls. */
require __DIR__ . '/gocar-lead-lifecycle-php.test.php';
final class Gocar_Promotion_Model { public const COMMERCIAL_ENABLED = false; }
$fixtures = json_decode( file_get_contents( __DIR__ . '/fixtures/promotion-snapshot.json' ), true, 512, JSON_THROW_ON_ERROR );
$checks = 0;
function verify_snapshot( $condition, $message ) { $GLOBALS['checks']++; check( $condition, $message ); }
function request_for( $key, $hash, $snapshot ) {
    $p = $snapshot['pricing']; $meta = array( 'pricing_resolution_mode' => $p['mode'], 'pricing_resolution_reason' => $p['reason'], 'surcharge_mode' => $p['surcharge']['mode'] );
    foreach ( array( 'base_price_snapshot' => $p['base_price'], 'estimated_total' => $p['estimated_total'], 'price_modifier_amount' => $p['modifier_amount'], 'surcharge_amount' => $p['surcharge']['amount'] ) as $k => $v ) { if ( $v ) $meta[$k] = $v; }
    if ( $snapshot['tuple'] ) { $meta['tuyen_quan_tam'] = $snapshot['tuple']['route_id']; $meta['loai_xe_dat'] = $snapshot['tuple']['vehicle_id']; }
    $r = new WP_REST_Request(); $r->set_body_params( array( 'idempotency_key' => $key, 'intent_version' => 2, 'intent_hash' => $hash, 'promotion_snapshot' => $snapshot, 'booking' => array( 'title' => 'Synthetic', 'meta' => $meta ), 'acquisition' => array( 'consent_state' => 'unknown' ) ) ); return $r;
}
foreach ( $fixtures as $name => $s ) {
    verify_snapshot( Gocar_Promotion_Snapshot::valid( $s, true ), "$name validates across TS/PHP" );
    verify_snapshot( Gocar_Promotion_Snapshot::valid( $s ) === ! in_array( $name, array( 'applied','benefit','free_surcharge' ), true ), "$name respects commercial-off gate" );
}
foreach ( array( 'snapshot_version' => 2, 'pricing_version' => 3, 'currency' => 'USD', 'estimate_only' => false, 'timezone' => 'UTC', 'tuple' => array() ) as $k => $v ) { $bad = $fixtures['fixed']; $bad[$k] = $v; verify_snapshot( ! Gocar_Promotion_Snapshot::valid( $bad ), "invalid $k rejected" ); }
$bad = $fixtures['fixed']; $bad['phone'] = 'private'; verify_snapshot( ! Gocar_Promotion_Snapshot::valid( $bad ), 'additional snapshot fields rejected' );
foreach ( array( 0,-1,9007199254740992 ) as $total ) { $bad = $fixtures['fixed']; $bad['pricing']['estimated_total'] = $total; verify_snapshot( ! Gocar_Promotion_Snapshot::valid( $bad ), 'unsafe total rejected' ); }
$bad = $fixtures['fixed']; $bad['pricing']['estimated_total'] = 800000; verify_snapshot( ! Gocar_Promotion_Snapshot::valid( $bad ), 'component sum must match total' );
$bad = $fixtures['applied']; $bad['promotion']['promotional_estimated_total'] = 900000; verify_snapshot( ! Gocar_Promotion_Snapshot::valid( $bad, true ), 'promotion total mismatch rejected' );
$bad = $fixtures['contact']; $bad['pricing']['estimated_total'] = 1; verify_snapshot( ! Gocar_Promotion_Snapshot::valid( $bad ), 'contact total rejected' );
$GLOBALS['response_mode'] = '';
$start_creates = $GLOBALS['creates'];
foreach ( array( 'fixed','contact','disabled' ) as $index => $mode ) {
    $key = sprintf( 'eeeeeeee-eeee-4eee-8eee-%012d', $index ); $r = request_for( $key, str_repeat( 'a', 64 ), $fixtures[$mode] );
    verify_snapshot( Gocar_Lead_Lifecycle::replay( $r ) === array( 'found' => false ), 'lookup never creates new lead' );
    $first = Gocar_Lead_Lifecycle::create( $r );
    verify_snapshot( is_array( $first ) && $first['promotion_snapshot'] === $fixtures[$mode], "$mode original saved exactly" );
    $id = $first['id'];
    $changed = $fixtures['fixed']; $changed['pricing']['base_price'] = 1000000; $changed['pricing']['estimated_total'] = 1100000; $changed['evaluation_time'] = '2001-01-01T00:00:00.000Z';
    $r2 = request_for( $key, str_repeat( 'a', 64 ), $changed );
    verify_snapshot( Gocar_Lead_Lifecycle::create( $r2 )['promotion_snapshot'] === $fixtures[$mode], "$mode repeated create ignores changed server price" );
    verify_snapshot( Gocar_Lead_Lifecycle::replay( $r2 )['promotion_snapshot'] === $fixtures[$mode], "$mode lookup preserves original snapshot" );
    verify_snapshot( count( get_post_meta( $id, Gocar_Promotion_Snapshot::META_KEY, false ) ) === 1, 'one immutable snapshot' );
    verify_snapshot( get_post_meta( $id, '_gocar_lead_attribution_v1', true )['attribution_status'] === 'unknown', 'promotion cannot upgrade unknown attribution' );
    $r2->set_param( 'intent_hash', str_repeat( 'b',64 ) ); verify_snapshot( Gocar_Lead_Lifecycle::create( $r2 ) instanceof WP_Error && Gocar_Lead_Lifecycle::replay( $r2 ) instanceof WP_Error, 'changed user intent conflicts' );
    verify_snapshot( false === update_post_meta( $id, Gocar_Promotion_Snapshot::META_KEY, $changed ), 'post meta update cannot rewrite snapshot' );
    verify_snapshot( false === add_post_meta( $id, Gocar_Promotion_Snapshot::META_KEY, $changed ), 'post meta add cannot forge snapshot' );
    verify_snapshot( false === Gocar_Promotion_Snapshot::guard( null, $id, Gocar_Promotion_Snapshot::META_KEY, null, null ), 'delete hook protects snapshot' );
}
verify_snapshot( $GLOBALS['creates'] === $start_creates + 3, 'replay creates no duplicates' );
verify_snapshot( null === Gocar_Promotion_Snapshot::read( 200 ), 'old lead stays without snapshot; no backfill' );
$old = request_for( 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', str_repeat( 'a',64 ), $fixtures['fixed'] ); verify_snapshot( Gocar_Lead_Lifecycle::replay( $old ) instanceof WP_Error, 'legacy key is not silently rebound to V2' );
$invalid = request_for( 'ffffffff-ffff-4fff-8fff-ffffffffffff', str_repeat( 'a',64 ), $fixtures['applied'] ); verify_snapshot( Gocar_Lead_Lifecycle::create( $invalid ) instanceof WP_Error, 'disabled backend rejects commercial snapshot' );
$invalid->set_param( 'promotion_snapshot', $fixtures['fixed'] ); $booking = $invalid->get_param( 'booking' ); $booking['meta']['estimated_total'] = 1; $invalid->set_param( 'booking', $booking ); verify_snapshot( Gocar_Lead_Lifecycle::create( $invalid ) instanceof WP_Error, 'snapshot and legacy pricing must agree' );
foreach ( array( 'malformed','error_after_insert' ) as $i => $mode ) {
    $r = request_for( sprintf( '12121212-1212-4212-8212-%012d', $i ), str_repeat( 'c',64 ), $fixtures['fixed'] ); $GLOBALS['response_mode'] = $mode; $count = $GLOBALS['creates'];
    verify_snapshot( Gocar_Lead_Lifecycle::create( $r ) instanceof WP_Error, 'uncertain initial receipt fails' );
    $r->set_param( 'promotion_snapshot', $fixtures['contact'] );
    $recovered = Gocar_Lead_Lifecycle::replay( $r ); verify_snapshot( $recovered['promotion_snapshot'] === $fixtures['fixed'] && $GLOBALS['creates'] === $count + 1, 'uncertain insert recovers winning snapshot without duplicate' );
}
$GLOBALS['response_mode'] = ''; $GLOBALS['fail_snapshot'] = true;
$r = request_for( '34343434-3434-4434-8434-343434343434', str_repeat( 'd',64 ), $fixtures['fixed'] ); $count = $GLOBALS['creates'];
verify_snapshot( Gocar_Lead_Lifecycle::create( $r ) instanceof WP_Error, 'snapshot write failure cannot acknowledge success' );
verify_snapshot( Gocar_Lead_Lifecycle::replay( $r ) instanceof WP_Error, 'snapshot still missing cannot acknowledge replay' );
$GLOBALS['fail_snapshot'] = false; $r->set_param( 'promotion_snapshot', $fixtures['disabled'] ); $recovered = Gocar_Lead_Lifecycle::replay( $r );
verify_snapshot( $recovered['promotion_snapshot'] === $fixtures['fixed'] && $GLOBALS['creates'] === $count+1, 'retry repairs from original durable reservation only' );
$r = request_for( '56565656-5656-4565-8565-565656565656', str_repeat( 'e',64 ), $fixtures['fixed'] ); $GLOBALS['race_option'] = '_gocar_lead_key_' . hash( 'sha256',$r->get_param('idempotency_key') ); $count = $GLOBALS['creates'];
verify_snapshot( Gocar_Lead_Lifecycle::create( $r ) instanceof WP_Error && $GLOBALS['creates'] === $count, 'losing concurrent reservation never inserts' );
verify_snapshot( Gocar_Lead_Lifecycle::replay( $r ) instanceof WP_Error, 'pending reservation is not released or recreated' );
// Synthetic historical applied snapshot: replay must ignore today's commercial flag and expiry.
$r = request_for( '78787878-7878-4787-8787-787878787878', str_repeat('f',64), $fixtures['fixed'] ); $historical_id = 999;
$GLOBALS['posts'][$historical_id] = 'booking_request'; Gocar_Promotion_Snapshot::save( $historical_id, $fixtures['applied'] );
$GLOBALS['options']['_gocar_lead_key_' . hash('sha256',$r->get_param('idempotency_key'))] = array('fingerprint'=>hash('sha256','booking_intent_v2:'.str_repeat('f',64)),'intent_version'=>2,'id'=>$historical_id,'snapshot'=>$fixtures['applied']);
verify_snapshot( Gocar_Lead_Lifecycle::replay( $r )['promotion_snapshot'] === $fixtures['applied'], 'expired historical applied result is not reevaluated or repriced' );
verify_snapshot( false === Gocar_Promotion_Snapshot::save( $historical_id,$fixtures['fixed'] ), 'append-only estimate cannot be replaced by another resolution' );
echo "Day 45 snapshot checks: $checks passed; in-memory only.\n";
