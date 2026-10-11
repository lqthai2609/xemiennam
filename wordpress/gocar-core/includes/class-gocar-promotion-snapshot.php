<?php
/** Day 45: private immutable server estimate; never public post meta or SEO data. */
if ( ! defined( 'ABSPATH' ) ) { exit; }
final class Gocar_Promotion_Snapshot {
    public const META_KEY = '_gocar_promotion_snapshot_v1';
    private static bool $writing = false;
    public static function boot(): void {
        add_filter( 'add_post_metadata', array( self::class, 'guard' ), 10, 5 );
        add_filter( 'update_post_metadata', array( self::class, 'guard' ), 10, 5 );
        add_filter( 'delete_post_metadata', array( self::class, 'guard' ), 10, 5 );
    }
    public static function guard( $check, $id, $key, $value, $previous ) {
        return self::META_KEY === $key && ! self::$writing ? false : $check;
    }
    public static function read( int $id ): ?array {
        $value = get_post_meta( $id, self::META_KEY, true );
        return is_array( $value ) ? $value : null;
    }
    /** Only lifecycle calls this with the winning durable reservation, never current pricing. */
    public static function save( int $id, array $snapshot ): bool {
        $existing = self::read( $id );
        if ( null !== $existing ) { return $existing === $snapshot; }
        self::$writing = true;
        try { add_post_meta( $id, self::META_KEY, $snapshot, true ); }
        finally { self::$writing = false; }
        return self::read( $id ) === $snapshot;
    }
    private static function keys( $value, array $keys ): bool {
        if ( ! is_array( $value ) ) { return false; }
        $actual = array_keys( $value ); sort( $actual ); sort( $keys ); return $actual === $keys;
    }
    private static function money( $value, int $min = 0 ): bool { return is_int( $value ) && $value >= $min && $value <= 9007199254740991; }
    private static function text( $value, int $max = 100 ): bool { return is_string( $value ) && strlen( $value ) <= $max; }
    private static function strings( $values, int $max = 100, int $length = 240 ): bool {
        if ( ! is_array( $values ) || ! array_is_list( $values ) || count( $values ) > $max ) { return false; }
        foreach ( $values as $value ) { if ( ! self::text( $value, $length ) ) { return false; } } return true;
    }
    public static function matches_booking( array $s, array $meta ): bool {
        $p = $s['pricing'];
        $expected = array( 'pricing_resolution_mode' => $p['mode'], 'pricing_resolution_reason' => $p['reason'], 'surcharge_mode' => $p['surcharge']['mode'] );
        foreach ( $expected as $k => $v ) { if ( ( $meta[$k] ?? null ) !== $v ) { return false; } }
        foreach ( array( 'base_price_snapshot' => $p['base_price'], 'estimated_total' => $p['estimated_total'], 'price_modifier_amount' => $p['modifier_amount'], 'surcharge_amount' => $p['surcharge']['amount'] ) as $k => $v ) {
            if ( ( $meta[$k] ?? null ) !== ( $v ?: null ) ) { return false; }
        }
        if ( null !== $s['tuple'] && ( ( $meta['tuyen_quan_tam'] ?? null ) !== $s['tuple']['route_id'] || ( $meta['loai_xe_dat'] ?? null ) !== $s['tuple']['vehicle_id'] ) ) { return false; }
        return true;
    }

