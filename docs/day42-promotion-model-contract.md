# Day 42 — model dữ liệu và kiểm tra đầu vào Promotion Engine

Nguồn yêu cầu: mục 16 và phụ lục A, Promotion Engine v1.1 trong bản bàn giao Day 41 số 9 ngày 09/10/2026. Day 41 đã chốt. Tài liệu này chỉ mô tả phần triển khai Day 42; không thay các nghiệm thu lịch sử.

## Phạm vi hoàn thành

- Model version 1, revision tăng từng lần lưu; enabled mặc định false. Năm loại chương trình: fixed_discount, percent_discount, special_price, benefit, free_surcharge.
- Phê duyệt có trạng thái, owner, source_ref và approved_at. Bản draft/rejected phải có approved_at=null. Post publish không thay phê duyệt. Bản sửa đã duyệt cần phê duyệt mới hoặc trở lại draft, enabled=false.
- Phạm vi là danh sách tổ hợp chính xác route_id, direction, vehicle_id, package_key. Chỉ nhận ID CPT thật và dòng Pricing V2 đúng tổ hợp. Không dùng taxonomy hay nhãn xe làm ID; không lấy chiều đi để cấp ưu đãi chiều về.
- Mỗi chiều dữ liệu có lựa chọn selected/all rõ. All vẫn bị giới hạn bởi danh sách scopes và danh sách activation đã duyệt có owner, source, version, approved_at và readiness_version từng tổ hợp. Không tự mở rộng khi thêm tuyến mới. Hai danh sách phải khớp; rỗng, lặp, ID mất hoặc phiên bản đổi bị từ chối.
- Tiền là số nguyên VND dương, không vượt 9007199254740991. Phần trăm lưu bằng rate_bps nguyên 1–9999; hàm nhập phần trăm chỉ nhận chuỗi thập phân tối đa hai chữ số sau dấu chấm, không làm tròn. Special price chỉ nhắm base_price. Free surcharge chỉ nhận rule_key + policy_version đúng khoản fixed có tiền nguyên dương; cap nếu có phải nguyên dương.
- Start/end bắt buộc, ngày thật, end>=start, timezone Asia/Ho_Chi_Minh. Cửa sổ từ đầu ngày bắt đầu đến đầu ngày kế tiếp sau ngày kết thúc, lấy thời điểm nhận yêu cầu theo server. Ngày chuyến đi là điều kiện riêng.
- Điều kiện hỗ trợ ở model: khoảng ngày chuyến đi, ngày trong tuần (0 Chủ nhật đến 6 Thứ Bảy), số phút đặt trước tối thiểu, số tiền đủ điều kiện tối thiểu. Trường/điều kiện lạ bị từ chối, không bỏ âm thầm. Các predicate này sẽ được thực thi trong evaluator Day 43, chưa được dùng để tính giá.

## Đường đọc và lưu WordPress

`GET|PUT /wp-json/gocar/v1/admin/promotions/{promotion_id}/model` yêu cầu xác thực WordPress và quyền edit_post trên chính promotion. Phê duyệt hoặc ghi danh sách activation cần thêm manage_options. Cookie authentication vẫn phải qua nonce WordPress; không mở route nopriv.

PUT nhận duy nhất expected_revision và model. Model mới có revision=1, expected_revision=0. Lần tiếp theo phải revision=current+1 và expected_revision=current. Xung đột trả 409; dữ liệu sai trả 400 kèm errors với field/code/message. Thiếu quyền trả 403. Không ghi dữ liệu sai lên dữ liệu cũ.

Model lưu nguyên khối trong meta riêng tư `_gocar_promotion_model_v1`, nhật ký riêng tư `_gocar_promotion_model_history_v1`. Các trường này không xuất trong REST công khai. Generic add/update/delete post meta bị chặn; chỉ handler được kiểm quyền, validation và revision có đường ghi. Nhật ký lưu người ghi, thời điểm, bản trước và bản gửi. Request đọc/lưu có Cache-Control private,no-store.

Khóa option từng promotion ngăn hai request ghi đồng thời. Handler luôn nhả khóa khi kết thúc, kể cả lỗi. Nếu tiến trình bị dừng đột ngột và để lại khóa, quản trị chỉ xóa `gocar_promotion_model_lock_{id}` sau khi xác nhận không còn request đang ghi; không tự xóa theo thời gian để tránh đè request còn chạy. Nhận lỗi ghi không được tự suy lưu thành công: đọc lại revision trước khi thử lại.

## Phạm vi khóa thương mại

`Gocar_Promotion_Model::COMMERCIAL_ENABLED` và `PROMOTION_COMMERCIAL_ENABLED` đều false trong source; không có công tắc môi trường hoặc endpoint để tự bật. Public promotion list trả rỗng khi cờ tắt, kể cả có bài legacy publish hoặc mock fallback. Không tự chuyển sáu meta cũ sang model mới, không sửa/xóa ID, slug, nội dung hay giá nền.

Snippet #11/#12 tiếp tục sở hữu CPT và sáu meta legacy. Module mới chỉ sở hữu hai meta riêng tư và endpoint mới, không đăng ký CPT hoặc hook lưu legacy lần thứ hai. Việc tách block legacy chỉ đặt ra khi rollout sau này cần, không tắt toàn snippet.

Draft có thể giữ tổ hợp PRELAUNCH để chuẩn bị dữ liệu, nhưng activation/enabled bị chặn bởi whitelist và nguồn hiện hành: endpoint sân bay Long Thành #9102 hoặc service_state=prelaunch, mapping chưa clear, readiness_version thiếu/đổi, direction chưa bật, tuyến/xe chưa publish. Không sửa readiness để vượt gate. Kiểm này chỉ chặn promotion cho tổ hợp đó, không đóng tuyến lịch sử hoặc mọi mapping.

Không tạo dữ liệu CMS công khai, không gửi booking/email, không bật GA/Meta/Paid/Budget/Campaign. Nguồn khách vẫn chưa rõ. DEP-011, D35-10, attribution QA, backend promotion SEO-06 và các tồn đọng mục 16.2 giữ owner và điều kiện gốc.

## Kiểm tra và giới hạn

Hai runtime dùng chung fixtures tổng hợp tại scripts/fixtures/promotion-model.json. TypeScript kiểm model, parser phần trăm, thời gian và cờ public. PHP kiểm cùng dữ liệu, tham chiếu WordPress và handler lưu/quyền/revision/khóa/lỗi ghi trong môi trường mô phỏng biệt lập.

Chạy `npm run test:promotion-model`, `npm run test:promotion-model:php`, typecheck, lint và build. CI chạy cả hai bộ kiểm mới. Dữ liệu fixture không phải giá nghiệp vụ và không được nhập vào CMS.

Day 42 hoàn thành ở lớp mã nguồn và kiểm tra tương ứng; việc cài plugin và phát hành production cần quyền phát hành riêng. Không coi tests mô phỏng là nghiệm thu REST WordPress production. Không lặp mẫu SEO đã đạt hoặc mở lượt bàn giao SEO mới.

## Việc tiếp theo

Core Day 43 triển khai evaluator server sau Pricing V2: kiểm eligibility/time/readiness ở thời điểm dùng, BigInt cho phần trăm, kiểm giảm nhỏ hơn số tiền được giảm và giá cuối dương, chọn một chương trình theo priority/specificity, không stacking. Fixed/contact/disabled giữ nguyên contract. UI/schema Day 44 và snapshot/idempotency Day 45 chưa bắt đầu; DEP-006 chưa đóng. Cờ thương mại chỉ được xét bật sau các phần này và gate activation được nghiệm thu.
