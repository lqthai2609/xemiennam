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
    private const MAX_INTERMEDIATE_STOPS = 3;
    private const MAX_STOP_ADDRESS_LENGTH = 240;
    private const MAX_WAITING_MINUTES = 1440;

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

        if ( ! registered_meta_key_exists( 'post', 'intermediate_stops_v1', 'booking_request' ) ) {
            register_post_meta(
                'booking_request',
                'intermediate_stops_v1',
                array(
                    'single'            => true,
                    'type'              => 'array',
                    'default'           => array(),
                    'show_in_rest'      => array(
                        'schema' => array(
                            'type'  => 'array',
                            'items' => array(
                                'type'                 => 'object',
                                'additionalProperties' => false,
                                'properties'           => array(
                                    'order'           => array( 'type' => 'integer' ),
                                    'address'         => array( 'type' => 'string' ),
                                    'waiting_minutes' => array( 'type' => 'integer' ),
                                ),
                            ),
                        ),
                    ),
                    'sanitize_callback' => array( self::class, 'sanitize_intermediate_stops' ),
                    'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
                        unset( $allowed, $meta_key );
                        return current_user_can( 'edit_post', $post_id );
                    },
                )
            );
        }
    }

    public static function sanitize_intermediate_stops( $rows ): array {
        if ( ! is_array( $rows ) ) {
            return array();
        }

        $sanitized = array();
        foreach ( array_slice( array_values( $rows ), 0, self::MAX_INTERMEDIATE_STOPS ) as $row ) {
            if ( ! is_array( $row ) ) {
                continue;
            }

            $address = sanitize_text_field( (string) ( $row['address'] ?? '' ) );
            $address = mb_substr( trim( $address ), 0, self::MAX_STOP_ADDRESS_LENGTH );
            if ( '' === $address ) {
                continue;
            }

            $waiting_minutes = min(
                self::MAX_WAITING_MINUTES,
                max( 0, absint( $row['waiting_minutes'] ?? 0 ) )
            );

            $sanitized[] = array(
                'order'           => count( $sanitized ) + 1,
                'address'         => $address,
                'waiting_minutes' => $waiting_minutes,
            );
        }

        return $sanitized;
    }
}

Gocar_Booking_Request::boot();
