# Prompt v0 — Day 33 Multi-stop cơ bản

## Bối cảnh

Gocar VN đã có ba luồng gửi Booking V2: form Liên hệ, Quick Booking trên trang tuyến và Journey Quote trong Booking Search. Mỗi luồng đã thu thập điểm đón, điểm trả và ghi chú điểm đón. Day 33 bổ sung tối đa ba điểm dừng trung gian cho một booking instance.

## Mục tiêu giao diện

Tạo một khối `Điểm dừng trung gian` dùng chung cho cả ba luồng. Người dùng có thể thêm, xóa và đổi thứ tự điểm dừng. Mỗi điểm gồm địa chỉ hoặc điểm hẹn và thời gian chờ tính theo phút.

## Hành vi

1. Ban đầu không có điểm dừng.
2. Nút `Thêm điểm dừng` thêm một hàng mới với thời gian chờ mặc định bằng 0.
3. Cho phép tối đa ba điểm dừng. Khi đủ ba điểm, ẩn nút thêm.
4. Có nút đưa lên, đưa xuống và xóa cho từng hàng.
5. Đánh lại số thứ tự ngay khi thay đổi vị trí hoặc xóa.
6. Địa chỉ bắt buộc khi hàng đã được thêm, tối đa 240 ký tự.
7. Thời gian chờ là số phút nguyên từ 0 đến 1.440.
8. Hiển thị lỗi cạnh đúng trường và giữ dữ liệu khi submit thất bại.
9. Sau khi gửi thành công, reset điểm dừng ở form Liên hệ; dialog Quick Booking và Journey Quote đóng theo hành vi hiện hữu.

## Responsive và accessibility

- Desktop: địa chỉ, thời gian chờ và nhóm nút điều khiển nằm cùng hàng khi đủ không gian.
- Mobile: các trường xếp dọc; vùng bấm đủ lớn; không tràn dialog.
- Fieldset có legend rõ ràng. Mọi nút icon có `aria-label` theo số thứ tự điểm dừng.
- Thứ tự tab đi từ địa chỉ, thời gian chờ đến các nút điều khiển.

## Dữ liệu và tích hợp

Payload gửi `/api/booking` dưới dạng `intermediateStops[]` với `address` và `waitingMinutes`. Server xác thực lại toàn bộ giới hạn, tự xác lập `order` theo vị trí mảng và lưu vào Booking V2.

## Không được thay đổi

- Không tạo page SEO, URL hoặc schema SEO cho Multi-stop.
- Không dùng điểm dừng để phân loại zone hoặc tính surcharge trong Day 33.
- Không thay đổi Route/Direction/Pricing V2 hay luồng airport hiện hữu.
- Không hiển thị hoặc hard-code giá phát sinh theo điểm dừng hoặc thời gian chờ.

## Acceptance criteria

- Cả ba luồng booking gửi cùng một cấu trúc Multi-stop.
- Không thể thêm quá ba điểm dừng ở UI hoặc API.
- Thứ tự đã sắp xếp được giữ nguyên trong payload và dữ liệu lưu.
- Địa chỉ rỗng, quá 240 ký tự hoặc thời gian chờ ngoài giới hạn bị chặn.
- Booking không có điểm dừng vẫn hoạt động như trước.
- Mobile, keyboard navigation và thông báo lỗi không bị regression.
