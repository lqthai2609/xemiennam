<?php
/**
 * Day 34 — version-gated Price Rules Engine persistence contract.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Price_Rules {
    private const MODIFIER_TYPES = array( 'extra_stop', 'waiting_minute', 'overtime_hour', 'extra_km' );

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_meta' ), 20 );
    }

    public static function auth( bool $allowed, string $meta_key, int $post_id ): bool {
        unset( $allowed, $meta_key );
        return current_user_can( 'edit_post', $post_id );
    }

    public static function sanitize_resolution_mode( $value ): string {
        $value = sanitize_key( (string) $value );
        return in_array( $value, array( 'fixed', 'contact', 'disabled' ), true ) ? $value : 'contact';
    }

    public static function sanitize_modifier_rules( $rows ): array {
        if ( ! is_array( $rows ) ) return array();
        $output = array();

        foreach ( $rows as $row ) {
            if ( ! is_array( $row ) ) continue;
            $type = sanitize_key( $row['modifier_type'] ?? '' );
            if ( ! in_array( $type, self::MODIFIER_TYPES, true ) ) continue;

            $mode = sanitize_key( $row['charge_mode'] ?? 'contact' );
            if ( ! in_array( $mode, array( 'none', 'fixed', 'contact' ), true ) ) $mode = 'contact';
            $amount = isset( $row['amount_per_unit'] ) ? (float) $row['amount_per_unit'] : 0;
            if ( 'fixed' === $mode && $amount <= 0 ) $mode = 'contact';
            $increment = isset( $row['increment_units'] ) ? (float) $row['increment_units'] : 1;
            if ( $increment <= 0 ) $increment = 1;

            $output[] = array(
                'rule_key' => sanitize_key( $row['rule_key'] ?? '' ),
                'modifier_type' => $type,
                'direction' => in_array( $row['direction'] ?? '', array( 'outbound', 'inbound' ), true ) ? $row['direction'] : '',
                'vehicle_id' => absint( $row['vehicle_id'] ?? 0 ),
                'package_key' => sanitize_key( $row['package_key'] ?? '' ),
                'charge_mode' => $mode,
                'amount_per_unit' => 'fixed' === $mode ? $amount : 0,
                'included_units' => max( 0, (float) ( $row['included_units'] ?? 0 ) ),
                'increment_units' => $increment,
                'contact_text' => sanitize_text_field( $row['contact_text'] ?? '' ),
            );
        }

        return $output;
    }

    public static function sanitize_modifier_resolution( $rows ): array {
        if ( ! is_array( $rows ) ) return array();
        $output = array();
        foreach ( $rows as $row ) {
            if ( ! is_array( $row ) ) continue;
            $type = sanitize_key( $row['type'] ?? '' );
            if ( ! in_array( $type, self::MODIFIER_TYPES, true ) ) continue;
            $mode = sanitize_key( $row['mode'] ?? 'contact' );
            if ( ! in_array( $mode, array( 'none', 'fixed', 'contact' ), true ) ) $mode = 'contact';
            $amount = isset( $row['amount'] ) ? (float) $row['amount'] : 0;
            $output[] = array(
                'type' => $type,
                'quantity' => max( 0, (float) ( $row['quantity'] ?? 0 ) ),
                'billable_units' => max( 0, (float) ( $row['billable_units'] ?? 0 ) ),
                'mode' => $mode,
                'amount' => 'fixed' === $mode && $amount > 0 ? $amount : 0,
                'rule_key' => sanitize_key( $row['rule_key'] ?? '' ),
                'reason' => sanitize_key( $row['reason'] ?? '' ),
            );
        }
        return $output;
    }

    private static function register_string( string $key, callable $sanitize ): void {
        if ( registered_meta_key_exists( 'post', $key, 'booking_request' ) ) return;
        register_post_meta( 'booking_request', $key, array(
            'single' => true, 'type' => 'string', 'default' => '', 'show_in_rest' => true,
            'sanitize_callback' => $sanitize, 'auth_callback' => array( self::class, 'auth' ),
        ) );
    }

    private static function register_amount( string $key ): void {
        register_post_meta( 'booking_request', $key, array(
            'single' => true, 'type' => 'number', 'show_in_rest' => true,
            'sanitize_callback' => static fn( $value ) => max( 0, (float) $value ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );
    }

    public static function register_meta(): void {
        register_post_meta( 'route', 'price_modifier_policy_version', array(
            'single' => true, 'type' => 'integer', 'default' => 0, 'show_in_rest' => true,
            'sanitize_callback' => 'absint', 'auth_callback' => array( self::class, 'auth' ),
        ) );
        register_post_meta( 'route', 'price_modifier_rules_v2', array(
            'single' => true, 'type' => 'array', 'default' => array(),
            'show_in_rest' => array( 'schema' => array(
                'type' => 'array',
                'items' => array( 'type' => 'object', 'additionalProperties' => true ),
            ) ),
            'sanitize_callback' => array( self::class, 'sanitize_modifier_rules' ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );

        self::register_string( 'pricing_resolution_mode', array( self::class, 'sanitize_resolution_mode' ) );
        self::register_string( 'pricing_resolution_reason', 'sanitize_key' );
        self::register_amount( 'base_price_snapshot' );
        self::register_amount( 'price_modifier_amount' );
        self::register_amount( 'estimated_total' );
        register_post_meta( 'booking_request', 'price_modifier_resolution_v1', array(
            'single' => true, 'type' => 'array', 'default' => array(),
            'show_in_rest' => array( 'schema' => array(
                'type' => 'array',
                'items' => array( 'type' => 'object', 'additionalProperties' => true ),
            ) ),
            'sanitize_callback' => array( self::class, 'sanitize_modifier_resolution' ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );
    }
}

Gocar_Price_Rules::boot();
