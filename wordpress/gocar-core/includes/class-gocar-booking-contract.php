<?php
/** Day 53: read-only capability declaration; never reads leads or changes state. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

final class Gocar_Booking_Contract {
    public static function routes(): void {
        register_rest_route( 'gocar/v1', '/leads/contract', array(
            'methods' => 'GET',
            'callback' => array( self::class, 'read' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function read(): WP_REST_Response {
        $response = new WP_REST_Response( array(
            'contract_version' => 1,
            'intent_version' => 2,
            'snapshot_version' => 1,
            'replay_lookup' => is_callable( array( 'Gocar_Lead_Lifecycle', 'replay' ) ),
            'snapshot_persistence' => is_callable( array( 'Gocar_Promotion_Snapshot', 'save' ) ),
        ) );
        $response->header( 'Cache-Control', 'no-store, max-age=0' );
        $response->header( 'X-Robots-Tag', 'noindex, nofollow, noarchive' );
        return $response;
    }
}

add_action( 'rest_api_init', array( Gocar_Booking_Contract::class, 'routes' ) );
