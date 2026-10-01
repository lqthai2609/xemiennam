# Khắc phục giao diện lưu dữ liệu rỗng sau lỗi WordPress

Ngày kiểm tra: 01/10/2026. Phạm vi: lớp đọc WordPress dùng chung, không thay dữ liệu CMS, giá, URL hoặc chính sách bán.

## Bằng chứng sự cố

- Production `dpl_GaQBKffWUEmpfTF4LDL4kqmpNWHB`, source `2a94e605f4982a67bc263cb34c3f8afffa08ff01`.
- Nhật ký Vercel lúc 08:15 UTC ghi HTTP 500 từ `/route`, `/location`, `/diem-den`, `/posts`, `/vehicle` và `/media`.
- Trang chủ và danh sách tuyến trả HTTP 200 nhưng RSC chứa `routes: []`. Trang chủ không có các section tuyến, điểm đến và bài viết từ CMS.
- Kiểm tra trực tiếp API WordPress lúc 08:40 UTC trả HTTP 200, 85 tuyến; danh sách xe có 6 records. Dữ liệu chưa bị xóa. Nguyên nhân upstream của đợt HTTP 500 chưa được xác định; không quy kết plugin, nhà cung cấp hosting hoặc PR thiết kế lại.
- `wpFetch()` cũ trả `null` cho mọi lỗi. Các adapter đổi `null` thành `[]`, khiến ISR coi trang rỗng là một lần tạo trang thành công.

## Thay đổi

- Thử lại đúng một lần khi mạng lỗi, HTTP 429 hoặc HTTP 5xx. Header riêng của lần thử lại tránh dùng lại phản hồi lỗi trong request memoization; vẫn giữ `next.revalidate`.
- Khi lỗi kéo dài, authentication thất bại hoặc JSON không hợp lệ, throw để quá trình dựng/revalidate thất bại rõ ràng; không chuyển thành danh sách rỗng. ISR có thể tiếp tục phục vụ trang thành công gần nhất.
- 404 thật vẫn trả `null`; danh sách rỗng hợp lệ từ HTTP 200 vẫn được giữ. Không dùng giá hoặc dữ liệu mock để che sự cố.
- Bổ sung regression test vào CI.

## Kiểm tra

- 9 behavioral tests cho WordPress fetch: đạt.
- Typecheck và ESLint hai tệp thay đổi: đạt.
- Production build với API WordPress thật: đạt, 520 trang.
- 8 tests cho Pricing V2 và HTML của danh sách/schema/Long Thành: đạt. Fixture tuyến #9055 vẫn NOT_BUILT/PENDING như báo cáo của bộ thử; không tuyên bố nghiệm thu tuyến này.
- HTML trang chủ có 85 route IDs cùng đủ ba section CMS; danh sách tuyến và bảng giá có 80 route IDs, loại 5 tuyến sân bay Long Thành. Đây là bằng chứng bản dựng local, chưa phải production đã khôi phục.

## Việc tiếp theo và quay lại

- Gộp bản sửa và triển khai từ GitHub sau quyền phát hành; bản dựng mới phải lấy dữ liệu thật, không chấp nhận build rỗng khi API lỗi.
- Kiểm tra trang chủ, `/tuyen-duong`, `/bang-gia`, `/diem-den`, `/blog`, `/lien-he` và một tuyến có giá trên deployment mới; đối chiếu nhật ký lỗi.
- Khi đạt các kiểm tra trên mới xác nhận website đã khôi phục. Nếu phát hành lỗi, quay frontend về deployment trước sự cố có dữ liệu hợp lệ; không cần khôi phục hoặc sửa database WordPress cho thay đổi này.
