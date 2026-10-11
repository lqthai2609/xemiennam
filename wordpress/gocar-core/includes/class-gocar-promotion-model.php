<?php
/** Day 42: private, versioned promotion data. No price calculation or public activation. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Gocar_Promotion_Model {
    public const META_KEY = '_gocar_promotion_model_v1';
    private const HISTORY_KEY = '_gocar_promotion_model_history_v1';
    public const MODEL_VERSION = 1;
    public const COMMERCIAL_ENABLED = false;
    private const MAX_INTEGER = 9007199254740991;
    private static bool $writing = false;

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_meta' ), 21 );
        add_action( 'rest_api_init', array( self::class, 'register_routes' ) );
        foreach ( array( 'add', 'update', 'delete' ) as $action ) {
            add_filter( $action . '_post_metadata', array( self::class, 'guard_meta' ), 10, 5 );
        }
    }

    public static function register_meta(): void {
        // #11/#12 keep their CPT and six legacy fields. Only this new private key is owned here.
        register_post_meta( 'promotion', self::META_KEY, array(
            'single' => true, 'type' => 'string', 'default' => '', 'show_in_rest' => false,
            'auth_callback' => static fn() => false,
        ) );
        register_post_meta( 'promotion', self::HISTORY_KEY, array(
            'single' => false, 'type' => 'string', 'show_in_rest' => false,
            'auth_callback' => static fn() => false,
        ) );
    }

    public static function guard_meta( $check, $post_id, $key, $value = null, $extra = null ) {
        unset( $post_id, $value, $extra );
        if ( in_array( $key, array( self::META_KEY, self::HISTORY_KEY ), true ) && ! self::$writing ) return false;
        return $check;
    }

    public static function register_routes(): void {
        register_rest_route( 'gocar/v1', '/admin/promotions/(?P<id>\d+)/model', array(
            array( 'methods' => 'GET', 'callback' => array( self::class, 'read' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
            array( 'methods' => 'PUT', 'callback' => array( self::class, 'save' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
        ) );
    }

    public static function can_edit( $request ): bool {
        $id = (int) $request['id'];
        return $id > 0 && 'promotion' === get_post_type( $id ) && ! in_array( get_post_status( $id ), array( 'trash', 'auto-draft' ), true ) && current_user_can( 'edit_post', $id );
    }

    private static function stored( int $id ): ?array {
        $raw = get_post_meta( $id, self::META_KEY, true );
        $model = is_string( $raw ) && '' !== $raw ? json_decode( $raw, true ) : null;
        return is_array( $model ) ? $model : null;
    }

    public static function read( $request ) {
        if ( ! self::can_edit( $request ) ) return new WP_Error( 'forbidden', 'Không có quyền sửa chương trình này.', array( 'status' => 403 ) );
        $id = (int) $request['id'];
        return self::response( array( 'promotion_id' => $id, 'model' => self::stored( $id ),
            'commercial_enabled' => self::COMMERCIAL_ENABLED, 'legacy_status' => 'unapproved' ) );
    }

    private static function response( array $data ) {
        $response = new WP_REST_Response( $data, 200 );
        $response->header( 'Cache-Control', 'private, no-store' );
        return $response;
    }

    public static function save( $request ) {
        if ( ! self::can_edit( $request ) ) return new WP_Error( 'forbidden', 'Không có quyền sửa chương trình này.', array( 'status' => 403 ) );
        $id = (int) $request['id'];
        $body = $request->get_json_params();
        if ( ! is_array( $body ) || array_diff( array_keys( $body ), array( 'expected_revision', 'model' ) ) || ! self::integer( $body['expected_revision'] ?? null, 0 ) ) {
            return new WP_Error( 'invalid_promotion', 'Yêu cầu cần model và expected_revision nguyên không âm.', array( 'status' => 400 ) );
        }
        $result = self::validate( $body['model'] ?? null );
        if ( ! $result['valid'] ) return new WP_Error( 'invalid_promotion', 'Dữ liệu khuyến mãi không hợp lệ.', array( 'status' => 400, 'errors' => $result['errors'] ) );
        $model = $result['model'];
        $body['expected_revision'] = (int) $body['expected_revision'];
        if ( ( 'approved' === $model['approval']['status'] || isset( $model['activation'] ) ) && ! current_user_can( 'manage_options' ) ) {
            return new WP_Error( 'approval_forbidden', 'Phê duyệt chương trình hoặc danh sách cho phép cần quyền quản trị.', array( 'status' => 403 ) );
        }
        // Serialize edits of one ID. Never evict a lock automatically while another writer may run.
        $lock = 'gocar_promotion_model_lock_' . $id;
        if ( ! add_option( $lock, time(), '', false ) ) return new WP_Error( 'promotion_busy', 'Chương trình đang được lưu; đọc lại trước khi thử lại.', array( 'status' => 409 ) );
        try {
            $current = self::stored( $id );
            $revision = $current['revision'] ?? 0;
            if ( $body['expected_revision'] !== $revision || $model['revision'] !== $revision + 1 ) {
                return new WP_Error( 'revision_conflict', 'Phiên bản đã đổi; đọc lại chương trình rồi duyệt đúng bản mới.', array( 'status' => 409, 'current_revision' => $revision ) );
            }
            $fresh = self::validate( $model );
            if ( ! $fresh['valid'] ) return new WP_Error( 'invalid_promotion', 'Tham chiếu đã thay đổi; chương trình chưa được lưu.', array( 'status' => 400, 'errors' => $fresh['errors'] ) );
            if ( 'approved' === $model['approval']['status'] && strtotime( $model['approval']['approved_at'] ) > time() ) {
                return new WP_Error( 'invalid_approval_time', 'Thời điểm phê duyệt không được ở tương lai.', array( 'status' => 400 ) );
            }
            if ( isset( $model['activation'] ) && strtotime( $model['activation']['approved_at'] ) > time() ) {
                return new WP_Error( 'invalid_approval_time', 'Thời điểm duyệt danh sách không được ở tương lai.', array( 'status' => 400 ) );
            }
            // Reusing an old approval after any policy edit is prohibited.
            if ( $current && 'approved' === $model['approval']['status'] && ( $current['approval']['approved_at'] ?? null ) === $model['approval']['approved_at'] ) {
                return new WP_Error( 'reapproval_required', 'Phiên bản mới cần phê duyệt mới hoặc trở về draft với enabled=false.', array( 'status' => 400 ) );
            }
            $record = wp_json_encode( $model, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
            self::$writing = true;
            // Journal before the write. A failed write may leave an attempt, never a fake successful revision.
            $audit = array( 'actor_id' => get_current_user_id(), 'saved_at_utc' => gmdate( 'c' ), 'previous' => $current,
                'previous_raw' => get_post_meta( $id, self::META_KEY, true ), 'submitted' => $model );
            if ( ! add_post_meta( $id, self::HISTORY_KEY, wp_slash( wp_json_encode( $audit ) ) ) ) return new WP_Error( 'audit_failed', 'Không lưu được nhật ký; chương trình chưa thay đổi.', array( 'status' => 500 ) );
            if ( ! update_post_meta( $id, self::META_KEY, wp_slash( $record ) ) ) return new WP_Error( 'save_failed', 'Không lưu được chương trình.', array( 'status' => 500 ) );
            return self::response( array( 'promotion_id' => $id, 'model' => $model, 'commercial_enabled' => self::COMMERCIAL_ENABLED ) );
        } finally {
            self::$writing = false;
            delete_option( $lock );
        }
    }

    private static function integer( $value, int $min = 1, int $max = self::MAX_INTEGER ): bool {
        return ( is_int( $value ) || is_float( $value ) ) && is_finite( (float) $value ) && floor( (float) $value ) === (float) $value && $value >= $min && $value <= $max;
    }

    public static function valid_date( $value ): bool {
        if ( ! is_string( $value ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/D', $value ) || $value < '0001-01-01' ) return false;
        $date = DateTimeImmutable::createFromFormat( '!Y-m-d', $value, new DateTimeZone( 'Asia/Ho_Chi_Minh' ) );
        return $date && $date->format( 'Y-m-d' ) === $value;
    }

    private static function valid_timestamp( $value ): bool {
        if ( ! is_string( $value ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/D', $value ) || ! self::valid_date( substr( $value, 0, 10 ) ) ) return false;
        $date = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:sP', $value );
        $errors = DateTimeImmutable::getLastErrors();
        return $date && ( false === $errors || ( 0 === $errors['warning_count'] && 0 === $errors['error_count'] ) );
    }

    public static function parse_percent( $value ): ?int {
        if ( ! is_string( $value ) || ! preg_match( '/^\d{1,2}(\.\d{1,2})?$/D', $value ) ) return null;
        $parts = explode( '.', $value );
        $bps = (int) $parts[0] * 100 + (int) str_pad( $parts[1] ?? '', 2, '0' );
        return $bps > 0 && $bps < 10000 ? $bps : null;
    }

    public static function window( array $window ): array {
        if ( 'Asia/Ho_Chi_Minh' !== ( $window['timezone'] ?? null ) || ! self::valid_date( $window['start_date'] ?? null ) || ! self::valid_date( $window['end_date'] ?? null ) || $window['end_date'] < $window['start_date'] || '9999-12-31' === $window['end_date'] ) throw new InvalidArgumentException( 'invalid_promotion_window' );
        $tz = new DateTimeZone( 'Asia/Ho_Chi_Minh' );
        return array( 'startAt' => ( new DateTimeImmutable( $window['start_date'], $tz ) )->getTimestamp() * 1000,
            'endExclusive' => ( new DateTimeImmutable( $window['end_date'], $tz ) )->modify( '+1 day' )->getTimestamp() * 1000 );
    }

    private static function error( array &$errors, string $field, string $code = 'invalid_config', string $message = 'Dữ liệu không hợp lệ.' ): void {
        $errors[] = compact( 'field', 'code', 'message' );
    }

    private static function object( $value, array $required, array $optional = array() ): bool {
        return is_array( $value ) && ! array_diff( $required, array_keys( $value ) ) && ! array_diff( array_keys( $value ), array_merge( $required, $optional ) );
    }

    private static function text( $value ): bool {
        return is_string( $value ) && '' !== trim( $value ) && strlen( $value ) <= 500 && ! preg_match( '/[<>]/', $value );
    }

    private static function tuple( $value, bool $activation = false ): bool {
        $fields = array( 'route_id', 'direction', 'vehicle_id', 'package_key' );
        if ( $activation ) $fields[] = 'readiness_version';
        return self::object( $value, $fields ) && self::integer( $value['route_id'] ) && self::integer( $value['vehicle_id'] )
            && in_array( $value['direction'], array( 'outbound', 'inbound' ), true ) && is_string( $value['package_key'] ) && preg_match( '/^[a-z0-9_-]{1,80}$/D', $value['package_key'] )
            && ( ! $activation || self::integer( $value['readiness_version'] ) );
    }

    private static function tuple_key( array $tuple ): string {
        return $tuple['route_id'] . ':' . $tuple['direction'] . ':' . $tuple['vehicle_id'] . ':' . $tuple['package_key'];
    }

    private static function canonical_integers( array $value ): array {
        foreach ( $value as $key => $item ) {
            if ( is_array( $item ) ) $value[ $key ] = self::canonical_integers( $item );
            elseif ( is_float( $item ) && self::integer( $item, -self::MAX_INTEGER ) ) $value[ $key ] = (int) $item;
        }
        return $value;
    }

    /** Callback injection is for isolated fixtures; REST always reads authoritative WordPress. */
    public static function validate( $input, ?callable $reference = null ): array {
        $errors = array();
        if ( ! self::object( $input, array( 'model_version', 'revision', 'approval', 'discount', 'priority', 'scopes', 'scope_policy', 'window', 'conditions' ), array( 'enabled', 'activation' ) ) ) {
            return array( 'valid' => false, 'errors' => array( array( 'field' => '', 'code' => 'invalid_config', 'message' => 'Model thiếu trường hoặc có trường không hỗ trợ.' ) ) );
        }
        $m = $input;
        if ( ! array_key_exists( 'enabled', $m ) ) $m['enabled'] = false;
        foreach ( array( 'model_version', 'revision', 'priority' ) as $field ) {
            if ( ! self::integer( $m[ $field ], 'priority' === $field ? -self::MAX_INTEGER : 1 ) || ( 'model_version' === $field && self::MODEL_VERSION !== (int) $m[ $field ] ) ) self::error( $errors, $field );
            else $m[ $field ] = (int) $m[ $field ];
        }
        if ( ! is_bool( $m['enabled'] ) ) self::error( $errors, 'enabled' );
        $a = $m['approval'];
        if ( ! self::object( $a, array( 'status', 'owner', 'source_ref', 'approved_at' ) ) || ! in_array( $a['status'], array( 'draft', 'approved', 'rejected' ), true ) || ! self::text( $a['owner'] ) || ! self::text( $a['source_ref'] ) || ( null !== $a['approved_at'] && ! self::valid_timestamp( $a['approved_at'] ) ) ) self::error( $errors, 'approval' );
        else {
            if ( ( 'approved' === $a['status'] ) !== ( null !== $a['approved_at'] ) ) self::error( $errors, 'approval.approved_at', 'unapproved' );
            if ( true === $m['enabled'] && 'approved' !== $a['status'] ) self::error( $errors, 'enabled', 'unapproved' );
        }
        $d = $m['discount'];
        $kind = is_array( $d ) ? ( $d['kind'] ?? '' ) : '';
        $shape = array( 'fixed_discount' => array( 'amount_vnd' ), 'percent_discount' => array( 'rate_bps' ), 'special_price' => array( 'amount_vnd' ), 'benefit' => array( 'title', 'rule' ), 'free_surcharge' => array( 'rule_key', 'policy_version' ) );
        if ( ! is_string( $kind ) || ! isset( $shape[ $kind ] ) || ! self::object( $d, array_merge( array( 'kind', 'target' ), $shape[ $kind ] ), 'free_surcharge' === $kind ? array( 'cap_vnd' ) : array() ) ) self::error( $errors, 'discount' );
        else {
            $targets = in_array( $kind, array( 'fixed_discount', 'percent_discount' ), true ) ? array( 'base_price', 'estimated_total' ) : array( 'special_price' === $kind ? 'base_price' : ( 'benefit' === $kind ? 'none' : 'surcharge' ) );
            if ( ! in_array( $d['target'], $targets, true ) ) self::error( $errors, 'discount.target' );
            foreach ( array( 'amount_vnd', 'rate_bps', 'cap_vnd', 'policy_version' ) as $field ) if ( array_key_exists( $field, $d ) && ! self::integer( $d[ $field ], 1, 'rate_bps' === $field ? 9999 : self::MAX_INTEGER ) ) self::error( $errors, 'discount.' . $field );
            foreach ( array( 'title', 'rule' ) as $field ) if ( array_key_exists( $field, $d ) && ! self::text( $d[ $field ] ) ) self::error( $errors, 'discount.' . $field );
            if ( isset( $d['rule_key'] ) && ( ! is_string( $d['rule_key'] ) || ! preg_match( '/^[a-z0-9_-]{1,80}$/D', $d['rule_key'] ) ) ) self::error( $errors, 'discount.rule_key' );
        }
        $w = $m['window'];
        if ( ! self::object( $w, array( 'start_date', 'end_date', 'timezone' ) ) || ! self::valid_date( $w['start_date'] ) || ! self::valid_date( $w['end_date'] ) || 'Asia/Ho_Chi_Minh' !== $w['timezone'] ) self::error( $errors, 'window' );
        elseif ( $w['end_date'] < $w['start_date'] || '9999-12-31' === $w['end_date'] ) self::error( $errors, 'window.end_date' );
        if ( ! self::object( $m['scope_policy'], array( 'route', 'direction', 'vehicle', 'package' ) ) ) self::error( $errors, 'scope_policy' );
        else foreach ( $m['scope_policy'] as $field => $value ) if ( ! in_array( $value, array( 'selected', 'all' ), true ) ) self::error( $errors, 'scope_policy.' . $field );
        if ( ! is_array( $m['conditions'] ) || ! array_is_list( $m['conditions'] ) || count( $m['conditions'] ) > 20 ) self::error( $errors, 'conditions' );
        else foreach ( $m['conditions'] as $i => $c ) {
            $shape = array( 'departure_date_range' => array( 'start_date', 'end_date' ), 'departure_weekdays' => array( 'days' ), 'advance_booking_minutes' => array( 'minimum' ), 'min_eligible_amount' => array( 'amount_vnd' ) );
            $ck = is_array( $c ) ? ( $c['kind'] ?? '' ) : '';
            if ( ! is_string( $ck ) || ! isset( $shape[ $ck ] ) || ! self::object( $c, array_merge( array( 'kind' ), $shape[ $ck ] ) ) ) { self::error( $errors, 'conditions.' . $i ); continue; }
            if ( 'departure_date_range' === $ck && ( ! self::valid_date( $c['start_date'] ) || ! self::valid_date( $c['end_date'] ) || $c['end_date'] < $c['start_date'] ) ) self::error( $errors, 'conditions.' . $i );
            if ( 'advance_booking_minutes' === $ck && ! self::integer( $c['minimum'] ) ) self::error( $errors, 'conditions.' . $i . '.minimum' );
            if ( 'min_eligible_amount' === $ck && ! self::integer( $c['amount_vnd'] ) ) self::error( $errors, 'conditions.' . $i . '.amount_vnd' );
            if ( 'departure_weekdays' === $ck ) {
                $days = $c['days'];
                if ( ! is_array( $days ) || ! array_is_list( $days ) || ! count( $days ) || count( $days ) > 7 ) self::error( $errors, 'conditions.' . $i . '.days' );
                else {
                    foreach ( $days as $day ) if ( ! self::integer( $day, 0, 6 ) ) self::error( $errors, 'conditions.' . $i . '.days' );
                    if ( count( array_unique( $days, SORT_REGULAR ) ) !== count( $days ) ) self::error( $errors, 'conditions.' . $i . '.days' );
                }
            }
        }
        if ( ! is_array( $m['scopes'] ) || ! array_is_list( $m['scopes'] ) || ! count( $m['scopes'] ) || count( $m['scopes'] ) > 1000 ) self::error( $errors, 'scopes' );
        else foreach ( $m['scopes'] as $i => $scope ) if ( ! self::tuple( $scope ) ) self::error( $errors, 'scopes.' . $i );
        $activation = $m['activation'] ?? null;
        if ( array_key_exists( 'activation', $m ) ) {
            if ( ! self::object( $activation, array( 'owner', 'source_ref', 'approved_at', 'version', 'tuples' ) ) || ! self::text( $activation['owner'] ) || ! self::text( $activation['source_ref'] ) || ! self::valid_timestamp( $activation['approved_at'] ) || ! self::integer( $activation['version'] ) || ! is_array( $activation['tuples'] ) || ! array_is_list( $activation['tuples'] ) || ! count( $activation['tuples'] ) || count( $activation['tuples'] ) > 1000 ) self::error( $errors, 'activation' );
            else foreach ( $activation['tuples'] as $i => $scope ) if ( ! self::tuple( $scope, true ) ) self::error( $errors, 'activation.tuples.' . $i );
        }
        if ( $errors ) return array( 'valid' => false, 'errors' => $errors );
        $m = self::canonical_integers( $m );
        $activation = $m['activation'] ?? null;
        if ( ( $m['enabled'] || in_array( 'all', $m['scope_policy'], true ) ) && ! $activation ) self::error( $errors, 'activation', 'mapping_blocked' );
        $seen = array(); $whitelist = array();
        foreach ( $activation['tuples'] ?? array() as $i => $scope ) {
            $key = self::tuple_key( $scope );
            if ( isset( $whitelist[ $key ] ) ) self::error( $errors, 'activation.tuples.' . $i );
            $whitelist[ $key ] = $scope['readiness_version'];
        }
        foreach ( $m['scopes'] as $i => $scope ) {
            $key = self::tuple_key( $scope );
            if ( isset( $seen[ $key ] ) ) self::error( $errors, 'scopes.' . $i );
            $seen[ $key ] = true;
            $ref = $reference ? $reference( $scope, $m ) : self::reference( $scope, $m );
            if ( empty( $ref['exists'] ) ) self::error( $errors, 'scopes.' . $i, 'reference_missing' );
            if ( 'free_surcharge' === $kind && empty( $ref['surchargeExists'] ) ) self::error( $errors, 'scopes.' . $i, 'reference_missing' );
            if ( $activation && ( ! isset( $whitelist[ $key ] ) || $whitelist[ $key ] !== ( $ref['readinessVersion'] ?? null ) || empty( $ref['activationReady'] ) || ! empty( $ref['mappingBlocked'] ) || ! empty( $ref['prelaunch'] ) ) ) self::error( $errors, 'activation.tuples.' . $i, ! empty( $ref['prelaunch'] ) ? 'prelaunch_blocked' : 'mapping_blocked' );
        }
        foreach ( $whitelist as $key => $version ) if ( ! isset( $seen[ $key ] ) ) self::error( $errors, 'activation.tuples' );
        return $errors ? array( 'valid' => false, 'errors' => $errors ) : array( 'valid' => true, 'model' => $m );
    }

    private static function reference( array $scope, array $model ): array {
        $route = get_post( $scope['route_id'] ); $vehicle = get_post( $scope['vehicle_id'] );
        $ref = array( 'exists' => false, 'activationReady' => false, 'surchargeExists' => false );
        if ( ! $route || 'route' !== $route->post_type || in_array( $route->post_status, array( 'trash', 'auto-draft' ), true ) || ! $vehicle || 'vehicle' !== $vehicle->post_type || in_array( $vehicle->post_status, array( 'trash', 'auto-draft' ), true ) ) return $ref;
        $id = (int) $scope['route_id'];
        $rows = get_post_meta( $id, 'pricing_packages_v2', true );
        foreach ( is_array( $rows ) ? $rows : array() as $row ) {
            if ( is_array( $row ) && ( $row['direction'] ?? null ) === $scope['direction'] && (int) ( $row['vehicle_id'] ?? 0 ) === (int) $scope['vehicle_id'] && ( $row['package_key'] ?? null ) === $scope['package_key'] ) $ref['exists'] = true;
        }
        $ref['readinessVersion'] = (int) get_post_meta( $id, 'content_readiness_version', true );
        $ref['prelaunch'] = 'prelaunch' === get_post_meta( $id, 'content_service_state', true ) || in_array( 9102, array( (int) get_post_meta( $id, 'origin_location_id', true ), (int) get_post_meta( $id, 'destination_location_id', true ) ), true );
        $ref['mappingBlocked'] = 'clear' !== get_post_meta( $id, 'content_mapping_state', true );
        $direction_enabled = get_post_meta( $id, $scope['direction'] . '_enabled', true );
        $ref['activationReady'] = $ref['readinessVersion'] > 0 && 'live' === get_post_meta( $id, 'content_service_state', true ) && in_array( $direction_enabled, array( true, '1', 1 ), true ) && 'publish' === $route->post_status && 'publish' === $vehicle->post_status;
        if ( 'free_surcharge' === $model['discount']['kind'] ) {
            $discount = $model['discount'];
            $policy_version = (int) get_post_meta( $id, 'surcharge_policy_version', true );
            $rules = get_post_meta( $id, 'zone_surcharge_rules_v2', true );
            $matches = array();
            foreach ( is_array( $rules ) ? $rules : array() as $rule ) {
                if ( ! is_array( $rule ) || ( $rule['rule_key'] ?? null ) !== $discount['rule_key'] ) continue;
                if ( ! empty( $rule['direction'] ) && $rule['direction'] !== $scope['direction'] ) continue;
                if ( ! empty( $rule['vehicle_id'] ) && (int) $rule['vehicle_id'] !== $scope['vehicle_id'] ) continue;
                if ( ! empty( $rule['package_key'] ) && $rule['package_key'] !== $scope['package_key'] ) continue;
                $matches[] = $rule;
            }
            $ref['surchargeExists'] = $policy_version === $discount['policy_version'] && 1 === count( $matches ) && 'fixed' === ( $matches[0]['surcharge_mode'] ?? null ) && self::integer( $matches[0]['amount'] ?? null );
        }
        return $ref;
    }
}
Gocar_Promotion_Model::boot();
