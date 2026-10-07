<?php
/**
 * Day41: Alo Đặt Xe frontend sync v2. WPCode PHP: omit this opening tag.
 * Runs alongside legacy #16 without redefining its functions. Once verified,
 * the user may disable #16. No Gocar Core upgrade or database migration needed.
 * Secret is a private WordPress option, never in source or public REST fields.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

final class Alo_Dat_Xe_Frontend_Sync_V2 {
    private static array $pending = array();
    private const TYPES = array( 'post', 'route', 'vehicle', 'location', 'diem_den', 'dich_vu', 'promotion', 'testimonial', 'attachment' );

    public static function init(): void {
        add_action( 'save_post', array( __CLASS__, 'post_saved' ), 100, 3 );
        foreach ( array( 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ) as $hook ) {
            add_action( $hook, array( __CLASS__, 'meta_changed' ), 100, 4 );
        }
        foreach ( array( 'trashed_post', 'untrashed_post' ) as $hook ) {
            add_action( $hook, array( __CLASS__, 'post_changed' ), 100, 1 );
        }
        add_action( 'before_delete_post', array( __CLASS__, 'post_saved' ), 100, 2 );
        add_action( 'set_object_terms', array( __CLASS__, 'post_changed' ), 100, 1 );
        foreach ( array( 'created_term', 'edited_term', 'delete_term' ) as $hook ) {
            add_action( $hook, array( __CLASS__, 'term_changed' ), 100, 3 );
        }
        add_action( 'shutdown', array( __CLASS__, 'flush' ), 100 );
        add_action( 'alo_dat_xe_frontend_sync_retry', array( __CLASS__, 'send' ), 10, 2 );
        // First enabled request refreshes existing data without editing any route.
        if ( '2' !== get_option( 'alo_dat_xe_frontend_sync_bootstrap', '' ) ) {
            self::$pending['taxonomy'] = true;
            update_option( 'alo_dat_xe_frontend_sync_bootstrap', '2', false );
        }
    }

    public static function post_saved( $post_id, $post, $update = false ): void {
        if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) { return; }
        if ( $post && in_array( $post->post_type, self::TYPES, true ) ) {
            self::$pending[ $post->post_type ] = true;
        }
    }
    public static function post_changed( $post_id ): void {
        self::post_saved( $post_id, get_post( $post_id ) );
    }
    public static function meta_changed( $meta_id, $post_id, $meta_key, $meta_value ): void {
        // Ignore editor locks and private sync bookkeeping; watch all actual CPT meta.
        if ( in_array( $meta_key, array( '_edit_lock', '_edit_last' ), true ) ) { return; }
        self::post_changed( $post_id );
    }
    public static function term_changed( $term_id, $term_taxonomy_id, $taxonomy ): void {
        if ( in_array( $taxonomy, array( 'province', 'vehicle_type', 'category', 'post_tag' ), true ) ) {
            self::$pending['taxonomy'] = true;
        }
    }
    public static function flush(): void {
        $types = array_keys( self::$pending );
        self::$pending = array();
        foreach ( $types as $type ) { self::send( $type, 1 ); }
    }
    public static function send( $type, $attempt = 1 ): void {
        if ( ! in_array( $type, array_merge( self::TYPES, array( 'taxonomy' ) ), true ) ) { return; }
        $attempt = max( 1, min( 3, (int) $attempt ) );
        $secret = get_option( 'alo_dat_xe_frontend_sync_secret', '' );
        $code = 0;
        $reason = 'missing_secret';
        if ( is_string( $secret ) && strlen( $secret ) >= 32 && 'THAY-SECRET-NAY' !== $secret ) {
            $response = wp_remote_post( 'https://alodatxe.com/api/revalidate', array(
                'timeout' => 8, 'blocking' => true, 'redirection' => 0,
                'headers' => array( 'Content-Type' => 'application/json' ),
                'body' => wp_json_encode( array( 'secret' => $secret, 'post_type' => $type ) ),
            ) );
            if ( is_wp_error( $response ) ) {
                $reason = 'transport_error';
            } else {
                $code = (int) wp_remote_retrieve_response_code( $response );
                $body = json_decode( wp_remote_retrieve_body( $response ), true );
                $reason = 200 === $code && is_array( $body ) && true === ( $body['revalidated'] ?? false ) ? 'ok' : 'rejected';
            }
        }
        $status = get_option( 'alo_dat_xe_frontend_sync_status', array() );
        if ( ! is_array( $status ) ) { $status = array(); }
        $status[ $type ] = array( 'at_utc' => gmdate( 'c' ), 'http' => $code, 'result' => $reason, 'attempt' => $attempt );
        update_option( 'alo_dat_xe_frontend_sync_status', $status, false );
        // Bounded retry for network/server faults, not authentication/configuration errors.
        if ( $attempt < 3 && ( 'transport_error' === $reason || $code >= 500 || 429 === $code ) ) {
            $args = array( $type, $attempt + 1 );
            if ( ! wp_next_scheduled( 'alo_dat_xe_frontend_sync_retry', $args ) ) {
                wp_schedule_single_event( time() + ( 1 === $attempt ? 60 : 300 ), 'alo_dat_xe_frontend_sync_retry', $args );
            }
        }
    }
}
Alo_Dat_Xe_Frontend_Sync_V2::init();
