# Day 48 — gợi ý giờ đón sân bay từ dữ liệu Vận hành

Ngày 09/10/2026. Nguồn: bàn giao Core Day 47 và roadmap/Integrated Plan Day 48. Phạm vi là mã nguồn và kiểm tra biệt lập. Không tự đóng gate CMS, Vận hành, WordPress/MySQL hoặc SEO; không cài backend, gộp mã hay phát hành production.

## Luồng và nguồn dữ liệu

Form đón/tiễn sân bay trong dialog tuyến và combo gọi `POST /api/airport-pickup-suggestion`. Endpoint chỉ đọc, kiểm đầu vào, lấy `GET /wp-json/gocar/v1/routes/{id}/airport-timing` bằng no-store và tính ở server-only evaluator. Không đọc travel time dạng chữ, khoảng cách, giá, hãng bay, mock, địa chỉ riêng hoặc ghi chú để đoán buffer/thời gian. Endpoint không ghi lead, gửi email/thông báo hoặc tra hãng bay. Dữ liệu giả trong scripts chỉ dùng localhost; không nhập CMS.

Mỗi tuyến lưu model v1 riêng tư `_gocar_airport_timing_v1`, lịch sử `_gocar_airport_timing_history_v1`. `GET|PUT /wp-json/gocar/v1/admin/routes/{id}/airport-timing` yêu cầu WordPress authentication, `edit_post` đúng tuyến. Xác nhận, sửa hoặc rút bản đã xác nhận cần `manage_options`. PUT chỉ nhận `expected_revision` và `model`; actor/time lấy từ server. Không cho generic meta writes, không xuất source_ref/actor/history vào REST công khai. Không tự backfill dữ liệu cũ.

Một rule gắn chính xác direction, airport_id, counterpart_id, readiness_version, arrival/departure, domestic/international và nhãn nhà ga. `buffer_minutes` là số nguyên 0–1440; 0 chỉ khi được duyệt rõ. `travel_minutes` là số nguyên 1–1440 cho tiễn sân bay; đón sân bay phải null. Đây là giới hạn kỹ thuật, không phải số phút mặc định. `valid_from`/`valid_until` là thời điểm UTC hợp lệ, cửa sổ nửa mở, end lớn hơn start. Không dùng nhiều rule cùng scope hoặc ghép một buffer với duration của rule khác. Model confirmed phải có nguồn và ít nhất một rule.

Lưu có writer lock, expected revision và nhật ký trước khi ghi; xung đột 409, sai model/references 400, thiếu quyền 403, lỗi lưu 500. Khóa được nhả khi request kết thúc; không tự phá khóa của worker bị ngắt. Sau lỗi ghi phải đọc lại revision trước khi thử lại. Không restore database hoặc xóa lịch sử để rollback.

Projection chỉ trả rules confirmed của đúng route publish, cả hai Location publish, một đầu type airport và đầu kia không airport. Direction phải enabled rõ; service live, mapping clear, readiness_version khớp. Đổi endpoint/direction/readiness hoặc rút phê duyệt không được tái dùng bản cũ. Long Thành #9102 hoặc slug san-bay-long-thanh luôn bị chặn. Chỉ lọc đúng tổ hợp bị chặn, không tự thay trạng thái tuyến hay policy SEO.

## Kiểm thông tin chuyến bay và phép tính

Đầu vào gồm route_id, direction, movement, flight_kind, terminal, flight_number, flight_at và airport_arrival_at; không nhận clock, buffer, source hoặc lời tự xác nhận của client. Ngày giờ datetime-local luôn hiểu là Asia/Ho_Chi_Minh, kể cả browser/server ở múi giờ khác; kiểm ngày thật, leap day, giờ/phút và tương lai theo server. Số hiệu được kiểm cú pháp và chuẩn hóa khoảng trắng/chữ hoa, không chứng minh chuyến bay tồn tại, sân bay, nhà ga hoặc lịch realtime. Không suy domestic/international từ hãng hoặc nhà ga.

