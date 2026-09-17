# Technical Receipt — Day 35 Pricing Conditions

Trạng thái: SOURCE MERGED / SEO-004 SPEC CORE ACCEPTED / PRODUCTION PENDING.
Ngày: 17/09/2026. Owner: Core. PR #111; merge SHA `46ce668bf642a1f803634d93099296b9f6e35ee1`.

## Kết quả

Gocar Core source 0.8.0 có condition evaluator riêng trên Pricing V2: giờ địa phương, thứ, cuối tuần cấu hình, ngày lễ tường minh, khoảng ngày và package. Không có dữ liệu vận hành dựng sẵn. Rule lỗi hoặc mơ hồ, thiếu policy/ngày/giờ/múi giờ đều contact.

Review phát hiện và sửa rủi ro sanitizer loại bỏ predicate lỗi rồi mở rộng scope. TS validator và WordPress giờ giữ contact cho policy sai. Thêm kiểm tra key trùng, biên ngày/giờ, khung qua nửa đêm, không mặc định cuối tuần Thứ bảy/Chủ nhật, lọc scope trước khi yêu cầu ngày/giờ.

Booking lưu snapshot server có policy version và timezone. Client gửi giờ rỗng vẫn tương thích. Giá legacy và direction bị tắt không tạo tổng. Base, surcharge, modifiers và condition tách riêng; không chuyển estimate thành giá SEO hoặc doanh thu.

## Kiểm thử

- 84/84 JavaScript regression/behavioral tests PASS; gồm 13 price-condition và 8 SEO URL Map fixtures.
- ESLint PASS: 0 lỗi; 5 cảnh báo cũ.
- TypeScript PASS.
- Next.js build exit 0; hoàn tất 581/581 trang. Có HTTP 500 từ một số request WordPress trong lúc build; không dùng kết quả build này để chứng nhận toàn bộ nội dung production.
- GitHub Actions PASS: CI #206, Gocar Core Package #28 gồm PHP syntax/sanitizer fixtures, và Location Migration Preview #41.
- `git diff --check` PASS.

## SEO-004

Đã nhận hai artifact người dùng bàn giao, đối chiếu policy nguồn và workbook v0.5: 73 cluster/4 canonical lịch sử, 15 price-support, 5 prelaunch. Export public-safe snapshot: 96 routes, 74 locations, 1.022 tuple states. Bốn URL trả 200/self-canonical/trong sitemap; query inbound về canonical sạch. Phát hiện 9 nhóm nhiều Route chung endpoint, ghi D35-10. Xem receipt SEO-004 riêng cho AC-01…18 và owner/mốc.

## Chưa hoàn tất

1. Chưa deploy plugin 0.8.0, chưa nhập/kích hoạt dữ liệu Operations, chưa REST/booking production fixtures hoặc mobile QA.
2. UI giờ cấu trúc thống nhất tiếp tục Day 36; thiếu giờ vẫn contact.
3. Runtime SEO mapping/attribution, readiness/schema, xung đột endpoint và các dependency khác còn mở theo pre-flight ledger.
4. Organic Growth cần xác nhận receipt SEO-004 trước final reconciliation Day 35.

Source slice Day 35 đã merge sau khi mọi quality gate đạt. Day 35 vẫn mở đến khi Organic Growth xác nhận receipt SEO-004 và Core phát hành bộ Project Files chốt ngày. Merge không đồng nghĩa deploy hoặc kích hoạt policy.
