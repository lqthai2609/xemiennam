# Day 35 — Pre-flight và carry-over

Ngày 17/09/2026. Trạng thái: SOURCE MERGED / SEO-004 SPEC CORE ACCEPTED / chờ SEO closure và final reconciliation.

## Đối chiếu đầu vào

Đã đối chiếu 16 Project Files đầu phiên, hai file SEO-004 mới, policy reverse được tìm lại, hai bộ Day 34 và Integrated Plan v1.7-day34-closed. Technical Receipt Day 34 có ưu tiên so với handoff lịch sử còn nhãn READY FOR CORE REVIEW.

Commit source bắt đầu: `a295bacd1149c14fa0afd26753dedb249b069349`. Commit Day 35 ban đầu thực tế là `b759df166565c61134830abb7c39fc935e8cf915`; mã ngắn f0dca11 trong phản hồi trước không khớp repository và không dùng làm bằng chứng. Bản sửa sau review giữ trên nhánh `codex/day35-pricing-conditions`.

## Tồn đọng có owner và mốc

| Nhóm | Trạng thái hiện tại | Owner / mốc |
|---|---|---|
| Xuất bản source Day 35 | RESOLVED: PR #111 đã squash-merge; SHA `46ce668bf642a1f803634d93099296b9f6e35ee1` | Core / hoàn tất |
| CI / PHP package | PASS: CI #206, Gocar Core Package #28 và Location Migration Preview #41 | Core / hoàn tất source gate |
| Plugin Day 32–35 | Chưa xác minh deployment; 0.8.0 mới là version source | Core / production gate |
| Zone, surcharge, modifiers, conditions | Chưa có dữ liệu Operations được phê duyệt; policy bất hoạt/contact | Core + Operations / trước activation |
| REST read-back / safe booking | Chưa chạy production fixture không gửi thông báo; chưa có dữ liệu đủ cho fixed/contact/ambiguous | Core / sau deploy và approval |
| Mobile ba entry points | Chưa có real-device receipt | Core / Day 36–58, trước production acceptance |
| D34-01 / D35-01 | Đã export 96 routes, 74 locations, 1.022 tuple states; còn approval/readiness/cluster join | Core + SEO / Day 36 |
| D34-05 / D35-04 | Có snapshot public-safe; runtime API/attribution chưa triển khai | Core / Day 38 |
| D34-06 / D35-03 | Policy một canonical/pair đã nhận; target gaps và activation vẫn mở | Core + SEO / Day 36 |
| D35-02 | HTTP/canonical/sitemap bốn URL đạt; deployed commit chưa biết | Core / Day 36 |
| D35-05/06 / D34-09 | Chưa nghiệm thu editorial, display và Offer eligibility | Core + SEO / Day 36 |
| D35-07 / D34-07 | Long Thành prelaunch; không tự mở theo ngày | Core + Operations + SEO / trước Day 40 hoặc commercial release |
| D35-08 / D34-08 | Demand evidence chưa có | SEO/Growth / Day 41 |
| D35-09 | RESOLVED cho nguồn plan: đã lấy đúng v1.7-day34-closed | Core / checkpoint hiện tại |
| D35-10 | 9 nhóm có nhiều record cùng endpoint; không tự gộp/redirect | Core + SEO / Day 36 trước mapping activation |
| DEP-002 | Spec accepted; attribution/funnel không triển khai sớm | Core + SEO / Day 38/40/55–56 |
| Day 30 analytics | GA4/Meta account receipt chưa có trong phiên; không tự đánh dấu đạt | Core + Growth / khi có quyền đọc và trước nghiệm thu analytics |

## Giới hạn tính năng Day 35

Đã triển khai backend evaluator và persistence contract. Client cũ có thể thiếu hoặc gửi rỗng departureTime; nếu rule áp dụng cần giờ thì kết quả contact. Giao diện hiện chưa gửi giờ theo một trường cấu trúc thống nhất ở cả ba entry points. Day 36 phải viết prompt v0 và nối input giờ theo nghĩa vận hành đã duyệt; không lấy giờ bay hoặc ghi chú làm giờ khởi hành mặc định.

Ngày lễ, weekend_days, timezone, khoảng áp dụng, priority và amount đều do Operations cấu hình. Không có seed hoặc giá mặc định. Không có hệ số nhân trong phiên này; thay đổi theo hệ số cần contract Operations riêng.

Chưa phát lệnh bắt đầu Day 36. Core gửi receipt SEO-004 cho Organic Growth xác nhận đóng slice; sau phản hồi và final reconciliation, Core mới xuất bộ chốt ngày cùng lệnh Day 36.