    /** Validate the trusted gateway's projection. Public callers cannot reach this contract. */
    public static function valid( $s, bool $commercial_enabled = false ): bool {
        if ( ! self::keys( $s, array( 'snapshot_version','evaluator_version','pricing_version','estimate_only','currency','timezone','evaluation_time','tuple','pricing','promotion','rule_versions' ) )
            || 1 !== $s['snapshot_version'] || 1 !== $s['evaluator_version'] || 2 !== $s['pricing_version'] || true !== $s['estimate_only']
            || 'VND' !== $s['currency'] || 'Asia/Ho_Chi_Minh' !== $s['timezone'] || ! self::text( $s['evaluation_time'], 30 )
            || ! preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/', $s['evaluation_time'] ) || false === strtotime( $s['evaluation_time'] ) ) { return false; }
        $t = $s['tuple'];
        if ( null !== $t && ( ! self::keys( $t, array( 'route_id','direction','vehicle_id','package_key' ) ) || ! self::money( $t['route_id'], 1 ) || ! self::money( $t['vehicle_id'], 1 )
            || ! in_array( $t['direction'], array( 'outbound','inbound' ), true ) || ! is_string( $t['package_key'] ) || ! preg_match( '/^[a-z0-9_-]{1,80}$/', $t['package_key'] ) ) ) { return false; }
        $p = $s['pricing']; $m = $s['promotion'];
        if ( ! self::keys( $p, array( 'mode','reason','base_price','estimated_total','modifier_amount','surcharge','modifiers','condition' ) )
            || ! in_array( $p['mode'], array( 'fixed','contact','disabled' ), true ) || ! self::text( $p['reason'] )
            || ! self::keys( $m, array( 'status','reason','promotion_id','revision','type','target','discount_amount','promotional_estimated_total','window','conditions','requires_trip_context','benefit' ) )
            || ! in_array( $m['status'], array( 'none','applied','benefit','ambiguous' ), true ) || ! self::text( $m['reason'] ) || ! is_bool( $m['requires_trip_context'] )
            || ! self::strings( $m['conditions'], 20, 500 ) ) { return false; }
        foreach ( array( 'base_price','estimated_total','modifier_amount' ) as $k ) { if ( null !== $p[$k] && ! self::money( $p[$k], 'modifier_amount' === $k ? 0 : 1 ) ) { return false; } }
        $c = $p['condition']; $a = $p['surcharge'];
        if ( ! self::keys( $c, array( 'mode','amount','rule_key','reason','policy_version','timezone' ) ) || ! self::keys( $a, array( 'mode','amount','reason','rule_keys','components' ) )
            || ! self::strings( $a['rule_keys'] ) || ! is_array( $a['components'] ) || ! array_is_list( $a['components'] ) || count( $a['components'] ) > 100
            || ! self::money( $c['policy_version'] ) || ! self::text( $c['timezone'] ) || ( null !== $c['rule_key'] && ! self::text( $c['rule_key'] ) ) ) { return false; }
        foreach ( array( $a,$c ) as $charge ) {
            if ( ! in_array( $charge['mode'], array( 'none','fixed','contact' ), true ) || ! self::text( $charge['reason'] )
                || ( null !== $charge['amount'] && ! self::money( $charge['amount'] ) ) || ( 'fixed' === $charge['mode'] && ! self::money( $charge['amount'], 1 ) )
                || ( 'none' === $charge['mode'] && null !== $charge['amount'] && 0 !== $charge['amount'] ) ) { return false; }
        }
        foreach ( $a['components'] as $row ) {
            if ( ! self::keys( $row, array( 'rule_key','policy_version','application_key','mode','amount' ) ) || ( null !== $row['rule_key'] && ! self::text( $row['rule_key'] ) )
                || ! self::money( $row['policy_version'] ) || ! self::text( $row['application_key'] ) || ! in_array( $row['mode'], array( 'fixed','none' ), true )
                || ! self::money( $row['amount'], 'fixed' === $row['mode'] ? 1 : 0 ) || ( 'none' === $row['mode'] && 0 !== $row['amount'] ) ) { return false; }
        }
        if ( ! is_array( $p['modifiers'] ) || ! array_is_list( $p['modifiers'] ) || count( $p['modifiers'] ) > 4 ) { return false; }
        $modifier_total = 0;
        foreach ( $p['modifiers'] as $row ) {
            if ( ! self::keys( $row, array( 'type','quantity','billable_units','mode','amount','rule_key','reason' ) ) || ! in_array( $row['type'], array( 'extra_stop','waiting_minute','overtime_hour','extra_km' ), true )
                || ! ( is_int( $row['quantity'] ) || is_float( $row['quantity'] ) ) || ! ( is_int( $row['billable_units'] ) || is_float( $row['billable_units'] ) ) || $row['quantity'] < 0 || $row['billable_units'] < 0
                || ! in_array( $row['mode'], array( 'none','fixed','contact' ), true ) || ! self::text( $row['reason'] ) || ( null !== $row['rule_key'] && ! self::text( $row['rule_key'] ) )
                || ( null !== $row['amount'] && ! self::money( $row['amount'] ) ) || ( 'fixed' === $row['mode'] && ! self::money( $row['amount'], 1 ) )
                || ( 'none' === $row['mode'] && null !== $row['amount'] && 0 !== $row['amount'] ) ) { return false; }
            if ( 'fixed' === $p['mode'] && 'contact' === $row['mode'] ) { return false; }
            $modifier_total += $row['amount'] ?? 0;
        }
        if ( 'fixed' === $p['mode'] ) {
            if ( ! self::money( $p['base_price'], 1 ) || ! self::money( $p['estimated_total'], 1 ) || 'contact' === $a['mode'] || 'contact' === $c['mode']
                || ( null !== $p['modifier_amount'] && $p['modifier_amount'] !== $modifier_total )
                || $p['base_price'] + ( $a['amount'] ?? 0 ) + ( $c['amount'] ?? 0 ) + $modifier_total !== $p['estimated_total'] ) { return false; }
        } elseif ( null !== $p['estimated_total'] ) { return false; }
        $chosen = in_array( $m['status'], array( 'applied','benefit' ), true );
        if ( $chosen ) {
            if ( ! $commercial_enabled || 'fixed' !== $p['mode'] || null === $t || 'applied' !== $m['reason'] || ! self::money( $m['promotion_id'], 1 ) || ! self::money( $m['revision'], 1 )
                || ! in_array( $m['type'], array( 'percent_discount','fixed_discount','special_price','free_surcharge','benefit' ), true ) || ! in_array( $m['target'], array( 'base_price','estimated_total','surcharge','none' ), true )
                || ! self::money( $m['discount_amount'], 'benefit' === $m['status'] ? 0 : 1 ) || ! self::money( $m['promotional_estimated_total'], 1 )
                || $p['estimated_total'] - $m['discount_amount'] !== $m['promotional_estimated_total']
                || ! self::keys( $m['window'], array( 'start_date','end_date','timezone' ) ) || 'Asia/Ho_Chi_Minh' !== $m['window']['timezone'] ) { return false; }
            foreach ( array( 'start_date','end_date' ) as $k ) {
                $date = $m['window'][$k]; if ( ! is_string( $date ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) || date( 'Y-m-d', strtotime( $date ) ) !== $date ) { return false; }
            }
            if ( $m['window']['start_date'] > $m['window']['end_date'] ) { return false; }
            $evaluated = strtotime( $s['evaluation_time'] );
            $start = strtotime( $m['window']['start_date'] . 'T00:00:00+07:00' );
            $end = strtotime( $m['window']['end_date'] . 'T00:00:00+07:00' ) + 86400;
            if ( $evaluated < $start || $evaluated >= $end ) { return false; }
            if ( in_array( $m['type'], array( 'percent_discount','fixed_discount' ), true ) && ! in_array( $m['target'], array( 'base_price','estimated_total' ), true ) ) { return false; }
            if ( 'special_price' === $m['type'] && 'base_price' !== $m['target'] ) { return false; }
            if ( 'free_surcharge' === $m['type'] && 'surcharge' !== $m['target'] ) { return false; }
            $eligible = 'base_price' === $m['target'] ? $p['base_price'] : ( 'surcharge' === $m['target'] ? ( $a['amount'] ?? 0 ) : $p['estimated_total'] );
            if ( 'applied' === $m['status'] && ( $m['discount_amount'] > $eligible || ( 'surcharge' !== $m['target'] && $m['discount_amount'] >= $eligible ) ) ) { return false; }
            if ( 'benefit' === $m['status'] ) {
                if ( 'benefit' !== $m['type'] || 'none' !== $m['target'] || 0 !== $m['discount_amount'] || ! self::keys( $m['benefit'], array( 'title','rule' ) )
                    || ! self::text( $m['benefit']['title'], 300 ) || ! self::text( $m['benefit']['rule'], 1000 ) ) { return false; }
            } elseif ( 'benefit' === $m['type'] || 'none' === $m['target'] || null !== $m['benefit'] ) { return false; }
        } else {
            if ( 'applied' === $m['reason'] ) { return false; }
            foreach ( array( 'promotion_id','revision','type','target','discount_amount','promotional_estimated_total','window','benefit' ) as $k ) { if ( null !== $m[$k] ) { return false; } }
        }
        if ( ! self::keys( $s['rule_versions'], array( 'surcharge','modifier','condition' ) ) ) { return false; }
        foreach ( $s['rule_versions'] as $v ) { if ( ! self::money( $v ) ) { return false; } }
        return true;
    }
}
Gocar_Promotion_Snapshot::boot();
