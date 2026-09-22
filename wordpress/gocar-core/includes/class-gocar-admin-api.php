<?php
/**
 * CORE-ADMIN-002 — authenticated draft, approval, audit and rollback API.
 *
 * The browser never writes to the WordPress core post endpoints directly. Every mutation is
 * validated here, recorded as a private draft, approved by a user with publish_posts, and
 * written together with a before/after audit snapshot.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Gocar_Admin_API {
    private const REST_NAMESPACE = 'gocar/v1';
    private const DRAFT_POST_TYPE = 'gocar_admin_draft';
    private const AUDIT_POST_TYPE = 'gocar_admin_audit';
    private const CONTRACT_VERSION = 1;
    private const MAX_REASON_LENGTH = 500;
    private const MAX_PRICE = 9007199254740991;

    /** Long Thành airport/locality remain PRELAUNCH until a separate receipt explicitly unlocks them. */
    private const PRELAUNCH_LOCATION_IDS = array( 9102, 9154 );

    /** D35-10 remains OPEN/P0 for these unordered endpoint pairs and existing Route records. */
    private const D35_10_ENDPOINT_PAIRS = array(
        '9118:9119',
        '9118:9120',
        '9118:9123',
        '9118:9138',
        '9118:9139',
        '9115:9118',
        '9118:9140',
        '9118:9144',
        '9118:9184',
    );

    private const D35_10_ROUTE_IDS = array(
        9095, 9026, 9079, 48, 9076, 9075, 44, 9059, 9058, 9057, 9056,
        9055, 9054, 41, 9053, 9052, 42, 9048, 9047, 9006, 9005,
    );

    private const SNAPSHOT_META_KEYS = array(
        'route_model_version',
        'origin_location_id',
        'destination_location_id',
        'outbound_enabled',
        'outbound_featured_package',
        'inbound_enabled',
        'inbound_featured_package',
        'pricing_model_version',
        'pricing_packages_v2',
        'content_mapping_state',
        'content_service_state',
    );

    public static function boot(): void {
        add_action( 'init', array( self::class, 'register_private_post_types' ), 30 );
        add_action( 'rest_api_init', array( self::class, 'register_routes' ) );
    }

    public static function register_private_post_types(): void {
        $common = array(
            'public'              => false,
            'publicly_queryable'  => false,
            'exclude_from_search' => true,
            'show_ui'             => false,
            'show_in_rest'        => false,
            'supports'            => array( 'title', 'editor', 'author' ),
            'map_meta_cap'        => true,
        );

        register_post_type( self::DRAFT_POST_TYPE, $common );
        register_post_type( self::AUDIT_POST_TYPE, $common );
    }

    public static function register_routes(): void {
        register_rest_route(
            self::REST_NAMESPACE,
            '/admin/session',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( self::class, 'session' ),
                'permission_callback' => array( self::class, 'can_edit' ),
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/admin/drafts',
            array(
                array(
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'            => array( self::class, 'list_drafts' ),
                    'permission_callback' => array( self::class, 'can_edit' ),
                ),
                array(
                    'methods'             => WP_REST_Server::CREATABLE,
                    'callback'            => array( self::class, 'save_draft' ),
                    'permission_callback' => array( self::class, 'can_edit' ),
                ),
            )
        );

        foreach ( array( 'validate', 'submit', 'publish' ) as $action ) {
            register_rest_route(
                self::REST_NAMESPACE,
                '/admin/drafts/(?P<id>\d+)/' . $action,
                array(
                    'methods'             => WP_REST_Server::CREATABLE,
                    'callback'            => array( self::class, $action . '_draft' ),
                    'permission_callback' => 'publish' === $action ? array( self::class, 'can_publish' ) : array( self::class, 'can_edit' ),
                    'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
                )
            );
        }

        register_rest_route(
            self::REST_NAMESPACE,
            '/admin/drafts/(?P<id>\d+)',
            array(
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => array( self::class, 'delete_draft' ),
                'permission_callback' => array( self::class, 'can_edit' ),
                'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/admin/routes/(?P<id>\d+)/archive',
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( self::class, 'archive_route' ),
                'permission_callback' => array( self::class, 'can_publish' ),
                'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/admin/audit',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( self::class, 'list_audit' ),
                'permission_callback' => array( self::class, 'can_edit' ),
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/admin/audit/(?P<id>\d+)/rollback',
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( self::class, 'rollback' ),
                'permission_callback' => array( self::class, 'can_publish' ),
                'args'                => array( 'id' => array( 'sanitize_callback' => 'absint' ) ),
            )
        );
    }

    public static function can_edit(): bool {
        return current_user_can( 'edit_posts' );
    }

    public static function can_publish(): bool {
        return current_user_can( 'publish_posts' );
    }

    public static function session(): WP_REST_Response {
        $user = wp_get_current_user();
        return rest_ensure_response(
            array(
                'id'         => (int) $user->ID,
                'name'       => sanitize_text_field( $user->display_name ?: $user->user_login ),
                'canPublish' => self::can_publish(),
                'contract'   => self::CONTRACT_VERSION,
            )
        );
    }

    public static function list_drafts(): WP_REST_Response {
        $args = array(
            'post_type'      => self::DRAFT_POST_TYPE,
            'post_status'    => array( 'draft', 'pending', 'publish', 'trash' ),
            'posts_per_page' => 50,
            'orderby'        => 'modified',
            'order'          => 'DESC',
        );
        if ( ! self::can_publish() ) {
            $args['author'] = get_current_user_id();
        }

        $posts = get_posts( $args );
        return rest_ensure_response( array_map( array( self::class, 'draft_response' ), $posts ) );
    }

    public static function save_draft( WP_REST_Request $request ) {
        $params = $request->get_json_params();
        $params = is_array( $params ) ? $params : array();
        $draft_id = absint( $params['id'] ?? 0 );
        $existing = $draft_id ? get_post( $draft_id ) : null;

        if ( $existing && self::DRAFT_POST_TYPE !== $existing->post_type ) {
            return self::error( 'draft_not_found', 'Không tìm thấy bản nháp.', 404 );
        }
        if ( $existing && ! self::owns_draft( $existing ) ) {
            return self::error( 'draft_forbidden', 'Không có quyền sửa bản nháp này.', 403 );
        }
        if ( $existing && 'publish' === $existing->post_status ) {
            return self::error( 'draft_applied', 'Bản nháp đã được áp dụng và không thể sửa.', 409 );
        }

        $payload = self::sanitize_payload( $params['payload'] ?? $params );
        $operation = $payload['operation'] ?? '';
        if ( ! in_array( $operation, array( 'create_route', 'update_pricing', 'archive_route' ), true ) ) {
            return self::error( 'operation_invalid', 'Thao tác không hợp lệ.', 422 );
        }

        $reason = self::sanitize_reason( $params['reason'] ?? $payload['reason'] ?? '' );
        $payload['reason'] = $reason;
        $route_id = absint( $payload['routeId'] ?? 0 );
        if ( $route_id && empty( $payload['baseVersion'] ) ) {
            $payload['baseVersion'] = self::snapshot_version( self::snapshot_route( $route_id ) );
        }

        $version = $existing ? max( 1, absint( get_post_meta( $existing->ID, '_gocar_version', true ) ) + 1 ) : 1;
        $postarr = array(
            'ID'           => $existing ? $existing->ID : 0,
            'post_type'    => self::DRAFT_POST_TYPE,
            'post_status'  => 'draft',
            'post_title'   => self::draft_title( $payload ),
            'post_content' => wp_json_encode( $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
            'post_author'  => $existing ? (int) $existing->post_author : get_current_user_id(),
        );
        $saved_id = wp_insert_post( $postarr, true );
        if ( is_wp_error( $saved_id ) ) {
            return self::error( 'draft_save_failed', $saved_id->get_error_message(), 500 );
        }

        update_post_meta( $saved_id, '_gocar_operation', $operation );
        update_post_meta( $saved_id, '_gocar_route_id', $route_id );
        update_post_meta( $saved_id, '_gocar_reason', $reason );
        update_post_meta( $saved_id, '_gocar_version', $version );
        update_post_meta( $saved_id, '_gocar_contract_version', self::CONTRACT_VERSION );

        return rest_ensure_response( self::draft_response( get_post( $saved_id ) ) );
    }

    public static function validate_draft( WP_REST_Request $request ) {
        $draft = self::get_draft_for_request( $request );
        if ( is_wp_error( $draft ) ) return $draft;

        $payload = self::decode_post_json( $draft );
        $validation = self::validate_payload( $payload );
        update_post_meta( $draft->ID, '_gocar_validation', $validation );
        return rest_ensure_response( $validation );
    }

    public static function submit_draft( WP_REST_Request $request ) {
        $draft = self::get_draft_for_request( $request );
        if ( is_wp_error( $draft ) ) return $draft;
        if ( 'publish' === $draft->post_status ) {
            return self::error( 'draft_applied', 'Bản nháp đã được áp dụng.', 409 );
        }

        $validation = self::validate_payload( self::decode_post_json( $draft ) );
        update_post_meta( $draft->ID, '_gocar_validation', $validation );
        if ( ! empty( $validation['errors'] ) ) {
            return self::error( 'draft_invalid', 'Bản nháp chưa đạt kiểm tra.', 422, $validation );
        }

        wp_update_post( array( 'ID' => $draft->ID, 'post_status' => 'pending' ) );
        return rest_ensure_response( self::draft_response( get_post( $draft->ID ) ) );
    }

    public static function publish_draft( WP_REST_Request $request ) {
        $draft = self::get_draft_for_request( $request, true );
        if ( is_wp_error( $draft ) ) return $draft;
        if ( 'pending' !== $draft->post_status ) {
            return self::error( 'draft_not_pending', 'Bản nháp phải được gửi duyệt trước khi áp dụng.', 409 );
        }

        $lock = current_time( 'mysql', true );
        $locked = add_post_meta( $draft->ID, '_gocar_apply_lock', $lock, true );
        if ( ! $locked ) {
            $existing_lock = (string) get_post_meta( $draft->ID, '_gocar_apply_lock', true );
            if ( $existing_lock && strtotime( $existing_lock . ' UTC' ) < time() - 300 ) {
                delete_post_meta( $draft->ID, '_gocar_apply_lock' );
                $locked = add_post_meta( $draft->ID, '_gocar_apply_lock', $lock, true );
            }
        }
        if ( ! $locked ) {
            return self::error( 'draft_apply_locked', 'Bản nháp đang được áp dụng bởi một yêu cầu khác.', 409 );
        }

        $payload = self::decode_post_json( $draft );
        $validation = self::validate_payload( $payload );
        if ( ! empty( $validation['errors'] ) ) {
            delete_post_meta( $draft->ID, '_gocar_apply_lock' );
            return self::error( 'draft_invalid', 'Bản nháp không còn hợp lệ.', 422, $validation );
        }

        $result = self::apply_payload( $payload );
        if ( is_wp_error( $result ) ) {
            delete_post_meta( $draft->ID, '_gocar_apply_lock' );
            return $result;
        }

        $reason = self::sanitize_reason( get_post_meta( $draft->ID, '_gocar_reason', true ) );
        $audit_id = self::create_audit( $draft->ID, $payload['operation'], $result['routeId'], $reason, $result['before'], $result['after'] );
        if ( is_wp_error( $audit_id ) ) {
            if ( empty( $result['before'] ) ) wp_delete_post( $result['routeId'], true );
            else self::restore_snapshot( $result['routeId'], $result['before'] );
            delete_post_meta( $draft->ID, '_gocar_apply_lock' );
            return $audit_id;
        }

        update_post_meta( $draft->ID, '_gocar_audit_id', $audit_id );
        update_post_meta( $draft->ID, '_gocar_route_id', $result['routeId'] );
        wp_update_post( array( 'ID' => $draft->ID, 'post_status' => 'publish' ) );
        delete_post_meta( $draft->ID, '_gocar_apply_lock' );

        return rest_ensure_response(
            array(
                'draft'   => self::draft_response( get_post( $draft->ID ) ),
                'auditId' => $audit_id,
                'routeId' => $result['routeId'],
                'public'  => 'publish' === ( $result['after']['postStatus'] ?? '' ),
                'message' => 'create_route' === $payload['operation']
                    ? 'Đã ghi tuyến mới vào backend dưới trạng thái nháp, chưa tạo bề mặt công khai.'
                    : 'Đã áp dụng thay đổi vào production và tạo bản ghi audit.',
            )
        );
    }

    public static function delete_draft( WP_REST_Request $request ) {
        $draft = self::get_draft_for_request( $request );
        if ( is_wp_error( $draft ) ) return $draft;
        if ( 'publish' === $draft->post_status ) {
            return self::error( 'draft_applied', 'Không thể xóa bản nháp đã áp dụng; hãy dùng rollback.', 409 );
        }
        wp_trash_post( $draft->ID );
        return rest_ensure_response( array( 'deleted' => true, 'id' => (int) $draft->ID ) );
    }

    public static function archive_route( WP_REST_Request $request ) {
        $route_id = absint( $request['id'] );
        $reason = self::sanitize_reason( $request->get_param( 'reason' ) );
        if ( '' === $reason ) {
            return self::error( 'reason_required', 'Phải nhập lý do tạm ngừng tuyến.', 422 );
        }

        $payload = array(
            'operation'   => 'archive_route',
            'routeId'     => $route_id,
            'reason'      => $reason,
            'baseVersion' => self::snapshot_version( self::snapshot_route( $route_id ) ),
        );
        $validation = self::validate_payload( $payload );
        if ( ! empty( $validation['errors'] ) ) {
            return self::error( 'archive_invalid', 'Không thể tạm ngừng tuyến.', 422, $validation );
        }

        $result = self::apply_payload( $payload );
        if ( is_wp_error( $result ) ) return $result;
        $audit_id = self::create_audit( 0, 'archive_route', $route_id, $reason, $result['before'], $result['after'] );
        if ( is_wp_error( $audit_id ) ) {
            self::restore_snapshot( $route_id, $result['before'] );
            return $audit_id;
        }

        return rest_ensure_response( array( 'routeId' => $route_id, 'auditId' => $audit_id, 'archived' => true ) );
    }

    public static function list_audit(): WP_REST_Response {
        $posts = get_posts(
            array(
                'post_type'      => self::AUDIT_POST_TYPE,
                'post_status'    => 'publish',
                'posts_per_page' => 50,
                'orderby'        => 'date',
                'order'          => 'DESC',
            )
        );
        $rows = array();
        foreach ( $posts as $post ) {
            $row = self::decode_post_json( $post );
            $row['id'] = (int) $post->ID;
            $rows[] = $row;
        }
        return rest_ensure_response( $rows );
    }

    public static function rollback( WP_REST_Request $request ) {
        $audit_id = absint( $request['id'] );
        $audit = get_post( $audit_id );
        if ( ! $audit || self::AUDIT_POST_TYPE !== $audit->post_type || 'publish' !== $audit->post_status ) {
            return self::error( 'audit_not_found', 'Không tìm thấy bản ghi audit.', 404 );
        }
        if ( get_post_meta( $audit_id, '_gocar_rolled_back_at', true ) ) {
            return self::error( 'audit_already_rolled_back', 'Thay đổi này đã được rollback.', 409 );
        }

        $row = self::decode_post_json( $audit );
        $route_id = absint( $row['routeId'] ?? 0 );
        $current = self::snapshot_route( $route_id );
        if ( self::snapshot_version( $current ) !== self::snapshot_version( $row['after'] ?? array() ) ) {
            return self::error( 'rollback_conflict', 'Tuyến đã thay đổi sau bản ghi này; không thể rollback tự động.', 409 );
        }

        $before = is_array( $row['before'] ?? null ) ? $row['before'] : array();
        if ( empty( $before ) ) {
            wp_update_post( array( 'ID' => $route_id, 'post_status' => 'draft' ) );
        } else {
            self::restore_snapshot( $route_id, $before );
        }
        $restored = self::snapshot_route( $route_id );
        $reason = self::sanitize_reason( $request->get_param( 'reason' ) ?: 'Rollback audit #' . $audit_id );
        $rollback_audit = self::create_audit( 0, 'rollback', $route_id, $reason, $current, $restored );
        if ( is_wp_error( $rollback_audit ) ) return $rollback_audit;

        update_post_meta( $audit_id, '_gocar_rolled_back_at', current_time( 'mysql', true ) );
        update_post_meta( $audit_id, '_gocar_rollback_audit_id', $rollback_audit );
        return rest_ensure_response( array( 'rolledBack' => true, 'routeId' => $route_id, 'auditId' => $rollback_audit ) );
    }

    /** Public for isolated PHP contract tests. */
    public static function sanitize_payload( $raw ): array {
        if ( ! is_array( $raw ) ) return array();
        $mode = sanitize_key( (string) ( $raw['priceMode'] ?? 'contact' ) );
        if ( ! in_array( $mode, array( 'fixed', 'contact', 'disabled' ), true ) ) $mode = 'contact';
        $direction = sanitize_key( (string) ( $raw['pricingDirection'] ?? 'outbound' ) );
        if ( ! in_array( $direction, array( 'outbound', 'inbound' ), true ) ) $direction = 'outbound';
        $amount = self::positive_price( $raw['priceAmount'] ?? 0 );

        return array(
            'operation'           => sanitize_key( (string) ( $raw['operation'] ?? 'create_route' ) ),
            'routeId'             => absint( $raw['routeId'] ?? 0 ),
            'originLocationId'    => absint( $raw['originLocationId'] ?? $raw['originId'] ?? 0 ),
            'destinationLocationId' => absint( $raw['destinationLocationId'] ?? $raw['destinationId'] ?? 0 ),
            'outboundEnabled'     => rest_sanitize_boolean( $raw['outboundEnabled'] ?? true ),
            'inboundEnabled'      => rest_sanitize_boolean( $raw['inboundEnabled'] ?? false ),
            'pricingDirection'    => $direction,
            'vehicleId'           => absint( $raw['vehicleId'] ?? 0 ),
            'packageKey'          => sanitize_key( (string) ( $raw['packageKey'] ?? 'one_way' ) ),
            'priceMode'           => $mode,
            'priceAmount'         => 'fixed' === $mode ? $amount : 0,
            'baseVersion'         => sanitize_key( (string) ( $raw['baseVersion'] ?? '' ) ),
            'reason'              => self::sanitize_reason( $raw['reason'] ?? '' ),
        );
    }

    /** @return array{valid:bool,errors:string[],warnings:string[]} */
    public static function validate_payload( array $payload ): array {
        $errors = array();
        $warnings = array();
        $operation = $payload['operation'] ?? '';
        $route_id = absint( $payload['routeId'] ?? 0 );

        if ( '' === self::sanitize_reason( $payload['reason'] ?? '' ) ) {
            $errors[] = 'Phải nhập lý do thay đổi để lưu audit.';
        }

        if ( 'create_route' === $operation ) {
            $origin = absint( $payload['originLocationId'] ?? 0 );
            $destination = absint( $payload['destinationLocationId'] ?? 0 );
            if ( ! self::valid_post( $origin, 'location' ) || ! self::valid_post( $destination, 'location' ) ) {
                $errors[] = 'Location không tồn tại hoặc chưa được xuất bản.';
            }
            if ( $origin === $destination ) $errors[] = 'Điểm đi và điểm đến phải khác nhau.';
            if ( self::is_prelaunch_location( $origin ) || self::is_prelaunch_location( $destination ) ) {
                $errors[] = 'Long Thành đang PRELAUNCH và chưa được phép thao tác.';
            }
            if ( self::is_d35_10_pair( $origin, $destination ) ) {
                $errors[] = 'Cặp endpoint thuộc D35-10 OPEN/P0.';
            }
            if ( self::find_route_pair( $origin, $destination ) ) {
                $errors[] = 'Route Pair đã tồn tại; không được tạo bản ghi trùng.';
            }
            if ( empty( $payload['outboundEnabled'] ) && empty( $payload['inboundEnabled'] ) ) {
                $errors[] = 'Phải bật ít nhất một chiều.';
            }
            $warnings[] = 'Tuyến mới chỉ được ghi dưới trạng thái nháp; không tạo URL công khai.';
        } elseif ( in_array( $operation, array( 'update_pricing', 'archive_route' ), true ) ) {
            if ( ! self::valid_post( $route_id, 'route', false ) ) {
                $errors[] = 'Tuyến không tồn tại.';
            } elseif ( ! current_user_can( 'edit_post', $route_id ) ) {
                $errors[] = 'Tài khoản không có quyền sửa tuyến này.';
            }
            if ( self::is_blocked_route( $route_id ) ) {
                $errors[] = 'Tuyến thuộc D35-10 hoặc Long Thành PRELAUNCH và đang bị khóa.';
            }
            $current_version = self::snapshot_version( self::snapshot_route( $route_id ) );
            if ( ! empty( $payload['baseVersion'] ) && $payload['baseVersion'] !== $current_version ) {
                $errors[] = 'Dữ liệu tuyến đã thay đổi; hãy tải lại trước khi tiếp tục.';
            }
        } else {
            $errors[] = 'Thao tác không được hỗ trợ.';
        }

        if ( in_array( $operation, array( 'create_route', 'update_pricing' ), true ) ) {
            $vehicle_id = absint( $payload['vehicleId'] ?? 0 );
            if ( ! self::valid_post( $vehicle_id, 'vehicle' ) ) $errors[] = 'Loại xe không tồn tại hoặc chưa được xuất bản.';
            if ( empty( $payload['packageKey'] ) ) $errors[] = 'Gói chuyến không hợp lệ.';
            if ( ! in_array( $payload['priceMode'] ?? '', array( 'fixed', 'contact', 'disabled' ), true ) ) {
                $errors[] = 'Trạng thái giá không hợp lệ.';
            }
            if ( 'fixed' === ( $payload['priceMode'] ?? '' ) && empty( $payload['priceAmount'] ) ) {
                $errors[] = 'Giá fixed phải là số nguyên dương; không được dùng price=0.';
            }
            if ( 'update_pricing' === $operation && $route_id ) {
                $direction_meta = 'inbound' === ( $payload['pricingDirection'] ?? 'outbound' ) ? 'inbound_enabled' : 'outbound_enabled';
                if ( ! rest_sanitize_boolean( get_post_meta( $route_id, $direction_meta, true ) ) ) {
                    $errors[] = 'Chiều tuyến đang tắt; không thể công bố giá cho chiều này.';
                }
            }
        }

        return array( 'valid' => empty( $errors ), 'errors' => array_values( array_unique( $errors ) ), 'warnings' => $warnings );
    }

    private static function apply_payload( array $payload ) {
        $operation = $payload['operation'];
        if ( 'create_route' === $operation ) {
            $origin = get_post( $payload['originLocationId'] );
            $destination = get_post( $payload['destinationLocationId'] );
            $route_id = wp_insert_post(
                array(
                    'post_type'   => 'route',
                    'post_status' => 'draft',
                    'post_title'  => sanitize_text_field( $origin->post_title . ' đi ' . $destination->post_title ),
                    'post_name'   => sanitize_title( $origin->post_name . '-di-' . $destination->post_name ),
                    'post_author' => get_current_user_id(),
                ),
                true
            );
            if ( is_wp_error( $route_id ) ) return $route_id;
            $before = array();
            update_post_meta( $route_id, 'route_model_version', 2 );
            update_post_meta( $route_id, 'origin_location_id', $payload['originLocationId'] );
            update_post_meta( $route_id, 'destination_location_id', $payload['destinationLocationId'] );
            update_post_meta( $route_id, 'outbound_enabled', (bool) $payload['outboundEnabled'] );
            update_post_meta( $route_id, 'inbound_enabled', (bool) $payload['inboundEnabled'] );
            update_post_meta( $route_id, 'outbound_featured_package', 'outbound' === $payload['pricingDirection'] ? $payload['packageKey'] : '' );
            update_post_meta( $route_id, 'inbound_featured_package', 'inbound' === $payload['pricingDirection'] ? $payload['packageKey'] : '' );
            update_post_meta( $route_id, 'pricing_model_version', 2 );
            update_post_meta( $route_id, 'pricing_packages_v2', array( self::pricing_row( $payload ) ) );
            update_post_meta( $route_id, 'content_readiness_version', 0 );
            update_post_meta( $route_id, 'content_indexability_state', 'noindex' );
            update_post_meta( $route_id, 'content_schema_state', 'none' );
            $after = self::snapshot_route( $route_id );
            return array( 'routeId' => $route_id, 'before' => $before, 'after' => $after );
        }

        $route_id = absint( $payload['routeId'] );
        $before = self::snapshot_route( $route_id );
        if ( 'update_pricing' === $operation ) {
            $rows = get_post_meta( $route_id, 'pricing_packages_v2', true );
            $rows = is_array( $rows ) ? array_values( $rows ) : array();
            $replacement = self::pricing_row( $payload );
            $matched = false;
            foreach ( $rows as $index => $row ) {
                if ( ! is_array( $row ) ) continue;
                if (
                    ( $row['direction'] ?? 'outbound' ) === $replacement['direction'] &&
                    absint( $row['vehicle_id'] ?? 0 ) === $replacement['vehicle_id'] &&
                    sanitize_key( $row['package_key'] ?? '' ) === $replacement['package_key']
                ) {
                    $rows[ $index ] = $replacement;
                    $matched = true;
                    break;
                }
            }
            if ( ! $matched ) $rows[] = $replacement;
            update_post_meta( $route_id, 'pricing_model_version', 2 );
            update_post_meta( $route_id, 'pricing_packages_v2', $rows );
        } elseif ( 'archive_route' === $operation ) {
            update_post_meta( $route_id, 'outbound_enabled', false );
            update_post_meta( $route_id, 'inbound_enabled', false );
            wp_update_post( array( 'ID' => $route_id, 'post_status' => 'draft' ) );
        }

        return array( 'routeId' => $route_id, 'before' => $before, 'after' => self::snapshot_route( $route_id ) );
    }

    private static function pricing_row( array $payload ): array {
        $row = array(
            'direction'    => $payload['pricingDirection'],
            'vehicle_id'   => absint( $payload['vehicleId'] ),
            'package_key'  => sanitize_key( $payload['packageKey'] ),
            'pricing_mode' => $payload['priceMode'],
        );
        if ( 'fixed' === $payload['priceMode'] ) {
            $row['price'] = self::positive_price( $payload['priceAmount'] );
        } elseif ( 'contact' === $payload['priceMode'] ) {
            $row['contact_text'] = 'Liên hệ để nhận báo giá';
        }
        return $row;
    }

    private static function create_audit( int $draft_id, string $operation, int $route_id, string $reason, array $before, array $after ) {
        $user = wp_get_current_user();
        $row = array(
            'contractVersion' => self::CONTRACT_VERSION,
            'draftId'         => $draft_id,
            'operation'       => sanitize_key( $operation ),
            'routeId'         => $route_id,
            'actor'           => array( 'id' => (int) $user->ID, 'name' => sanitize_text_field( $user->display_name ?: $user->user_login ) ),
            'timestamp'       => current_time( 'c', true ),
            'reason'          => $reason,
            'before'          => $before,
            'after'           => $after,
        );
        return wp_insert_post(
            array(
                'post_type'    => self::AUDIT_POST_TYPE,
                'post_status'  => 'publish',
                'post_title'   => sprintf( '%s route #%d', sanitize_key( $operation ), $route_id ),
                'post_content' => wp_json_encode( $row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
                'post_author'  => get_current_user_id(),
            ),
            true
        );
    }

    private static function snapshot_route( int $route_id ): array {
        $post = get_post( $route_id );
        if ( ! $post || 'route' !== $post->post_type ) return array();
        $meta = array();
        foreach ( self::SNAPSHOT_META_KEYS as $key ) {
            $meta[ $key ] = get_post_meta( $route_id, $key, true );
        }
        return array(
            'routeId'    => $route_id,
            'postStatus' => $post->post_status,
            'postTitle'  => $post->post_title,
            'postName'   => $post->post_name,
            'meta'       => $meta,
        );
    }

    private static function restore_snapshot( int $route_id, array $snapshot ): void {
        wp_update_post(
            array(
                'ID'          => $route_id,
                'post_status' => sanitize_key( $snapshot['postStatus'] ?? 'draft' ),
                'post_title'  => sanitize_text_field( $snapshot['postTitle'] ?? '' ),
                'post_name'   => sanitize_title( $snapshot['postName'] ?? '' ),
            )
        );
        $meta = is_array( $snapshot['meta'] ?? null ) ? $snapshot['meta'] : array();
        foreach ( self::SNAPSHOT_META_KEYS as $key ) {
            if ( array_key_exists( $key, $meta ) ) update_post_meta( $route_id, $key, $meta[ $key ] );
            else delete_post_meta( $route_id, $key );
        }
    }

    private static function snapshot_version( array $snapshot ): string {
        return hash( 'sha256', wp_json_encode( $snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
    }

    private static function is_blocked_route( int $route_id ): bool {
        if ( in_array( $route_id, self::D35_10_ROUTE_IDS, true ) ) return true;
        if ( 'd35_10_blocked' === get_post_meta( $route_id, 'content_mapping_state', true ) ) return true;
        $origin = absint( get_post_meta( $route_id, 'origin_location_id', true ) );
        $destination = absint( get_post_meta( $route_id, 'destination_location_id', true ) );
        return self::is_prelaunch_location( $origin ) || self::is_prelaunch_location( $destination ) || self::is_d35_10_pair( $origin, $destination );
    }

    private static function is_prelaunch_location( int $location_id ): bool {
        if ( in_array( $location_id, self::PRELAUNCH_LOCATION_IDS, true ) ) return true;
        $post = get_post( $location_id );
        if ( ! $post ) return false;
        $key = remove_accents( strtolower( $post->post_title . ' ' . $post->post_name ) );
        return false !== strpos( $key, 'long thanh' ) || false !== strpos( $key, 'long-thanh' );
    }

    private static function is_d35_10_pair( int $origin, int $destination ): bool {
        $ids = array( $origin, $destination );
        sort( $ids, SORT_NUMERIC );
        return in_array( $ids[0] . ':' . $ids[1], self::D35_10_ENDPOINT_PAIRS, true );
    }

    private static function find_route_pair( int $origin, int $destination ): int {
        if ( ! $origin || ! $destination ) return 0;
        $candidates = get_posts(
            array(
                'post_type'      => 'route',
                'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
                'posts_per_page' => -1,
                'fields'         => 'ids',
                'meta_query'     => array(
                    'relation' => 'OR',
                    array(
                        'relation' => 'AND',
                        array( 'key' => 'origin_location_id', 'value' => $origin, 'compare' => '=', 'type' => 'NUMERIC' ),
                        array( 'key' => 'destination_location_id', 'value' => $destination, 'compare' => '=', 'type' => 'NUMERIC' ),
                    ),
                    array(
                        'relation' => 'AND',
                        array( 'key' => 'origin_location_id', 'value' => $destination, 'compare' => '=', 'type' => 'NUMERIC' ),
                        array( 'key' => 'destination_location_id', 'value' => $origin, 'compare' => '=', 'type' => 'NUMERIC' ),
                    ),
                ),
            )
        );
        return absint( $candidates[0] ?? 0 );
    }

    private static function valid_post( int $id, string $post_type, bool $published = true ): bool {
        $post = get_post( $id );
        return $post && $post_type === $post->post_type && ( ! $published || 'publish' === $post->post_status );
    }

    private static function get_draft_for_request( WP_REST_Request $request, bool $require_publisher = false ) {
        $draft = get_post( absint( $request['id'] ) );
        if ( ! $draft || self::DRAFT_POST_TYPE !== $draft->post_type || 'trash' === $draft->post_status ) {
            return self::error( 'draft_not_found', 'Không tìm thấy bản nháp.', 404 );
        }
        if ( ! $require_publisher && ! self::owns_draft( $draft ) ) {
            return self::error( 'draft_forbidden', 'Không có quyền với bản nháp này.', 403 );
        }
        return $draft;
    }

    private static function owns_draft( WP_Post $draft ): bool {
        return self::can_publish() || (int) $draft->post_author === get_current_user_id();
    }

    private static function draft_response( WP_Post $post ): array {
        return array(
            'id'         => (int) $post->ID,
            'status'     => $post->post_status,
            'authorId'   => (int) $post->post_author,
            'modified'   => get_post_modified_time( 'c', true, $post ),
            'version'    => absint( get_post_meta( $post->ID, '_gocar_version', true ) ),
            'reason'     => sanitize_text_field( get_post_meta( $post->ID, '_gocar_reason', true ) ),
            'validation' => get_post_meta( $post->ID, '_gocar_validation', true ) ?: null,
            'payload'    => self::decode_post_json( $post ),
            'auditId'    => absint( get_post_meta( $post->ID, '_gocar_audit_id', true ) ),
        );
    }

    private static function decode_post_json( WP_Post $post ): array {
        $decoded = json_decode( $post->post_content, true );
        return is_array( $decoded ) ? $decoded : array();
    }

    private static function draft_title( array $payload ): string {
        $operation = sanitize_key( $payload['operation'] ?? 'draft' );
        $route_id = absint( $payload['routeId'] ?? 0 );
        return $route_id ? sprintf( '%s route #%d', $operation, $route_id ) : $operation;
    }

    private static function sanitize_reason( $value ): string {
        return mb_substr( sanitize_textarea_field( (string) $value ), 0, self::MAX_REASON_LENGTH );
    }

    private static function positive_price( $value ): int {
        if ( is_string( $value ) ) $value = preg_replace( '/[^0-9]/', '', $value );
        if ( ! is_numeric( $value ) ) return 0;
        $amount = (float) $value;
        if ( ! is_finite( $amount ) || $amount <= 0 || $amount > self::MAX_PRICE || floor( $amount ) !== $amount ) return 0;
        return (int) $amount;
    }

    private static function error( string $code, string $message, int $status, array $data = array() ): WP_Error {
        return new WP_Error( $code, $message, array_merge( array( 'status' => $status ), $data ) );
    }
}

Gocar_Admin_API::boot();
