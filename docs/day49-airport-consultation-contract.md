# Day 49 — tư vấn nhanh theo chiều sân bay

Ngày 09/10/2026. Phạm vi mã nguồn và kiểm tra biệt lập, nền Day 48. Chưa gộp hoặc phát hành production, không cài backend hoặc nhập dữ liệu Vận hành. Brief Organic Growth/SEO-014A/014B, dữ liệu 30 ngày và các facts dịch vụ chưa có biên nhận xác nhận mới; giữ gate riêng, không tạo số liệu hoặc cam kết để đóng joint DEP-007.

## Hành vi và nguồn

Nút Zalo trong thẻ giá tuyến/combo xác định theo `airportContext`, độc lập với outbound/inbound: đón tại sân bay hoặc tiễn đến sân bay. Luồng chuẩn bị tư vấn riêng giữ form booking hiện có; không tính giá, chọn xe, tự điền giờ hoặc gửi lead. Khách có thể nhập số khách, số kiện, kích thước/loại hành lý, yêu cầu hỏi về bảng tên chỉ ở chiều đón. Chưa biết giữ trống và hiển thị cần tư vấn; 0 kiện chỉ khi khách nhập rõ. Số kiện không chứng minh xe đủ chỗ.

Bản nháp chỉ ở bộ nhớ cửa sổ. Không nhận tên, số điện thoại, địa chỉ riêng hay số hiệu chuyến bay. Không gắn bản nháp vào URL, Zalo query, analytics, localStorage hoặc CMS. Nút sao chép chỉ ghi clipboard khi khách chủ động bấm; khách tự mở Zalo, dán và gửi. Sao chép lỗi vẫn có ô nội dung chọn thủ công và đường gọi tư vấn. Đóng cửa sổ xóa đầu vào; thay đầu vào bỏ trạng thái đã sao chép, phản hồi clipboard trễ không cập nhật bản mới. Cửa sổ dùng portal, khóa cuộn, giữ focus, Escape đóng và trả focus về nút mở.

Hub sân bay có hai nút riêng theo chiều, danh sách lấy từ Route Pair/Location/Pricing V2. Kiểm hai Location đúng movement và pricingDirection; chỉ service live, readiness version >= 1, mapping clear, direction enabled ở cả pair và pricing, ít nhất một gói không disabled, không legacy fallback. Thiếu dữ liệu không tự mở nút. Đây là tư vấn về tuyến hiện có, không tạo URL/link thúc index hoặc báo giá mới. Không sửa canonical/sitemap/schema; FAQ mới trong cửa sổ là hướng dẫn sử dụng luồng, không phát FAQPage mới.

Long Thành id 9102/slug/prelaunch luôn không có luồng tư vấn chuyến đang hoạt động tại hub. Thẻ giá có lớp phòng vệ theo nhãn/slug Long Thành: chỉ liên hệ tư vấn trước, không mở form yêu cầu. Pricing disabled tiếp tục không có action. Guard tuyến và schema/index cũ được giữ.

Bảng tên luôn là nhu cầu phải xác nhận khả năng phục vụ và chi phí; không hứa miễn phí hoặc bao gồm sẵn. Nhãn trong booking chiều đón cũng làm rõ điều này; payload và snapshot/replay không đổi. Không suy buffer, lượng hành lý cho từng xe, mẫu xe thực giao, phụ phí hoặc tình trạng còn xe từ nhãn/ảnh/text.

## Yêu cầu giao diện và nghiệm thu

Mục tiêu: chuẩn bị tư vấn ít thao tác trên desktop/mobile, đúng chiều và không tạo lời hứa. Thành phần dùng Button/Zalo và CSS dialog hiện có. Trạng thái: thiếu thông tin, số sai, đã sao chép, sao chép bị từ chối, thay đầu vào, đóng/mở và prelaunch. Không có form submit hoặc API mutation trong luồng này. Kiểm keyboard, focus, cuộn và tràn ngang; kiểm route/combo/hub cả hai chiều. Fixture chỉ localhost và API ghi bị chặn.

## Gate còn mở và rollback

Organic Growth cung cấp brief CTA/FAQ theo TSN/Long Thành map và nghiệm thu SEO-014B/DEP-007; Vận hành xác nhận hành lý/bảng tên/điểm gặp/thời gian/chi phí trước nội dung thương mại. Thiếu dữ liệu 30 ngày không tuyên bố uplift hoặc tối ưu từ dữ liệu thật. Gate WordPress/MySQL/đa worker, facts/timing CMS, DEP-006, DEP-002 và DEP-011 vẫn riêng. Hai cờ thương mại false, Long Thành PRELAUNCH; Paid/Ads/GA/Meta INACTIVE.

Rollback thay đổi UI Day 49 bằng revert commit frontend; không restore database hoặc xóa lead/snapshot/replay v2. Backend nguồn giữ 0.14.0, production 0.11.1 theo bàn giao; không có thay đổi backend trong Day 49.
