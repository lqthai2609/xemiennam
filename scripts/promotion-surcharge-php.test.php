<?php
// Synthetic isolated sanitizer checks. No WordPress writes or network.
define( 'ABSPATH', __DIR__ );
function add_action( ...$args ) {}
function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_-]/', '', strtolower( $value ) ); }
function absint( $value ) { return abs( (int) $value ); }
function sanitize_text_field( $value ) { return strip_tags( (string) $value ); }
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-service-area.php';
$checks = 0;
function check( $condition, $message ) { global $checks; $checks++; if ( ! $condition ) { fwrite( STDERR, "FAIL: $message\n" ); exit( 1 ); } }
$base = array( 'zone_id' => 'synthetic', 'surcharge_mode' => 'fixed', 'amount' => 100000, 'direction' => 'outbound', 'vehicle_id' => 2001, 'package_key' => 'one_way' );
$result = Gocar_Service_Area::sanitize_surcharge_rules( array( array_merge( $base, array( 'rule_key' => 'airport_approved-1' ) ) ) )[0];
check( 'airport_approved-1' === $result['rule_key'], 'preserves explicit approved key' );
foreach ( array( 'direction', 'vehicle_id', 'package_key', 'surcharge_mode', 'zone_id' ) as $key ) check( $base[$key] === $result[$key], 'preserves ' . $key );
check( 100000.0 === $result['amount'], 'preserves resolved amount' );
check( '' === Gocar_Service_Area::sanitize_surcharge_rules( array( $base ) )[0]['rule_key'], 'legacy receives no invented identity' );
foreach ( array( '', 'Airport', '<script>', str_repeat( 'a', 81 ), array(), 123, null ) as $key ) {
    $row = Gocar_Service_Area::sanitize_surcharge_rules( array( array_merge( $base, array( 'rule_key' => $key ) ) ) )[0];
    check( '' === $row['rule_key'], 'invalid identity cannot be normalized into an approved key' );
}
$row = Gocar_Service_Area::sanitize_surcharge_rules( array( array_merge( $base, array( 'surcharge_mode' => 'none', 'amount' => 999999 ) ) ) )[0];
check( 0 === $row['amount'], 'none never carries a monetary waiver' );
echo "PASS: $checks promotion surcharge persistence checks\n";
