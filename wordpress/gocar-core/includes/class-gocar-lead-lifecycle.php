<?php
/** Day 37 — lead state and acquisition on the existing booking_request record. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

final class Gocar_Lead_Lifecycle {
    private const NEXT = array(
        'new' => array( 'quote', 'lost' ),
        'quote' => array( 'sent', 'lost' ),
        'sent' => array( 'agreed', 'quote', 'lost' ),
        'agreed' => array( 'deposit', 'lost' ),
        'deposit' => array( 'assigned', 'lost' ),
        'assigned' => array( 'complete', 'lost' ),
        'complete' => array(),
        'lost' => array(),
    );
    private const LEGACY = array( 'moi' => 'new', 'bao_gia' => 'quote', 'da_gui_gia' => 'sent', 'dong_y' => 'agreed', 'dat_coc' => 'deposit', 'xep_xe' => 'assigned', 'hoan_thanh' => 'complete', 'mat_khach' => 'lost' );
    private const LEGACY_BY_STATE = array( 'new' => 'moi', 'quote' => 'bao_gia', 'sent' => 'da_gui_gia', 'agreed' => 'dong_y', 'deposit' => 'dat_coc', 'assigned' => 'xep_xe', 'complete' => 'hoan_thanh', 'lost' => 'mat_khach' );
    private static bool $syncing_legacy = false;
    private const CONTEXT_KEYS = array( 'source' => 100, 'medium' => 50, 'campaign' => 150, 'utm_source' => 100, 'utm_medium' => 50, 'utm_campaign' => 150, 'utm_id' => 100, 'utm_term' => 150, 'utm_content' => 150, 'landing_page_id' => 100, 'landing_path' => 500, 'landing_family' => 100 );
    private const SEARCH_HOSTS = array( 'google.com', 'google.com.vn', 'bing.com', 'search.yahoo.com', 'duckduckgo.com', 'coccoc.com' );
    private const FIRST_PARTY_HOSTS = array( 'xemiennam.vercel.app', 'alodatxe.com', 'www.alodatxe.com' );

    public static function boot(): void {
        add_action( 'rest_api_init', array( self::class, 'routes' ) );
        // Covers legacy clients using the existing WordPress post creation API.
        add_action( 'rest_after_insert_booking_request', array( self::class, 'legacy_create' ), 10, 3 );
        add_filter( 'rest_pre_insert_booking_request', array( self::class, 'guard_legacy_update' ), 10, 2 );
        add_filter( 'update_post_metadata', array( self::class, 'guard_legacy_meta' ), 10, 5 );
    }

    public static function routes(): void {
        register_rest_route( 'gocar/v1', '/leads', array( 'methods' => 'POST', 'callback' => array( self::class, 'create' ), 'permission_callback' => array( self::class, 'can_create' ) ) );
        register_rest_route( 'gocar/v1', '/admin/leads/(?P<id>\d+)', array( 'methods' => 'GET', 'callback' => array( self::class, 'read' ), 'permission_callback' => array( self::class, 'can_access' ) ) );
        register_rest_route( 'gocar/v1', '/admin/leads/(?P<id>\d+)/transition', array( 'methods' => 'POST', 'callback' => array( self::class, 'transition' ), 'permission_callback' => array( self::class, 'can_access' ) ) );
    }

    public static function can_create(): bool { return current_user_can( 'edit_posts' ); }
    public static function can_access( WP_REST_Request $request ): bool {
        $id = absint( $request['id'] );
        return 'booking_request' === get_post_type( $id ) && current_user_can( 'edit_post', $id );
    }

    public static function state( int $id ): string {
        $stored = get_post_meta( $id, '_gocar_lead_state_v1', true );
        if ( isset( self::NEXT[ $stored ] ) ) { return $stored; }
        $legacy = get_post_meta( $id, 'trang_thai_booking', true );
        return self::LEGACY[ $legacy ] ?? 'new';
    }

    public static function guard_legacy_update( $prepared, WP_REST_Request $request ) {
        $id = absint( $request['id'] );
        $meta = $request->get_param( 'meta' );
        if ( $id && is_array( $meta ) && isset( $meta['trang_thai_booking'] ) && self::state( $id ) !== ( self::LEGACY[ $meta['trang_thai_booking'] ] ?? '' ) ) {
            return new WP_Error( 'lead_transition_required', 'Use the audited lead transition endpoint.', array( 'status' => 409 ) );
        }
        return $prepared;
    }

    public static function guard_legacy_meta( $check, int $id, string $key, $value, $previous ) {
        if ( self::$syncing_legacy || 'booking_request' !== get_post_type( $id ) ) { return $check; }
        if ( '_gocar_lead_state_v1' === $key || '_gocar_lead_context_v1' === $key || '_gocar_lead_attribution_v1' === $key || '_gocar_lead_history_v1' === $key ) { return false; }
        if ( 'trang_thai_booking' === $key && get_post_meta( $id, '_gocar_lead_state_v1', true ) && ( self::LEGACY[ $value ] ?? '' ) !== self::state( $id ) ) { return false; }
        return $check;
    }

    public static function context( $input ): array {
        $output = array( 'context_schema_version' => 1, 'context_captured_at' => gmdate( 'c' ) );
        if ( ! is_array( $input ) ) { $input = array(); }
        foreach ( self::CONTEXT_KEYS as $key => $max ) {
            $value = $input[ $key ] ?? null;
            if ( ! is_string( $value ) || '' === trim( $value ) || strlen( $value ) > $max ) { $output[ $key ] = null; continue; }
            $value = trim( $value );
            // Reject identifiers, addresses, coordinates, URLs and unbounded free text.
            if ( preg_match( '/@|\+?\d[\d\s.()-]{8,}|https?:|%40|%2b|\b(?:phone|email|address|token|name|dia_chi|so_dien_tho)\b/i', $value ) || ! preg_match( '/^[\pL\pN_\/.:-]+$/u', $value ) ) { $output[ $key ] = null; continue; }
            if ( 'landing_path' === $key && ( '/' !== substr( $value, 0, 1 ) || str_contains( $value, '..' ) || str_contains( $value, '//' ) || preg_match( '#/(?:api|quan-tri|wp-admin|checkout|booking)(?:/|$)#i', $value ) ) ) { $output[ $key ] = null; continue; }
            $output[ $key ] = 'landing_path' === $key ? strtok( $value, '?#' ) : sanitize_text_field( $value );
        }
        return $output;
    }

    /** No raw referrer path/query, click ID or person-entered text is persisted. */
    private static function referrer( $value ): array {
        if ( ! is_string( $value ) || strlen( $value ) > 2048 ) { return array( 'origin' => null, 'host' => null, 'type' => 'unknown' ); }
        $parts = wp_parse_url( $value );
        if ( ! is_array( $parts ) || ! in_array( $parts['scheme'] ?? '', array( 'http', 'https' ), true ) || empty( $parts['host'] ) ) {
            return array( 'origin' => null, 'host' => null, 'type' => 'unknown' );
        }
        $host = strtolower( $parts['host'] );
        if ( ! preg_match( '/^[a-z0-9.-]+$/', $host ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
            return array( 'origin' => null, 'host' => null, 'type' => 'unknown' );
        }
        $origin = $parts['scheme'] . '://' . $host . ( isset( $parts['port'] ) ? ':' . $parts['port'] : '' );
        foreach ( self::SEARCH_HOSTS as $search ) {
            if ( $host === $search || str_ends_with( $host, '.' . $search ) ) {
                return array( 'origin' => $origin, 'host' => $host, 'type' => 'search_engine' );
            }
        }
        foreach ( self::FIRST_PARTY_HOSTS as $site ) {
            if ( $host === $site ) { return array( 'origin' => $origin, 'host' => $host, 'type' => 'internal' ); }
        }
        return array( 'origin' => $origin, 'host' => $host, 'type' => 'external_referral' );
    }

    /** Called only after WordPress has created the lead; no standalone CRM or client conversion. */
    public static function attribution( $input ): array {
        $input = is_array( $input ) ? $input : array();
        $context = self::context( $input );
        $consent = in_array( $input['consent_state'] ?? null, array( 'granted', 'denied' ), true ) ? $input['consent_state'] : 'unknown';
        $referrer = self::referrer( $input['referrer_origin'] ?? null );
        $medium = strtolower( $context['utm_medium'] ?? '' );
        $source = strtolower( $context['utm_source'] ?? '' );
        $channel = 'unknown';
        if ( 'granted' !== $consent ) {
            $context = self::context( array() );
            $referrer = self::referrer( null );
        } elseif ( in_array( $medium, array( 'cpc', 'ppc', 'paid_search', 'paid_social' ), true ) ) {
            $channel = 'paid_search' === $medium || in_array( $medium, array( 'cpc', 'ppc' ), true ) ? 'paid_search' : 'paid_social';
        } elseif ( 'search_engine' === $referrer['type'] && ( '' === $medium || 'organic' === $medium ) ) {
            $channel = 'organic_search';
        } elseif ( 'external_referral' === $referrer['type'] && '' === $medium ) {
            $channel = 'referral';
        } elseif ( 'internal' === $referrer['type'] && '' === $medium && '' === $source ) {
            $channel = 'direct';
        }
        if ( 'granted' !== $consent ) { $channel = 'unknown'; }
        $touch = array(
            'occurred_at_utc' => gmdate( 'c' ),
            'source' => 'organic_search' === $channel ? $referrer['host'] : ( $context['utm_source'] ?? null ),
            'medium' => 'organic_search' === $channel ? 'organic' : ( $context['utm_medium'] ?? null ),
            'campaign' => $context['utm_campaign'],
            'channel_group' => $channel,
            'referrer_origin' => $referrer['origin'], 'referrer_host' => $referrer['host'], 'referrer_type' => $referrer['type'],
            'landing_path' => $context['landing_path'], 'landing_page_id' => $context['landing_page_id'],
            'landing_family' => $context['landing_family'], 'landing_cluster_id' => null,
            'landing_mapping_status' => $context['landing_path'] ? 'unmapped' : 'unknown',
        );
        // A single request gives one verified lead touch. Earlier visits require an approved
        // consent-aware capture mechanism and cannot be reconstructed from booking PII.
        $status = 'denied' === $consent ? 'privacy_rejected' : ( 'unknown' === $channel ? 'unknown' : ( $context['landing_path'] ? 'attributed' : 'missing_context' ) );
        return array(
            'attribution_schema_version' => 1, 'channel_rule_version' => 'channel_v1',
            'search_allowlist_version' => 'search_v1', 'attribution_model' => 'first_eligible_organic_30d_v1',
            'lookback_days' => 30, 'consent_state' => $consent,
            'attribution_status' => $status,
            'initial_touch' => $touch, 'lead_touch' => $touch,
            'first_eligible_organic_touch' => 'organic_search' === $channel ? $touch : null,
            'attributed_touch' => 'granted' === $consent ? $touch : null,
        );
    }

    public static function legacy_create( WP_Post $post, WP_REST_Request $request, bool $creating ): void {
        if ( ! $creating || 'booking_request' !== $post->post_type ) { return; }
        self::initialize( $post->ID, $request->get_param( 'acquisition' ) );
    }

    private static function initialize( int $id, $context ): void {
        $operational_context = is_array( $context ) && 'granted' === ( $context['consent_state'] ?? null ) ? $context : array();
        add_post_meta( $id, '_gocar_lead_context_v1', self::context( $operational_context ), true );
        add_post_meta( $id, '_gocar_lead_attribution_v1', self::attribution( $context ), true );
        add_post_meta( $id, '_gocar_lead_state_v1', 'new', true );
        add_post_meta( $id, '_gocar_lead_history_v1', array( 'from' => null, 'to' => 'new', 'at' => gmdate( 'c' ), 'actor' => get_current_user_id(), 'source' => 'booking_request_create', 'reason' => null ), false );
    }

    public static function create( WP_REST_Request $request ) {
        $key = $request->get_param( 'idempotency_key' );
        if ( ! is_string( $key ) || ! preg_match( '/^[a-f0-9-]{36}$/i', $key ) ) { return new WP_Error( 'invalid_key', 'A UUID idempotency key is required.', array( 'status' => 400 ) ); }
        $booking = $request->get_param( 'booking' );
        if ( ! is_array( $booking ) || empty( $booking['title'] ) || ! isset( $booking['meta'] ) || ! is_array( $booking['meta'] ) ) { return new WP_Error( 'invalid_booking', 'Booking payload is required.', array( 'status' => 400 ) ); }
        $option = '_gocar_lead_key_' . hash( 'sha256', $key );
        $fingerprint = hash( 'sha256', wp_json_encode( array( $booking, $request->get_param( 'acquisition' ) ) ) );
        $existing = get_option( $option );
        if ( $existing ) {
            if ( ! is_array( $existing ) || ! hash_equals( $existing['fingerprint'] ?? '', $fingerprint ) ) { return new WP_Error( 'key_conflict', 'Idempotency key belongs to another request.', array( 'status' => 409 ) ); }
            if ( ! empty( $existing['id'] ) && 'booking_request' === get_post_type( (int) $existing['id'] ) ) { return rest_ensure_response( array( 'id' => (int) $existing['id'], 'lead_id' => (int) $existing['id'], 'replayed' => true ) ); }
            return new WP_Error( 'lead_in_progress', 'Lead creation is in progress; retry with the same key.', array( 'status' => 409 ) );
        }
        if ( ! add_option( $option, array( 'fingerprint' => $fingerprint, 'id' => null, 'reserved_at' => gmdate( 'c' ) ), '', false ) ) { return new WP_Error( 'lead_in_progress', 'Lead creation is in progress; retry with the same key.', array( 'status' => 409 ) ); }
        $inner = new WP_REST_Request( 'POST', '/wp/v2/booking_request' );
        $inner->set_body_params( $booking );
        $inner->set_param( 'acquisition', $request->get_param( 'acquisition' ) );
        $response = rest_do_request( $inner );
        if ( $response->is_error() ) { delete_option( $option ); return $response->as_error(); }
        $record = $response->get_data();
        // The REST response may be malformed after a post was inserted. Keep the pending
        // reservation for reconciliation; releasing it could create a duplicate on retry.
        if ( empty( $record['id'] ) || ! is_numeric( $record['id'] ) || 'booking_request' !== get_post_type( (int) $record['id'] ) ) {
            return new WP_Error( 'lead_create_unconfirmed', 'Lead creation needs reconciliation; retry with the same key.', array( 'status' => 502 ) );
        }
        update_option( $option, array( 'fingerprint' => $fingerprint, 'id' => (int) $record['id'] ), false );
        return rest_ensure_response( array( 'id' => (int) $record['id'], 'lead_id' => (int) $record['id'], 'replayed' => false ) );
    }

    public static function read( WP_REST_Request $request ) {
        $id = absint( $request['id'] );
        return rest_ensure_response( array( 'lead_id' => $id, 'state' => self::state( $id ), 'history' => get_post_meta( $id, '_gocar_lead_history_v1', false ), 'acquisition' => get_post_meta( $id, '_gocar_lead_context_v1', true ) ?: null, 'attribution' => get_post_meta( $id, '_gocar_lead_attribution_v1', true ) ?: null ) );
    }

    public static function transition( WP_REST_Request $request ) {
        $id = absint( $request['id'] );
        $target = $request->get_param( 'to' );
        $expected = $request->get_param( 'from' );
        $reason = $request->get_param( 'reason' );
        $source = $request->get_param( 'source' );
        if ( ! is_string( $target ) || ! is_string( $expected ) || ! isset( self::NEXT[ $target ] ) || ! isset( self::NEXT[ $expected ] ) ) { return new WP_Error( 'invalid_state', 'Valid to/from states are required.', array( 'status' => 400 ) ); }
        if ( ! is_string( $source ) || ! in_array( $source, array( 'admin', 'operations' ), true ) ) { return new WP_Error( 'invalid_source', 'An approved actor source is required.', array( 'status' => 400 ) ); }
        if ( in_array( $target, array( 'agreed', 'deposit', 'assigned', 'complete' ), true ) && ! current_user_can( 'publish_posts' ) ) { return new WP_Error( 'forbidden_transition', 'Publisher capability is required.', array( 'status' => 403 ) ); }
        if ( in_array( $target, array( 'lost', 'quote', 'sent' ), true ) && ( ! is_string( $reason ) || '' === trim( $reason ) ) ) { return new WP_Error( 'reason_required', 'A reason is required.', array( 'status' => 400 ) ); }
        if ( null !== $reason && ( ! is_string( $reason ) || mb_strlen( $reason ) > 500 ) ) { return new WP_Error( 'invalid_reason', 'Reason is too long.', array( 'status' => 400 ) ); }
        global $wpdb;
        $wpdb->query( 'START TRANSACTION' );
        $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE ID = %d FOR UPDATE", $id ) );
        $current = self::state( $id );
        if ( $current !== $expected || ! in_array( $target, self::NEXT[ $current ], true ) ) { $wpdb->query( 'ROLLBACK' ); return new WP_Error( 'invalid_transition', 'State changed or transition is not allowed.', array( 'status' => 409 ) ); }
        $entry = array( 'from' => $current, 'to' => $target, 'at' => gmdate( 'c' ), 'actor' => get_current_user_id(), 'source' => $source, 'reason' => is_string( $reason ) ? sanitize_text_field( $reason ) : null );
        self::$syncing_legacy = true;
        $saved = add_post_meta( $id, '_gocar_lead_history_v1', $entry, false ) && update_post_meta( $id, '_gocar_lead_state_v1', $target ) && update_post_meta( $id, 'trang_thai_booking', self::LEGACY_BY_STATE[ $target ] );
        self::$syncing_legacy = false;
        if ( ! $saved ) { $wpdb->query( 'ROLLBACK' ); wp_cache_delete( $id, 'post_meta' ); return new WP_Error( 'transition_failed', 'Could not save the transition.', array( 'status' => 500 ) ); }
        $wpdb->query( 'COMMIT' );
        return rest_ensure_response( array( 'lead_id' => $id, 'state' => $target, 'entry' => $entry ) );
    }
}

Gocar_Lead_Lifecycle::boot();
