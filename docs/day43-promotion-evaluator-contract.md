# Day 43 — bộ tính ưu đãi sau Pricing V2

Ngày 09/10/2026. Nguồn: bản bàn giao Day 42 và phụ lục A bản thiết kế Promotion Engine v1.1 trong bản 9 Day 41. Phạm vi: evaluator server; chưa triển khai giao diện/schema Day 44 hoặc snapshot/idempotency Day 45. DEP-006 vẫn OPEN.

## Luồng và thẩm quyền

`resolvePriceRulesWithPromotion` trong `src/lib/api/promotion-pricing.ts` là đầu vào chung phía máy chủ. Nó gọi `resolvePriceRulesV2` trước, nhận ngữ cảnh tuyến/chiều/xe/gói và ngày/giờ đi đã được server xử lý. Không nhận tiền, clock hoặc quyền bật thương mại từ trình duyệt. `/api/booking` đã dùng đường này và tiếp tục chỉ lưu phần pricing hiện hành; chưa ghi snapshot promotion hoặc thay nghĩa `estimated_total`.

Cờ `PROMOTION_COMMERCIAL_ENABLED` và cờ WordPress đều false. Khi tắt, source loader không được gọi; không đọc riêng tư thêm, quảng bá chương trình hoặc áp giảm trong luồng thực. Không có biến môi trường/endpoint để bật. Không nối admin model vào REST công khai. `server-only` chặn import vào client bundle.

Kernel `evaluatePromotionRules` kiểm dữ liệu có thật bằng Day 42 validator, rồi kiểm phê duyệt, enabled, thời điểm phê duyệt không ở tương lai, exact tuple, cửa sổ, predicate và phép tính. Tham số thời gian kernel chỉ phục vụ kiểm tra biệt lập; entry point lấy `Date.now()` sau khi đọc nguồn. Không có HTTP endpoint nhận clock hoặc danh sách promotion từ client.

## Dữ liệu và cửa kiểm tra hiện hành

`promotionReferenceFromSnapshot` dùng route/vehicle CMS trong cùng lần đọc hiện hành, yêu cầu publish, dòng Pricing V2 khớp đúng tổ hợp, direction bật rõ, service live, mapping clear và readiness version khớp whitelist. Long Thành #9102 bị chặn kể cả có claim service live. Thiếu version/mapping/direction không tự được coi là đủ điều kiện. Không mở scope mới, không dùng legacy row, nhãn xe hoặc chiều ngược để cấp ưu đãi.

Source loader tương lai chỉ được dùng server-authenticated private models và snapshot CMS mới, cùng Pricing V2/location context hiện hành; không dùng public promotion list, mock fallback hoặc dữ liệu request. Loader thương mại/CMS end-to-end chưa được kích hoạt hoặc nghiệm thu trên WordPress. Trước activation cần đường đọc có quyền, không giữ snapshot giá/readiness cũ, UI/schema Day 44, backend snapshot Day 45 và các gate công khai còn mở. Test mock không thay bằng chứng production.

Thời gian chương trình là ngày nhận yêu cầu Asia/Ho_Chi_Minh: bao gồm đầu ngày start và cả ngày end; đúng end_exclusive đã hết hạn. Ngày chuyến đi là predicate riêng. Hỗ trợ khoảng ngày đi, ngày trong tuần, số phút đặt trước và minimum eligible amount; các predicate phải cùng đạt. Thiếu ngày/giờ cần thiết trả context_missing; input đủ nhưng không đạt trả scope_mismatch. Không đọc PII, địa chỉ riêng hoặc câu mô tả để quyết định.

## Giá và lựa chọn

Giá phải là VND nguyên, safe integer, base và total dương. Tổng trước giảm phải khớp base + surcharge + modifiers + condition; lỗi giá chuyển contact, không chữa bằng ưu đãi. Contact/disabled không có tổng hay mức giảm số. Lỗi riêng promotion giữ giá fixed hợp lệ.

