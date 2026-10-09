<?php
/** Day 51: authenticated manual dispatch. No booking, email, pricing writes or public inventory. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Gocar_Empty_Leg_Admin {
    public static function boot(): void { add_action( 'rest_api_init', array( self::class, 'register_routes' ) ); }
    public static function can_edit(): bool { return current_user_can( 'edit_posts' ); }
    private static function error( string $code, string $message, int $status, array $details = array() ) {
        return new WP_Error( $code, $message, array_merge( array( 'status' => $status ), $details ) );
    }
    private static function private_response( array $data ) {
        $response = rest_ensure_response( $data );
        if ( is_object( $response ) && method_exists( $response, 'header' ) ) {
            $response->header( 'Cache-Control', 'private, no-store' );
            $response->header( 'X-Robots-Tag', 'noindex, nofollow' );
        }
        return $response;
    }
    public static function register_routes(): void {
        register_rest_route( 'gocar/v1', '/admin/empty-legs/options', array( 'methods' => 'GET', 'callback' => array( self::class, 'options' ), 'permission_callback' => array( self::class, 'can_edit' ) ) );
        register_rest_route( 'gocar/v1', '/admin/empty-legs', array(
            array( 'methods' => 'GET', 'callback' => array( self::class, 'listing' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
            array( 'methods' => 'POST', 'callback' => array( self::class, 'save' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
        ) );
        register_rest_route( 'gocar/v1', '/admin/empty-legs/(?P<id>[1-9]\d*)', array(
            array( 'methods' => 'GET', 'callback' => array( self::class, 'read' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
            array( 'methods' => 'POST', 'callback' => array( self::class, 'save' ), 'permission_callback' => array( self::class, 'can_edit' ) ),
        ) );
    }
    public static function options() {
        if ( ! self::can_edit() ) return self::error( 'forbidden', 'Không có quyền điều phối.', 403 );
        $options = array(); $seen = array();
        foreach ( get_posts( array( 'post_type' => 'route', 'post_status' => array( 'publish', 'draft', 'pending', 'private' ), 'posts_per_page' => 500 ) ) as $post ) {
            $id = (int) $post->ID;
            $rows = get_post_meta( $id, 'pricing_packages_v2', true );
            foreach ( is_array( $rows ) ? $rows : array() as $row ) {
                if ( ! is_array( $row ) || 'one_way' !== ( $row['package_key'] ?? null ) || ! in_array( $row['direction'] ?? null, array( 'outbound', 'inbound' ), true ) ) continue;
                $s = array( 'route_id' => $id, 'direction' => $row['direction'], 'vehicle_id' => (int) ( $row['vehicle_id'] ?? 0 ), 'package_key' => 'one_way' );
                $ref = Gocar_Empty_Leg::reference( $s );
                $key = $id . ':' . $s['direction'] . ':' . $s['vehicle_id'];
                if ( ! $ref['exists'] || isset( $seen[$key] ) || $ref['readinessVersion'] < 1 ) continue;
                $seen[$key] = true;
                $s['origin_location_id'] = $ref['originLocationId']; $s['destination_location_id'] = $ref['destinationLocationId']; $s['readiness_version'] = $ref['readinessVersion'];
                $options[] = array( 'key' => $key, 'scope' => $s, 'reference' => $ref, 'label' => get_the_title( $s['origin_location_id'] ) . ' đến ' . get_the_title( $s['destination_location_id'] ) . ' · ' . get_the_title( $s['vehicle_id'] ) );
            }
        }
        return self::private_response( array( 'options' => $options ) );
    }
    private static function accessible( $post ): bool {
        return $post && Gocar_Empty_Leg::POST_TYPE === $post->post_type && 'private' === $post->post_status &&
            ( current_user_can( 'publish_posts' ) || (int) $post->post_author === get_current_user_id() );
    }
    /** One SQL snapshot, avoiding stale persistent object caches between dispatch workers. */
    private static function stored( int $id ): ?array {
        global $wpdb;
        $rows = $wpdb->get_results( $wpdb->prepare( "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key IN (%s, %s) ORDER BY meta_id ASC", $id, Gocar_Empty_Leg::META_KEY, Gocar_Empty_Leg::HISTORY_KEY ) );
        if ( ! is_array( $rows ) ) return null;
        $model = null; $history = array();
        foreach ( $rows as $r ) {
            $value = json_decode( $r->meta_value, true );
            if ( ! is_array( $value ) ) return null;
            if ( Gocar_Empty_Leg::META_KEY === $r->meta_key ) { if ( null !== $model ) return null; $model = $value; }
            else $history[] = $value;
        }
        $last = $history ? $history[ count( $history ) - 1 ] : null;
        if ( ! $model || ! $last || ( $last['after'] ?? null ) !== $model || ( $model['revision'] ?? 0 ) !== count( $history ) ) return null;
        return array( 'model' => $model, 'confirmation' => $last['confirmation'], 'history' => $history );
    }
    private static function response( int $id, array $stored ) {
        return self::private_response( array_merge( array( 'id' => $id, 'assessment' => Gocar_Empty_Leg::assess( $stored['model'] ) ), $stored ) );
    }
    public static function read( $request ) {
        if ( ! self::can_edit() ) return self::error( 'forbidden', 'Không có quyền điều phối.', 403 );
        $id = (int) $request['id'];
        if ( ! self::accessible( get_post( $id ) ) ) return self::error( 'not_found', 'Không tìm thấy chuyến trong phạm vi được phép.', 404 );
        $stored = self::stored( $id );
        return $stored ? self::response( $id, $stored ) : self::error( 'storage_invalid', 'Lịch sử chuyến không hợp lệ. Cần kiểm tra dữ liệu.', 409 );
    }
    public static function listing() {
        if ( ! self::can_edit() ) return self::error( 'forbidden', 'Không có quyền điều phối.', 403 );
        $args = array( 'post_type' => Gocar_Empty_Leg::POST_TYPE, 'post_status' => 'private', 'posts_per_page' => 50, 'orderby' => 'ID', 'order' => 'DESC' );
        if ( ! current_user_can( 'publish_posts' ) ) $args['author'] = get_current_user_id();
        $items = array();
        foreach ( get_posts( $args ) as $post ) {
            if ( ! self::accessible( $post ) ) continue;
            $stored = self::stored( (int) $post->ID );
            if ( $stored ) $items[] = array( 'id' => (int) $post->ID, 'model' => $stored['model'], 'assessment' => Gocar_Empty_Leg::assess( $stored['model'] ) );
        }
        return self::private_response( array( 'items' => $items, 'limit' => 50 ) );
    }
    private static function safe_text( $text ): bool {
        if ( ! is_string( $text ) || trim( $text ) !== $text || '' === $text || preg_match( '/[<>\x00-\x1f\x7f]/', $text ) ) return false;
        $n = preg_match_all( '/./us', $text ); return false !== $n && $n > 0 && $n <= 500;
    }
    /** Pure pre-write policy, also exercised without CMS or business data. */
    public static function prepare( array $params, ?array $before, bool $publisher, int $actor, ?callable $reference = null, ?int $now = null ) {
        $now = $now ?? time();
        $keys = array( 'model', 'expected_revision', 'reason', 'operation_key', 'action' );
        if ( array_diff( $keys, array_keys( $params ) ) || array_diff( array_keys( $params ), $keys ) || ! is_int( $params['expected_revision'] ) || $params['expected_revision'] < 0 || $params['expected_revision'] >= 9007199254740991 || ! self::safe_text( $params['reason'] ) || ! is_string( $params['operation_key'] ) || ! preg_match( '/^[a-zA-Z0-9-]{16,80}$/D', $params['operation_key'] ) || ! in_array( $params['action'], array( 'save', 'confirm' ), true ) ) return self::error( 'payload_invalid', 'Thông tin lưu chuyến không hợp lệ.', 422 );
        $expected = $before['revision'] ?? 0;
        if ( $params['expected_revision'] !== $expected || ( $params['model']['revision'] ?? null ) !== max( 1, $expected ) ) return self::error( 'revision_conflict', 'Chuyến đã được người khác sửa. Tải lại trước khi lưu.', 409 );
        $model = $params['model'];
        if ( ! is_array( $model ) ) return self::error( 'model_invalid', 'Dữ liệu chuyến không hợp lệ.', 422 );
        $confirm = 'confirm' === $params['action'];
        if ( ! $publisher && ( $confirm || 'confirmed' === ( $before['approval']['status'] ?? null ) ) ) return self::error( 'confirmation_forbidden', 'Cần quyền xác nhận Vận hành để sửa chuyến đã xác nhận.', 403 );
        if ( ( $model['approval']['status'] ?? null ) !== ( $confirm ? 'confirmed' : 'draft' ) || ( ! $confirm && ! in_array( $model['status'] ?? null, array( 'draft', 'inactive', 'cancelled' ), true ) ) ) return self::error( 'confirmation_required', 'Lưu nháp không được tự xác nhận hoặc chuyển sang còn chuyến.', 422 );
        $transitions = array(
            'draft' => array( 'draft', 'inactive', 'available', 'cancelled' ),
            'inactive' => array( 'draft', 'inactive', 'available', 'cancelled' ),
            'available' => array( 'draft', 'inactive', 'available', 'reserved', 'cancelled' ),
            'reserved' => array( 'inactive', 'reserved', 'completed', 'cancelled' ),
            'completed' => array(), 'cancelled' => array(),
        );
        if ( ! in_array( $model['status'] ?? null, $transitions[ $before['status'] ?? 'draft' ] ?? array(), true ) ) return self::error( 'transition_invalid', 'Không được chuyển trạng thái này hoặc mở lại chuyến đã kết thúc.', 409 );
        // A reserved trip's operational facts are frozen; status changes retain its snapshot.
        if ( 'reserved' === ( $before['status'] ?? null ) ) foreach ( array( 'scope', 'departure', 'prices', 'valid_from', 'expires_at' ) as $key ) {
            if ( ( $model[$key] ?? null ) !== $before[$key] ) return self::error( 'reserved_frozen', 'Chuyến đang giữ chỗ không được thay tuyến, xe, giá hoặc thời hạn.', 409 );
        }
        $model['revision'] = $expected + 1;
        $checked = Gocar_Empty_Leg::validate( $model, $reference );
        if ( ! $checked['valid'] ) return self::error( 'model_invalid', 'Dữ liệu chuyến hoặc nguồn giá chưa đủ điều kiện.', 422, array( 'errors' => $checked['errors'] ) );
        $model = $checked['model'];
        // Ended trips may be closed after departure; availability/reservation cannot be revived.
        if ( $confirm && in_array( $model['status'], array( 'available', 'reserved' ), true ) && ( strtotime( $model['expires_at'] ) <= $now || Gocar_Empty_Leg::departure_at( $model['departure'] ) <= $now ) ) return self::error( 'expired', 'Chuyến đã hết hạn hoặc qua giờ khởi hành.', 409 );
        return array( 'model' => $model, 'confirmation' => $confirm ? array( 'actor' => $actor, 'at' => gmdate( 'Y-m-d\TH:i:s\Z', $now ), 'revision' => $model['revision'], 'source_ref' => $model['approval']['source_ref'] ) : null );
    }
    public static function save( $request ) {
        global $wpdb;
        if ( ! self::can_edit() ) return self::error( 'forbidden', 'Không có quyền điều phối.', 403 );
        $params = $request->get_json_params();
        if ( ! is_array( $params ) || ! is_string( $params['operation_key'] ?? null ) || ! preg_match( '/^[a-zA-Z0-9-]{16,80}$/D', $params['operation_key'] ) ) return self::error( 'payload_invalid', 'Thiếu mã thao tác hợp lệ.', 422 );
        $id = (int) ( $request['id'] ?? 0 ); $actor = get_current_user_id();
        $key = hash( 'sha256', $actor . ':' . $params['operation_key'] );
        $fingerprint = hash( 'sha256', wp_json_encode( array( $id, $params ) ) );
        $lock = 'alo-el-' . substr( hash( 'sha256', $wpdb->posts . ':' . ( $id ? 'id:' . $id : 'new:' . $key ) ), 0, 50 );
        // Fail closed on non-transactional tables or unavailable MySQL locks.
        foreach ( array( $wpdb->posts, $wpdb->postmeta ) as $table ) {
            $engine = $wpdb->get_var( $wpdb->prepare( 'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s', $table ) );
            if ( 'INNODB' !== strtoupper( (string) $engine ) ) return self::error( 'storage_unavailable', 'Hệ thống chưa đủ điều kiện lưu an toàn.', 503 );
        }
        if ( '1' !== (string) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $lock ) ) ) return self::error( 'write_busy', 'Chuyến đang được xử lý. Vui lòng thử lại.', 409 );
        $committed = false; $created = false;
        try {
            if ( false === $wpdb->query( 'START TRANSACTION' ) ) throw new RuntimeException( 'transaction' );
            if ( ! $id ) {
                $slug = 'el-' . $key;
                $id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_name = %s FOR UPDATE", Gocar_Empty_Leg::POST_TYPE, $slug ) );
            }
            $before = null; $stored = null;
            if ( $id ) {
                $post = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->posts} WHERE ID = %d FOR UPDATE", $id ) );
                if ( ! self::accessible( $post ) ) return self::error( 'not_found', 'Không tìm thấy chuyến trong phạm vi được phép.', 404 );
                $stored = self::stored( $id );
                if ( ! $stored ) return self::error( 'storage_invalid', 'Dữ liệu hoặc lịch sử chuyến không hợp lệ.', 409 );
                $before = $stored['model'];
                if ( ! current_user_can( 'publish_posts' ) && 'confirmed' === $before['approval']['status'] ) return self::error( 'confirmation_forbidden', 'Không có quyền sửa chuyến đã xác nhận.', 403 );
                foreach ( $stored['history'] as $entry ) if ( $entry['operation_hash'] === $key ) {
                    if ( $entry['fingerprint'] !== $fingerprint ) return self::error( 'operation_conflict', 'Mã thao tác đã dùng cho nội dung khác.', 409 );
                    return self::response( $id, array( 'model' => $entry['after'], 'confirmation' => $entry['confirmation'], 'history' => array_slice( $stored['history'], 0, $entry['after']['revision'] ) ) );
                }
            }
            // Remove cached Route/Location/Vehicle references before the fresh authoritative check.
            $scope = $params['model']['scope'] ?? null;
            if ( is_array( $scope ) ) foreach ( array( 'route_id', 'vehicle_id', 'origin_location_id', 'destination_location_id' ) as $field ) if ( is_int( $scope[$field] ?? null ) ) clean_post_cache( $scope[$field] );
            $prepared = self::prepare( $params, $before, current_user_can( 'publish_posts' ), $actor );
            if ( is_wp_error( $prepared ) ) return $prepared;
            if ( ! $id ) {
                $id = wp_insert_post( array( 'post_type' => Gocar_Empty_Leg::POST_TYPE, 'post_status' => 'private', 'post_title' => 'Chuyến chiều trống', 'post_name' => $slug, 'post_author' => $actor ), true );
                if ( is_wp_error( $id ) || ! $id ) throw new RuntimeException( 'insert post' );
                $created = true;
            }
            $entry = array( 'at' => gmdate( 'Y-m-d\TH:i:s\Z' ), 'actor' => $actor, 'action' => $params['action'], 'reason' => $params['reason'], 'before' => $before, 'after' => $prepared['model'], 'confirmation' => $prepared['confirmation'], 'operation_hash' => $key, 'fingerprint' => $fingerprint );
            $model_json = wp_json_encode( $prepared['model'], JSON_UNESCAPED_UNICODE );
            $history_json = wp_json_encode( $entry, JSON_UNESCAPED_UNICODE );
            if ( ! is_string( $model_json ) || ! is_string( $history_json ) ) throw new RuntimeException( 'encode' );
            if ( $created ) $written = $wpdb->insert( $wpdb->postmeta, array( 'post_id' => $id, 'meta_key' => Gocar_Empty_Leg::META_KEY, 'meta_value' => $model_json ) );
            else $written = $wpdb->update( $wpdb->postmeta, array( 'meta_value' => $model_json ), array( 'post_id' => $id, 'meta_key' => Gocar_Empty_Leg::META_KEY ) );
            if ( 1 !== $written || 1 !== $wpdb->insert( $wpdb->postmeta, array( 'post_id' => $id, 'meta_key' => Gocar_Empty_Leg::HISTORY_KEY, 'meta_value' => $history_json ) ) ) throw new RuntimeException( 'write' );
            if ( false === $wpdb->query( 'COMMIT' ) ) throw new RuntimeException( 'commit' );
            $committed = true;
            $history = $stored['history'] ?? array(); $history[] = $entry;
            return self::response( $id, array( 'model' => $prepared['model'], 'confirmation' => $prepared['confirmation'], 'history' => $history ) );
        } catch ( Throwable $e ) {
            return self::error( 'write_failed', 'Chưa lưu được chuyến. Có thể thử lại cùng thao tác.', 503 );
        } finally {
            if ( ! $committed ) $wpdb->query( 'ROLLBACK' );
            if ( $id && is_int( $id ) ) clean_post_cache( $id );
            $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock ) );
        }
    }
}
Gocar_Empty_Leg_Admin::boot();
