# Kiểm tra và tối ưu Core Web Vitals — 15/10/2026

Phạm vi: nhánh `fix/scoped-route-pricing-cache`, tiếp nối commit `73e866b99a510f467f4597e7dfb619231e017ea0` và PR #150. Chỉ chỉnh mã và kiểm tra cục bộ; không gộp mã, tạo deployment Vercel, sửa DNS/domain hoặc gửi booking/email thật.

## Nguyên nhân và thay đổi

- `RouteBookingActions` nhập trực tiếp toàn bộ wizard, kiểm tra biểu mẫu và tư vấn sân bay. Tách wizard nguyên hành vi sang `quick-booking-dialog.tsx`, chỉ tải khi mở; tải trước khi nút có focus hoặc pointer enter. Có trạng thái đang tải. Lần mở đầu có chi phí tải thêm; không đồng nhất thời gian mở dialog với INP.
- Hàm định dạng trong `wp.ts` nhập cùng module với CMS fetch và schema Promotion Model có Zod. Các Client Components dùng định dạng vô tình đưa schema máy chủ và Zod vào gói tải ban đầu. Tách nguyên văn các hàm sang `wp-format.ts`, cập nhật import định dạng; `wp.ts` giữ re-export tương thích. Không sửa công thức giá, dữ liệu hoặc trạng thái phục vụ.
- Ảnh trong picker tuyến dùng ảnh gốc. Đổi sang cơ chế Next Image sẵn có, khai báo `sizes` theo bố cục hiện hành và giữ khung ảnh cố định, tải chậm cho ảnh dưới màn hình đầu. Không thay tài sản ảnh.
- `SubpageHero` dùng ảnh nền CSS, phát hiện sau CSS và luôn tải bản gốc. Dùng Next Image `fill`, `preload`, `sizes=100vw`; giữ đúng ảnh dùng chung hiện tại, vị trí, lớp phủ và kích thước.

## Kết quả JavaScript

Đơn vị byte nội dung JavaScript sau giải nén, không phải byte truyền có gzip/Brotli. Chỉ tính tài nguyên từ `script[src]` của trang ban đầu; loại request router prefetch để phép so sánh không phụ thuộc liên kết xuất hiện trong viewport. Máy tính và điện thoại tải cùng tổng lượng này.

| Trang thử | Trước | Sau | Giảm |
| --- | ---: | ---: | ---: |
| / | 600855 | 600867 | -0.00% |
| /tuyen-duong/ba-ria-vung-tau/synthetic-route | 1076143 | 632250 | 41.25% |
| /loai-xe/7-cho | 1044134 | 600201 | 42.52% |
| /bang-gia | 974874 | 597261 | 38.73% |

Trang chủ giữ nguyên lượng JavaScript về thực chất (chênh 12 byte); không tuyên bố cải thiện tốc độ trang chủ.

## Phương pháp và giới hạn

- Hai bản Next.js production build cục bộ, cùng source baseline và cùng bộ dữ liệu CMS giả: hai tuyến, ba xe, ba Location. Các phản hồi rỗng khác dùng chính cơ chế fallback của môi trường thử nghiệm. Không dùng dữ liệu cá nhân thật.
- Chromium Headless Shell 145, Playwright; viewport 390×844 và 1440×844, deviceScaleFactor=1, mạng loopback, không giảm tốc CPU/mạng. Request bên ngoài trong trình duyệt bị chặn; API đặt xe được giả lập. Cache thử nghiệm cũ và môi trường không còn chạy không được dùng làm baseline.
- Tám lượt kiểm tra bốn trang đều HTTP 200, không có lỗi JavaScript hoặc tràn ngang. Các khung ảnh xe giữ kích thước; `sizes` chọn ảnh 384px trên điện thoại và 640px trên máy tính, tất cả ảnh xe của fixture tải thành công.
- CLS thử nghiệm sau thay đổi: trang tuyến 0.00277/0.00552; trang loại xe 0.03377/0.02861; bảng giá 0.00039/0.00599 (điện thoại/máy tính). Các trang này bằng baseline trong bộ dữ liệu giả.
- LCP và thời gian blocking trên máy thử dao động và không đại diện production; không tuyên bố LCP/INP đã cải thiện hay đạt ngưỡng. Lần mở wizard đầu đo khoảng 379–409 ms sau tối ưu, so với 69–77 ms khi toàn bộ wizard đã tải trước; có trạng thái đang mở và tải trước theo ý định. Đổi chi phí tải ban đầu lấy tải theo nhu cầu; cần kiểm tra trên mạng điện thoại thực tế khi nghiệm thu.
- Chưa có dữ liệu người dùng thực tế từ CrUX/Search Console và chưa đo backend/ảnh CMS thật trên Vercel. Không đánh dấu nghiệm thu Core Web Vitals production.

## Kiểm tra hồi quy

- TypeScript và production build cục bộ: PASS.
- ESLint: không có lỗi; tám cảnh báo còn lại thuộc mã hiện có ngoài phạm vi.
- 132 kiểm tra hợp đồng/hàm hiện có: PASS (giá public, Promotion Model, schema giá, tên địa điểm, luồng sân bay, voucher, biên nhận, gửi lại booking và phạm vi làm mới cache).
- Hai luồng trình duyệt trên 390×500 và 1440×900: mở lần đầu, CTA trong viewport, khóa nền, Escape và trả focus, validation từng bước, tóm tắt chiều–xe–giá/tên/điện thoại/voucher, chặn gửi trước xác nhận, phản hồi lỗi giữ dữ liệu, gửi lại cùng idempotency key và payload, chặn bấm gửi hai lần, chuyển `/cam-on` sau phản hồi giả lập hợp lệ, biên nhận phiên không chứa tên/điện thoại/voucher: PASS. Toàn bộ phản hồi booking được chặn và giả lập; không tạo booking/email thật.
- Luồng booking/API và chính sách cache không sửa trong lượt tối ưu này. Cờ thương mại và Long Thành PRELAUNCH giữ nguyên.

## Việc tiếp theo

Nghiệm thu các thay đổi giao diện còn lại trên PR #150 trước phát hành. Khi có production release được cho phép, đo lại mobile LCP/INP/CLS bằng nội dung và backend thực tế; đối chiếu dữ liệu người dùng thực tế. Không tạo Preview mới chỉ để chạy phép đo cục bộ.

Nguồn hướng dẫn: tài liệu Next.js 16.3.4 cài trong `node_modules/next/dist/docs/` (Lazy Loading và Image); https://nextjs.org/docs/app/guides/lazy-loading; https://web.dev/articles/vitals.
