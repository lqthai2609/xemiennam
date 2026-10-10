<?php
/** Day 46: protected Operations facts. No legacy migration, availability or price activation. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Gocar_Vehicle_Facts {
    public const META_KEY = '_gocar_vehicle_facts_v1';
    private const HISTORY_KEY = '_gocar_vehicle_facts_history_v1';
    private static bool $writing = false;

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_meta' ), 21 );
        add_action( 'rest_api_init', array( self::class, 'register_routes' ) );
        foreach ( array( 'add', 'update', 'delete' ) as $action ) add_filter( $action . '_post_metadata', array( self::class, 'guard_meta' ), 10, 5 );
    }
    public static function register_meta(): void {
        foreach ( array( self::META_KEY, self::HISTORY_KEY ) as $key ) register_post_meta( 'vehicle', $key, array(
            'type' => 'string', 'single' => self::META_KEY === $key, 'show_in_rest' => false, 'auth_callback' => static fn() => false,
        ) );
    }
    public static function guard_meta( $check, $id, $key, $value = null, $extra = null ) {
        unset( $id, $value, $extra );
        return in_array( $key, array( self::META_KEY, self::HISTORY_KEY ), true ) && ! self::$writing ? false : $check;
    }
    public static function register_routes(): void {
        register_rest_route( 'gocar/v1', '/admin/vehicles/(?P<id>\d+)/facts', array(
            array( 'methods' => 'GET', 'callback' => array( self::class, 'read' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
            array( 'methods' => 'PUT', 'callback' => array( self::class, 'save' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
        ) );
        register_rest_field( 'vehicle', 'gocar_vehicle_facts', array(
            'get_callback' => static fn( $post ) => self::public_facts( (int) $post['id'] ),
            'schema' => array( 'description' => 'Operations-confirmed facts only; null means consultation.', 'type' => array( 'object', 'null' ), 'readonly' => true, 'context' => array( 'view', 'edit' ) ),
        ) );
    }
    public static function can_edit( $request ): bool {
        $id = (int) $request['id'];
        return $id > 0 && 'vehicle' === get_post_type( $id ) && ! in_array( get_post_status( $id ), array( 'trash', 'auto-draft' ), true ) && current_user_can( 'edit_post', $id );
    }
    private static function object( $v, array $keys ): bool {
        return is_array( $v ) && ! array_diff( $keys, array_keys( $v ) ) && ! array_diff( array_keys( $v ), $keys );
    }
    private static function integer( $v, int $min, int $max = 100 ): bool {
        return ( is_int( $v ) || is_float( $v ) ) && is_finite( (float) $v ) && floor( (float) $v ) === (float) $v && $v >= $min && $v <= $max;
    }
    private static function dimensions( $v ): bool {
        return is_array( $v ) && array_is_list( $v ) && 3 === count( $v ) && ! array_filter( $v, static fn( $n ) => ! self::integer( $n, 1, 300 ) );
    }
    private static function text( $v, int $max ): bool {
        if ( ! is_string( $v ) || '' === $v || trim( $v ) !== $v || preg_match( '/[<>\x00-\x1f]/', $v ) ) return false;
        $length = preg_match_all( '/./us', $v );
        return false !== $length && $length > 0 && $length <= $max;
    }
    /** Each load profile is a joint envelope confirmed with its passenger count. */
    public static function validate( $m ): array {
        $errors = array();
        if ( ! self::object( $m, array( 'model_version', 'revision', 'approval', 'passenger_capacity', 'load_profiles', 'model_examples', 'service_level' ) ) ) return array( 'valid' => false, 'errors' => array( 'model' ) );
        if ( ! self::integer( $m['model_version'], 1, 1 ) ) $errors[] = 'model_version';
        if ( ! self::integer( $m['revision'], 1, 9007199254740991 ) ) $errors[] = 'revision';
        if ( ! self::object( $m['approval'], array( 'status', 'source_ref' ) ) || ! in_array( $m['approval']['status'], array( 'draft', 'confirmed', 'rejected' ), true ) || ( null !== $m['approval']['source_ref'] && ! self::text( $m['approval']['source_ref'], 500 ) ) || ( 'confirmed' === $m['approval']['status'] && null === $m['approval']['source_ref'] ) ) $errors[] = 'approval';
        if ( null !== $m['passenger_capacity'] && ! self::integer( $m['passenger_capacity'], 1 ) ) $errors[] = 'passenger_capacity';
        if ( ! is_array( $m['load_profiles'] ) || ! array_is_list( $m['load_profiles'] ) || count( $m['load_profiles'] ) > 30 ) $errors[] = 'load_profiles';
        else {
            $seen = array();
            foreach ( $m['load_profiles'] as $i => $p ) {
                $valid = self::object( $p, array( 'passengers', 'cabin_bags', 'checked_bags', 'cabin_max_cm', 'checked_max_cm', 'total_luggage_kg' ) );
                if ( $valid ) $valid = self::integer( $p['passengers'], 1 ) && self::integer( $m['passenger_capacity'], 1 ) && $p['passengers'] <= $m['passenger_capacity'] && self::integer( $p['cabin_bags'], 0 ) && self::integer( $p['checked_bags'], 0 );
                if ( $valid ) $valid = ( 0 == $p['cabin_bags'] ? null === $p['cabin_max_cm'] : self::dimensions( $p['cabin_max_cm'] ) ) && ( 0 == $p['checked_bags'] ? null === $p['checked_max_cm'] : self::dimensions( $p['checked_max_cm'] ) );
                if ( $valid ) $valid = 0 == $p['cabin_bags'] && 0 == $p['checked_bags'] ? null === $p['total_luggage_kg'] : self::integer( $p['total_luggage_kg'], 1, 5000 );
                $key = is_array( $p ) ? json_encode( array_map( static fn( $k ) => $p[ $k ] ?? null, array( 'passengers', 'cabin_bags', 'checked_bags', 'cabin_max_cm', 'checked_max_cm', 'total_luggage_kg' ) ) ) : json_encode( $p );
                if ( ! $valid || isset( $seen[ $key ] ) ) $errors[] = 'load_profiles.' . $i;
                $seen[ $key ] = true;
            }
        }
        if ( null !== $m['model_examples'] ) {
            if ( ! is_array( $m['model_examples'] ) || ! array_is_list( $m['model_examples'] ) || count( $m['model_examples'] ) < 1 || count( $m['model_examples'] ) > 10 || array_filter( $m['model_examples'], static fn( $v ) => ! self::text( $v, 120 ) ) || count( array_unique( $m['model_examples'], SORT_REGULAR ) ) !== count( $m['model_examples'] ) ) $errors[] = 'model_examples';
        }
        if ( null !== $m['service_level'] && ! in_array( $m['service_level'], array( 'standard', 'business', 'premium' ), true ) ) $errors[] = 'service_level';
        if ( $errors ) return array( 'valid' => false, 'errors' => $errors );
        return array( 'valid' => true, 'model' => self::canonical( $m ) );
    }
    private static function canonical( array $m ): array {
        foreach ( $m as $k => $v ) {
            if ( is_array( $v ) ) $m[ $k ] = self::canonical( $v );
            elseif ( is_float( $v ) && self::integer( $v, 0, 9007199254740991 ) ) $m[ $k ] = (int) $v;
        }
        return $m;
    }
    private static function stored( int $id ): ?array {
        $raw = get_post_meta( $id, self::META_KEY, true );
        $record = is_string( $raw ) ? json_decode( $raw, true ) : null;
        return is_array( $record ) ? $record : null;
    }
    private static function response( array $data ) {
        $r = new WP_REST_Response( $data, 200 ); $r->header( 'Cache-Control', 'private, no-store' ); return $r;
    }
    public static function read( $request ) {
        if ( ! self::can_edit( $request ) ) return new WP_Error( 'forbidden', 'Không có quyền sửa xe này.', array( 'status' => 403 ) );
        return self::response( array( 'vehicle_id' => (int) $request['id'], 'record' => self::stored( (int) $request['id'] ) ) );
    }
    public static function save( $request ) {
        if ( ! self::can_edit( $request ) ) return new WP_Error( 'forbidden', 'Không có quyền sửa xe này.', array( 'status' => 403 ) );
        $id = (int) $request['id']; $body = $request->get_json_params();
        if ( ! self::object( $body, array( 'expected_revision', 'model' ) ) || ! self::integer( $body['expected_revision'], 0, 9007199254740991 ) ) return new WP_Error( 'invalid_vehicle_facts', 'Cần model và expected_revision hợp lệ.', array( 'status' => 400 ) );
        $result = self::validate( $body['model'] );
        if ( ! $result['valid'] ) return new WP_Error( 'invalid_vehicle_facts', 'Thông tin xe không hợp lệ.', array( 'status' => 400, 'errors' => $result['errors'] ) );
        $model = $result['model'];
        // Every write after confirmation requires Operations authority, including withdrawal.
        $lock = 'gocar_vehicle_facts_lock_' . $id;
        if ( ! add_option( $lock, time(), '', false ) ) return new WP_Error( 'vehicle_facts_busy', 'Thông tin xe đang được lưu.', array( 'status' => 409 ) );
        try {
            $current = self::stored( $id );
            if ( ( 'confirmed' === $model['approval']['status'] || 'confirmed' === ( $current['model']['approval']['status'] ?? null ) ) && ! current_user_can( 'manage_options' ) ) return new WP_Error( 'approval_forbidden', 'Xác nhận hoặc thay đổi thông tin đã duyệt cần quyền quản trị của Vận hành.', array( 'status' => 403 ) );
            $revision = $current['model']['revision'] ?? 0;
            if ( (int) $body['expected_revision'] !== $revision || $model['revision'] !== $revision + 1 ) return new WP_Error( 'revision_conflict', 'Thông tin đã đổi; đọc lại và duyệt phiên bản mới.', array( 'status' => 409, 'current_revision' => $revision ) );
            $record = array( 'vehicle_id' => $id, 'model' => $model, 'actor_id' => get_current_user_id(), 'reviewed_at' => gmdate( 'Y-m-d\TH:i:s\Z' ) );
            self::$writing = true;
            $audit = array( 'attempted_at' => $record['reviewed_at'], 'actor_id' => $record['actor_id'], 'previous' => $current, 'submitted' => $record );
            if ( ! add_post_meta( $id, self::HISTORY_KEY, wp_slash( wp_json_encode( $audit ) ) ) ) return new WP_Error( 'audit_failed', 'Không lưu được nhật ký; thông tin xe chưa thay đổi.', array( 'status' => 500 ) );
            if ( ! update_post_meta( $id, self::META_KEY, wp_slash( wp_json_encode( $record ) ) ) ) return new WP_Error( 'save_failed', 'Không lưu được thông tin xe.', array( 'status' => 500 ) );
            return self::response( array( 'vehicle_id' => $id, 'record' => $record ) );
        } finally { self::$writing = false; delete_option( $lock ); }
    }
    public static function public_facts( int $id ): ?array {
        if ( 'vehicle' !== get_post_type( $id ) || 'publish' !== get_post_status( $id ) ) return null;
        $record = self::stored( $id );
        if ( ! $record || ( $record['vehicle_id'] ?? null ) !== $id || ! self::integer( $record['actor_id'] ?? null, 1, 9007199254740991 ) || ! is_string( $record['reviewed_at'] ?? null ) ) return null;
        $date = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $record['reviewed_at'], new DateTimeZone( 'UTC' ) );
        if ( ! $date || $date->format( 'Y-m-d\TH:i:s\Z' ) !== $record['reviewed_at'] || $date->getTimestamp() > time() ) return null;
        $result = self::validate( $record['model'] ?? null );
        if ( ! $result['valid'] || 'confirmed' !== $result['model']['approval']['status'] ) return null;
        $model = $result['model']; unset( $model['approval'] );
        return array_merge( $model, array( 'vehicle_id' => $id, 'status' => 'confirmed', 'reviewed_at' => $record['reviewed_at'] ) );
    }
}
Gocar_Vehicle_Facts::boot();
