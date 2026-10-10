# Core Day 50 — cấu trúc dữ liệu chuyến xe có chiều chạy trống

Ngày 09/10/2026. Nguồn: bàn giao Day 49, Roadmap Day 50–52 và Integrated Plan/DEP-008. Phạm vi Day 50 là mô hình dữ liệu, lưu trữ riêng tư và kiểm tra. Chưa làm màn hình điều phối Day 51, phần hiển thị khách Day 52, nhập dữ liệu hoặc kích hoạt bán. Không có dữ liệu Vận hành xác nhận mới trong hồ sơ tiếp nhận.

## Cấu trúc v1

| Nhóm | Trường và quy tắc |
| --- | --- |
| Phiên bản | `model_version=1`, `revision` nguyên dương an toàn JavaScript. Revision phục vụ writer có kiểm xung đột Day 51; hôm nay không có writer. |
| Trạng thái tồn chuyến | `draft`, `inactive`, `available`, `reserved`, `completed`, `cancelled`. `available` là trạng thái nghiệp vụ dự kiến, không phải quyền mở bán. |
| Xác nhận | `approval.status=draft/confirmed/rejected`, `source_ref` văn bản nguồn riêng tư hoặc null; confirmed phải có nguồn. Không nhận actor/time từ model của client. Quyền, dấu xác nhận server và audit thuộc writer Day 51. |
| Phạm vi | `scope` null khi chưa rõ; khi có phải đủ route_id, direction outbound/inbound, vehicle_id, package_key=one_way, hai Location theo chiều và readiness_version. Không có wildcard, đảo chiều tự động hoặc gói khứ hồi. vehicle_id là loại xe trong CMS, không phải xe thực được phân công. |
| Khởi hành | `departure` null hoặc date YYYY-MM-DD, time HH:mm, timezone Asia/Ho_Chi_Minh. Ngày thật, leap day, 00:00–23:59; thời điểm chuẩn theo UTC+07:00, không phụ thuộc múi giờ trình duyệt/server. |
| Giá | `prices.normal_price_vnd` và `special_price_vnd` null khi thiếu; khi nhập phải nguyên dương, không ép chuỗi/boolean hoặc làm tròn. Currency VND, basis base_price, source pricing_v2_snapshot. Giá riêng không vượt giá thường; bằng nhau không tự tạo lời quảng cáo giảm giá. |
| Hiệu lực | `valid_from`, `expires_at` null khi thiếu hoặc UTC YYYY-MM-DDTHH:mm:ssZ. Start nhỏ hơn expiry; expiry không sau giờ khởi hành. Cửa sổ nửa mở: start được dùng, đúng expiry đã hết hạn. |

Draft/inactive cho phép dữ liệu còn thiếu bằng null. Trường đã nhập vẫn phải hợp lệ; không dùng 0 hoặc chuỗi rỗng thay cho thiếu. Confirmed phải đủ phạm vi, ngày giờ, hai giá và thời hạn. Available/reserved/completed cần confirmed; không suy xác nhận từ trạng thái bài WordPress, ngày, nhãn giảm giá, legacy hoặc mock. Không giữ tên, điện thoại, địa chỉ riêng, số hiệu chuyến bay, biển số hoặc thông tin tài xế trong model.

## Kiểm nguồn và tách giá

PHP resolver chỉ đọc tuyến/xe/Location thật và đúng một dòng `pricing_packages_v2` thuộc version 2, đúng chiều–xe–one_way. Trùng dòng, thiếu tổ hợp hoặc hai Location không khớp bị từ chối. Dòng giá contact/disabled không được biến thành giá số vì còn lưu một số trong CMS.

Bản confirmed cần tuyến/xe/hai Location publish, chiều enabled rõ, service live, mapping clear, readiness_version khớp và giá thường bằng giá base fixed dương của chính tuple. Long Thành được chặn theo ID 9102 và slug san-bay-long-thanh ở cả hai đầu. Draft có thể giữ tuple PRELAUNCH nhưng không xác nhận dùng thương mại. TypeScript nhận resolver từ nguồn có thẩm quyền; thiếu hoặc lỗi resolver luôn từ chối scope đã nhập. Không dùng dữ liệu client tự khai readiness để mở bán.

