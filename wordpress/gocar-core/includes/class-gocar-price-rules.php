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

    private static function valid_date( $value ): string {
        if ( ! is_string( $value ) ) return '';
        $value = sanitize_text_field( (string) $value );
        if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) return '';
        $date = DateTimeImmutable::createFromFormat( '!Y-m-d', $value );
        return $date && $date->format( 'Y-m-d' ) === $value ? $value : '';
    }

    private static function valid_time( $value ): string {
        if ( ! is_string( $value ) ) return '';
        $value = sanitize_text_field( (string) $value );
        return preg_match( '/^(?:[01]\d|2[0-3]):[0-5]\d$/', $value ) ? $value : '';
    }

    private static function condition_number( $value ): bool {
        return ( is_int( $value ) || is_float( $value ) || ( is_string( $value ) && preg_match( '/^\d+(\.\d+)?$/D', $value ) ) )
            && is_finite( (float) $value ) && (float) $value >= 0 && (float) $value <= 9007199254740991;
    }

    public static function sanitize_condition_version( $value ): int {
        return self::condition_number( $value ) && floor( (float) $value ) === (float) $value ? (int) $value : 0;
    }

    public static function sanitize_condition_rules( $rows ): array {
        // Keep an invalid marker rather than dropping a predicate or silently broadening scope.
        $invalid = array( array( 'invalid' => true, 'charge_mode' => 'contact' ) );
        if ( ! is_array( $rows ) || array_values( $rows ) !== $rows ) return $invalid;
        $output = array();
        $keys = array();
        $allowed = array( 'rule_key', 'priority', 'direction', 'vehicle_id', 'package_key', 'days_of_week',
            'weekend_only', 'weekend_days', 'holiday_dates', 'start_date', 'end_date', 'start_time', 'end_time',
            'charge_mode', 'amount', 'contact_text' );
        foreach ( $rows as $row ) {
            if ( ! is_array( $row ) || array_diff( array_keys( $row ), $allowed ) ) return $invalid;
            $key = $row['rule_key'] ?? null;
            if ( ! is_string( $key ) || ! preg_match( '/^[a-z0-9_-]{1,80}$/D', $key ) || isset( $keys[ $key ] ) ) return $invalid;
            $keys[ $key ] = true;
            if ( ! in_array( $row['charge_mode'] ?? null, array( 'none', 'fixed', 'contact' ), true ) ) return $invalid;
            foreach ( array( 'priority', 'vehicle_id', 'amount' ) as $field ) {
                if ( ! array_key_exists( $field, $row ) ) continue;
                if ( ! self::condition_number( $row[ $field ] ) ) return $invalid;
                if ( 'amount' !== $field && floor( (float) $row[ $field ] ) !== (float) $row[ $field ] ) return $invalid;
                $row[ $field ] = 'amount' === $field ? (float) $row[ $field ] : (int) $row[ $field ];
            }
            if ( 'fixed' === $row['charge_mode'] && ( ! isset( $row['amount'] ) || $row['amount'] <= 0 ) ) return $invalid;
            if ( array_key_exists( 'direction', $row ) && ! in_array( $row['direction'], array( '', 'outbound', 'inbound' ), true ) ) return $invalid;
            if ( array_key_exists( 'package_key', $row ) && ( ! is_string( $row['package_key'] ) || ! preg_match( '/^[a-z0-9_-]{0,80}$/D', $row['package_key'] ) ) ) return $invalid;
            if ( array_key_exists( 'weekend_only', $row ) && ! is_bool( $row['weekend_only'] ) ) return $invalid;
            foreach ( array( 'days_of_week', 'weekend_days' ) as $field ) {
                if ( ! array_key_exists( $field, $row ) ) continue;
                if ( ! is_array( $row[ $field ] ) || array_values( $row[ $field ] ) !== $row[ $field ] || count( $row[ $field ] ) > 7 ) return $invalid;
                foreach ( $row[ $field ] as $day ) {
                    if ( ! self::condition_number( $day ) || floor( (float) $day ) !== (float) $day || (float) $day > 6 ) return $invalid;
                }
                $row[ $field ] = array_map( 'intval', $row[ $field ] );
            }
            if ( ! empty( $row['weekend_only'] ) && empty( $row['weekend_days'] ) ) return $invalid;
            if ( array_key_exists( 'holiday_dates', $row ) ) {
                if ( ! is_array( $row['holiday_dates'] ) || array_values( $row['holiday_dates'] ) !== $row['holiday_dates'] ) return $invalid;
                foreach ( $row['holiday_dates'] as $date ) {
                    if ( ! is_string( $date ) || ! $date || self::valid_date( $date ) !== $date ) return $invalid;
                }
            }
            foreach ( array( 'start_date', 'end_date', 'start_time', 'end_time' ) as $field ) {
                if ( ! array_key_exists( $field, $row ) ) continue;
                if ( ! is_string( $row[ $field ] ) ) return $invalid;
                $valid = str_ends_with( $field, '_date' ) ? self::valid_date( $row[ $field ] ) : self::valid_time( $row[ $field ] );
                if ( $valid !== $row[ $field ] ) return $invalid;
            }
            if ( ! empty( $row['start_date'] ) && ! empty( $row['end_date'] ) && $row['start_date'] > $row['end_date'] ) return $invalid;
            if ( empty( $row['start_time'] ) !== empty( $row['end_time'] ) ) return $invalid;
            if ( ! empty( $row['start_time'] ) && $row['start_time'] === $row['end_time'] ) return $invalid;
            if ( array_key_exists( 'contact_text', $row ) ) {
                if ( ! is_string( $row['contact_text'] ) ) return $invalid;
                $row['contact_text'] = sanitize_text_field( $row['contact_text'] );
            }
            if ( 'fixed' !== $row['charge_mode'] ) unset( $row['amount'] );
            $output[] = $row;
        }
        return $output;
    }

    public static function sanitize_condition_resolution( $row ): array {
        if ( ! is_array( $row ) ) return array( 'mode' => 'contact', 'reason' => 'invalid_snapshot' );
        $mode = $row['mode'] ?? 'contact';
        if ( ! in_array( $mode, array( 'none', 'fixed', 'contact' ), true ) ) $mode = 'contact';
        $amount = $row['amount'] ?? null;
        if ( 'fixed' === $mode && ( ! self::condition_number( $amount ) || (float) $amount <= 0 ) ) $mode = 'contact';
        $result = array(
            'mode' => $mode,
            'rule_key' => sanitize_key( $row['rule_key'] ?? '' ),
            'reason' => sanitize_key( $row['reason'] ?? '' ),
            'policy_version' => self::sanitize_condition_version( $row['policy_version'] ?? 0 ),
            'timezone' => sanitize_text_field( $row['timezone'] ?? '' ),
            'departure_date' => self::valid_date( $row['departure_date'] ?? '' ),
            'departure_time' => self::valid_time( $row['departure_time'] ?? '' ),
        );
        if ( 'fixed' === $mode ) $result['amount'] = (float) $amount;
        return $result;
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
        register_post_meta( 'route', 'price_condition_policy_version', array(
            'single' => true, 'type' => 'integer', 'default' => 0, 'show_in_rest' => true,
            'sanitize_callback' => array( self::class, 'sanitize_condition_version' ), 'auth_callback' => array( self::class, 'auth' ),
        ) );
        register_post_meta( 'route', 'price_condition_timezone', array(
            'single' => true, 'type' => 'string', 'default' => '', 'show_in_rest' => true,
            'sanitize_callback' => 'sanitize_text_field', 'auth_callback' => array( self::class, 'auth' ),
        ) );
        register_post_meta( 'route', 'price_condition_rules_v2', array(
            'single' => true, 'type' => 'array', 'default' => array(),
            'show_in_rest' => array( 'schema' => array(
                'type' => 'array',
                'items' => array( 'type' => 'object', 'additionalProperties' => true ),
            ) ),
            'sanitize_callback' => array( self::class, 'sanitize_condition_rules' ),
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
        register_post_meta( 'booking_request', 'price_condition_resolution_v1', array(
            'single' => true, 'type' => 'object', 'default' => new stdClass(),
            'show_in_rest' => array( 'schema' => array( 'type' => 'object', 'additionalProperties' => true ) ),
            'sanitize_callback' => array( self::class, 'sanitize_condition_resolution' ),
            'auth_callback' => array( self::class, 'auth' ),
        ) );
    }
}

Gocar_Price_Rules::boot();
