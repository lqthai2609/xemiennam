# Cloudflare Ngày 2 — cấu hình ứng viên, chưa nghiệm thu trực tuyến

Nhánh: `chore/cloudflare-day2-isr`, phát triển từ Ngày 1 `e974e5a`.
Worker hiện có: `alodatxe-migration-spike`. Giữ Access All traffic.
R2 `alodatxe-migration-cache` (Standard, Private) và D1 `alodatxe-migration-tags` đã tạo ngày 06/10/2026. Database ID đã điền vào `wrangler.isr.jsonc`. Chủ dự án đã nhập cấu hình build và nhánh Ngày 2; chưa thấy build mới hoặc bằng chứng triển khai ISR trực tuyến.

## Phạm vi

`wrangler.jsonc` và `open-next.config.ts` vẫn là cấu hình snapshot Ngày 1.
Ứng viên Ngày 2 dùng `wrangler.isr.jsonc`, `open-next.isr.config.ts`:

| Thành phần | Tài nguyên | Mục đích |
|---|---|---|
| R2 Standard, riêng tư | `alodatxe-migration-cache` | Dữ liệu đệm Next.js; không phải ảnh hay dữ liệu khách hàng |
| D1 | `alodatxe-migration-tags` | Theo dõi thời điểm làm mới đường dẫn/tag |
| Durable Object SQLite | `DOQueueHandler`, binding `NEXT_CACHE_DO_QUEUE` | Hàng đợi tái tạo trang theo thời gian |

Không có regional Cache API layer. Không mở bucket công khai/r2.dev.
Booking, trang quản trị và POST `/api/revalidate` vẫn bị chặn. D1 sẵn sàng
cho bước webhook sau; chưa tuyên bố webhook WordPress hoạt động.
Header `X-AloDatXe-Cache: r2-isr` chỉ là nhãn cấu hình, không phải bằng chứng HIT.

## Kiểm tra đã thực hiện ngày 06/10/2026

- TypeScript, ESLint phần thay đổi, diff check: đạt; 7 kiểm tra guard đạt.
- Build đầy đủ 556 trang đạt. Một số trang tuyến vượt 60 giây lần đầu rồi
  Next.js tự thử lại; chưa nghiệm thu độ ổn định của WordPress/build.
- Wrangler dry-run đạt: bundle 10.370,39 KiB, gzip 1.952,76 KiB.
- Preview workerd cục bộ đã nạp cache và trả 200 cho trang chủ, HEAD và tuyến
  Vũng Tàu; booking/webhook/admin/cache nội bộ trả 403; tất cả có noindex.
  Thời gian cục bộ không dùng làm số đo CPU hoặc tốc độ Cloudflare trực tuyến.
- Máy thử gặp lỗi đọc network interfaces; dùng fallback loopback chỉ trong
  tiến trình kiểm tra cục bộ. Không đưa workaround này vào source/deploy.
- Cache build có 675 file, 236.439.225 byte (khoảng 0,236 GB).
  Đây là một bản build; nhiều build có thể tăng lưu trữ, hạn mức dùng chung tài khoản.
- Chưa kiểm chứng online R2/DO/D1, tái tạo trang theo thời gian, sửa giá thử,
  webhook, Access sau đổi cấu hình, CPU Free và cơ sở dữ liệu WordPress độc lập.

## Bước của chủ dự án

1. Trong tài khoản Cloudflare, mở **Storage & databases**, **R2**, **Overview**.
2. Kiểm tra trang kích hoạt R2 và điều kiện tính phí trước khi xác nhận.
   R2 Standard có hạn mức miễn phí nhưng có thể tính tiền vượt hạn mức.
3. Sau khi đồng ý kích hoạt, tạo bucket `alodatxe-migration-cache`, chọn Standard,
   giữ Private. Không cần nâng Workers lên Paid.
4. Tại **Storage & databases**, **D1 SQL Database**, tạo
   `alodatxe-migration-tags`. Cung cấp Database ID (không phải mật khẩu).

R2 miễn phí mỗi tháng: 10 GB-tháng, 1 triệu thao tác Class A, 10 triệu Class B.
Vượt hạn mức: 0,015 USD/GB-tháng, 4,50 USD/triệu Class A,
0,36 USD/triệu Class B; đơn vị tính tiền có làm tròn.
D1 Free: 5 triệu hàng đọc/ngày, 100.000 hàng ghi/ngày, tổng lưu trữ 5 GB.
Durable Objects SQLite có trên Workers Free, vượt hạn mức Free thì báo lỗi.
Chưa có số đo tải trực tuyến để cam kết hóa đơn 0 USD.
Nguồn đối chiếu 06/10/2026:
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://opennext.js.org/cloudflare/caching

## Bước của Core sau khi có tài nguyên

1. Điền Database ID thật vào `wrangler.isr.jsonc`. Lệnh deploy có chặn ID mẫu.
2. Kiểm tra bộ biến build/runtime: public CMS chỉ đọc như Ngày 1;
   mock fallback và admin tắt. Chưa sao chép credentials production.
3. Đổi nhánh Cloudflare sang `chore/cloudflare-day2-isr` khi cấu hình đã sẵn sàng.
   Build `npm run cf:isr:build`, deploy `npm run cf:isr:deploy:preview`,
   version dry-run `npm run cf:isr:dry-run`.
   OpenNext deploy sẽ nạp cache ban đầu và tạo bảng D1 cần thiết.
4. Xác minh online: trang/ảnh/RSC, Access, noindex, bảo vệ ghi dữ liệu,
   R2/D1/queue, dữ liệu cũ được giữ khi CMS lỗi, CPU và hạn mức Free.
5. Hoàn thiện kết nối CMS thử có xác thực và fixture giá đã duyệt.
   Kiểm chứng thay giá thử, tự làm mới và webhook riêng có xác thực trước khi đóng CF-07.

## WordPress thử hiện có

`https://laquangthai.datxesaigon.com/alo-day38-test/` còn chuyển về đăng nhập;
REST route ẩn danh trả 401 `alo_day38_login_required` ngày 06/10/2026.
Bốn biến Preview trên nhánh Vercel `day38-wordpress-isolated-test` tồn tại:
`WP_API_BASE_URL`, `WP_TEST_APPLICATION_AUTH_ENABLED`, `WP_TEST_USERNAME`,
`WP_TEST_APPLICATION_PASSWORD`. Chỉ kiểm tra tên/phạm vi; chưa lấy giá trị bí mật.
Fixture lịch sử là thử booking với danh mục rỗng; chưa chứng minh có đầy đủ
giá/tuyến hoặc cơ sở dữ liệu độc lập. Không tạo lại WordPress lúc này.

## Khôi phục preview

Trước khi triển khai ISR, preview Ngày 1 không bị đổi.
Nếu cần quay lại sau thử ISR: chọn nhánh `chore/cloudflare-day1-spike`,
build `npm run cf:build`, deploy `npm run cf:deploy:preview`.
Giữ Access All traffic, Vercel và các tài nguyên thử; không xóa D1/R2/DO tự động.
Không triển khai production hoặc đổi DNS/domain/canonical trong Ngày 2.
