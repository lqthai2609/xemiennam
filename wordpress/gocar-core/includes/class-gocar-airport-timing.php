<?php
/** Day 48: protected airport timing rules. No guessed buffers or commercial activation. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Gocar_Airport_Timing {
    public const META_KEY = '_gocar_airport_timing_v1';
    private const HISTORY_KEY = '_gocar_airport_timing_history_v1';
    private static bool $writing = false;

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_meta' ), 21 );
        add_action( 'rest_api_init', array( self::class, 'register_routes' ) );
        foreach ( array( 'add', 'update', 'delete' ) as $action ) add_filter( $action . '_post_metadata', array( self::class, 'guard_meta' ), 10, 5 );
    }
    public static function register_meta(): void {
        foreach ( array( self::META_KEY, self::HISTORY_KEY ) as $key ) register_post_meta( 'route', $key, array(
            'type' => 'string', 'single' => self::META_KEY === $key, 'show_in_rest' => false, 'auth_callback' => static fn() => false,
        ) );
    }
    public static function guard_meta( $check, $id, $key, $value = null, $extra = null ) {
        unset( $id, $value, $extra );
        return in_array( $key, array( self::META_KEY, self::HISTORY_KEY ), true ) && ! self::$writing ? false : $check;
    }
    public static function register_routes(): void {
        register_rest_route( 'gocar/v1', '/admin/routes/(?P<id>\d+)/airport-timing', array(
            array( 'methods' => 'GET', 'callback' => array( self::class, 'read' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
            array( 'methods' => 'PUT', 'callback' => array( self::class, 'save' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
        ) );
        register_rest_route( 'gocar/v1', '/routes/(?P<id>\d+)/airport-timing', array(
            'methods' => 'GET', 'callback' => static function ( $request ) {
                return self::response( self::public_rules( (int) $request['id'] ) );
            }, 'permission_callback' => '__return_true',
        ) );
    }

    public static function can_edit( $request ): bool {
        $id = (int) $request['id'];
        return $id > 0 && 'route' === get_post_type( $id ) && ! in_array( get_post_status( $id ), array( 'trash', 'auto-draft' ), true ) && current_user_can( 'edit_post', $id );
    }
    private static function object( $v, array $keys ): bool {
        return is_array( $v ) && ! array_diff( $keys, array_keys( $v ) ) && ! array_diff( array_keys( $v ), $keys );
    }
    private static function integer( $v, int $min, int $max = 100 ): bool {
        return ( is_int( $v ) || is_float( $v ) ) && is_finite( (float) $v ) && floor( (float) $v ) === (float) $v && $v >= $min && $v <= $max;
    }
    private static function text( $v, int $max ): bool {
        if ( ! is_string( $v ) || '' === $v || trim( $v ) !== $v || preg_match( '/[<>\x00-\x1f]/', $v ) ) return false;
        $length = preg_match_all( '/./us', $v );
        return false !== $length && $length > 0 && $length <= $max;
    }
    private static function instant( $value ): ?int {
        if ( ! is_string( $value ) ) return null;
        $date = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $value, new DateTimeZone( 'UTC' ) );
        return $date && $date->format( 'Y-m-d\TH:i:s\Z' ) === $value ? $date->getTimestamp() : null;
    }
    public static function validate( $m ): array {
        $errors = array();
        if ( ! self::object( $m, array( 'model_version', 'revision', 'approval', 'rules' ) ) ) return array( 'valid' => false, 'errors' => array( 'model' ) );
        if ( ! self::integer( $m['model_version'], 1, 1 ) ) $errors[] = 'model_version';
        if ( ! self::integer( $m['revision'], 1, 9007199254740991 ) ) $errors[] = 'revision';
        if ( ! self::object( $m['approval'], array( 'status', 'source_ref' ) ) || ! in_array( $m['approval']['status'], array( 'draft', 'confirmed', 'rejected' ), true ) || ( null !== $m['approval']['source_ref'] && ! self::text( $m['approval']['source_ref'], 500 ) ) || ( 'confirmed' === $m['approval']['status'] && null === $m['approval']['source_ref'] ) ) $errors[] = 'approval';
        if ( ! is_array( $m['rules'] ) || ! array_is_list( $m['rules'] ) || count( $m['rules'] ) > 40 || ( 'confirmed' === ( $m['approval']['status'] ?? null ) && ! count( $m['rules'] ) ) ) $errors[] = 'rules';
        else {
            $seen = array();
            foreach ( $m['rules'] as $i => $r ) {
                $ok = self::object( $r, array( 'direction', 'airport_id', 'counterpart_id', 'readiness_version', 'movement', 'flight_kind', 'terminal', 'buffer_minutes', 'travel_minutes', 'valid_from', 'valid_until' ) );
                if ( $ok ) $ok = in_array( $r['direction'], array( 'outbound', 'inbound' ), true ) && self::integer( $r['airport_id'], 1, 9007199254740991 ) && self::integer( $r['counterpart_id'], 1, 9007199254740991 ) && self::integer( $r['readiness_version'], 1, 9007199254740991 ) && in_array( $r['movement'], array( 'arrival', 'departure' ), true ) && in_array( $r['flight_kind'], array( 'domestic', 'international' ), true ) && self::text( $r['terminal'], 80 ) && self::integer( $r['buffer_minutes'], 0, 1440 );
                if ( $ok ) $ok = 'arrival' === $r['movement'] ? null === $r['travel_minutes'] : self::integer( $r['travel_minutes'], 1, 1440 );
                if ( $ok ) $ok = null !== self::instant( $r['valid_from'] ) && null !== self::instant( $r['valid_until'] ) && self::instant( $r['valid_until'] ) > self::instant( $r['valid_from'] );
                $key = is_array( $r ) ? json_encode( array_map( static fn( $k ) => $r[ $k ] ?? null, array( 'direction', 'airport_id', 'movement', 'flight_kind', 'terminal' ) ) ) : '';
                if ( ! $ok || isset( $seen[ $key ] ) ) $errors[] = 'rules.' . $i;
                $seen[ $key ] = true;
            }
        }
        return $errors ? array( 'valid' => false, 'errors' => $errors ) : array( 'valid' => true, 'model' => self::canonical( $m ) );
    }
    /** Exact published route, direction and airport; never reverse-clone a duration. */
    private static function references_valid( int $id, array $r, bool $activation ): bool {
        $from = (int) get_post_meta( $id, 'origin_location_id', true );
        $to = (int) get_post_meta( $id, 'destination_location_id', true );
        if ( 'inbound' === $r['direction'] ) { $old = $from; $from = $to; $to = $old; }
        $airport = 'arrival' === $r['movement'] ? $from : $to;
        $other = 'arrival' === $r['movement'] ? $to : $from;
        if ( $airport !== $r['airport_id'] || $other !== $r['counterpart_id'] || $from === $to || 'location' !== get_post_type( $airport ) || 'airport' !== get_post_meta( $airport, 'location_type', true ) || 'location' !== get_post_type( $other ) || 'airport' === get_post_meta( $other, 'location_type', true ) ) return false;
        if ( ! $activation ) return true;
        $post = get_post( $airport );
        return 9102 !== $airport && $post && 'san-bay-long-thanh' !== $post->post_name
            && 'publish' === get_post_status( $id ) && 'publish' === get_post_status( $airport ) && 'publish' === get_post_status( $other )
            && in_array( get_post_meta( $id, $r['direction'] . '_enabled', true ), array( true, 1, '1' ), true )
            && 'live' === get_post_meta( $id, 'content_service_state', true ) && 'clear' === get_post_meta( $id, 'content_mapping_state', true )
            && $r['readiness_version'] === (int) get_post_meta( $id, 'content_readiness_version', true );
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
        if ( ! self::can_edit( $request ) ) return new WP_Error( 'forbidden', 'Không có quyền sửa tuyến này.', array( 'status' => 403 ) );
        return self::response( array( 'route_id' => (int) $request['id'], 'record' => self::stored( (int) $request['id'] ) ) );
    }
    public static function save( $request ) {
        if ( ! self::can_edit( $request ) ) return new WP_Error( 'forbidden', 'Không có quyền sửa tuyến này.', array( 'status' => 403 ) );
        $id = (int) $request['id']; $body = $request->get_json_params();
        if ( ! self::object( $body, array( 'expected_revision', 'model' ) ) || ! self::integer( $body['expected_revision'], 0, 9007199254740991 ) ) return new WP_Error( 'invalid_airport_timing', 'Cần model và expected_revision hợp lệ.', array( 'status' => 400 ) );
        $result = self::validate( $body['model'] );
        if ( ! $result['valid'] ) return new WP_Error( 'invalid_airport_timing', 'Cấu hình giờ đón không hợp lệ.', array( 'status' => 400, 'errors' => $result['errors'] ) );
        $model = $result['model'];
        foreach ( $model['rules'] as $rule ) if ( ! self::references_valid( $id, $rule, 'confirmed' === $model['approval']['status'] ) ) return new WP_Error( 'invalid_timing_scope', 'Tuyến, chiều, sân bay hoặc trạng thái chưa đủ điều kiện xác nhận.', array( 'status' => 400 ) );
        // Every write after confirmation requires Operations authority, including withdrawal.
        $lock = 'gocar_airport_timing_lock_' . $id;
        if ( ! add_option( $lock, time(), '', false ) ) return new WP_Error( 'airport_timing_busy', 'Cấu hình giờ đón đang được lưu.', array( 'status' => 409 ) );
        try {
            $current = self::stored( $id );
            if ( ( 'confirmed' === $model['approval']['status'] || 'confirmed' === ( $current['model']['approval']['status'] ?? null ) ) && ! current_user_can( 'manage_options' ) ) return new WP_Error( 'approval_forbidden', 'Xác nhận hoặc thay đổi thông tin đã duyệt cần quyền quản trị của Vận hành.', array( 'status' => 403 ) );
            $revision = $current['model']['revision'] ?? 0;
            if ( (int) $body['expected_revision'] !== $revision || $model['revision'] !== $revision + 1 ) return new WP_Error( 'revision_conflict', 'Cấu hình đã đổi; đọc lại và duyệt phiên bản mới.', array( 'status' => 409, 'current_revision' => $revision ) );
            $record = array( 'route_id' => $id, 'model' => $model, 'actor_id' => get_current_user_id(), 'reviewed_at' => gmdate( 'Y-m-d\TH:i:s\Z' ) );
            self::$writing = true;
            $audit = array( 'attempted_at' => $record['reviewed_at'], 'actor_id' => $record['actor_id'], 'previous' => $current, 'submitted' => $record );
            if ( ! add_post_meta( $id, self::HISTORY_KEY, wp_slash( wp_json_encode( $audit ) ) ) ) return new WP_Error( 'audit_failed', 'Không lưu được nhật ký; cấu hình giờ đón chưa thay đổi.', array( 'status' => 500 ) );
            if ( ! update_post_meta( $id, self::META_KEY, wp_slash( wp_json_encode( $record ) ) ) ) return new WP_Error( 'save_failed', 'Không lưu được cấu hình giờ đón.', array( 'status' => 500 ) );
            return self::response( array( 'route_id' => $id, 'record' => $record ) );
        } finally { self::$writing = false; delete_option( $lock ); }
    }
    public static function public_rules( int $id ): array {
        $empty = array( 'model_version' => 1, 'route_id' => $id, 'revision' => null, 'rules' => array() );
        if ( 'route' !== get_post_type( $id ) || 'publish' !== get_post_status( $id ) ) return $empty;
        $record = self::stored( $id );
        if ( ! $record || ( $record['route_id'] ?? null ) !== $id || ! self::integer( $record['actor_id'] ?? null, 1, 9007199254740991 ) || null === self::instant( $record['reviewed_at'] ?? null ) || self::instant( $record['reviewed_at'] ) > time() ) return $empty;
        $result = self::validate( $record['model'] ?? null );
        if ( ! $result['valid'] || 'confirmed' !== $result['model']['approval']['status'] ) return $empty;
        $model = $result['model'];
        $rules = array_values( array_filter( $model['rules'], static fn( $r ) => self::references_valid( $id, $r, true ) && time() >= self::instant( $r['valid_from'] ) && time() < self::instant( $r['valid_until'] ) ) );
        return array( 'model_version' => 1, 'route_id' => $id, 'revision' => $model['revision'], 'rules' => $rules );
    }
}
Gocar_Airport_Timing::boot();
