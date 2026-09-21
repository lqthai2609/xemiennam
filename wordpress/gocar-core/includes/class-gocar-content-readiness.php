<?php
/**
 * SEO-005 content-readiness fields for route records.
 *
 * Version 0 keeps the contract inactive. Version 1+ requires explicit public-safe
 * editorial, service, canonical, mapping, indexability and schema states.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Content_Readiness {
    /** Register hooks. */
    public static function boot(): void {
        add_action( 'init', array( __CLASS__, 'register_meta' ), 25 );
    }

    /** Register source-controlled REST fields without activating production policy. */
    public static function register_meta(): void {
        self::register_integer( 'content_readiness_version', 0 );
        self::register_enum( 'content_editorial_state', array( 'missing', 'draft', 'review', 'ready' ), 'missing' );
        self::register_enum( 'content_service_state', array( 'unknown', 'prelaunch', 'live', 'paused' ), 'unknown' );
        self::register_enum( 'content_canonical_state', array( 'missing', 'candidate', 'verified' ), 'missing' );
        self::register_enum( 'content_mapping_state', array( 'clear', 'd35_10_blocked' ), 'clear' );
        self::register_enum( 'content_indexability_state', array( 'noindex', 'index' ), 'noindex' );
        self::register_enum( 'content_schema_state', array( 'none', 'service', 'offer' ), 'none' );
        self::register_string( 'content_readiness_reason', 'sanitize_key' );
        self::register_string( 'content_source_ref', 'sanitize_text_field' );
    }

    private static function common_args( string $type, $default, callable $sanitize_callback ): array {
        return array(
            'type'              => $type,
            'single'            => true,
            'default'           => $default,
            'sanitize_callback' => $sanitize_callback,
            'auth_callback'     => static function (): bool {
                return current_user_can( 'edit_posts' );
            },
            'show_in_rest'      => array(
                'schema' => array(
                    'type'    => $type,
                    'default' => $default,
                ),
            ),
        );
    }

    private static function register_integer( string $key, int $default ): void {
        register_post_meta(
            'route',
            $key,
            self::common_args(
                'integer',
                $default,
                static function ( $value ): int {
                    return max( 0, absint( $value ) );
                }
            )
        );
    }

    private static function register_enum( string $key, array $allowed, string $default ): void {
        $args = self::common_args(
            'string',
            $default,
            static function ( $value ) use ( $allowed, $default ): string {
                $normalized = sanitize_key( (string) $value );
                return in_array( $normalized, $allowed, true ) ? $normalized : $default;
            }
        );
        $args['show_in_rest']['schema']['enum'] = $allowed;
        register_post_meta( 'route', $key, $args );
    }

    private static function register_string( string $key, callable $sanitize_callback ): void {
        register_post_meta( 'route', $key, self::common_args( 'string', '', $sanitize_callback ) );
    }
}

Gocar_Content_Readiness::boot();