Giá thường là snapshot tham chiếu của giá nền đúng lớp, không là estimated_total; không gộp phụ phí, modifier hoặc ưu đãi khác. Giá riêng chỉ tồn tại trong empty-leg, không ghi lại Pricing V2, không gọi Promotion Engine và không tự tạo coupon/Offer. Nếu giá nền hoặc readiness/Location/chiều thay đổi, bản cũ mất điều kiện sử dụng; không tự tính giá riêng mới. Việc xác nhận lại cần phiên bản và nguồn mới ở Day 51.

`assessEmptyLeg`/PHP `assess` đánh giá lại model + reference mới + clock server khi sử dụng: invalid, draft/inactive/reserved/completed/cancelled, not_yet_available, expired hoặc eligible. Eligible chỉ nói model đủ điều kiện tại thời điểm kiểm, không chứng minh còn xe, xe đã phân công, giữ chỗ hoặc booking. Kết quả luôn sellable=false, commercial_enabled=false; không xuất giá, nguồn xác nhận hoặc URL. Ngày giờ quá khứ có thể được giữ trong lịch sử nhưng không trở thành inventory khả dụng.

## Lưu trữ và giới hạn SEO

WordPress CPT `gocar_empty_leg` là private, không public query/search/archive/rewrite/navigation/REST/UI. Meta `_gocar_empty_leg_v1` và `_gocar_empty_leg_history_v1` riêng tư, generic add/update/delete bị chặn. Day 50 chỉ đăng ký cấu trúc; không có endpoint ghi, backfill, seed CMS hoặc tự tạo bài. Writer riêng có quyền/revision/audit và màn hình điều phối được thực hiện Day 51.

Policy cố định noindex,nofollow; không có public_url hoặc sitemap entry. Bộ lọc WordPress sitemap loại đúng CPT empty-leg; các loại nội dung khác giữ nguyên. Không thêm trang Next.js, link, canonical, schema hoặc thay sitemap hiện hành. Không cho client gửi requested_indexability/canonical_url để vượt policy. Dữ liệu tạm hoặc hết hạn không thành SEO page mặc định. Organic Growth vẫn cần biên nhận SEO-015A/DEP-008 riêng; model không tự đóng joint acceptance.

## Kiểm tra và phát hành

`npm run test:empty-leg` và `npm run test:empty-leg:php` dùng chung fixtures giả, chỉ local/CI; kiểm null/giá/scope/múi giờ/thời hạn, đổi nguồn và lưu trữ private. Kiểm hồi quy model/evaluator/snapshot/Pricing V2 liên quan, lint/typecheck/build. Không có thay đổi giao diện nên không mở nghiệm thu desktop/mobile hoặc kiểm lại mẫu SEO đã đạt.

Plugin nguồn 0.15.0; WordPress production giữ 0.11.1 theo bàn giao. Không cài plugin, merge, phát hành production, gửi booking/email/tin nhắn hoặc nhập dữ liệu. Các cờ thương mại promotion, modifier và empty-leg đều false; Long Thành/KU-068–072 PRELAUNCH; D35-10 đúng phạm vi; nguồn khách chưa rõ; Paid/Budget/Campaign/Ads/GA/Meta INACTIVE.

Rollback module Day 50 về private/inactive không được xóa hoặc restore database. Giữ backend replay v2, lead/snapshot/audit của Day 45; không dùng rollback UI để mất dữ liệu đã lưu.

## Việc tiếp theo — đúng một ưu tiên

Core Day 51: làm màn hình điều phối tạo/sửa chuyến empty-leg thủ công từ model v1; kiểm quyền, revision, dấu xác nhận server, lịch sử, trạng thái và thời hạn. Chỉ dùng dữ liệu được Vận hành xác nhận; chưa đủ giữ draft/inactive. Màn hình chưa mở bán và chưa tự publish URL được index. Organic Growth cung cấp SEO-015B/DEP-008/DEP-004 và acceptance riêng theo roadmap.