- Fixed: khoản giảm nguyên, dương, nhỏ hơn eligible amount; không tự giới hạn để sửa khoản giảm quá lớn.
- Percent: `floor(BigInt(E) * BigInt(rate_bps) / BigInt(10000))`; từ chối khi floor=0. Chỉ đổi sang Number sau kiểm giới hạn; rate 1–9999 bps theo model Day 42.
- Special price: chỉ base; 0 < special < base. Phụ phí và giá gốc giữ nguyên.
- Benefit: mức giảm 0, total vẫn dương và bằng trước giảm; quyền lợi tách riêng, không có cặp gạch giá.
- Free surcharge: đúng rule_key, policy_version và khoản fixed đã resolve duy nhất, cap rõ nếu có. Không suy từ tổng phụ phí hay matchedRuleKeys lịch sử. Nếu một rule xuất hiện hai lần thì không đoán khoản miễn. Chỉ trường hợp này cho miễn toàn eligible surcharge; base vẫn dương.

`SurchargeResolution.components` bổ sung từng khoản resolve, key và policy version; `matchedRuleKeys` cũ giữ nguyên. Row none không cộng amount còn sót. PHP sanitizer giữ rule_key đã nhập đúng dạng; không tạo key cho dữ liệu cũ. Plugin source 0.12.1; chưa cài trên WordPress production.

Lọc cả eligibility và tính hợp lệ của phép giảm trước lựa chọn: priority lớn nhất, rồi số chiều scope selected lớn nhất. Nếu vẫn ngang nhau: ambiguous_promotion, giữ giá gốc. Không chọn theo ID/thứ tự API/giảm lớn nhất; không cộng benefit hoặc chương trình khác. Record promotion ID lặp khiến lần tính không áp dụng, tránh phụ thuộc thứ tự nguồn.

## Kết quả, riêng tư và hạn cache

Kết quả `promotion` là projection dùng chung có version, exact tuple, priceCurrency VND, priceUnit package, mode/reason, base, total trước giảm, và các trường áp dụng khi hợp lệ. `comparisonBefore`/`comparisonAfter` luôn cùng priceLayer (base, total hoặc đúng surcharge). Không dùng so sánh phụ phí bằng 0 thành giá chuyến bằng 0. Benefit không có priceLayer/cặp so sánh.

Owner/source_ref/activation và các record không được chọn không có trong projection. `diagnostics` là kênh quản trị riêng; không serialize toàn đối tượng evaluation ra công khai. Vì chưa triển khai UI/schema, output này không tự tạo Offer.

`nextBoundaryAt` trả mốc start/end tương lai gần nhất của các chương trình đã duyệt, bật và đúng tuple. Đánh giá lại mỗi lần dùng; không cache kết quả tính toán trong kernel. Day 44 phải dùng key đủ tuple/điều kiện/revision, invalidation khi sửa/tạm dừng và hạn response trước nextBoundaryAt. Cột mốc này chưa chứng minh HTML/schema tự gỡ claim khi hết hạn; kiểm đó thuộc Day 44 trước activation.

## Kiểm tra và việc tiếp theo

Bộ hành vi mới bao phủ phép tính năm loại, exact tuple, gate hiện hành, ranh giới giờ/ngày, mọi predicate, ambiguity, BigInt lớn, dữ liệu tiền sai, riêng tư, cờ tắt và booking POST mô phỏng chống client amount. PHP kiểm sanitizer riêng và tiếp tục model/persistence Day 42. CI chạy các bộ mới cùng lint/typecheck/build và hồi quy hiện hành.

Core Day 44: giao diện/schema dùng duy nhất kết quả server, so sánh cùng lớp giá/tuple, xử lý scheduled/expired/contact/disabled/ambiguous, cache tới hạn và nghiệm thu phần công khai có thay đổi. Giữ cờ thương mại tắt. Không mở lại mẫu SEO Day 41 đã đạt. Day 45 lưu snapshot version mới và replay idempotency trước xét activation; không gộp mã hoặc production nếu chưa có quyền riêng.
