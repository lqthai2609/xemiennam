<?php
/**
 * Structured semantic relations for WordPress blog posts.
 *
 * Province and vehicle relations reuse the existing `province` and `vehicle_type`
 * taxonomies. Airport relation points directly to Location V2 entities whose
 * `location_type` is `airport`; no parallel airport taxonomy is introduced.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Blog_Relations {
    private const AIRPORT_META_KEY = 'related_airport_location_ids';
    private const NONCE_ACTION     = 'gocar_save_blog_relations';
    private const NONCE_NAME       = 'gocar_blog_relations_nonce';

    /** Register hooks. */
    public static function boot(): void {
        add_action( 'init', array( __CLASS__, 'attach_existing_taxonomies' ), 30 );
        add_action( 'init', array( __CLASS__, 'register_meta' ), 30 );
        add_action( 'add_meta_boxes_post', array( __CLASS__, 'register_meta_box' ) );
        add_action( 'save_post_post', array( __CLASS__, 'save_meta' ), 10, 2 );
    }

    /**
     * Attach the already-existing semantic taxonomies to posts when available.
     *
     * Taxonomy registration itself remains owned by the existing CMS contract;
     * this module only guarantees that blog posts can participate in those
     * relations without duplicating taxonomy definitions.
     */
    public static function attach_existing_taxonomies(): void {
        foreach ( array( 'province', 'vehicle_type' ) as $taxonomy ) {
            if ( taxonomy_exists( $taxonomy ) ) {
                register_taxonomy_for_object_type( $taxonomy, 'post' );
            }
        }
    }

    /** Register the airport relation in the REST-visible post meta contract. */
    public static function register_meta(): void {
        register_post_meta(
            'post',
            self::AIRPORT_META_KEY,
            array(
                'type'              => 'array',
                'single'            => true,
                'default'           => array(),
                'sanitize_callback' => array( __CLASS__, 'sanitize_airport_ids' ),
                'auth_callback'     => static function (): bool {
                    return current_user_can( 'edit_posts' );
                },
                'show_in_rest'      => array(
                    'schema' => array(
                        'description' => 'Location V2 IDs for airports semantically related to this blog post.',
                        'type'        => 'array',
                        'default'     => array(),
                        'items'       => array(
                            'type'    => 'integer',
                            'minimum' => 1,
                        ),
                    ),
                ),
            )
        );
    }

    /** Add the airport relation editor to normal WordPress posts. */
    public static function register_meta_box(): void {
        add_meta_box(
            'gocar-blog-relations',
            'Alo Đặt Xe — Quan hệ nội dung',
            array( __CLASS__, 'render_meta_box' ),
            'post',
            'side',
            'default'
        );
    }

    /** Render airport Location V2 checkboxes. */
    public static function render_meta_box( \WP_Post $post ): void {
        wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

        $selected_ids = self::sanitize_airport_ids( get_post_meta( $post->ID, self::AIRPORT_META_KEY, true ) );
        $selected_map = array_fill_keys( $selected_ids, true );

        $airports = get_posts(
            array(
                'post_type'      => 'location',
                'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
                'posts_per_page' => -1,
                'orderby'        => 'title',
                'order'          => 'ASC',
                'meta_key'       => 'location_type',
                'meta_value'     => 'airport',
            )
        );

        echo '<p>Province và loại xe dùng taxonomy hiện có. Chỉ chọn sân bay có quan hệ trực tiếp với nội dung bài viết.</p>';

        if ( empty( $airports ) ) {
            echo '<p><em>Chưa có Location loại airport để gắn quan hệ.</em></p>';
            return;
        }

        foreach ( $airports as $airport ) {
            $checked = isset( $selected_map[ $airport->ID ] ) ? ' checked' : '';
            printf(
                '<label style="display:block;margin:0 0 6px"><input type="checkbox" name="gocar_related_airport_location_ids[]" value="%1$d"%2$s> %3$s</label>',
                (int) $airport->ID,
                $checked,
                esc_html( $airport->post_title )
            );
        }
    }

    /** Save structured airport relations from the post edit screen. */
    public static function save_meta( int $post_id, \WP_Post $post ): void {
        if ( 'post' !== $post->post_type ) {
            return;
        }

        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }

        if ( ! isset( $_POST[ self::NONCE_NAME ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE_NAME ] ) ), self::NONCE_ACTION ) ) {
            return;
        }

        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }

        $submitted = isset( $_POST['gocar_related_airport_location_ids'] ) && is_array( $_POST['gocar_related_airport_location_ids'] )
            ? wp_unslash( $_POST['gocar_related_airport_location_ids'] )
            : array();

        $airport_ids = self::sanitize_airport_ids( $submitted );

        if ( empty( $airport_ids ) ) {
            delete_post_meta( $post_id, self::AIRPORT_META_KEY );
            return;
        }

        update_post_meta( $post_id, self::AIRPORT_META_KEY, $airport_ids );
    }

    /**
     * Keep only unique Location V2 IDs that are explicitly typed as airports.
     *
     * @param mixed $value Raw REST/admin meta value.
     * @return int[]
     */
    public static function sanitize_airport_ids( $value ): array {
        if ( ! is_array( $value ) ) {
            return array();
        }

        $clean = array();
        $seen  = array();

        foreach ( $value as $raw_id ) {
            $location_id = absint( $raw_id );
            if ( 0 === $location_id || isset( $seen[ $location_id ] ) ) {
                continue;
            }

            if ( 'location' !== get_post_type( $location_id ) ) {
                continue;
            }

            $location_type = strtolower( trim( (string) get_post_meta( $location_id, 'location_type', true ) ) );
            if ( 'airport' !== $location_type ) {
                continue;
            }

            $seen[ $location_id ] = true;
            $clean[] = $location_id;
        }

        sort( $clean, SORT_NUMERIC );
        return $clean;
    }
}

Gocar_Blog_Relations::boot();
