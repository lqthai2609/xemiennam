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
- Các source guard về điểm đón/trả và điểm dừng đã chuyển sang đọc wizard thực tế sau khi tách tệp; guard VehicleSelector kiểm cả launcher và wizard. Các điều kiện bảo vệ không bị bỏ. Nhóm kiểm tra các bước CI còn lại chạy cục bộ: 128 lượt PASS (có giao với nhóm 132 ở trên, không cộng thành số kiểm tra độc lập).
- Hai luồng trình duyệt trên 390×500 và 1440×900: mở lần đầu, CTA trong viewport, khóa nền, Escape và trả focus, validation từng bước, tóm tắt chiều–xe–giá/tên/điện thoại/voucher, chặn gửi trước xác nhận, phản hồi lỗi giữ dữ liệu, gửi lại cùng idempotency key và payload, chặn bấm gửi hai lần, chuyển `/cam-on` sau phản hồi giả lập hợp lệ, biên nhận phiên không chứa tên/điện thoại/voucher: PASS. Toàn bộ phản hồi booking được chặn và giả lập; không tạo booking/email thật.
- Luồng booking/API và chính sách cache không sửa trong lượt tối ưu này. Cờ thương mại và Long Thành PRELAUNCH giữ nguyên.

## Việc tiếp theo

Nghiệm thu các thay đổi giao diện còn lại trên PR #150 trước phát hành. Khi có production release được cho phép, đo lại mobile LCP/INP/CLS bằng nội dung và backend thực tế; đối chiếu dữ liệu người dùng thực tế. Không tạo Preview mới chỉ để chạy phép đo cục bộ.

Nguồn hướng dẫn: tài liệu Next.js 16.3.4 cài trong `node_modules/next/dist/docs/` (Lazy Loading và Image); https://nextjs.org/docs/app/guides/lazy-loading; https://web.dev/articles/vitals.

## Lượt tối ưu tiếp theo — khung tìm chuyến và thư viện xe

Baseline riêng: `15c30ca31cece2e86c3cb8ef159f5d8ffb20350f`. Không cộng mức giảm của lượt này với mức giảm JavaScript ở lượt trước: đây là hai loại dữ liệu và hai baseline khác nhau.

### Thay đổi

- Thêm server wrapper `booking-search.tsx` cho trang chủ, trang dịch vụ và hero dùng chung. Chỉ gửi ID/slug, hai đầu tuyến, loại địa điểm, trạng thái chiều và lựa chọn xe mà khung tìm chuyến thực sự cần. Các trang đang hiển thị bảng giá vẫn nhận nguồn giá đầy đủ hiện hành.
- Projection không tính giá, không lọc bỏ tuyến hoặc kích hoạt chiều. Dòng gói trùng đúng loại xe và mode được gộp trong dữ liệu tìm chuyến; mọi gói vẫn nằm trong nguồn giá ở trang đích. Xe legacy, fixed/contact/disabled, chiều bị tắt và thứ tự lựa chọn được giữ đúng.
- Lập Map tra cứu một lần theo danh sách tuyến trong `useMemo`; mỗi lần nhập chỉ chuẩn hóa hai địa điểm rồi tra cứu. Giữ quy tắc bản ghi đầu tiên khớp, outbound trước inbound trong mỗi bản ghi, alias Sài Gòn/HCM/quận và không cho hai đầu cùng nhóm giá. Không dùng cache toàn cục, không giữ địa chỉ khách trong bộ nhớ dùng chung.
- Gom media ID của thư viện xe, loại trùng khi đọc và chia tối đa 100 ID mỗi yêu cầu. Khôi phục đúng thứ tự và ảnh lặp của từng xe; ảnh thiếu vẫn thiếu và lỗi máy chủ vẫn được báo lỗi. Đọc từng xe giữ phương thức cũ; freshFacts vẫn yêu cầu facts mới như trước. Không đổi TTL, tag hoặc phạm vi làm mới cache.

### Số liệu và giới hạn

| Hạng mục | Trước lượt này | Sau lượt này | Phạm vi đo |
| --- | ---: | ---: | --- |
| JSON tuyến gửi cho khung tìm chuyến | 762.675 byte | 93.363 byte | Snapshot công khai đã lưu của 82 tuyến, giảm 87,76% trước nén |
| HTML/RSC trang chủ | 86.264 byte | 74.109 byte | Build cục bộ cùng fixture hai tuyến, giảm 14,09% trước nén |
| HTML/RSC trang dịch vụ | 76.609 byte | 64.409 byte | Cùng fixture, giảm 15,93% trước nén |
| Yêu cầu media cho danh sách sáu xe | 6 | 1 | Cùng sáu media ID; ảnh và thứ tự giữ nguyên |

