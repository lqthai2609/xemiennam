# Mã khuyến mãi đặt xe — Bản thiết kế và yêu cầu triển khai v1

Ngày: 16/10/2026. Phạm vi: bổ sung theo yêu cầu chủ dự án, không tự mở ngày roadmap mới.
Nguồn đầu vào: main `53db61356ed93de47b718cde1f1d7c31b38fe930`, bao gồm PR #150; Promotion Model, evaluator, snapshot và replay hiện hữu.

## Hành vi khách hàng

- Bước 1 của biểu mẫu: xác nhận chuyến, nhập mã, bấm Áp dụng hoặc Bỏ mã. Mã không bắt buộc; không yêu cầu tài khoản khách.
- Áp dụng trả giá trước giảm, số tiền giảm và giá sau giảm do máy chủ tính. Chưa tạo đơn, giữ lượt, gửi thư hoặc thu tiền.
- Đổi mã, tuyến, chiều, loại xe, gói, ngày hoặc giờ đi làm mất hiệu lực kết quả đang hiển thị. Phản hồi chậm của lựa chọn cũ không được gắn vào lựa chọn mới.
- Bước 3 hiển thị lại mã, mức giảm, giá sau giảm cùng thông tin đặt xe; khách phải xác nhận trước khi gửi.
- Máy chủ kiểm lại giá, mã, thời hạn, phạm vi và lượt còn lại khi lưu. Nếu kết quả khác với giá đã xem, trả 409, không lưu đơn mới và yêu cầu áp dụng lại.
- Sau phản hồi có mã yêu cầu đã lưu mới chuyển đến /cam-on. Lỗi mạng giữ thông tin và mã gửi lại; không coi HTTP 200 không có leadId là thành công.

## Giá và điều kiện

- Dùng Pricing V2 và Promotion Model/evaluator v1 hiện hữu. Mã chọn đúng một chương trình riêng, không tạo bộ tính giá theo trang.
- Phạm vi là tổ hợp tuyến × chiều × mã xe × gói. Không suy chiều ngược, không mở rộng danh sách trống thành toàn website.
- Chỉ áp dụng khi toàn bộ giá chuyến đã giải được số tiền hợp lệ. contact/disabled, dữ liệu thiếu hoặc phụ phí cần tư vấn đều không được biến thành giá cố định.
- Cả hai cách giảm đều nhắm vào giá chuyến cơ bản; phụ phí và điều chỉnh khác không được giảm theo mã trong phiên bản đầu.
- Cố định: số tiền giảm là số nguyên dương, nhỏ hơn mức giá tối thiểu được cấu hình.
- Phần trăm: nhập tối đa hai chữ số thập phân, lưu theo đơn vị 1/100 phần trăm; từ 0,01% đến 99,99%. Tiền giảm bằng phần nguyên của giá cơ bản × tỷ lệ, không vượt mức giảm tối đa bắt buộc.
- Tổng sau giảm = tổng đã giải của Pricing V2 − tiền giảm. Giá sau giảm phải dương; không sửa bảng giá nền.
- Một đơn một mã; không cộng với chương trình tự động khác hoặc giá riêng của chuyến chiều trống.
- Thời gian nhận yêu cầu: từ 00:00 ngày bắt đầu đến trước 00:00 ngày kế tiếp ngày kết thúc, giờ Việt Nam. Ngày đi áp dụng là điều kiện riêng, có thể để trống cả hai đầu.
- Long Thành PRELAUNCH, mapping D35-10 và readiness hiện hành vẫn thắng mọi mã. Lookup WordPress và kiểm tra cuối đều dùng tham chiếu hiện hành, không dùng quyền do trình duyệt khai báo.

## Quản trị

- Trang /quan-tri/ma-khuyen-mai chỉ cho quản trị viên WordPress có manage_options. Proxy kiểm phiên, cùng nguồn và mã chống giả mạo yêu cầu; backend kiểm quyền lại.
- Trường: mã, tên, trạng thái, loại giảm, giá trị, trần giảm, giá tối thiểu, tổng lượt, thời hạn nhận đặt xe, ngày đi tùy chọn và danh sách chuyến.
- Mã 3–64 ký tự Latin/chữ số/gạch ngang/gạch dưới, chuẩn hóa chữ hoa khi tra cứu. Mã của bản đã lưu không đổi; tạo mã mới là thao tác riêng.
- Có bản nháp/hoạt động/tạm dừng; hiển thị thêm chưa đến hạn/đã hết hạn theo ngày. Lưu mã không mở công tắc thương mại.
- Người sửa gửi expected_revision. Mọi sửa đổi có phiên bản, người sửa, thời điểm, cấu hình trước và sau. Không ghi đè cấu hình đang được người khác sửa.
- Hạn mức từ 1 đến 10.000 lượt mỗi mã; không giảm dưới tổng lượt đã dùng và đang xử lý. Không có hạn mức theo khách hoặc số điện thoại trong phiên bản này.
- Cho phép tạm dừng nguyên cấu hình cũ ngay cả khi tuyến không còn đủ điều kiện. Không đổi giá đơn cũ khi sửa hoặc dừng mã.
- Màn hình quản lý yêu cầu hiển thị mã và bản giá đã lưu. Không dùng mã để suy ra nguồn Organic/Paid.

