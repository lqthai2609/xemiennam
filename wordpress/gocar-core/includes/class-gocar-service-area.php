<?php
/**
 * Day 32 — authoritative service-area and surcharge persistence contract.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Service_Area {
    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_meta' ), 20 );
    }

    public static function sanitize_zone_id( $value ): string {
        return sanitize_key( (string) $value );
    }

    public static function sanitize_zone_tier( $value ): string {
        $value = sanitize_key( (string) $value );
        return in_array( $value, array( 'center', 'suburb', 'outskirt' ), true ) ? $value : '';
    }

    public static function sanitize_area_status( $value ): string {
        $value = sanitize_key( (string) $value );
        return in_array( $value, array( 'covered', 'contact', 'outside' ), true ) ? $value : 'contact';
    }

    public static function sanitize_surcharge_mode( $value ): string {
        $value = sanitize_key( (string) $value );
        return in_array( $value, array( 'none', 'fixed', 'contact' ), true ) ? $value : 'contact';
    }

    public static function auth( bool $allowed, string $meta_key, int $post_id ): bool {
        unset( $allowed, $meta_key );
        return current_user_can( 'edit_post', $post_id );
    }

    public static function sanitize_surcharge_rules( $rows ): array {
        if ( ! is_array( $rows ) ) return array();
        $output = array();
        foreach ( $rows as $row ) {
            if ( ! is_array( $row ) ) continue;
            $zone_id = self::sanitize_zone_id( $row['zone_id'] ?? '' );
            if ( '' === $zone_id ) continue;
            $mode = self::sanitize_surcharge_mode( $row['surcharge_mode'] ?? 'contact' );
            $amount = isset( $row['amount'] ) ? (float) $row['amount'] : 0;
            if ( 'fixed' === $mode && $amount <= 0 ) $mode = 'contact';
            $output[] = array(
                'zone_id' => $zone_id,
                'applies_to' => in_array( $row['applies_to'] ?? '', array( 'pickup', 'dropoff', 'either' ), true ) ? $row['applies_to'] : 'either',
                'direction' => in_array( $row['direction'] ?? '', array( 'outbound', 'inbound' ), true ) ? $row['direction'] : '',
                'vehicle_id' => absint( $row['vehicle_id'] ?? 0 ),
                'package_key' => sanitize_key( $row['package_key'] ?? '' ),
                'surcharge_mode' => $mode,
                'amount' => 'fixed' === $mode ? $amount : 0,
                'contact_text' => sanitize_text_field( $row['contact_text'] ?? '' ),
            );
        }
        return $output;
    }

    private static function register_string( string $post_type, string $key, callable $sanitize ): void {
        if ( registered_meta_key_exists( 'post', $key, $post_type ) ) return;
        register_post_meta( $post_type, $key, array(
            'single' => true, 'type' => 'string', 'default' => '', 'show_in_rest' => true,
            'sanitize_callback' => $sanitize, 'auth_callback' => array( self::class, 'auth' ),
        ) );
    }

    public static function register_meta(): void {
        self::register_string( 'location', 'service_zone_id', array( self::class, 'sanitize_zone_id' ) );
        self::register_string( 'location', 'service_zone_tier', array( self::class, 'sanitize_zone_tier' ) );
        self::register_string( 'location', 'service_area_status', array( self::class, 'sanitize_area_status' ) );

        self::register_string( 'booking_request', 'pickup_service_zone_id', array( self::class, 'sanitize_zone_id' ) );
        self::register_string( 'booking_request', 'dropoff_service_zone_id', array( self::class, 'sanitize_zone_id' ) );
        self::register_string( 'booking_request', 'surcharge_mode', array( self::class, 'sanitize_surcharge_mode' ) );

        register_post_meta( 'route', 'surcharge_policy_version', array(
            'single' => true, 'type' => 'integer', 'default' => 0, 'show_in_rest' => true,
            'sanitize_callback' => 'absint', 'auth_callback' => array( self::class, 'auth' ),
        ) );
        register_post_meta( 'route', 'zone_surcharge_rules_v2', array(
            'single' => true, 'type' => 'array', 'default' => array(),
            'show_in_rest' => array( 'schema' => array(
                'type' => 'array',
                'items' => array( 'type' => 'object', 'additionalProperties' => true ),
            ) ),
            'sanitize_callback' => array( self::class, 'sanitize_surcharge_rules' ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );

        register_post_meta( 'booking_request', 'surcharge_amount', array(
            'single' => true, 'type' => 'number', 'show_in_rest' => true,
            'sanitize_callback' => static fn( $value ) => max( 0, (float) $value ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );
        register_post_meta( 'booking_request', 'surcharge_rule_keys', array(
            'single' => true, 'type' => 'array', 'default' => array(),
            'show_in_rest' => array( 'schema' => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ) ),
            'sanitize_callback' => static fn( $values ) => array_values( array_filter( array_map( 'sanitize_text_field', is_array( $values ) ? $values : array() ) ) ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );
    }
}

Gocar_Service_Area::boot();