- 492 trường hợp tra cứu từ snapshot 82 tuyến (hai chiều, alias và hành trình chưa khớp) trả cùng route ID/direction với phép quét cũ. Kiểm tra giữ nguyên lựa chọn, không nghiệm thu lại giá kinh doanh.
- Microbenchmark 4.920 lượt tra cứu: khoảng 1.468 ms → 33 ms trên máy thử, không gồm dựng index. Đây là phép đo thuật toán, không phải INP hoặc mức tăng tốc của toàn website; index phải được dựng lại khi danh sách tuyến thay đổi.
- Một GET chỉ đọc tới WordPress thật với sáu media ID: HTTP 200, đủ sáu bản ghi, URL ảnh khớp snapshot; không ghi dữ liệu CMS. Không khẳng định mức giảm ISR Writes chỉ từ số yêu cầu ít hơn.
- JavaScript trang chủ gần như không đổi (600.867 → 600.936 byte sau giải nén); trang tuyến/xe/bảng giá giữ kết quả lượt trước. Không tuyên bố giảm thêm JavaScript 88%.
- Chưa đo người dùng thực tế, backend thật và mạng điện thoại cho toàn bộ trang sau phát hành; chưa chốt LCP/INP/CLS production.

### Kiểm tra

- TypeScript, production build cục bộ: PASS. ESLint không có lỗi, tám cảnh báo hiện có.
- 85 kiểm tra về projection/index/gallery, dữ liệu xe, lựa chọn chuyến, địa chỉ, điểm dừng và luồng xe: PASS. Hai bộ kiểm tra mới được đưa vào CI.
- Mười kịch bản trình duyệt: viewport 390 và 1440; HCM → Vũng Tàu với xe/khứ hồi đúng URL, đảo chiều về với ngày/xe tùy chọn, chặn Sài Gòn → Thủ Đức cùng nhóm giá, hành trình chưa có tuyến vẫn mở báo giá, chiều đón sân bay giữ query: PASS. Không gửi yêu cầu đặt xe thật.
- Bốn trang × hai viewport không có lỗi JavaScript/tràn ngang. Hai luồng wizard 390×500 và 1440×900 vẫn đạt (giữ dữ liệu khi lỗi, gửi lại cùng key/payload, chặn hai lần, xác nhận và trang cảm ơn giả lập).
- Giá, nội dung kinh doanh, thương hiệu, header/footer, miền/DNS, cờ thương mại và Long Thành PRELAUNCH không sửa; không tạo Preview/deployment Vercel hoặc merge production.


## Lượt tối ưu ảnh bảng giá và lịch tải logo cuối trang

Baseline riêng: `53f0fcf2d747a0fa722e759ddb01bd1edc2e6aeb`. Không đổi nguồn giá, dữ liệu CMS, công thức giá, ISR, nội dung hoặc quy trình đặt xe.

### Phát hiện và thay đổi

- Hero `/bang-gia` tải ảnh nền CSS nguyên bản `home-coastal-fleet.webp` (178.196 byte). Chuyển đúng ảnh đó sang Next Image `fill`, `sizes=100vw`, `preload`. Giữ chiều cao 340/235 px, crop `center 55%` trên máy tính và `right center` trên điện thoại, nền dự phòng và lớp gradient cũ. Ảnh trang trí có alt rỗng và aria-hidden; không thêm ảnh hoặc thay thương hiệu.
- Logo footer raw img chưa có loading policy nên React tự thêm preload vào head; ảnh 54.972 byte bắt đầu tải cùng ảnh hero dù footer ở xa. Thêm `loading=lazy`, `decoding=async`, giữ nguyên nguồn, kích thước nội tại và CSS. Không tạo thêm biến thể logo hoặc yêu cầu biến đổi ảnh cho logo. Trình duyệt vẫn có thể tải trước khi cuộn nếu footer đủ gần viewport, đúng cơ chế native lazy loading.
- Dùng cơ chế Next Image đang có cho đúng một ảnh hero. Sau phát hành, cơ chế này có thể tạo các biến thể ảnh theo kích thước được yêu cầu và dùng tài nguyên Image Optimization; không tuyên bố thay đổi hoàn toàn không tốn tài nguyên hoặc đã giảm ISR Writes. Lượt làm việc này không tạo deployment.

