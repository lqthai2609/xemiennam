# Day 35 — Pricing V2 Condition Rules

Trạng thái: IMPLEMENTED LOCAL — chờ Pull Request, CI/PHP gate và production verification.
Ngày: 17/09/2026. Owner: Core. Gocar Core source: 0.8.0.

## Nguồn dữ liệu và ranh giới

Pricing V2 là nguồn duy nhất cho base theo route × direction × vehicle × package. Engine loại nguồn legacy và direction bị tắt khỏi khả năng tạo tổng số. Condition là lớp cộng riêng, cùng với surcharge Day 32 và modifiers Day 34; không sửa base price.

Không tạo amount, hệ số, lịch ngày lễ, định nghĩa cuối tuần, múi giờ hoặc khoảng áp dụng vận hành. Policy mặc định bất hoạt. Airport dùng cùng engine. Địa chỉ, điểm dừng, ghi chú, tọa độ và danh tính khách hàng không tham gia lựa chọn condition.

## Policy được quản trị

- `price_condition_policy_version`: số nguyên dương đánh dấu policy Operations đã duyệt; mặc định 0. Đây là gate cấu hình, không phải chứng cứ phê duyệt độc lập.
- `price_condition_timezone`: múi giờ IANA do Operations duyệt. Không điền mặc định. Temporal rule thiếu múi giờ hợp lệ trả contact.
- `price_condition_rules_v2`: danh sách rule, mỗi rule có `rule_key` không trùng và `charge_mode` rõ ràng.
- Scope tùy chọn: direction, vehicle_id, package_key; chuẩn hóa package bằng contract Pricing V2 hiện hữu.
- Predicate tùy chọn: days_of_week (0 Chủ nhật … 6 Thứ bảy), weekend_only + weekend_days được cấu hình, holiday_dates tường minh, start_date/end_date, start_time/end_time.
- `priority` là thứ tự cấu hình số nguyên không âm; thiếu priority dùng thứ tự kỹ thuật 0, không tạo hệ số hay ngày áp dụng.
- `none` là không điều chỉnh tường minh; `fixed` cần amount dương hữu hạn; `contact` yêu cầu báo giá. Không dùng amount 0 để biểu diễn contact.

Các predicate được kết hợp AND. Phạm vi ngày bao gồm hai đầu. Khung giờ `[start_time,end_time)` có thể qua nửa đêm; ngày/weekday/holiday luôn căn cứ ngày khởi hành địa phương, không suy ra ngày trước đó. Hai biên giờ phải được cung cấp cùng nhau và khác nhau. Không có lịch lễ tự động.

## Lựa chọn và fallback

Validate toàn bộ policy trước khi chọn. Rule sai kiểu, sai ngày/giờ, scope lỗi, key trùng hoặc field không được hỗ trợ làm policy trả contact. WordPress giữ invalid marker thay vì loại bỏ predicate lỗi rồi mở rộng phạm vi áp dụng.

Lọc direction/vehicle/package trước, sau đó date, rồi time. Thiếu date/time có thể ảnh hưởng rule áp dụng phải trả contact, không rơi về generic none. Rule của package/direction/vehicle khác không làm phát sinh yêu cầu giờ không liên quan.

Trong các rule phù hợp: priority cao nhất, sau đó specificity cao nhất. Specificity gồm direction, vehicle, package, nhóm date, nhóm time; cùng điểm cao nhất trả contact. Không mặc định holiday thắng weekend. Operations phải cấu hình precedence rõ.

Thiếu policy, thiếu rule, thiếu dữ liệu hoặc cấu hình mơ hồ đều contact. No-match không đồng nghĩa không có phụ phí. Phải có explicit none cho trường hợp miễn điều chỉnh đã được duyệt.

## Booking snapshot

Server đọc departureDate và departureTime cấu trúc. Client cũ có thể bỏ trống giờ; khi temporal rule cần giờ, contact fallback được giữ. Không suy giờ từ note hoặc thời điểm hiện tại.

`price_condition_resolution_v1` lưu mode/reason, policy_version, timezone, rule_key, local date/time và amount chỉ khi fixed hợp lệ. Snapshot là dữ liệu Booking V2; không đưa ngày/giờ chuyến vào SEO read model.

`estimated_total = base + surcharge + modifiers + condition`

Chỉ tạo khi mọi lớp thực sự áp dụng resolve, base là fixed dương từ V2 và direction được bật. Tổng không hữu hạn/vượt giới hạn số an toàn trả contact. Contact và disabled không thành zero. Snapshot là ước tính, không phải quoted price, revenue hoặc stable SEO price.

## Nghiệm thu và rollout

Local behavioral tests bao gồm invalid policy, leap date, boundaries, overnight, approved weekend membership, holiday, precedence, conflict, missing date/time/timezone, package/direction isolation, legacy rejection, disabled direction và overflow.

Trước production: CI/PHP syntax + sanitizer tests, package/deploy 0.8.0, Operations approval, REST read-back, booking fixtures an toàn không thông báo và dọn fixture. UI giờ cấu trúc thống nhất ở ba entry points tiếp tục Day 36 bằng prompt v0; không lấy giờ bay làm giờ đón mặc định.

Rollback: đưa condition policy về version 0 để giữ contact; rollback deployment bằng artifact phiên bản trước khi cần. Không thay base rows hoặc canonical.

## SEO-004

SEO-004 đã CORE ACCEPTED ở mức đặc tả; xem `seo-004-day35-core-acceptance.md`. Không tạo URL mới hoặc đổi canonical. URL mapping không kích hoạt rule giá hoặc cấp quyền Offer/schema.
