# Day 45 — bản giá và ưu đãi đã lưu, xử lý gửi lại

Ngày 09/10/2026. PR #144, nhánh `core/day42-promotion-model`. Phạm vi source/test; không cài plugin, gửi booking/email thật, merge hoặc phát hành production. Hai cờ thương mại vẫn false; Long Thành PRELAUNCH; acquisition unknown; quảng cáo INACTIVE.

## Dữ liệu và nguồn tính

`resolvePriceRulesWithPromotion` là entry point server chung sau Pricing V2. `/api/booking` lấy evaluation mới chỉ cho lần chưa có yêu cầu, tạo `promotion_snapshot` version 1; backend lưu riêng trong protected meta `_gocar_promotion_snapshot_v1` của booking_request. Không có meta public/REST registration, endpoint bật cờ hoặc logic tính ưu đãi ở client. Phần snapshot gồm pricing_version 2, evaluator_version 1, evaluation_time UTC, timezone Asia/Ho_Chi_Minh, tuple route–direction–vehicle–package, mode/reason, base/estimated price, thành phần surcharge/modifier/condition, rule keys/versions; promotion ID/revision/type/target/window/conditions, số giảm và tổng sau giảm. Không lưu raw promotion owner/source, diagnostics, địa chỉ, điện thoại, acquisition hoặc ghi chú trong snapshot.

`base_price_snapshot`, `estimated_total`, surcharge và modifier/condition meta hiện hành vẫn giữ nghĩa cũ. Đặc biệt estimated_total là tổng **trước** promotion. Tổng sau nằm riêng tại `promotion.promotional_estimated_total` trong snapshot, không thay dữ liệu giá CMS. Contact/disabled không có tổng cố định hoặc tổng sau giảm; benefit không tạo giảm giá giả. Snapshot là estimate khi nhận yêu cầu, không phải báo giá được duyệt, booking hoàn tất hoặc doanh thu.

## Nhận diện yêu cầu

Gateway tính SHA-256 trên JSON được validation/normalization từ thông tin khách nhập; sắp khóa object, giữ thứ tự điểm dừng. Không nhận intent_hash, clock, flag, tổng tiền hoặc snapshot từ request công khai. Hash không chứa phần giá/CMS/evaluation do server tạo. Header UUID tiếp tục dùng với helper hiện hành; cùng UUID nhưng thông tin khách thay đổi trả 409. UUID mới là yêu cầu mới. Hash và UUID không thay thế quyền xác thực.

`POST /gocar/v1/leads/replay` có cùng quyền edit_posts như /leads, no-store, nhận intent_version 2 + intent_hash từ gateway. Lookup trước CMS/resolver; found=true trả lead ID và đúng snapshot đã lưu, không đọc lại giá hoặc chương trình và không gửi notification. Found=false mới tính và gọi /leads. Không có snapshot thành công nếu WordPress chưa xác nhận lead ID và bản đã lưu.

## Lưu và cạnh tranh

Backend kiểm cấu trúc/version, tiền nguyên an toàn, mode, tổng thành phần, số giảm/tổng cuối dương, tuple và sự khớp với pricing meta hiện hành. Cờ false từ chối snapshot thương mại mới. Reservation `add_option` có unique key và autoload=false chọn đúng một worker; reservation lưu snapshot gốc trước insert. Worker thua nhận 409, không insert. Hook sau insert đánh dấu hash của key và thêm đúng một snapshot riêng tư. Success chỉ trả sau khi đọc lại đúng snapshot. Khi response mất/malformed hoặc lỗi meta sau insert, reservation không bị xóa; retry tìm đúng một post đã đánh dấu và phục hồi từ snapshot gốc của reservation. Không dùng evaluation của retry để sửa lịch sử. Không có post hoặc nhiều post là tình huống cần đối soát, không giải phóng key và tự insert lần hai.

Snapshot được bảo vệ ở cả add/update/delete metadata. Admin read có quyền edit_post trả snapshot riêng tư để đối soát. Giá báo chính thức sau này phải ghi kết quả duyệt riêng; không sửa estimate ban đầu. Reservation tồn tại với snapshot để phục hồi; không autoload và không có tác vụ xóa/TTL tự động trong phạm vi này.

## Dữ liệu cũ và điều kiện phát hành

Lead cũ trả promotion_snapshot=null, không được tự backfill hoặc gán chương trình. Luồng /leads v1 giữ fingerprint đầy đủ cũ và có thể replay nguyên lead cũ; không tự nhập snapshot từ legacy meta. Không thể suy ra stable intent của UUID v1 từ fingerprint giá cũ. Khi UUID v1 được gửi qua lookup v2, trả 409 yêu cầu đối soát, không chuyển protocol hoặc tạo lại lead. Không hứa replay v2 cho khóa cũ chưa có hash tương ứng.

**Plugin source 0.12.2 phải được phát hành/kiểm endpoint trước frontend Day 45 trong một phiên được cho phép riêng.** Production hiện chưa nâng từ 0.11.1; phiên này không gọi WordPress. Nếu backend thiếu lookup hoặc snapshot, frontend fail closed, không fallback sang luồng tạo lead khác vì có thể tạo trùng. Đây là gate phát hành thật, không chứng cứ CMS/production acceptance. Rollback frontend về bản tương thích theo trạng thái thực tế; giữ mọi lead/snapshot/reservation đã ghi. Tắt ưu đãi để dừng claim mới, không restore database hoặc xóa snapshot. Nếu đã có client v2, phải giữ backend hỗ trợ replay v2 dù rollback UI; không hạ plugin làm mất hợp đồng replay.

## Bằng chứng và giới hạn

Các fixture tổng hợp trong scripts/fixtures/promotion-snapshot.json được tạo bằng builder server thật và kiểm khớp TS/PHP; không nhập CMS. Tests route handler mock toàn bộ CMS/backend/notification; PHP dùng WordPress in-memory, không database/mail thật. Bao phủ fixed/contact/disabled, applied/benefit/free surcharge, biến động giá/chương trình, client money/hash/flag, backend thiếu hợp đồng, gửi đồng thời, response mất/malformed, snapshot write failure, mutation guards và legacy data. CI dùng cùng tests. Simulation cạnh tranh của harness không thay nghiệm thu đa worker MySQL/WordPress thật trước activation.

Day 45 hoàn thành ở source/test khi các kiểm tra liên quan và build/CI đạt. DEP-006 vẫn OPEN cho nguồn private CMS, nghiệm thu runtime/UI/SEO độc lập và gate activation. DEP-002/SEO-012B không tự đóng; việc lưu promotion không xác nhận nguồn SEO/Paid hay mốc M4 Content engine ready.

## Việc tiếp theo

Core Day 46 theo roadmap: capacity, luggage_capacity, model examples và service level trên dữ liệu xe hiện hành. Dữ liệu chưa được Vận hành duyệt giữ trạng thái thiếu/cần tư vấn, không suy đoán số hành lý hay tải trọng từ tên xe. Giữ gate promotion riêng, không dùng chúng kéo dài phần source/test đã hoàn thành và không mở lại mẫu SEO đã đạt.