### Đo đối chiếu

Next production build cục bộ với cùng fixture hai tuyến/ba xe/ba Location. Chromium 145, viewport 390×844, DPR 1, CPU giảm tốc 4 lần; CDP network 200.000 byte/giây tải xuống (1,6 Mbps), 93.750 byte/giây tải lên, latency 150 ms. Mỗi trang ba browser context mới trước/sau; server loopback và cache biến thể ảnh cục bộ, không mô phỏng toàn bộ độ trễ backend/CDN. Chặn API booking thật, request ngoài và router prefetch như các lượt trước. PerformanceObserver ghi LCP và tổng layout shift không do input; chưa phải phép đo field hoặc đầy đủ INP/session-window CLS.

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| Ảnh hero bảng giá truyền tới viewport thử | 178.196 byte | 25.194 byte, biến thể 640 px |
| LCP bảng giá, trung vị 3 lượt | 3.600 ms | 1.300 ms |
| LCP bảng giá, cả ba lượt | 3.608 / 3.596 / 3.600 ms | 1.344 / 1.232 / 1.300 ms |
| Layout shift bảng giá, giá trị lớn nhất | 0,000227 | 0,000163 |
| JavaScript ban đầu bảng giá, sau giải nén | 597.261 byte | 597.449 byte |

Ảnh hero giảm khoảng 85,86% byte trong viewport/DPR thử, không phải tổng dung lượng trang. Biến thể màn hình lớn hoặc DPR cao có kích thước khác. Bảng giá tải ảnh từ head thay vì đợi CSS; LCP thử nghiệm giảm khoảng 64%, không suy ra phần trăm cho production. Logo footer không còn preload ở cả ba trang; trang chủ và xe 7 chỗ không tải logo trong cửa sổ đo, bảng giá ngắn vẫn tải logo từ khoảng 989–1.267 ms thay vì khoảng 170 ms trước sửa.

Trang chủ không ghi nhận cải thiện LCP nhất quán: trung vị 1.324 → 1.492 ms, các lượt sau 1.540 / 1.492 / 1.316 ms. Xe 7 chỗ 1.140 → 1.112 ms. JavaScript hai trang giữ nguyên. Không tuyên bố tăng tốc hai trang này từ phép đo; chỉ xác nhận footer không còn cạnh tranh tải từ head. CPU dùng chung và thứ tự mạng có thể gây dao động. Chưa có dữ liệu CrUX/Search Console hoặc INP thực tế; chưa nghiệm thu Core Web Vitals production.

### Kiểm tra hồi quy

- Production build, TypeScript: PASS. ESLint: 0 lỗi, 8 cảnh báo có sẵn.
- 13 kiểm tra hợp đồng footer, giá công khai và schema giá: PASS.
- So sánh nguyên văn từng hàng giá và từng href ở ba gói Một chiều/Khứ hồi/Theo ngày, trên viewport 390 và 1440: giống baseline. Không điều chỉnh giá để phục vụ tối ưu.
- Kiểm tra ảnh chụp trang bảng giá trên điện thoại/máy tính: giữ nội dung, header/footer chung, crop, gradient, kích thước hero và vị trí bộ lọc. Thay đổi chỉ là lịch tải và biến thể nén của ảnh hiện có.
- Bốn trang × hai viewport: HTTP 200, không lỗi JavaScript hoặc tràn ngang.
- Sáu kiểm tra ảnh trên ba trang × hai viewport ở DPR 2: footer không có preload, cuộn tới footer tải được ảnh và giải mã thành công; hero bảng giá tải đúng ảnh đáp ứng. Điện thoại chọn biến thể 828 px, máy tính 3840 px.
- Hai luồng wizard 390×500 và 1440×900: PASS gồm xác nhận từng bước, dữ liệu/voucher, lỗi giữ thông tin, retry cùng key/payload, chặn bấm hai lần, redirect cảm ơn giả lập và không lưu PII trong biên nhận. Không tạo booking/email thật.

Phần còn lại cần đo bằng dữ liệu thực sau phát hành được phép: tải khung tìm chuyến và độ phản hồi khi nhập/chọn trên thiết bị thật. Ảnh CSS fleet trang chủ vẫn tải sớm (64.882 byte trong phép đo); cần giữ đúng cách cắt ảnh ba xe nếu tối ưu tiếp, không thay vội để tránh đổi hình xe. Không tạo thêm deployment để đo trong lượt này.
