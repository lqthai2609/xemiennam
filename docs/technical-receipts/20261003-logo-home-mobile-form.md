# Thay logo và bố cục biểu mẫu trang chủ trên điện thoại

Ngày: 03/10/2026. Phạm vi: Core, giao diện.

## Thay đổi

- Chuyển 1564.jpg và 1563.png do chủ dự án cung cấp sang WebP, cắt phần lề trống; giữ nguyên nội dung, màu và nền ảnh. Logo đầu trang dùng bản chữ xanh, chân trang dùng bản chữ trắng. Kích thước ảnh 1420 × 395 pixel, tên tệp có phiên bản để tránh bộ nhớ đệm cũ.
- Trang chủ ở chiều rộng tối đa 800 pixel: điểm đón hàng 1, điểm đến hàng 2, loại xe hàng 3, ngày đi và loại chuyến cùng hàng 4. Thứ tự phần tử biểu mẫu tương ứng thứ tự nhập trên điện thoại.
- Giữ vị trí các trường trên máy tính; các trang khác tiếp tục dùng thứ tự trường cũ. Nút đổi chiều chuyển về vị trí giữa hai hàng địa điểm trên điện thoại.
- Giữ nguyên resolver, Pricing V2, giá liên hệ, điều kiện ngày đi, lọc loại xe, chế độ sân bay và tiếp nhận yêu cầu.

## Kiểm tra

- Typecheck đạt. Các kiểm tra booking-search (5) và footer (4) đạt.
- Build đạt, tạo 554 trang.
- Kiểm tra trình duyệt trên bản dựng tại 320, 390, 768, 1440 pixel: không tràn ngang, logo tải thành công, trường ngày đi và loại chuyến cùng hàng; máy tính giữ hai địa điểm cùng hàng và ba trường còn lại cùng hàng.
- Chế độ đưa đón sân bay hiển thị đủ năm trường. Không có lỗi JavaScript được ghi nhận trong lượt kiểm tra.
- agent-browser không khởi động được daemon trong môi trường hiện tại; kiểm tra trực quan thực hiện bằng Playwright với Chromium cục bộ.

## Trạng thái và việc tiếp theo

Mã nguồn đã kiểm tra cục bộ; chưa phát hành production. Core đẩy nhánh sửa và tạo yêu cầu gộp để xem thử. Nghiệm thu deployment xem thử và gộp là bước tiếp theo; không thay domain, DNS, canonical hoặc sitemap.

Rollback: hoàn tác commit này. Không có thay đổi cơ sở dữ liệu hoặc backend.
