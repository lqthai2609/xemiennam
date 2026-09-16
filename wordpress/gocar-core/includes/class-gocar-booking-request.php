<?php
/**
 * Day 31 — Booking V2 pickup/dropoff persistence contract.
 *
 * Exact pickup/dropoff points are trip-instance data. They do not replace Route Pair V2
 * endpoints and they do not participate in Pricing V2. Zone/service-area classification
 * remains a separate Day 32 concern.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Booking_Request {
    /** @var array<string, array<string, mixed>> */
    private const META_FIELDS = array(
        'pickup_location_id' => array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 0,
        ),
        'dropoff_location_id' => array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 0,
        ),
        'pickup_address' => array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ),
        'dropoff_address' => array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ),
        'pickup_note' => array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_textarea_field',
            'default'           => '',
        ),
    );

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_meta' ), 20 );
    }

    public static function register_meta(): void {
        foreach ( self::META_FIELDS as $meta_key => $config ) {
            if ( registered_meta_key_exists( 'post', $meta_key, 'booking_request' ) ) {
                continue;
            }

            register_post_meta(
                'booking_request',
                $meta_key,
                array(
                    'single'            => true,
                    'type'              => $config['type'],
                    'default'           => $config['default'],
                    'show_in_rest'      => true,
                    'sanitize_callback' => $config['sanitize_callback'],
                    'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
                        unset( $allowed, $meta_key );
                        return current_user_can( 'edit_post', $post_id );
                    },
                )
            );
        }
    }
}

Gocar_Booking_Request::boot();
