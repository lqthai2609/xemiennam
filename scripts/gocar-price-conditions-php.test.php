<?php
// Synthetic sanitizer fixtures; never seed or activate production pricing.
define( 'ABSPATH', __DIR__ );
function add_action( ...$args ) {}
function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\\-]/', '', strtolower( $value ) ); }
function sanitize_text_field( $value ) { return trim( strip_tags( $value ) ); }
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-price-rules.php';
function check( $condition, $name ) { if ( ! $condition ) { fwrite( STDERR, "FAIL: $name\n" ); exit(1); } }
$base = array( 'rule_key' => 'fixture', 'charge_mode' => 'none' );
$invalid = array(
    array( 'start_date' => '2001-02-29' ), array( 'holiday_dates' => array( 'bad' ) ),
    array( 'start_time' => '25:00', 'end_time' => '06:00' ), array( 'start_time' => '09:00' ),
    array( 'days_of_week' => array( 'bad' ) ), array( 'weekend_only' => true ),
    array( 'weekend_only' => 'false' ), array( 'direction' => 'unknown' ), array( 'vehicle_id' => -2 ),
    array( 'priority' => 1.5 ), array( 'charge_mode' => 'fixed', 'amount' => true ),
    array( 'charge_mode' => 'fixed', 'amount' => 0 ), array( 'unknown_scope' => true ),
);
foreach ( $invalid as $patch ) {
    $result = Gocar_Price_Rules::sanitize_condition_rules( array( array_merge( $base, $patch ) ) );
    check( ! empty( $result[0]['invalid'] ), 'invalid predicate must not become a broad rule' );
}
check( ! empty( Gocar_Price_Rules::sanitize_condition_rules( array( $base, $base ) )[0]['invalid'] ), 'duplicate keys' );
$valid = array_merge( $base, array( 'start_time' => '22:00', 'end_time' => '06:00', 'weekend_only' => true, 'weekend_days' => array( 5 ), 'holiday_dates' => array( '2000-02-29' ) ) );
check( Gocar_Price_Rules::sanitize_condition_rules( array( $valid ) )[0] === $valid, 'valid predicates preserved' );
$contact = Gocar_Price_Rules::sanitize_condition_resolution( array( 'mode' => 'fixed', 'amount' => 0 ) );
check( 'contact' === $contact['mode'] && ! isset( $contact['amount'] ), 'invalid snapshot amount is contact without zero' );
check( 0 === Gocar_Price_Rules::sanitize_condition_version( -1 ), 'negative policy version' );
check( 0 === Gocar_Price_Rules::sanitize_condition_version( true ), 'boolean policy version' );
echo "PASS: condition sanitizer fixtures\n";
