# Core Day 52 — hiển thị chuyến chiều trống và giá riêng

Ngày 09/10/2026. Nguồn: bản bàn giao Day 51, model Day 50 và writer Day 51. Hoàn thành ở mã nguồn và kiểm local; dữ liệu Vận hành/CMS/runtime/SEO nghiệm thu riêng. Không bắt đầu Day 53–54.

## Nguồn máy chủ và phạm vi

`GET /admin/empty-legs/presentation` chỉ cho người có quyền biên tập, giữ phạm vi tác giả của Day 51. Đọc model cùng history từ SQL hiện hành; chỉ chiếu chuyến available có approval confirmed và dấu server khớp actor/revision/time/source. Kiểm lại đúng tổ hợp Pricing V2, hai Location, readiness, Long Thành và D35-10. Rút xác nhận, reserved/completed/cancelled/inactive/draft, giá nền đổi/contact/disabled/trùng dòng, nguồn lỗi hoặc hết hạn đều không có thẻ. Không dùng replay snapshot cũ làm nguồn hiển thị.

Kết quả v1 chỉ có id/revision, nhãn địa điểm/loại xe đã tồn tại, chiều, one_way, departure Việt Nam, valid_from/expires_at, normal_price_vnd/special_price_vnd, currency VND/basis base_price. Không đưa actor/source_ref/audit/history/PII/model nguyên vào thẻ. Các label là tên Location/vehicle công khai; không suy sức chứa, loại xe thực hoặc giờ từ tên. Nhãn Sài Gòn dùng formatter hiện hành, ID/canonical giữ nguyên.

Giá thường lấy đúng lớp base của Pricing V2 đã đối chiếu với snapshot; giá riêng chỉ của chuyến này. Không sửa Pricing V2, không ghép ưu đãi, không tính phần trăm giảm hoặc tổng phụ phí; không gạch giá khác lớp. Giá bằng giá nền vẫn được hiển thị như giá riêng, không claim giảm. Giao diện nói rõ chưa phải tổng tiền sau phát sinh. Không booking, giữ xe, gán tài xế hoặc email.

## Giao diện và khóa phát hành

Màn hình `/quan-tri/chieu-trong/xem-truoc` có đăng nhập, nằm trong development/preview hoặc cờ quản trị riêng đang có; là trang xem nội bộ, chưa mở bán. Không tạo đường dẫn công khai cho từng chuyến, canonical, sitemap entry hoặc Offer. Thẻ không có nút nhận chuyến/booking. Proxy chỉ GET presentation, POST/DELETE bị chặn; lỗi xác định cũng private no-store/noindex. Cờ thương mại empty-leg/promotion/modifier vẫn false, sellable=false. Nút gọi/Zalo nổi ẩn trên cả điều phối và trang con.

Không mở endpoint inventory public hoặc gắn thẻ vào trang khách khi cờ false. Việc mở bán cần quyền, dữ liệu, backend/runtime và SEO acceptance riêng; noindex không thay những điều kiện này.

## Thời hạn và kết nối

Máy chủ kiểm cửa sổ nửa mở [valid_from, expires_at), expires_at không sau departure. Mỗi projection có server_now và lease tối đa 15 giây; server_now tính từ bắt đầu yêu cầu PHP, để thời gian xử lý SQL không kéo dài lease.

Trình duyệt dùng performance.now và cộng toàn bộ thời gian yêu cầu từ lúc gửi. Bù thêm 1 giây vì server timestamp có độ chính xác đến giây; có thể ẩn sớm tối đa khoảng một giây cộng độ trễ, không chủ động kéo dài hạn. Đồng hồ ngày giờ thiết bị không quyết định hiệu lực. Timer nhắm mốc hết hạn và lease, tối đa mỗi giây; đồng thời tải máy chủ mỗi 10 giây sau phản hồi. Bắt đầu tải lại sẽ xóa thẻ cũ; request timeout 8 giây. Lease hết sẽ ẩn, kể cả khi máy chủ treo.

Offline/visibilitychange/pageshow xóa dữ liệu cũ, hủy request cũ; quay lại/online phải đọc mới. generation chặn phản hồi cũ quay lại sau reset; timer/controller/listeners được dọn khi unmount. Không lưu localStorage hoặc fallback mock trong sản phẩm. Thay đổi trạng thái/nguồn sẽ phản ánh ở lần đọc tiếp theo; đây không phải cơ chế push tức thời hoặc quyền giữ chuyến. Event loop bị hệ điều hành dừng chỉ có thể cập nhật DOM khi tiếp tục chạy; lúc quay lại phải đọc mới.

## Nghiệm thu còn mở và rollback

Chuyến Vận hành thật chưa có; giữ draft/inactive khi thiếu nguồn. WordPress/MySQL/object cache/nhiều worker, quyền runtime và hạ tầng thực chưa được nghiệm thu. Fixtures chỉ kiểm mã nguồn và giao diện.

Organic Growth chưa có biên nhận mới SEO-015A/015B/DEP-008/DEP-004 và implementation pack Day 53–54. Mỗi phần Programmatic/Indexability/Internal Link/Quality Gates phải ghi READY/BLOCKED/NEEDS REVISION, nguồn và owner. Không tự đánh dấu đủ điều kiện SEO hoặc mở URL index.

Rollback chỉ gỡ/khóa projection/UI; giữ CPT/model/history private, writer, replay v2/lead/snapshot/audit. Không restore database. Plugin nguồn 0.17.0; production 0.11.1 theo bàn giao, chưa cài backend, gộp hoặc phát hành.
