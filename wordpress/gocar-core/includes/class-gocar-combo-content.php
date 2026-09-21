<?php
/**
 * Route × Vehicle editorial content for combo landing pages.
 *
 * Stores one hand-written description per route + vehicle post in route meta
 * `combo_descriptions`, exposes it through the WP REST meta object, and adds a
 * small route edit-screen meta box for editors.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Combo_Content {
    private const META_KEY     = 'combo_descriptions';
    private const NONCE_ACTION = 'gocar_save_combo_descriptions';
    private const NONCE_NAME   = 'gocar_combo_descriptions_nonce';

    /** Register hooks. */
    public static function boot(): void {
        add_action( 'init', array( __CLASS__, 'register_meta' ), 20 );
        add_action( 'add_meta_boxes_route', array( __CLASS__, 'register_meta_box' ) );
        add_action( 'save_post_route', array( __CLASS__, 'save_meta' ), 10, 2 );
    }

    /** Register the source-controlled REST contract. */
    public static function register_meta(): void {
        register_post_meta(
            'route',
            self::META_KEY,
            array(
                'type'              => 'array',
                'single'            => true,
                'default'           => array(),
                'sanitize_callback' => array( __CLASS__, 'sanitize_rows' ),
                'auth_callback'     => static function (): bool {
                    return current_user_can( 'edit_posts' );
                },
                'show_in_rest'      => array(
                    'schema' => array(
                        'description' => 'Hand-written Route × Vehicle descriptions for combo landing pages.',
                        'type'        => 'array',
                        'default'     => array(),
                        'items'       => array(
                            'type'                 => 'object',
                            'additionalProperties' => false,
                            'required'             => array( 'vehicle_id', 'description' ),
                            'properties'           => array(
                                'vehicle_id'  => array(
                                    'type'    => 'integer',
                                    'minimum' => 1,
                                ),
                                'description' => array(
                                    'type' => 'string',
                                ),
                            ),
                        ),
                    ),
                ),
            )
        );
    }

    /** Add the editor UI to route posts only. */
    public static function register_meta_box(): void {
        add_meta_box(
            'gocar-route-vehicle-content',
            'Alo Đặt Xe — Nội dung Route × Vehicle',
            array( __CLASS__, 'render_meta_box' ),
            'route',
            'normal',
            'default'
        );
    }

    /** Render one textarea per vehicle post. */
    public static function render_meta_box( \WP_Post $post ): void {
        wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

        $rows = self::sanitize_rows( get_post_meta( $post->ID, self::META_KEY, true ) );
        $by_vehicle_id = array();
        foreach ( $rows as $row ) {
            $by_vehicle_id[ (int) $row['vehicle_id'] ] = (string) $row['description'];
        }

        $vehicles = get_posts(
            array(
                'post_type'      => 'vehicle',
                'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
                'posts_per_page' => -1,
                'orderby'        => 'title',
                'order'          => 'ASC',
            )
        );

        echo '<p>Nội dung này là nguồn biên tập riêng cho từng tổ hợp tuyến + xe. Không chép cùng một đoạn cho nhiều loại xe và không hard-code giá vào mô tả.</p>';

        if ( empty( $vehicles ) ) {
            echo '<p><em>Chưa có vehicle post để gắn nội dung combo.</em></p>';
            return;
        }

        foreach ( $vehicles as $vehicle ) {
            $terms = wp_get_post_terms( $vehicle->ID, 'vehicle_type', array( 'fields' => 'names' ) );
            $type_label = ( ! is_wp_error( $terms ) && ! empty( $terms ) ) ? implode( ', ', $terms ) : '';
            $label = $type_label ? $type_label . ' — ' . $vehicle->post_title : $vehicle->post_title;
            $value = $by_vehicle_id[ $vehicle->ID ] ?? '';

            printf(
                '<p><label for="gocar-combo-%1$d"><strong>%2$s</strong></label><br><textarea id="gocar-combo-%1$d" name="gocar_combo_descriptions[%1$d]" rows="5" style="width:100%%;max-width:1100px">%3$s</textarea></p>',
                (int) $vehicle->ID,
                esc_html( $label ),
                esc_textarea( $value )
            );
        }
    }

    /** Save route combo descriptions from the meta box. */
    public static function save_meta( int $post_id, \WP_Post $post ): void {
        if ( 'route' !== $post->post_type ) {
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

        $submitted = isset( $_POST['gocar_combo_descriptions'] ) && is_array( $_POST['gocar_combo_descriptions'] )
            ? wp_unslash( $_POST['gocar_combo_descriptions'] )
            : array();

        $rows = array();
        foreach ( $submitted as $vehicle_id => $description ) {
            $rows[] = array(
                'vehicle_id'  => $vehicle_id,
                'description' => $description,
            );
        }
        $rows = self::sanitize_rows( $rows );

        if ( empty( $rows ) ) {
            delete_post_meta( $post_id, self::META_KEY );
            return;
        }

        update_post_meta( $post_id, self::META_KEY, $rows );
    }

    /**
     * Normalize REST/admin input and drop invalid, empty or duplicate vehicle rows.
     *
     * @param mixed $value Raw post-meta value.
     * @return array<int,array{vehicle_id:int,description:string}>
     */
    public static function sanitize_rows( $value ): array {
        if ( ! is_array( $value ) ) {
            return array();
        }

        $clean = array();
        $seen  = array();

        foreach ( $value as $row ) {
            if ( ! is_array( $row ) ) {
                continue;
            }

            $vehicle_id = isset( $row['vehicle_id'] ) ? absint( $row['vehicle_id'] ) : 0;
            $description = isset( $row['description'] ) ? sanitize_textarea_field( (string) $row['description'] ) : '';

            if ( 0 === $vehicle_id || '' === $description || isset( $seen[ $vehicle_id ] ) ) {
                continue;
            }

            if ( 'vehicle' !== get_post_type( $vehicle_id ) ) {
                continue;
            }

            $seen[ $vehicle_id ] = true;
            $clean[] = array(
                'vehicle_id'  => $vehicle_id,
                'description' => $description,
            );
        }

        return $clean;
    }
}

Gocar_Combo_Content::boot();
