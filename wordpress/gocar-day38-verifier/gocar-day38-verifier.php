<?php
/**
 * Plugin Name: Alo Dat Xe Day 38 Verifier
 * Description: Runs isolated lead integration checks with synthetic records and removes them afterward.
 * Version: 0.3.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function alo_day38_verifier_site(): bool {
    return untrailingslashit( site_url() ) === 'https://laquangthai.datxesaigon.com/alo-day38-test';
}

register_activation_hook( __FILE__, static function (): void {
    if ( ! alo_day38_verifier_site() ) {
        wp_die( 'This verifier is limited to the isolated Day 38 test site.' );
    }
} );

if ( ! alo_day38_verifier_site() ) {
    return;
}

function alo_day38_dispatch( string $route, array $body, string $method = 'POST' ): WP_REST_Response {
    $request = new WP_REST_Request( $method, $route );
    $request->set_body_params( $body );
    return rest_do_request( $request );
}

function alo_day38_check( array &$checks, string $label, bool $passed, string $detail = '' ): void {
    $checks[] = array( 'label' => $label, 'passed' => $passed, 'detail' => $detail );
}

function alo_day38_verify(): array {
    $checks = array();
    $created = array();
    $keys = array();
    if ( ! post_type_exists( 'booking_request' ) || ! class_exists( 'Gocar_Lead_Lifecycle' ) || ! function_exists( 'alo_day38_is_test_site' ) ) {
        alo_day38_check( $checks, 'Cấu trúc và phần tiếp nhận', false, 'Thiếu gói cấu trúc thử hoặc gói tiếp nhận.' );
        return $checks;
    }

    $key_a = wp_generate_uuid4();
    $key_b = wp_generate_uuid4();
    $key_c = wp_generate_uuid4();
    $key_d = wp_generate_uuid4();
    $keys = array( $key_a, $key_b, $key_c, $key_d );
    $marker = 'DAY38-' . substr( $key_a, 0, 8 );
    $booking_a = array( 'title' => $marker . '-A', 'status' => 'draft', 'meta' => array() );
    $booking_b = array( 'title' => $marker . '-B', 'status' => 'draft', 'meta' => array() );
    $context = array( 'consent_state' => 'unknown' );

    try {
        $first = alo_day38_dispatch( '/gocar/v1/leads', array( 'idempotency_key' => $key_a, 'booking' => $booking_a, 'acquisition' => $context ) );
        $first_data = $first->get_data();
        $id_a = is_array( $first_data ) ? absint( $first_data['lead_id'] ?? 0 ) : 0;
        if ( $id_a ) { $created[] = $id_a; }
        alo_day38_check( $checks, 'Tạo yêu cầu và nhận mã thật', 200 === $first->get_status() && $id_a > 0 && 'booking_request' === get_post_type( $id_a ), 'Mã: ' . $id_a );
        if ( ! $id_a ) { return $checks; }

        $read = alo_day38_dispatch( '/gocar/v1/admin/leads/' . $id_a, array(), 'GET' );
        $read_data = $read->get_data();
        $attribution = is_array( $read_data ) ? ( $read_data['attribution'] ?? array() ) : array();
        alo_day38_check( $checks, 'Đọc trạng thái và quyền riêng tư', 200 === $read->get_status() && 'new' === ( $read_data['state'] ?? null ) && 'unknown' === ( $attribution['consent_state'] ?? null ) && 'unknown' === ( $attribution['attribution_status'] ?? null ) );

        $replay = alo_day38_dispatch( '/gocar/v1/leads', array( 'idempotency_key' => $key_a, 'booking' => $booking_a, 'acquisition' => $context ) );
        $replay_data = $replay->get_data();
        alo_day38_check( $checks, 'Gửi lại không tạo bản ghi thứ hai', 200 === $replay->get_status() && $id_a === absint( $replay_data['lead_id'] ?? 0 ) && true === ( $replay_data['replayed'] ?? null ) );

        $conflict = alo_day38_dispatch( '/gocar/v1/leads', array( 'idempotency_key' => $key_a, 'booking' => $booking_b, 'acquisition' => $context ) );
        alo_day38_check( $checks, 'Cùng khóa nhưng nội dung khác bị từ chối', 409 === $conflict->get_status() );

        $second = alo_day38_dispatch( '/gocar/v1/leads', array( 'idempotency_key' => $key_b, 'booking' => $booking_b, 'acquisition' => $context ) );
        $second_data = $second->get_data();
        $id_b = is_array( $second_data ) ? absint( $second_data['lead_id'] ?? 0 ) : 0;
        if ( $id_b ) { $created[] = $id_b; }
        alo_day38_check( $checks, 'Yêu cầu khác có mã khác', 200 === $second->get_status() && $id_b > 0 && $id_b !== $id_a, 'Mã: ' . $id_b );

        // Simulate a response lost AFTER WordPress has saved the post. This
        // filter acts only on this verifier's unique, synthetic inner request.
        $fault_title = $marker . '-FAULT';
        $fault_booking = array( 'title' => $fault_title, 'status' => 'draft', 'meta' => array() );
        $fault_body = array( 'idempotency_key' => $key_d, 'booking' => $fault_booking, 'acquisition' => $context );
        $injected = false;
        $corrupt_response = static function ( $response, $handler, WP_REST_Request $request ) use ( $fault_title, &$injected ) {
            if ( $injected || '/wp/v2/booking_request' !== $request->get_route() || $fault_title !== $request->get_param( 'title' ) || ! $response instanceof WP_REST_Response ) {
                return $response;
            }
            $data = $response->get_data();
            if ( ! is_array( $data ) || ! absint( $data['id'] ?? 0 ) ) {
                return $response;
            }
            $injected = true;
            return new WP_REST_Response( array(), 200 );
        };
        add_filter( 'rest_request_after_callbacks', $corrupt_response, 1000, 3 );
        try {
            $uncertain = alo_day38_dispatch( '/gocar/v1/leads', $fault_body );
        } finally {
            remove_filter( 'rest_request_after_callbacks', $corrupt_response, 1000 );
        }
        $fault_posts = get_posts( array( 'post_type' => 'booking_request', 'post_status' => 'any', 'posts_per_page' => 20, 's' => $fault_title ) );
        $fault_ids = array();
        foreach ( $fault_posts as $fault_post ) {
            if ( $fault_title === $fault_post->post_title ) {
                $fault_ids[] = $fault_post->ID;
                $created[] = $fault_post->ID;
            }
        }
        $fault_id = 1 === count( $fault_ids ) ? $fault_ids[0] : 0;
        alo_day38_check( $checks, 'Mất phản hồi sau khi lưu không báo thành công', $injected && 502 === $uncertain->get_status() && $fault_id > 0 );
        $recovered = alo_day38_dispatch( '/gocar/v1/leads', $fault_body );
        $recovered_data = $recovered->get_data();
        alo_day38_check( $checks, 'Gửi lại tìm đúng mã đã lưu, không tạo trùng', $fault_id > 0 && 200 === $recovered->get_status() && $fault_id === absint( $recovered_data['lead_id'] ?? 0 ) && true === ( $recovered_data['replayed'] ?? null ) && 1 === count( get_post_meta( $fault_id, '_gocar_lead_history_v1', false ) ) );
        $fault_after = get_posts( array( 'post_type' => 'booking_request', 'post_status' => 'any', 'posts_per_page' => 20, 's' => $fault_title ) );
        $exact_fault_count = 0;
        foreach ( $fault_after as $fault_post ) {
            if ( $fault_title === $fault_post->post_title ) { ++$exact_fault_count; $created[] = $fault_post->ID; }
        }
        alo_day38_check( $checks, 'Sau gửi lại vẫn chỉ có một yêu cầu', 1 === $exact_fault_count );

        $invalid = alo_day38_dispatch( '/gocar/v1/leads', array( 'idempotency_key' => 'invalid', 'booking' => $booking_a ) );
        alo_day38_check( $checks, 'Khóa sai định dạng bị từ chối', 400 === $invalid->get_status() );

        $missing_booking = alo_day38_dispatch( '/gocar/v1/leads', array( 'idempotency_key' => wp_generate_uuid4(), 'booking' => array() ) );
        alo_day38_check( $checks, 'Nội dung thiếu bị từ chối', 400 === $missing_booking->get_status() );

        $privacy_booking = array( 'title' => $marker . '-PRIVACY', 'status' => 'draft', 'meta' => array() );
        $privacy = alo_day38_dispatch( '/gocar/v1/leads', array(
            'idempotency_key' => $key_c, 'booking' => $privacy_booking,
            'acquisition' => array( 'consent_state' => 'denied', 'utm_source' => 'google', 'utm_medium' => 'cpc', 'referrer_origin' => 'https://google.com/private?q=secret' ),
        ) );
        $privacy_data = $privacy->get_data();
        $privacy_id = is_array( $privacy_data ) ? absint( $privacy_data['lead_id'] ?? 0 ) : 0;
        if ( $privacy_id ) { $created[] = $privacy_id; }
        $privacy_snapshot = $privacy_id ? get_post_meta( $privacy_id, '_gocar_lead_attribution_v1', true ) : array();
        $privacy_context = $privacy_id ? get_post_meta( $privacy_id, '_gocar_lead_context_v1', true ) : array();
        alo_day38_check( $checks, 'Từ chối theo dõi không giữ nguồn quảng cáo', 200 === $privacy->get_status() && 'privacy_rejected' === ( $privacy_snapshot['attribution_status'] ?? null ) && 'unknown' === ( $privacy_snapshot['initial_touch']['channel_group'] ?? null ) && null === ( $privacy_context['utm_source'] ?? null ) && null === ( $privacy_snapshot['initial_touch']['referrer_origin'] ?? null ) );

        $legacy = alo_day38_dispatch( '/wp/v2/booking_request', array( 'title' => $marker . '-LEGACY', 'status' => 'draft' ) );
        $legacy_data = $legacy->get_data();
        $legacy_id = is_array( $legacy_data ) ? absint( $legacy_data['id'] ?? 0 ) : 0;
        if ( $legacy_id ) { $created[] = $legacy_id; }
        alo_day38_check( $checks, 'Đường tạo yêu cầu cũ vẫn hoạt động', 201 === $legacy->get_status() && $legacy_id > 0 && 'new' === get_post_meta( $legacy_id, '_gocar_lead_state_v1', true ), 'Mã: ' . $legacy_id );

        if ( $legacy_id ) {
            $transition = alo_day38_dispatch( '/gocar/v1/admin/leads/' . $legacy_id . '/transition', array( 'from' => 'new', 'to' => 'quote', 'source' => 'admin', 'reason' => 'DAY38 TEST' ) );
            $history = get_post_meta( $legacy_id, '_gocar_lead_history_v1', false );
            alo_day38_check( $checks, 'Chuyển trạng thái có ghi lịch sử', 200 === $transition->get_status() && 'quote' === get_post_meta( $legacy_id, '_gocar_lead_state_v1', true ) && 'bao_gia' === get_post_meta( $legacy_id, 'trang_thai_booking', true ) && 2 === count( $history ) );
        }
    } finally {
        // Also catch an insertion whose REST response did not contain an ID.
        $possible = get_posts( array( 'post_type' => 'booking_request', 'post_status' => 'any', 'posts_per_page' => 20, 's' => $marker ) );
        foreach ( $possible as $post ) {
            if ( str_starts_with( $post->post_title, $marker . '-' ) ) { $created[] = $post->ID; }
        }
        foreach ( array_unique( $created ) as $id ) {
            wp_delete_post( $id, true );
        }
        foreach ( $keys as $key ) {
            delete_option( '_gocar_lead_key_' . hash( 'sha256', $key ) );
        }
    }
    return $checks;
}

add_action( 'admin_menu', static function (): void {
    add_management_page( 'Kiểm tra ngày 38', 'Kiểm tra ngày 38', 'manage_options', 'alo-day38-verify', static function (): void {
        if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Không có quyền.' ); }
        echo '<div class="wrap"><h1>Kiểm tra tiếp nhận yêu cầu ngày 38</h1>';
        if ( isset( $_POST['alo_day38_run'] ) ) {
            check_admin_referer( 'alo_day38_run' );
            $checks = alo_day38_verify();
            echo '<table class="widefat striped"><thead><tr><th>Mục kiểm tra</th><th>Kết quả</th><th>Chi tiết</th></tr></thead><tbody>';
            foreach ( $checks as $check ) {
                echo '<tr><td>' . esc_html( $check['label'] ) . '</td><td>' . ( $check['passed'] ? 'ĐẠT' : 'CHƯA ĐẠT' ) . '</td><td>' . esc_html( $check['detail'] ) . '</td></tr>';
            }
            echo '</tbody></table><p>Dữ liệu mẫu được xóa sau khi kiểm tra.</p>';
        }
        echo '<form method="post">';
        wp_nonce_field( 'alo_day38_run' );
        submit_button( 'Chạy kiểm tra', 'primary', 'alo_day38_run' );
        echo '</form></div>';
    } );
} );
