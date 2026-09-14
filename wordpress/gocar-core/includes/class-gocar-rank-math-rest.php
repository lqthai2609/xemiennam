<?php
/**
 * Expose the Rank Math SEO fields required by the headless frontend.
 *
 * Day 10 scope is intentionally limited to the `diem_den` CPT. Existing
 * WPCode contracts for other post types remain untouched until they are
 * migrated into Gocar Core in a separate, acceptance-tested step.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Rank_Math_REST {
    /**
     * Register hooks.
     */
    public static function boot(): void {
        add_action( 'rest_api_init', array( __CLASS__, 'register_fields' ) );
    }

    /**
     * Register read-only SEO fields on the Province Hub REST response.
     */
    public static function register_fields(): void {
        register_rest_field(
            'diem_den',
            'rank_math_title',
            array(
                'get_callback' => array( __CLASS__, 'get_rank_math_title' ),
                'schema'       => array(
                    'description' => 'Rank Math SEO title for the destination hub.',
                    'type'        => 'string',
                    'context'     => array( 'view', 'edit' ),
                    'readonly'    => true,
                ),
            )
        );

        register_rest_field(
            'diem_den',
            'rank_math_description',
            array(
                'get_callback' => array( __CLASS__, 'get_rank_math_description' ),
                'schema'       => array(
                    'description' => 'Rank Math SEO description for the destination hub.',
                    'type'        => 'string',
                    'context'     => array( 'view', 'edit' ),
                    'readonly'    => true,
                ),
            )
        );
    }

    /**
     * Return the stored Rank Math title without inventing a fallback value.
     * The Next.js metadata layer already owns the fallback policy.
     *
     * @param array<string,mixed> $object REST post object.
     */
    public static function get_rank_math_title( array $object ): string {
        return self::get_post_meta_value( $object, 'rank_math_title' );
    }

    /**
     * Return the stored Rank Math description without inventing a fallback value.
     *
     * @param array<string,mixed> $object REST post object.
     */
    public static function get_rank_math_description( array $object ): string {
        return self::get_post_meta_value( $object, 'rank_math_description' );
    }

    /**
     * Read one Rank Math post-meta value safely.
     *
     * @param array<string,mixed> $object REST post object.
     */
    private static function get_post_meta_value( array $object, string $meta_key ): string {
        $post_id = isset( $object['id'] ) ? absint( $object['id'] ) : 0;
        if ( 0 === $post_id ) {
            return '';
        }

        $value = get_post_meta( $post_id, $meta_key, true );
        return is_string( $value ) ? $value : '';
    }
}

Gocar_Rank_Math_REST::boot();