## Lưu trữ và chống trùng

- Dùng một dòng wp_options không tự tải cho mỗi mã; option_name duy nhất. Config, Promotion Model, lịch sử và sổ lượt dùng cùng nằm trong dòng đó. Không tạo bảng hoặc migration dữ liệu cũ.
- coupon_id là option_id trong kho mã; promotion_id trong snapshot của luồng mã tham chiếu cùng bản này. Đây không phải ID bài promotion công khai. coupon_receipt làm rõ nguồn và phiên bản, không trộn với danh sách promotion của CMS.
- Đọc SQL trực tiếp, cập nhật có so sánh toàn bộ dữ liệu nhị phân trước/sau. Lượt tranh chấp thua phải đọc lại hạn mức; không dùng object cache hay bộ đếm trong bộ nhớ tiến trình làm trọng tài.
- Áp dụng chỉ đọc. Sau khi thắng khóa gửi lại của đơn, máy chủ giữ một lượt theo khóa yêu cầu đã băm. Lượt đang giữ chiếm số lượng còn lại nhưng chưa được tính là đã dùng.
- Đơn đã lưu và mang đúng dấu khóa được xác nhận mới chuyển lượt sang đã dùng, lưu coupon_receipt riêng và trả thành công. Gửi lại cùng khóa không tạo đơn hoặc tiêu thêm lượt.
- Lượt không rõ kết quả không tự hết hạn: có thể đơn đã lưu nhưng mất phản hồi. Phải đối chiếu record và worker trước khi xử lý, tránh giải phóng lượt rồi cấp vượt hạn mức.
- Replay tra bản đã lưu trước CMS và tính giá; dùng đúng snapshot/receipt cũ ngay cả sau hết hạn, tạm dừng hoặc sửa giá. Không tính lại ưu đãi cũ.
- Hủy đơn không tự hoàn lượt. Việc hoàn hoặc giải phóng lượt chưa rõ kết quả cần quy trình đối chiếu riêng; phiên bản này không có nút tự giải phóng.
- Giữ nguyên intent v2 và snapshot v1 hiện hữu; bổ sung coupon_receipt bên ngoài snapshot. Mã trống/không nhập giữ identity cũ; không đổi cách viết hoa của intent lịch sử trước bước replay.
- Bản xác nhận giá là hash từ lựa chọn và giá do máy chủ tính, không chứa thời điểm đánh giá, thông tin liên hệ hoặc địa chỉ riêng. Máy chủ tính lại và so sánh, không tin giá do trình duyệt gửi.

## Công tắc, phát hành và quay lui

- Next.js: ALO_COUPONS_ENABLED phải bằng chuỗi true. WordPress: hằng ALO_COUPONS_ENABLED phải bằng boolean true. Mặc định cả hai tắt; không thêm mã kinh doanh thật khi nâng cấp.
- Không bật PROMOTION_COMMERCIAL_ENABLED hoặc cờ bán chuyến chiều trống để mở mã. Bản build production có bật mã phải xác nhận coupon_contract_version=1, backend bật mã và có endpoint lookup bằng các yêu cầu GET chỉ đọc.
- Triển khai thử trên môi trường riêng trước. Thứ tự phát hành dự kiến: plugin tương thích, frontend tương thích, sau đó mở hai công tắc khi có phê duyệt và chương trình thật đã chốt.
- Trước mở khách thật cần đối chiếu mẫu thông báo WordPress đang chạy để chắc chắn đọc đúng số tiền sau giảm. Bộ thử đã tắt gửi thư; không chứng minh thư thật được giao tới hộp thư.
- Quay lui bằng tắt công tắc và ẩn/khóa giao diện áp dụng mới. Giữ plugin có khả năng replay, snapshot, receipt và sổ lượt dùng; không khôi phục database hoặc hạ plugin làm mất khả năng đọc đơn đã lưu.
- Không tạo URL chiến dịch, canonical, sitemap entry hoặc Offer công khai từ mã cá nhân. Giá ưu đãi chỉ thuộc yêu cầu đã chọn.
- Không deployment Vercel, merge, đổi domain/DNS, ghi CMS thật hoặc gửi đặt xe/email thật trong phiên triển khai này.
