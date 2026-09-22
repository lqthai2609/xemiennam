# v0 Prompt — CORE-ADMIN-001 Mobile Route & Pricing Wizard

Thiết kế giao diện quản trị nội bộ mobile-first cho ALO ĐẶT XE bằng React/Next.js App Router. Đây là working surface, không phải landing page.

## Mục tiêu

Người vận hành không rành kỹ thuật có thể tạo bản nháp tuyến và tuple giá trên điện thoại. Không triển khai API mutation trong prototype. Dữ liệu đọc được truyền vào bằng props: locations, routes, vehicles.

## Luồng chính

1. Home hiển thị tổng tuyến, tổng direction đang bật, số tuyến còn pricing mode contact.
2. Nút lớn “Tạo tuyến mới”.
3. Wizard sáu bước: Location đi/đến; outbound/inbound; direction + vehicle; package; fixed/contact/disabled; review.
4. Sticky footer có Quay lại, Lưu nháp, Tiếp tục.
5. Lưu local draft và tiếp tục trên cùng thiết bị.

## Guardrail hiển thị

- Cảnh báo và chặn Route Pair trùng.
- Không tự sao chép giá giữa direction/vehicle/package.
- Fixed bắt buộc số nguyên dương; contact và disabled không có amount.
- Nêu rõ base price tách surcharge/modifier/condition.
- Trang chỉ là preview/draft; không ghi production.
- D35-10 và Long Thành PRELAUNCH vẫn khóa.

## Visual system

- Mobile-first, thao tác một tay, touch target tối thiểu 48px.
- ALO ĐẶT XE: deep navy, teal, amber và warm cream; Be Vietnam Pro cho nội dung, Archivo cho tiêu đề.
- Card rõ, border nhẹ, không dùng hero marketing, không dùng bảng ngang trên mobile.
- Desktop tối đa 900px để giữ cảm giác ứng dụng tác nghiệp.
- Trạng thái lỗi, disabled, saved và review phải có text, không chỉ dựa vào màu.
- Hỗ trợ keyboard focus, reduced motion và text enlargement.
