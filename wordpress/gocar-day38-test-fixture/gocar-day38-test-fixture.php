<?php
/**
 * Plugin Name: Alo Dat Xe Day 38 Test Fixture
 * Description: Isolated booking schema and login gate for the Day 38 test site only.
 * Version: 0.3.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function alo_day38_is_test_site(): bool {
    return untrailingslashit( site_url() ) === 'https://laquangthai.datxesaigon.com/alo-day38-test';
}

register_activation_hook( __FILE__, static function (): void {
    if ( ! alo_day38_is_test_site() ) {
        wp_die( esc_html__( 'This fixture is limited to the isolated Day 38 test site.', 'alo-day38-test' ) );
    }
} );

if ( ! alo_day38_is_test_site() ) {
    return;
}

add_action( 'init', static function (): void {
    if ( post_type_exists( 'booking_request' ) ) {
        return;
    }

    register_post_type( 'booking_request', array(
        'label'           => 'Yêu cầu thử nghiệm',
        'public'          => false,
        'show_ui'         => true,
        'show_in_rest'    => true,
        'rest_base'       => 'booking_request',
        'supports'        => array( 'title', 'custom-fields' ),
        'capability_type' => 'post',
        'map_meta_cap'    => true,
    ) );
}, 5 );

// Keep the isolated site private after the directory password is removed.
add_action( 'template_redirect', static function (): void {
    if ( ! is_user_logged_in() ) {
        auth_redirect();
    }
}, 1 );

add_filter( 'rest_authentication_errors', static function ( $result ) {
    if ( is_wp_error( $result ) ) {
        return $result;
    }
    // WordPress cookie auth can return true even for an anonymous request
    // without a nonce; the current user is the authority for this gate.
    if ( ! is_user_logged_in() ) {
        return new WP_Error( 'alo_day38_login_required', 'Test site login required.', array( 'status' => 401 ) );
    }
    return $result;
}, 100 );

add_filter( 'rest_send_nocache_headers', '__return_true' );

add_action( 'send_headers', static function (): void {
    header( 'X-Robots-Tag: noindex, nofollow, noarchive', true );
} );

// Empty catalog endpoints let the isolated booking form use its contact fallback.
add_action( 'init', static function (): void {
    foreach ( array( 'route', 'vehicle', 'location' ) as $type ) {
        if ( post_type_exists( $type ) ) {
            continue;
        }
        register_post_type( $type, array(
            'public'       => false,
            'show_ui'      => false,
            'show_in_rest' => true,
            'rest_base'    => $type,
            'supports'     => array( 'title', 'custom-fields' ),
        ) );
    }
}, 6 );

// A synthetic lead must never trigger a real customer notification.
add_filter( 'pre_wp_mail', static function () { return true; } );
