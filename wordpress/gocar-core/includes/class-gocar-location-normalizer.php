<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Location_Normalizer {
    public static function normalize( $raw ) {
        $label = html_entity_decode( wp_strip_all_tags( (string) $raw ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
        $label = preg_replace( '/\s+/u', ' ', trim( $label ) );

        // Package/duration belongs to Pricing, not Location.
        $label = preg_replace( '/\s+\d+\s*(?:ngày|ngay)(?:\s+\d+\s*(?:đêm|dem))?\s*$/iu', '', $label );
        $label = preg_replace( '/\s+\d+\s*n\s*\d+\s*[đd]\s*$/iu', '', $label );
        $label = trim( preg_replace( '/\s+/u', ' ', $label ) );

        $key = self::comparison_key( $label );
        if ( in_array( $key, array( 'tphcm', 'tp hcm', 'tp ho chi minh', 'thanh pho ho chi minh', 'ho chi minh', 'sai gon' ), true ) ) {
            return 'TP. Hồ Chí Minh';
        }

        if ( preg_match( '/^TP\s+(.+)$/iu', $label, $matches ) ) {
            $label = 'TP. ' . trim( $matches[1] );
        }

        return trim( $label );
    }

    public static function slug( $label ) {
        return sanitize_title( (string) $label );
    }

    public static function needs_review( $label ) {
        return (bool) preg_match( '/[\/()]/u', (string) $label );
    }

    private static function comparison_key( $value ) {
        $value = remove_accents( wp_strip_all_tags( (string) $value ) );
        $value = strtolower( $value );
        $value = preg_replace( '/[^a-z0-9]+/', ' ', $value );
        return trim( preg_replace( '/\s+/', ' ', $value ) );
    }
}