- Đón sân bay: giờ đón gợi ý bằng giờ hạ cánh dự kiến cộng buffer sau hạ cánh đã duyệt.
- Tiễn sân bay: giờ có mặt bằng giờ bay trừ buffer trước bay. Nếu khách yêu cầu có mặt sớm hơn, dùng thời điểm sớm hơn; giờ khách nhập bằng/sau giờ bay bị từ chối. Giờ đón bằng giờ có mặt trừ travel_minutes của chính rule.
- Phép tính qua nửa đêm giữ đúng ngày. Server now, giờ bay, giờ đón và giờ có mặt phải nằm trong cửa sổ policy tương ứng; giờ đón đã qua giữ tư vấn.
- Thiếu số hiệu/giờ bay/loại chuyến/nhà ga, thiếu policy, backend cũ, không khớp scope, mơ hồ hoặc lỗi/timeout đều giữ cần tư vấn. Khách vẫn gửi được yêu cầu khi thông tin chuyến bay chưa biết; trường đã nhập sai phải sửa.

Kết quả v1 chỉ trả giờ/nhãn tính từ rule cùng revision, airport_id và `flight_verified=false`; không lộ số hiệu/nhà ga, nguồn xác nhận, người xác nhận hoặc nhật ký. Hiệu lực hiển thị tối đa 5 phút, không vượt policy expiry hoặc giờ đón. Đây là thời hạn kiểm tra kỹ thuật, không là chính sách vận hành. Mỗi lần kiểm lấy nguồn mới; UI không dùng kết quả quá hạn hoặc tự tính lại giờ.

## Giao diện và tương thích

UI giữ form/header hiện có. Hai chiều đều có số hiệu, giờ bay/hạ cánh, nhà ga và loại chuyến theo vé. Có chưa kiểm/đang tải/gợi ý/cần tư vấn/lỗi/timeout. Đổi flight/route/direction/address/vehicle/package hoặc đóng dialog làm mất kết quả; đổi lại giá trị cũ không khôi phục nó. Sequence/AbortController bỏ phản hồi trễ; response validator từ chối sai version, sai tuple hoặc hết hiệu lực. aria-live thông báo trạng thái; nút kiểm là type=button, không gửi form.

Gợi ý không tự điền giờ đón/ngày đi hoặc xác nhận booking. Booking contract/estimated_total/Pricing V2/promotion/snapshot/replay giữ nguyên; flight/kind/terminal do khách cung cấp tiếp tục nằm trong ghi chú hiện có. Không dùng dữ liệu chuyến bay/PII làm nguồn SEO; không tạo URL, schema, canonical, sitemap hoặc content mới. Không hứa còn xe, loại xe thực giao, giờ bay thực tế hoặc bảo đảm kịp chuyến.

Plugin source tăng 0.14.0; WordPress production vẫn 0.11.1 theo bàn giao. Khi có quyền phát hành riêng, phải giữ thứ tự backend snapshot/replay đã được kiểm trước frontend; rollback UI giữ backend replay và lịch sử lead/snapshot. Timing chưa duyệt có thể rollback riêng module/projection về tư vấn, không rollback database.

## Kiểm tra và gate

`npm run test:airport-timing` kiểm shared fixtures, thời gian/clock, rule scope, arithmetic, input/output/transport; `npm run test:airport-timing:php` kiểm cùng model và quyền/revision/lock/failure/projection/readiness. Kiểm booking pickup/dropoff, snapshot/replay và vehicle selector/facts liên quan; lint/typecheck/build. `node scripts/day48-browser-runner.mjs` chạy fixture localhost và desktop/mobile; Playwright/Chromium qua env nếu chưa nằm trong PATH. Không gọi booking backend trong browser acceptance. Không nghiệm thu lại mẫu SEO đã đạt.

Core source/UI hoàn thành không thay bằng chứng dữ liệu Vận hành/CMS thật hoặc WordPress/MySQL nhiều worker. Organic Growth còn SEO-014A inventory/policy draft và Airport SEO/CRO brief cho Day 49; DEP-007 joint chưa đóng. SEO-013A/013B/DEP-004, DEP-006, DEP-002/SEO-012B/M4, DEP-011/GSC, lần lưu tuyến thật và email thực nhận giữ riêng theo bản bàn giao.

Hai cờ thương mại false; Long Thành/KU-068–072 PRELAUNCH; D35-10 đúng phạm vi; nguồn khách chưa rõ; Paid/Budget/Campaign/Ads/GA/Meta INACTIVE. Việc tiếp theo theo roadmap là Core Day 49: CTA theo chiều và luồng tư vấn nhanh sân bay, dựa trên dữ liệu và brief SEO được xác nhận; thiếu dữ liệu 30 ngày không tự tạo kết luận hoặc lời hứa thương mại.
