# Day 36B — v0 prompt: giải thích trạng thái giá

Tạo một khối thông tin nhỏ, ưu tiên mobile, dùng chung cho trang chi tiết tuyến và trang bảng giá của Alo Đặt Xe.

## Mục tiêu người dùng

Giúp khách phân biệt rõ ba khái niệm trước khi bấm đặt xe:

1. `Giá từ`: mức cơ bản đã được duyệt cho đúng chiều, loại xe và gói đang hiển thị.
2. `Ước tính chuyến`: chỉ xuất hiện khi giá cơ bản và mọi khoản thực sự áp dụng đều xác định được.
3. `Liên hệ báo giá`: dùng khi dữ liệu còn thiếu, lịch thực tế cần xác nhận hoặc có điều kiện chưa được Operations phê duyệt.

## Ràng buộc giao diện

- Không hiển thị giá bằng `0` và không biến `contact` hoặc `disabled` thành số.
- Không gọi giá tham khảo hoặc ước tính là giá đã chốt.
- Không tự nêu khoản phụ phí, hệ số, lịch lễ hoặc mức tiền chưa có trong Pricing V2.
- Không thay đổi CTA, booking business logic, direction, vehicle hoặc package selection.
- Desktop: ba định nghĩa trên cùng một hàng nếu đủ chỗ.
- Mobile: xếp dọc, chữ dễ đọc, không cần mở modal hoặc tooltip.
- Dùng semantic HTML `aside`, `dl`, `dt`, `dd`; tiêu đề có liên kết `aria-labelledby`.
- Giữ typography, màu, border và spacing hiện hành; không thêm hệ màu hoặc icon trang trí mới ngoài một icon trợ giúp nhỏ.

## Copy bắt buộc

- Tiêu đề: `Cách đọc thông tin giá`.
- Ghi chú cuối: `Giá hiển thị không phải giá đã chốt. Alo Đặt Xe xác nhận lại theo thông tin chuyến trước khi đặt xe.`

## Acceptance

- Xuất hiện trên Route Pricing và `/bang-gia`.
- Không gây layout shift đáng kể.
- Keyboard/screen reader đọc đúng thứ tự.
- Không có logic giá mới trong component.
- Lint, TypeScript và production build đạt.

