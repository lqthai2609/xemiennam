<?php
/** Day 50 model, Day 51 dedicated audited writer; generic writes remain blocked. */
if ( ! defined( 'ABSPATH' ) ) exit;

final class Gocar_Empty_Leg {
    public const POST_TYPE = 'gocar_empty_leg';
    public const META_KEY = '_gocar_empty_leg_v1';
    public const HISTORY_KEY = '_gocar_empty_leg_history_v1';
    public const COMMERCIAL_ENABLED = false;

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_storage' ), 21 );
        foreach ( array( 'add', 'update', 'delete' ) as $action ) add_filter( $action . '_post_metadata', array( self::class, 'guard_meta' ), 10, 5 );
        add_filter( 'wp_sitemaps_post_types', array( self::class, 'exclude_sitemap' ) );
    }
    public static function register_storage(): void {
        register_post_type( self::POST_TYPE, array(
            'label' => 'Chuyến xe chiều trống', 'public' => false, 'publicly_queryable' => false,
            'exclude_from_search' => true, 'show_ui' => false, 'show_in_rest' => false,
            'show_in_nav_menus' => false, 'rewrite' => false, 'query_var' => false, 'has_archive' => false,
            'supports' => array(), 'map_meta_cap' => true,
        ) );
        foreach ( array( self::META_KEY, self::HISTORY_KEY ) as $key ) register_post_meta( self::POST_TYPE, $key, array(
            'type' => 'string', 'single' => self::META_KEY === $key, 'show_in_rest' => false, 'auth_callback' => static fn() => false,
        ) );
    }
    public static function guard_meta( $check, $id, $key, $value = null, $extra = null ) {
        unset( $id, $value, $extra );
        // The dedicated transactional writer uses SQL; generic writes stay blocked.
        return in_array( $key, array( self::META_KEY, self::HISTORY_KEY ), true ) ? false : $check;
    }
    public static function exclude_sitemap( array $types ): array { unset( $types[ self::POST_TYPE ] ); return $types; }
    private static function object( $v, array $keys ): bool {
        return is_array( $v ) && ! array_diff( $keys, array_keys( $v ) ) && ! array_diff( array_keys( $v ), $keys );
    }
    private static function integer( $v ): bool {
        return ( is_int( $v ) || is_float( $v ) ) && is_finite( (float) $v ) && floor( (float) $v ) === (float) $v && $v >= 1 && $v <= 9007199254740991;
    }
    private static function text( $v ): bool {
        if ( ! is_string( $v ) || '' === $v || trim( $v ) !== $v || preg_match( '/[<>\x00-\x1f\x7f]/', $v ) ) return false;
        $n = preg_match_all( '/./us', $v ); return false !== $n && $n > 0 && $n <= 500;
    }
    private static function instant( $v ): ?int {
        if ( ! is_string( $v ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/D', $v ) || $v < '0001-01-01T00:00:00Z' ) return null;
        $d = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $v, new DateTimeZone( 'UTC' ) );
        return $d && $d->format( 'Y-m-d\TH:i:s\Z' ) === $v ? $d->getTimestamp() : null;
    }
    public static function departure_at( $v ): ?int {
        if ( ! self::object( $v, array( 'date', 'time', 'timezone' ) ) || 'Asia/Ho_Chi_Minh' !== $v['timezone'] || ! is_string( $v['date'] ) || ! is_string( $v['time'] ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/D', $v['date'] ) || $v['date'] < '0001-01-01' || ! preg_match( '/^([01]\d|2[0-3]):[0-5]\d$/D', $v['time'] ) ) return null;
        $text = $v['date'] . 'T' . $v['time'];
        $d = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i', $text, new DateTimeZone( '+07:00' ) );
        return $d && $d->format( 'Y-m-d\TH:i' ) === $text ? $d->getTimestamp() : null;
    }
    public static function draft(): array {
        return array( 'model_version' => 1, 'revision' => 1, 'status' => 'draft', 'approval' => array( 'status' => 'draft', 'source_ref' => null ),
            'scope' => null, 'departure' => null, 'prices' => array( 'normal_price_vnd' => null, 'special_price_vnd' => null, 'currency' => 'VND', 'basis' => 'base_price', 'source' => 'pricing_v2_snapshot' ), 'valid_from' => null, 'expires_at' => null );
    }
    public static function validate( $m, ?callable $reference = null ): array {
        if ( ! self::object( $m, array( 'model_version', 'revision', 'status', 'approval', 'scope', 'departure', 'prices', 'valid_from', 'expires_at' ) ) ) return array( 'valid' => false, 'errors' => array( 'model' ) );
        $m = self::canonical( $m );
        $errors = array();
        if ( ! self::integer( $m['model_version'] ) || 1 != $m['model_version'] ) $errors[] = 'model_version';
        if ( ! self::integer( $m['revision'] ) ) $errors[] = 'revision';
        if ( ! in_array( $m['status'], array( 'draft', 'inactive', 'available', 'reserved', 'completed', 'cancelled' ), true ) ) $errors[] = 'status';
        $approval_ok = self::object( $m['approval'], array( 'status', 'source_ref' ) ) && in_array( $m['approval']['status'], array( 'draft', 'confirmed', 'rejected' ), true ) && ( null === $m['approval']['source_ref'] || self::text( $m['approval']['source_ref'] ) ) && ( 'confirmed' !== $m['approval']['status'] || null !== $m['approval']['source_ref'] );
        if ( ! $approval_ok ) $errors[] = 'approval';
        $confirmed = $approval_ok && 'confirmed' === $m['approval']['status'];
        if ( in_array( $m['status'], array( 'available', 'reserved', 'completed' ), true ) && ! $confirmed ) $errors[] = 'status';
        $scope = $m['scope'];
        $scope_ok = self::object( $scope, array( 'route_id', 'direction', 'vehicle_id', 'package_key', 'origin_location_id', 'destination_location_id', 'readiness_version' ) ) && ! array_filter( array( $scope['route_id'], $scope['vehicle_id'], $scope['origin_location_id'], $scope['destination_location_id'], $scope['readiness_version'] ), static fn( $n ) => ! self::integer( $n ) ) && in_array( $scope['direction'], array( 'outbound', 'inbound' ), true ) && 'one_way' === $scope['package_key'] && $scope['origin_location_id'] !== $scope['destination_location_id'];
        if ( null !== $scope && ! $scope_ok ) $errors[] = 'scope';
        $departure = self::departure_at( $m['departure'] );
        if ( null !== $m['departure'] && null === $departure ) $errors[] = 'departure';
        $p = $m['prices'];
        $prices_ok = self::object( $p, array( 'normal_price_vnd', 'special_price_vnd', 'currency', 'basis', 'source' ) ) && 'VND' === $p['currency'] && 'base_price' === $p['basis'] && 'pricing_v2_snapshot' === $p['source'] && ( null === $p['normal_price_vnd'] || self::integer( $p['normal_price_vnd'] ) ) && ( null === $p['special_price_vnd'] || self::integer( $p['special_price_vnd'] ) );
        if ( ! $prices_ok ) $errors[] = 'prices';
        elseif ( null !== $p['normal_price_vnd'] && null !== $p['special_price_vnd'] && $p['special_price_vnd'] > $p['normal_price_vnd'] ) $errors[] = 'prices.special_price_vnd';
        $from = self::instant( $m['valid_from'] ); $expiry = self::instant( $m['expires_at'] );
        if ( null !== $m['valid_from'] && null === $from ) $errors[] = 'valid_from';
        if ( null !== $m['expires_at'] && null === $expiry ) $errors[] = 'expires_at';
        if ( null !== $from && null !== $expiry && $from >= $expiry ) $errors[] = 'expires_at';
        if ( null !== $expiry && null !== $departure && $expiry > $departure ) $errors[] = 'expires_at';
        if ( $confirmed && ( ! $scope_ok || null === $departure || ! $prices_ok || null === $p['normal_price_vnd'] || null === $p['special_price_vnd'] || null === $from || null === $expiry ) ) $errors[] = 'confirmed_complete';
        if ( $scope_ok ) {
            try { $ref = $reference ? $reference( $scope ) : self::reference( $scope ); } catch ( Throwable $e ) { $ref = null; }
            if ( ! is_array( $ref ) || true !== ( $ref['exists'] ?? null ) || ( $ref['originLocationId'] ?? null ) !== $scope['origin_location_id'] || ( $ref['destinationLocationId'] ?? null ) !== $scope['destination_location_id'] ) $errors[] = 'reference';
            elseif ( $confirmed && ( true !== ( $ref['activationReady'] ?? null ) || false !== ( $ref['prelaunch'] ?? null ) || false !== ( $ref['mappingBlocked'] ?? null ) || ( $ref['readinessVersion'] ?? null ) !== $scope['readiness_version'] || 'fixed' !== ( $ref['pricingMode'] ?? null ) || ! self::integer( $ref['normalPriceVnd'] ?? null ) || ! $prices_ok || $ref['normalPriceVnd'] !== $p['normal_price_vnd'] ) ) $errors[] = 'reference_confirmation';
        }
        return $errors ? array( 'valid' => false, 'errors' => array_values( array_unique( $errors ) ) ) : array( 'valid' => true, 'model' => self::canonical( $m ) );
    }
    private static function canonical( array $m ): array {
        foreach ( $m as $k => $v ) {
            if ( is_array( $v ) ) $m[ $k ] = self::canonical( $v );
            elseif ( is_float( $v ) && self::integer( $v ) ) $m[ $k ] = (int) $v;
        }
        return $m;
    }
    /** Fresh exact Pricing V2 tuple, directed Locations, and current readiness. Read-only. */
    public static function reference( array $s ): array {
        $ref = array( 'exists' => false, 'activationReady' => false, 'prelaunch' => true, 'mappingBlocked' => true, 'originLocationId' => 0, 'destinationLocationId' => 0, 'readinessVersion' => 0, 'pricingMode' => 'disabled', 'normalPriceVnd' => null );
        $id = (int) $s['route_id']; $vehicle = (int) $s['vehicle_id'];
        if ( 'route' !== get_post_type( $id ) || 'vehicle' !== get_post_type( $vehicle ) || ! in_array( get_post_meta( $id, 'pricing_model_version', true ), array( 2, '2' ), true ) || in_array( get_post_status( $id ), array( 'trash', 'auto-draft' ), true ) || in_array( get_post_status( $vehicle ), array( 'trash', 'auto-draft' ), true ) ) return $ref;
        $from = (int) get_post_meta( $id, 'origin_location_id', true ); $to = (int) get_post_meta( $id, 'destination_location_id', true );
        if ( 'inbound' === $s['direction'] ) { $old = $from; $from = $to; $to = $old; }
        if ( $from === $to || 'location' !== get_post_type( $from ) || 'location' !== get_post_type( $to ) || in_array( get_post_status( $from ), array( 'trash', 'auto-draft' ), true ) || in_array( get_post_status( $to ), array( 'trash', 'auto-draft' ), true ) ) return $ref;
        $rows = get_post_meta( $id, 'pricing_packages_v2', true );
        $matches = array_values( array_filter( is_array( $rows ) ? $rows : array(), static fn( $r ) => is_array( $r ) && ( $r['direction'] ?? null ) === $s['direction'] && (string) ( $r['vehicle_id'] ?? '' ) === (string) $vehicle && ( $r['package_key'] ?? null ) === $s['package_key'] ) );
        $ref['exists'] = 1 === count( $matches );
        $ref['originLocationId'] = $from; $ref['destinationLocationId'] = $to;
        $ref['readinessVersion'] = (int) get_post_meta( $id, 'content_readiness_version', true );
        $ref['prelaunch'] = 'prelaunch' === get_post_meta( $id, 'content_service_state', true ) || array_intersect( array( 9102, 9154 ), array( $from, $to ) ) || in_array( get_post( $from )->post_name ?? '', array( 'san-bay-long-thanh', 'long-thanh' ), true ) || in_array( get_post( $to )->post_name ?? '', array( 'san-bay-long-thanh', 'long-thanh' ), true );
        $ref['prelaunch'] = (bool) $ref['prelaunch'];
        $ref['mappingBlocked'] = 'clear' !== get_post_meta( $id, 'content_mapping_state', true );
        if ( class_exists( 'Gocar_Admin_API' ) && Gocar_Admin_API::operational_route_blocked( $id, $from, $to ) ) $ref['mappingBlocked'] = true;
        $ref['activationReady'] = 'live' === get_post_meta( $id, 'content_service_state', true ) && in_array( get_post_meta( $id, $s['direction'] . '_enabled', true ), array( true, 1, '1' ), true ) && 'publish' === get_post_status( $id ) && 'publish' === get_post_status( $vehicle ) && 'publish' === get_post_status( $from ) && 'publish' === get_post_status( $to ) && $ref['readinessVersion'] > 0;
        if ( $ref['exists'] ) {
            $r = $matches[0];
            $ref['pricingMode'] = in_array( $r['pricing_mode'] ?? null, array( 'fixed', 'contact', 'disabled' ), true ) ? $r['pricing_mode'] : 'disabled';
            // WordPress numeric meta may be a canonical decimal string; never infer fixed from it.
            $price = $r['price'] ?? null;
            if ( is_string( $price ) && preg_match( '/^[1-9]\d{0,15}$/D', $price ) ) $price = (int) $price;
            if ( 'fixed' === $ref['pricingMode'] && self::integer( $price ) ) $ref['normalPriceVnd'] = (int) $price;
        }
        return $ref;
    }
    public static function presentation( int $id, ?array $stored, ?callable $reference = null, ?int $now = null, ?callable $title = null ): ?array {
        $now = $now ?? time(); $m = $stored['model'] ?? null; $stamp = $stored['confirmation'] ?? null;
        if ( $id < 1 || 'eligible' !== self::assess( $m, $reference, $now )['state'] || ! self::object( $stamp, array( 'actor', 'at', 'revision', 'source_ref' ) ) || ! self::integer( $stamp['actor'] ) || $stamp['revision'] !== $m['revision'] || $stamp['source_ref'] !== $m['approval']['source_ref'] || null === self::instant( $stamp['at'] ) || self::instant( $stamp['at'] ) > $now ) return null;
        $labels = array();
        foreach ( array( 'origin_location_id', 'destination_location_id', 'vehicle_id' ) as $key ) {
            $label = $title ? $title( $m['scope'][$key] ) : get_the_title( $m['scope'][$key] );
            if ( ! self::text( $label ) ) return null;
            $labels[] = $label;
        }
        return array( 'id' => $id, 'revision' => $m['revision'], 'origin' => $labels[0], 'destination' => $labels[1], 'vehicle' => $labels[2], 'direction' => $m['scope']['direction'], 'package_key' => 'one_way', 'departure' => $m['departure'], 'valid_from' => $m['valid_from'], 'expires_at' => $m['expires_at'], 'normal_price_vnd' => $m['prices']['normal_price_vnd'], 'special_price_vnd' => $m['prices']['special_price_vnd'], 'currency' => 'VND', 'basis' => 'base_price' );
    }
    public static function assess( $input, ?callable $reference = null, ?int $now = null ): array {
        $checked = self::validate( $input, $reference ); $now = $now ?? time(); $state = 'invalid';
        if ( $checked['valid'] ) {
            $m = $checked['model'];
            if ( in_array( $m['status'], array( 'draft', 'inactive', 'reserved', 'completed', 'cancelled' ), true ) ) $state = $m['status'];
            elseif ( $now >= self::instant( $m['expires_at'] ) || $now >= self::departure_at( $m['departure'] ) ) $state = 'expired';
            elseif ( $now < self::instant( $m['valid_from'] ) ) $state = 'not_yet_available';
            else $state = 'eligible';
        }
        return array( 'state' => $state, 'sellable' => false, 'commercial_enabled' => self::COMMERCIAL_ENABLED, 'robots' => 'noindex,nofollow', 'sitemap' => false, 'public_url' => null );
    }
}
Gocar_Empty_Leg::boot();
