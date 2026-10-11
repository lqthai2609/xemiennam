<?php
/** Minimal consented visit measurement. Intent records never invoke booking/email hooks. */
if ( ! defined( 'ABSPATH' ) ) { exit; }
final class Gocar_Lead_Measurement {
    public const POLICY = 'visit_30d_v1';
    public const DAYS = 30;
    private const EXPIRY = '_gocar_measurement_expires_at';
    private const EVENT_KEY = '_gocar_intent_event_key';

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register' ) );
        add_action( 'rest_api_init', array( self::class, 'routes' ) );
        add_action( 'gocar_measurement_cleanup', array( self::class, 'cleanup' ) );
    }
    public static function register(): void {
        register_post_type( 'gocar_intent', array( 'public' => false, 'show_ui' => false, 'show_in_rest' => false, 'supports' => array() ) );
        if ( ! wp_next_scheduled( 'gocar_measurement_cleanup' ) ) wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'gocar_measurement_cleanup' );
    }
    public static function routes(): void {
        register_rest_route( 'gocar/v1', '/measurement/contact', array( 'methods' => 'POST', 'callback' => array( self::class, 'contact' ), 'permission_callback' => array( 'Gocar_Lead_Lifecycle', 'can_create' ) ) );
        register_rest_route( 'gocar/v1', '/admin/measurement', array( 'methods' => 'GET', 'callback' => array( self::class, 'report' ), 'permission_callback' => array( 'Gocar_Lead_Lifecycle', 'can_create' ) ) );
    }
    public static function is_policy( $input ): bool {
        return is_array( $input ) && 'granted' === ( $input['consent_state'] ?? null ) && self::POLICY === ( $input['policy_version'] ?? null );
    }
    public static function expires_at(): int { return time() + self::DAYS * DAY_IN_SECONDS; }
    public static function expired( int $id ): bool {
        $expiry = (int) get_post_meta( $id, self::EXPIRY, true );
        return $expiry > 0 && $expiry <= time();
    }
    public static function mark( int $id, $input ): void {
        if ( self::is_policy( $input ) ) add_post_meta( $id, self::EXPIRY, self::expires_at(), true );
    }
    public static function redact( array $record ): array {
        foreach ( array( 'acquisition', 'attribution' ) as $key ) {
            if ( isset( $record[ $key ] ) ) $record[ $key ] = array( 'retention_status' => 'expired', 'attribution_status' => 'retention_expired' );
        }
        return $record;
    }
    public static function contact( WP_REST_Request $request ) {
        global $wpdb;
        $event = $request->get_param( 'event_id' ); $channel = $request->get_param( 'channel' );
        $input = $request->get_param( 'acquisition' );
        if ( 'contact_click' !== $request->get_param( 'event_name' ) || ! is_string( $event ) ||
            ! preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $event ) ||
            ! in_array( $channel, array( 'phone', 'zalo' ), true ) || ! self::is_policy( $input ) ) {
            return new WP_Error( 'invalid_intent', 'A consented contact intent is required.', array( 'status' => 400 ) );
        }
        $context = Gocar_Lead_Lifecycle::context( $input );
        if ( empty( $context['landing_path'] ) ) return new WP_Error( 'invalid_intent', 'A public landing is required.', array( 'status' => 400 ) );
        $hash = hash( 'sha256', strtolower( $event ) ); $option = '_gocar_intent_key_' . $hash;
        // No private/raw input in the reservation. A changed event body cannot overwrite the winner.
        unset( $context['context_captured_at'] );
        $fingerprint = hash( 'sha256', wp_json_encode( array( $channel, $context, $input['referrer_origin'] ?? null, ! empty( $input['paid_marker_present'] ) ) ) );
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $option ) );
        if ( '' !== $wpdb->last_error ) return new WP_Error( 'intent_store_failed', 'Intent store unavailable.', array( 'status' => 503 ) );
        if ( null === $row ) {
            $previous = $wpdb->suppress_errors( true );
            try {
                $inserted = $wpdb->query( $wpdb->prepare( "INSERT INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", $option, maybe_serialize( array( 'fingerprint' => $fingerprint ) ) ) );
                $errno = $wpdb->dbh instanceof mysqli ? mysqli_errno( $wpdb->dbh ) : 0;
            } finally { $wpdb->suppress_errors( $previous ); }
            wp_cache_delete( $option, 'options' ); wp_cache_delete( 'notoptions', 'options' );
            if ( 1 !== $inserted ) return new WP_Error( 'intent_store_failed', 'Retry the same event later.', array( 'status' => 1062 === $errno ? 409 : 503 ) );
            $id = wp_insert_post( array( 'post_type' => 'gocar_intent', 'post_status' => 'private', 'post_title' => 'contact_click',
                'meta_input' => array( self::EVENT_KEY => $hash, '_gocar_contact_channel' => $channel,
                    '_gocar_lead_attribution_v1' => Gocar_Lead_Lifecycle::attribution( $input ), self::EXPIRY => self::expires_at() ) ), true );
            if ( is_wp_error( $id ) || ! $id ) return new WP_Error( 'intent_pending', 'Intent needs reconciliation.', array( 'status' => 409 ) );
            update_option( $option, array( 'fingerprint' => $fingerprint, 'id' => (int) $id ), false );
        } else {
            $saved = maybe_unserialize( $row->option_value );
            if ( ! is_array( $saved ) || ! hash_equals( $saved['fingerprint'] ?? '', $fingerprint ) ) return new WP_Error( 'intent_conflict', 'Event changed.', array( 'status' => 409 ) );
            $ids = get_posts( array( 'post_type' => 'gocar_intent', 'post_status' => 'private', 'fields' => 'ids', 'posts_per_page' => 2, 'meta_key' => self::EVENT_KEY, 'meta_value' => $hash ) );
            if ( 1 !== count( $ids ) ) return new WP_Error( 'intent_pending', 'Intent needs reconciliation.', array( 'status' => 409 ) );
        }
        return rest_ensure_response( array( 'accepted' => true, 'event_name' => 'contact_click' ) );
    }
    public static function report(): WP_REST_Response {
        $since = gmdate( 'Y-m-d H:i:s', time() - self::DAYS * DAY_IN_SECONDS );
        $result = array( 'policy_version' => self::POLICY, 'retention_days' => self::DAYS, 'as_of_utc' => gmdate( 'c' ),
            'contact_clicks' => array( 'phone' => 0, 'zalo' => 0 ), 'saved_requests' => 0, 'by_channel' => array(), 'limited' => false );
        foreach ( array( 'booking_request' => 'publish', 'gocar_intent' => 'private' ) as $type => $status ) {
            $ids = get_posts( array( 'post_type' => $type, 'post_status' => $status, 'fields' => 'ids', 'posts_per_page' => 1001,
                'date_query' => array( array( 'after' => $since, 'column' => 'post_date_gmt', 'inclusive' => true ) ), 'orderby' => 'date', 'order' => 'DESC' ) );
            if ( count( $ids ) > 1000 ) $result['limited'] = true;
            foreach ( array_slice( $ids, 0, 1000 ) as $id ) {
                if ( get_post_meta( $id, '_gocar_measurement_test', true ) ) continue;
                if ( 'gocar_intent' === $type ) {
                    if ( self::expired( (int) $id ) ) continue;
                    $channel = get_post_meta( $id, '_gocar_contact_channel', true );
                    if ( isset( $result['contact_clicks'][ $channel ] ) ) ++$result['contact_clicks'][ $channel ];
                } else {
                    ++$result['saved_requests'];
                    $snapshot = get_post_meta( $id, '_gocar_lead_attribution_v1', true );
                    $channel = self::expired( (int) $id ) || 'expired' === ( $snapshot['retention_status'] ?? null ) ? 'retention_expired' : ( $snapshot['attributed_touch']['channel_group'] ?? 'unknown' );
                    $result['by_channel'][ $channel ] = ( $result['by_channel'][ $channel ] ?? 0 ) + 1;
                }
            }
        }
        $response = new WP_REST_Response( $result ); $response->header( 'Cache-Control', 'no-store' ); return $response;
    }
    /** Only new policy-marked source data. Operational leads, snapshots/history/email remain. */
    public static function cleanup(): void {
        $ids = get_posts( array( 'post_type' => array( 'booking_request', 'gocar_intent' ), 'post_status' => array( 'publish', 'private', 'draft', 'trash' ),
            'fields' => 'ids', 'posts_per_page' => 200, 'meta_query' => array( array( 'key' => self::EXPIRY, 'value' => time(), 'compare' => '<=', 'type' => 'NUMERIC' ) ) ) );
        foreach ( $ids as $id ) {
            if ( 'gocar_intent' === get_post_type( $id ) ) {
                $hash = get_post_meta( $id, self::EVENT_KEY, true );
                if ( wp_delete_post( $id, true ) && preg_match( '/^[a-f0-9]{64}$/', $hash ) ) delete_option( '_gocar_intent_key_' . $hash );
            } else {
                Gocar_Lead_Lifecycle::expire_acquisition( (int) $id );
            }
        }
    }
}
Gocar_Lead_Measurement::boot();
