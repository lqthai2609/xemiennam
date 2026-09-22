<?php

declare(strict_types=1);

define( 'ABSPATH', __DIR__ );

$GLOBALS['gocar_test_posts'] = array();
$GLOBALS['gocar_test_meta'] = array();
$GLOBALS['gocar_test_route_matches'] = array();

function add_action() {}
function sanitize_key( $value ) { return strtolower( preg_replace( '/[^a-z0-9_-]/', '', (string) $value ) ); }
function sanitize_text_field( $value ) { return trim( strip_tags( (string) $value ) ); }
function sanitize_textarea_field( $value ) { return trim( strip_tags( (string) $value ) ); }
function sanitize_title( $value ) { return sanitize_key( str_replace( ' ', '-', remove_accents( strtolower( (string) $value ) ) ) ); }
function absint( $value ) { return abs( (int) $value ); }
function rest_sanitize_boolean( $value ) { return filter_var( $value, FILTER_VALIDATE_BOOLEAN ); }
function current_user_can() { return true; }
function get_current_user_id() { return 7; }
function get_post( $id ) { return $GLOBALS['gocar_test_posts'][ (int) $id ] ?? null; }
function get_post_meta( $id, $key ) { return $GLOBALS['gocar_test_meta'][ (int) $id ][ $key ] ?? ''; }
function get_posts() { return $GLOBALS['gocar_test_route_matches']; }
function wp_json_encode( $value, $flags = 0 ) { return json_encode( $value, $flags ); }
function remove_accents( $value ) {
    return strtr( (string) $value, array( 'à' => 'a', 'á' => 'a', 'ạ' => 'a', 'ă' => 'a', 'â' => 'a', 'đ' => 'd', 'ê' => 'e', 'ô' => 'o', 'ơ' => 'o', 'ư' => 'u' ) );
}

require_once __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-admin-api.php';

function fixture_post( int $id, string $type, string $title ): object {
    return (object) array(
        'ID' => $id,
        'post_type' => $type,
        'post_status' => 'publish',
        'post_title' => $title,
        'post_name' => sanitize_title( $title ),
    );
}

function assert_true( bool $condition, string $message ): void {
    if ( ! $condition ) {
        fwrite( STDERR, "FAIL: {$message}\n" );
        exit( 1 );
    }
}

$GLOBALS['gocar_test_posts'][100] = fixture_post( 100, 'location', 'Sài Gòn' );
$GLOBALS['gocar_test_posts'][200] = fixture_post( 200, 'location', 'Vũng Tàu' );
$GLOBALS['gocar_test_posts'][300] = fixture_post( 300, 'vehicle', 'Xe 4 chỗ' );
$GLOBALS['gocar_test_posts'][400] = fixture_post( 400, 'route', 'Sài Gòn đi Vũng Tàu' );
$GLOBALS['gocar_test_meta'][400] = array(
    'origin_location_id' => 100,
    'destination_location_id' => 200,
    'outbound_enabled' => true,
    'inbound_enabled' => true,
);
$GLOBALS['gocar_test_posts'][9102] = fixture_post( 9102, 'location', 'Sân bay Long Thành' );
$GLOBALS['gocar_test_posts'][9118] = fixture_post( 9118, 'location', 'TP. Hồ Chí Minh' );
$GLOBALS['gocar_test_posts'][9123] = fixture_post( 9123, 'location', 'Cần Thơ' );

$fixed = Gocar_Admin_API::sanitize_payload(
    array(
        'operation' => 'create_route',
        'originLocationId' => 100,
        'destinationLocationId' => 200,
        'vehicleId' => 300,
        'priceMode' => 'fixed',
        'priceAmount' => '1.500.000 đồng',
        'reason' => 'Bảng giá đã duyệt',
    )
);
assert_true( 1500000 === $fixed['priceAmount'], 'fixed price is normalized to a positive integer' );

$contact = Gocar_Admin_API::sanitize_payload( array_merge( $fixed, array( 'priceMode' => 'contact', 'priceAmount' => 999 ) ) );
assert_true( 0 === $contact['priceAmount'], 'contact never retains a numeric amount' );

$valid = Gocar_Admin_API::validate_payload( $fixed );
assert_true( true === $valid['valid'], 'ordinary route draft passes validation' );

$zero = Gocar_Admin_API::validate_payload( array_merge( $fixed, array( 'priceAmount' => 0 ) ) );
assert_true( in_array( 'Giá fixed phải là số nguyên dương; không được dùng price=0.', $zero['errors'], true ), 'fixed zero is rejected' );

$long_thanh = Gocar_Admin_API::validate_payload( array_merge( $fixed, array( 'destinationLocationId' => 9102 ) ) );
assert_true( in_array( 'Long Thành đang PRELAUNCH và chưa được phép thao tác.', $long_thanh['errors'], true ), 'Long Thanh remains locked' );

$d35 = Gocar_Admin_API::validate_payload( array_merge( $fixed, array( 'originLocationId' => 9118, 'destinationLocationId' => 9123 ) ) );
assert_true( in_array( 'Cặp endpoint thuộc D35-10 OPEN/P0.', $d35['errors'], true ), 'D35-10 endpoint pair remains locked' );

$delete = Gocar_Admin_API::sanitize_payload(
    array(
        'operation' => 'delete_route',
        'routeId' => 400,
        'reason' => 'Xóa tuyến thử nghiệm đã ngừng khai thác',
    )
);
$delete_validation = Gocar_Admin_API::validate_payload( $delete );
assert_true( true === $delete_validation['valid'], 'ordinary route can pass recoverable delete validation' );

echo "Gocar Admin API behavioral tests passed.\n";
