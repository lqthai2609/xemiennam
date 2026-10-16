<?php
/** Coupon adapter for Promotion Model v1. SQL CAS owns quota; no public option/meta access. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Gocar_Coupon {
    private const PREFIX = '_alo_coupon_v1_';
    private const RECEIPT = '_alo_coupon_receipt_v1';
    private static bool $writing = false;
    public static function enabled(): bool { return defined( 'ALO_COUPONS_ENABLED' ) && true === ALO_COUPONS_ENABLED; }
    public static function boot(): void {
        add_action( 'rest_api_init', array( self::class, 'routes' ) );
        foreach ( array( 'add', 'update', 'delete' ) as $action ) add_filter( $action . '_post_metadata', array( self::class, 'guard' ), 10, 5 );
    }
    public static function guard( $check, $id, $key, $value = null, $extra = null ) { return self::RECEIPT === $key && ! self::$writing ? false : $check; }
    public static function admin(): bool { return current_user_can( 'manage_options' ); }
    public static function gateway(): bool { return current_user_can( 'edit_posts' ); }
    private static function error( string $code, string $message, int $status = 409 ) { return new WP_Error( $code, $message, array( 'status' => $status ) ); }
    private static function response( array $data ) {
        $r = rest_ensure_response( $data ); $r->header( 'Cache-Control', 'private, no-store' ); $r->header( 'X-Robots-Tag', 'noindex, nofollow' ); return $r;
    }
    public static function routes(): void {
        register_rest_route( 'gocar/v1', '/coupons/lookup', array( 'methods' => 'POST', 'callback' => array( self::class, 'lookup' ), 'permission_callback' => array( self::class, 'gateway' ) ) );
        register_rest_route( 'gocar/v1', '/admin/coupons/options', array( 'methods' => 'GET', 'callback' => array( self::class, 'options' ), 'permission_callback' => array( self::class, 'admin' ) ) );
        register_rest_route( 'gocar/v1', '/admin/coupons', array(
            array( 'methods' => 'GET', 'callback' => array( self::class, 'listing' ), 'permission_callback' => array( self::class, 'admin' ) ),
            array( 'methods' => 'POST', 'callback' => array( self::class, 'save' ), 'permission_callback' => array( self::class, 'admin' ) ),
        ) );
    }
    public static function code( $value ): ?string {
        if ( ! is_string( $value ) ) return null;
        $value = strtoupper( trim( $value ) );
        return preg_match( '/^[A-Z0-9][A-Z0-9_-]{2,63}$/D', $value ) ? $value : null;
    }
    private static function integer( $v, int $min = 0, int $max = 1000000000000 ): bool { return is_int( $v ) && $v >= $min && $v <= $max; }
    /** Read SQL directly: persistent/negative option caches cannot arbitrate quota. */
    private static function stored( string $code ) {
        global $wpdb;
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT option_id, option_value FROM {$wpdb->options} WHERE option_name = %s", self::PREFIX . $code ) );
        if ( '' !== $wpdb->last_error ) return self::error( 'coupon_storage', 'Chưa kiểm tra được mã khuyến mãi.', 503 );
        if ( ! $row ) return null;
        $data = json_decode( $row->option_value, true );
        if ( ! is_array( $data ) || ! isset( $data['config'], $data['model'], $data['uses'], $data['history'] ) || $data['config']['code'] !== $code ) return self::error( 'coupon_storage', 'Dữ liệu mã cần được kiểm tra.', 503 );
        return array( 'id' => (int) $row->option_id, 'raw' => $row->option_value, 'data' => $data );
    }
    private static function invalidate( string $code ): void {
        wp_cache_delete( self::PREFIX . $code, 'options' ); wp_cache_delete( 'notoptions', 'options' ); wp_cache_delete( 'alloptions', 'options' );
    }
    /** Whole-row binary compare-and-swap; config changes preserve concurrent redemptions. */
    private static function cas( string $code, string $before, array $after ): bool {
        global $wpdb;
        $n = $wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND BINARY option_value = %s", wp_json_encode( $after ), self::PREFIX . $code, $before ) );
        self::invalidate( $code ); return 1 === $n;
    }
    private static function counts( array $uses ): array {
        $used = 0; $held = 0;
        foreach ( $uses as $use ) { if ( $use['lead_id'] > 0 ) $used++; else $held++; }
        return array( 'used' => $used, 'held' => $held );
    }
    private static function summary( array $row ): array {
        return array_merge( array( 'id' => $row['id'], 'config' => $row['data']['config'], 'revision' => $row['data']['model']['revision'], 'history' => $row['data']['history'] ), self::counts( $row['data']['uses'] ) );
    }
    /** Reuse current Route/Direction/Pricing/Location gates, including Long Thanh and D35-10. */
    public static function reference( array $s, array $model = array() ): array {
        foreach ( array( $s['route_id'], $s['vehicle_id'] ) as $id ) clean_post_cache( $id );
        foreach ( array( 'origin_location_id', 'destination_location_id' ) as $key ) clean_post_cache( (int) get_post_meta( $s['route_id'], $key, true ) );
        return Gocar_Empty_Leg::reference( $s );
    }
    public static function options() {
        if ( ! self::admin() ) return self::error( 'forbidden', 'Chỉ quản trị viên được quản lý mã.', 403 );
        $options = array(); $seen = array();
        foreach ( get_posts( array( 'post_type' => 'route', 'post_status' => 'publish', 'posts_per_page' => -1 ) ) as $route ) {
            clean_post_cache( $route->ID );
            $rows = get_post_meta( $route->ID, 'pricing_packages_v2', true );
            foreach ( is_array( $rows ) ? $rows : array() as $r ) {
                $s = array( 'route_id' => (int) $route->ID, 'direction' => $r['direction'] ?? '', 'vehicle_id' => (int) ( $r['vehicle_id'] ?? 0 ), 'package_key' => $r['package_key'] ?? '' );
                if ( ! in_array( $s['direction'], array( 'outbound', 'inbound' ), true ) || ! preg_match( '/^[a-z0-9_-]{1,80}$/D', $s['package_key'] ) ) continue;
                $ref = self::reference( $s ); $key = implode( ':', $s );
                if ( isset( $seen[$key] ) || ! $ref['exists'] || ! $ref['activationReady'] || $ref['prelaunch'] || $ref['mappingBlocked'] || 'fixed' !== $ref['pricingMode'] || ! $ref['normalPriceVnd'] ) continue;
                $seen[$key] = true;
                $package_labels = array( 'one_way' => 'Một chiều', 'round_trip_day' => 'Khứ hồi trong ngày', '2d1n' => '2 ngày 1 đêm', '3d2n' => '3 ngày 2 đêm' );
                $package_label = $package_labels[$s['package_key']] ?? 'Gói dịch vụ đã cấu hình';
                $options[] = array( 'key' => $key, 'scope' => $s, 'label' => get_the_title( $ref['originLocationId'] ) . ' đến ' . get_the_title( $ref['destinationLocationId'] ) . ' · ' . get_the_title( $s['vehicle_id'] ) . ' · ' . $package_label );
            }
        }
        return self::response( array( 'options' => $options, 'commercial_enabled' => self::enabled() ) );
    }
    public static function listing() {
        if ( ! self::admin() ) return self::error( 'forbidden', 'Chỉ quản trị viên được quản lý mã.', 403 );
        global $wpdb;
        $names = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s ORDER BY option_id DESC LIMIT 101", $wpdb->esc_like( self::PREFIX ) . '%' ) );
        if ( '' !== $wpdb->last_error ) return self::error( 'coupon_storage', 'Không đọc được danh sách mã.', 503 );
        $items = array();
        foreach ( array_slice( $names, 0, 100 ) as $name ) { $r = self::stored( substr( $name, strlen( self::PREFIX ) ) ); if ( is_array( $r ) ) $items[] = self::summary( $r ); }
        return self::response( array( 'items' => $items, 'has_more' => count( $names ) > 100, 'commercial_enabled' => self::enabled() ) );
    }
    /** Server stamps approval/activation. Browser only chooses business fields and exact tuples. */
    public static function configuration( $c, int $revision, ?int $actor = null, ?string $stamp = null ) {
        $fields = array( 'code','name','status','kind','value','cap_vnd','minimum_vnd','limit','start_date','end_date','departure_start','departure_end','scopes' );
        if ( ! is_array( $c ) || array_diff( array_keys( $c ), $fields ) || array_diff( $fields, array_keys( $c ) ) || self::code( $c['code'] ?? null ) !== $c['code']
            || ! is_string( $c['name'] ) || '' === trim( $c['name'] ) || strlen( $c['name'] ) > 300 || preg_match( '/[<>\x00-\x1f]/', $c['name'] )
            || ! in_array( $c['status'], array( 'draft', 'active', 'paused' ), true ) || ! in_array( $c['kind'], array( 'fixed_discount', 'percent_discount' ), true )
            || ! self::integer( $c['value'], 1, 'percent_discount' === $c['kind'] ? 9999 : 1000000000000 ) || ! self::integer( $c['minimum_vnd'], 1 )
            || ! self::integer( $c['limit'], 1, 10000 ) || ( 'percent_discount' === $c['kind'] ? ! self::integer( $c['cap_vnd'], 1 ) : null !== $c['cap_vnd'] )
            || ! is_array( $c['scopes'] ) || ! count( $c['scopes'] ) || count( $c['scopes'] ) > 1000 ) return self::error( 'invalid_coupon', 'Thông tin mã khuyến mãi chưa hợp lệ.', 400 );
        if ( 'fixed_discount' === $c['kind'] && $c['value'] >= $c['minimum_vnd'] ) return self::error( 'invalid_coupon', 'Giá tối thiểu phải lớn hơn số tiền giảm.', 400 );
        foreach ( $c['scopes'] as $s ) {
            if ( ! is_array( $s ) || count( $s ) !== 4 || ! self::integer( $s['route_id'] ?? null, 1 ) || ! self::integer( $s['vehicle_id'] ?? null, 1 ) || ! in_array( $s['direction'] ?? null, array( 'outbound', 'inbound' ), true ) || ! is_string( $s['package_key'] ?? null ) || ! preg_match( '/^[a-z0-9_-]{1,80}$/D', $s['package_key'] ) ) return self::error( 'invalid_coupon', 'Tổ hợp chuyến không hợp lệ.', 400 );
        }
        $approved = 'draft' !== $c['status']; $enabled = 'active' === $c['status']; $stamp = $stamp ?? gmdate( 'Y-m-d\TH:i:s\Z' ); $actor = $actor ?? get_current_user_id();
        $conditions = array( array( 'kind' => 'min_eligible_amount', 'amount_vnd' => $c['minimum_vnd'] ) );
        if ( null !== $c['departure_start'] || null !== $c['departure_end'] ) $conditions[] = array( 'kind' => 'departure_date_range', 'start_date' => $c['departure_start'], 'end_date' => $c['departure_end'] );
        $discount = array( 'kind' => $c['kind'], 'target' => 'base_price' ); $discount['percent_discount' === $c['kind'] ? 'rate_bps' : 'amount_vnd'] = $c['value'];
        $m = array( 'model_version' => 1, 'revision' => $revision, 'enabled' => $enabled,
            'approval' => array( 'status' => $approved ? 'approved' : 'draft', 'owner' => 'admin:' . $actor, 'source_ref' => 'coupon:' . $c['code'], 'approved_at' => $approved ? $stamp : null ),
            'discount' => $discount, 'priority' => 0, 'scopes' => $c['scopes'],
            'scope_policy' => array( 'route' => 'selected', 'direction' => 'selected', 'vehicle' => 'selected', 'package' => 'selected' ),
            'window' => array( 'start_date' => $c['start_date'], 'end_date' => $c['end_date'], 'timezone' => 'Asia/Ho_Chi_Minh' ), 'conditions' => $conditions );
        if ( $approved ) {
            $tuples = array();
            foreach ( $c['scopes'] as $s ) {
                if ( ! is_array( $s ) || array_diff( array( 'route_id', 'direction', 'vehicle_id', 'package_key' ), array_keys( $s ) ) ) return self::error( 'invalid_coupon', 'Phạm vi áp dụng không hợp lệ.', 400 );
                $ref = self::reference( $s );
                if ( ! $ref['exists'] || ! $ref['activationReady'] || $ref['prelaunch'] || $ref['mappingBlocked'] || 'fixed' !== $ref['pricingMode'] || ! $ref['normalPriceVnd'] ) return self::error( 'scope_blocked', 'Tổ hợp chuyến chưa đủ điều kiện áp dụng mã.', 400 );
                $tuples[] = array_merge( $s, array( 'readiness_version' => $ref['readinessVersion'] ) );
            }
            $m['activation'] = array( 'owner' => 'admin:' . $actor, 'source_ref' => 'coupon:' . $c['code'], 'approved_at' => $stamp, 'version' => $revision, 'tuples' => $tuples );
        }
        $v = Gocar_Promotion_Model::validate( $m, array( self::class, 'reference' ) );
        return $v['valid'] ? $v['model'] : self::error( 'invalid_coupon', 'Thời hạn hoặc phạm vi mã chưa hợp lệ.', 400 );
    }
    public static function save( $request ) {
        if ( ! self::admin() ) return self::error( 'forbidden', 'Chỉ quản trị viên được quản lý mã.', 403 );
        $b = $request->get_json_params();
        if ( ! is_array( $b ) || array_diff( array_keys( $b ), array( 'config', 'expected_revision' ) ) || ! self::integer( $b['expected_revision'] ?? null ) ) return self::error( 'invalid_coupon', 'Thiếu phiên bản mã.', 400 );
        $code = self::code( $b['config']['code'] ?? null ); if ( ! $code ) return self::error( 'invalid_coupon', 'Mã gồm 3–64 chữ cái Latin, chữ số, dấu gạch ngang hoặc gạch dưới.', 400 );
        $b['config']['code'] = $code;
        $initial = self::stored( $code ); if ( is_wp_error( $initial ) ) return $initial;
        $paused = $b['config']; $previous_config = $initial['data']['config'] ?? null;
        $only_pause = 'paused' === ( $paused['status'] ?? null ) && is_array( $previous_config );
        if ( $only_pause ) { $paused['status'] = $previous_config['status']; $only_pause = $paused === $previous_config; }
        if ( $only_pause ) { $model = $initial['data']['model']; $model['enabled'] = false; $model['revision'] = $b['expected_revision'] + 1; }
        else $model = self::configuration( $b['config'], $b['expected_revision'] + 1 );
        if ( is_wp_error( $model ) ) return $model;
        for ( $try = 0; $try < 5; $try++ ) {
            $old = self::stored( $code ); if ( is_wp_error( $old ) ) return $old;
            if ( ( $old['data']['model']['revision'] ?? 0 ) !== $b['expected_revision'] ) return self::error( 'coupon_revision', 'Mã đã thay đổi. Hãy tải lại trước khi sửa.' );
            $uses = $old['data']['uses'] ?? array();
            if ( count( $uses ) > $b['config']['limit'] ) return self::error( 'coupon_limit', 'Hạn mức không được thấp hơn tổng lượt đã dùng và đang giữ.' );
            $history = $old['data']['history'] ?? array();
            $history[] = array( 'actor' => get_current_user_id(), 'at' => gmdate( 'c' ), 'revision' => $model['revision'], 'before' => $old['data']['config'] ?? null, 'after' => $b['config'] );
            $data = array( 'config' => $b['config'], 'model' => $model, 'uses' => $uses, 'history' => $history );
            if ( $old ) $ok = self::cas( $code, $old['raw'], $data );
            else {
                global $wpdb;
                $previous_errors = $wpdb->suppress_errors( true );
                $ok = 1 === $wpdb->query( $wpdb->prepare( "INSERT INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", self::PREFIX . $code, wp_json_encode( $data ) ) );
                $wpdb->suppress_errors( $previous_errors );
                self::invalidate( $code );
            }
            if ( $ok ) return self::response( self::summary( self::stored( $code ) ) );
        }
        return self::error( 'coupon_busy', 'Mã đang được cập nhật. Hãy thử lại.' );
    }
    public static function lookup( $request ) {
        if ( ! self::gateway() ) return self::error( 'forbidden', 'Không có quyền kiểm tra mã.', 403 );
        if ( ! self::enabled() ) return self::error( 'coupon_disabled', 'Tính năng áp dụng mã chưa được mở.', 503 );
        $code = self::code( $request->get_param( 'code' ) ); $row = $code ? self::stored( $code ) : null;
        if ( is_wp_error( $row ) ) return $row;
        if ( ! $row ) return self::error( 'coupon_missing', 'Mã khuyến mãi không tồn tại.', 404 );
        $check = self::available( $row ); if ( is_wp_error( $check ) ) return $check;
        if ( ! Gocar_Promotion_Model::validate( $row['data']['model'], array( self::class, 'reference' ) )['valid'] ) return self::error( 'coupon_scope', 'Phạm vi mã không còn đủ điều kiện áp dụng.' );
        return self::response( array( 'id' => $row['id'], 'code' => $code, 'model' => $row['data']['model'], 'cap_vnd' => $row['data']['config']['cap_vnd'] ) );
    }
    private static function available( array $row ) {
        $d = $row['data']; $c = $d['config'];
        if ( 'active' !== $c['status'] ) return self::error( 'coupon_inactive', 'Mã khuyến mãi chưa hoạt động.' );
        $start = strtotime( $c['start_date'] . 'T00:00:00+07:00' ); $end = strtotime( $c['end_date'] . 'T00:00:00+07:00' ) + 86400;
        if ( time() < $start ) return self::error( 'coupon_scheduled', 'Mã khuyến mãi chưa đến thời gian áp dụng.' );
        if ( time() >= $end ) return self::error( 'coupon_expired', 'Mã khuyến mãi đã hết hạn.' );
        if ( count( $d['uses'] ) >= $c['limit'] ) return self::error( 'coupon_exhausted', 'Mã khuyến mãi đã hết lượt hoặc các lượt còn lại đang được xử lý.' );
        return true;
    }
    /** Final authority before any booking write; caller is the authenticated gateway. */
    private static function claim( array $row, array $receipt, array $snapshot, array $meta ) {
        if ( ! self::enabled() ) return self::error( 'coupon_disabled', 'Tính năng áp dụng mã chưa được mở.', 503 );
        $check = self::available( $row ); if ( is_wp_error( $check ) ) return $check;
        $m = $row['data']['model']; $c = $row['data']['config']; $p = $snapshot['pricing']; $s = $snapshot['tuple']; $promo = $snapshot['promotion'];
        if ( $receipt['coupon_id'] !== $row['id'] || $receipt['revision'] !== $m['revision'] || $promo['promotion_id'] !== $row['id'] || $promo['revision'] !== $m['revision'] ) return self::error( 'coupon_changed', 'Mã đã thay đổi. Hãy áp dụng lại và kiểm tra giá.' );
        if ( ! Gocar_Promotion_Model::validate( $m, array( self::class, 'reference' ) )['valid'] || ! in_array( $s, $m['scopes'], false ) ) return self::error( 'coupon_scope', 'Mã không áp dụng cho chuyến đã chọn.' );
        $ref = self::reference( $s );
        if ( $ref['normalPriceVnd'] !== $p['base_price'] || 'fixed' !== $ref['pricingMode'] ) return self::error( 'coupon_price_changed', 'Giá chuyến đã thay đổi. Hãy áp dụng lại mã.' );
        foreach ( array( 'surcharge' => 'surcharge_policy_version', 'modifier' => 'price_modifier_policy_version', 'condition' => 'price_condition_policy_version' ) as $key => $meta_key ) {
            if ( ( $snapshot['rule_versions'][$key] ?? null ) !== (int) get_post_meta( $s['route_id'], $meta_key, true ) ) return self::error( 'coupon_price_changed', 'Quy tắc giá đã thay đổi. Hãy áp dụng lại mã.' );
        }
        if ( $promo['window'] !== $m['window'] ) return self::error( 'coupon_changed', 'Thời hạn mã đã thay đổi. Hãy áp dụng lại mã.' );
        $base = $p['base_price'];
        if ( ! self::integer( $base, 1 ) || $base < $c['minimum_vnd'] ) return self::error( 'coupon_minimum', 'Giá chuyến chưa đạt mức tối thiểu của mã.' );
        $amount = 'fixed_discount' === $c['kind'] ? $c['value'] : min( intdiv( $base * $c['value'], 10000 ), $c['cap_vnd'] );
        if ( $amount < 1 || $amount >= $base || $promo['discount_amount'] !== $amount || $promo['type'] !== $c['kind'] || 'base_price' !== $promo['target'] || $promo['promotional_estimated_total'] !== $p['estimated_total'] - $amount ) return self::error( 'coupon_amount', 'Không xác nhận được giá sau giảm.', 400 );
        if ( null !== $c['departure_start'] && ( ! is_string( $meta['ngay_di'] ?? null ) || $meta['ngay_di'] < $c['departure_start'] || $meta['ngay_di'] > $c['departure_end'] ) ) return self::error( 'coupon_departure', 'Ngày đi không thuộc thời gian áp dụng mã.' );
        return true;
    }
    public static function valid_receipt( $r ): bool {
        return is_array( $r ) && count( $r ) === 4 && self::integer( $r['coupon_id'] ?? null, 1, 9007199254740991 ) && self::integer( $r['revision'] ?? null, 1 ) && is_string( $r['code'] ?? null ) && null !== self::code( $r['code'] ) && self::code( $r['code'] ) === $r['code'] && is_string( $r['quote_key'] ?? null ) && preg_match( '/^[a-f0-9]{64}$/D', $r['quote_key'] );
    }
    public static function check( $r, array $s, array $meta ) {
        if ( ! self::valid_receipt( $r ) ) return self::error( 'invalid_coupon_receipt', 'Thiếu xác nhận mã khuyến mãi.', 400 );
        $row = self::stored( $r['code'] ); if ( is_wp_error( $row ) ) return $row;
        return $row ? self::claim( $row, $r, $s, $meta ) : self::error( 'coupon_missing', 'Mã khuyến mãi không tồn tại.' );
    }
    /** A pending hold consumes availability, not used count. Never expires on a timer. */
    public static function hold( array $r, array $s, array $meta, string $key ) {
        for ( $try = 0; $try < 8; $try++ ) {
            $row = self::stored( $r['code'] ); if ( is_wp_error( $row ) ) return $row;
            if ( ! $row ) return self::error( 'coupon_missing', 'Mã khuyến mãi không tồn tại.' );
            $d = $row['data'];
            if ( isset( $d['uses'][$key] ) ) return $d['uses'][$key]['receipt'] === $r ? true : self::error( 'coupon_key_conflict', 'Lượt mã đã thuộc yêu cầu khác.' );
            $check = self::claim( $row, $r, $s, $meta ); if ( is_wp_error( $check ) ) return $check;
            $d['uses'][$key] = array( 'lead_id' => 0, 'held_at' => gmdate( 'c' ), 'receipt' => $r );
            if ( self::cas( $r['code'], $row['raw'], $d ) ) return true;
        }
        return self::error( 'coupon_busy', 'Mã đang được áp dụng cho yêu cầu khác. Hãy thử lại.' );
    }
    /** Recovery uses saved receipt even after expiry/pause/price changes. No re-evaluation. */
    public static function settle( array $r, string $key, int $id ) {
        if ( 'booking_request' !== get_post_type( $id ) || get_post_meta( $id, '_gocar_lead_request_key_hash', true ) !== $key ) return self::error( 'coupon_reconcile', 'Cần đối chiếu lượt mã với đơn đã lưu.', 503 );
        for ( $try = 0; $try < 8; $try++ ) {
            $row = self::stored( $r['code'] ); if ( is_wp_error( $row ) ) return $row;
            if ( ! $row ) return self::error( 'coupon_reconcile', 'Không tìm thấy lượt mã đã giữ.', 503 );
            $d = $row['data']; $use = $d['uses'][$key] ?? null;
            if ( ! $use || $use['receipt'] !== $r || ( $use['lead_id'] > 0 && $use['lead_id'] !== $id ) ) return self::error( 'coupon_reconcile', 'Lượt mã cần được đối chiếu.', 503 );
            if ( $use['lead_id'] === $id ) break;
            $d['uses'][$key]['lead_id'] = $id;
            if ( self::cas( $r['code'], $row['raw'], $d ) ) break;
            if ( 7 === $try ) return self::error( 'coupon_busy', 'Chưa xác nhận được lượt mã. Hãy gửi lại cùng yêu cầu.', 503 );
        }
        $old = get_post_meta( $id, self::RECEIPT, true );
        if ( ! $old ) {
            self::$writing = true;
            try { add_post_meta( $id, self::RECEIPT, $r, true ); } finally { self::$writing = false; }
            $old = get_post_meta( $id, self::RECEIPT, true );
        }
        return $old === $r ? true : self::error( 'coupon_receipt', 'Cần xác nhận mã đã lưu trong đơn.', 503 );
    }
    public static function receipt( int $id ): ?array { $r = get_post_meta( $id, self::RECEIPT, true ); return is_array( $r ) ? $r : null; }
}
Gocar_Coupon::boot();
