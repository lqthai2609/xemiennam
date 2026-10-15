# Sửa giá trực tiếp — Alo Đặt Xe

Phiên bản 1.0 — 13/10/2026. Phạm vi tính năng độc lập; không bắt đầu hoặc đóng Day 54.

## Quyết định đã chốt

Chỉ tài khoản WordPress có vai trò `administrator`, đang đăng nhập và có quyền `manage_options`, được sửa giá. Quyền được xác thực lại tại máy chủ cho từng yêu cầu. Tài khoản biên tập viên, tác giả, thành viên và khách không có quyền này.

Giữ nguyên bố cục, bộ lọc, hàng, cột, tên xe và cách hiển thị dành cho khách của trang `/bang-gia` và thẻ giá tuyến. Khi phiên quản trị được xác thực, thêm nút nhỏ **Sửa** cạnh giá. Bấm nút này sẽ mở ô nhập tại chính vị trí giá, cùng **Lưu** và **Hủy**. Không tạo bảng quản lý thay thế, hộp thoại hay thanh thông báo chung.

Vị trí đang ghi **Liên hệ báo giá** giữ nguyên trong ô giá. Quản trị viên chọn **Giá cụ thể** hoặc **Liên hệ báo giá** ngay tại đó. Giá cụ thể phải là số nguyên dương theo đơn vị đồng; chế độ liên hệ không giữ lại số tiền. Không dùng giá 0 để biểu diễn thiếu giá.

## Luồng lưu và nguồn dữ liệu

1. Đăng nhập trên giao diện quản trị của frontend `/quan-tri`, dùng tài khoản quản trị WordPress. Đăng nhập riêng ở WordPress backend không tự tạo phiên frontend khi hai hệ thống khác miền.
2. Mở bảng giá hoặc trang tuyến và bấm Sửa ở mức giá cần đổi.
3. Đọc giá hiện tại và phiên bản tuyến từ máy chủ; hiển thị đúng tuyến, chiều, loại xe, gói và giá cũ trong ô đang sửa.
4. Lưu đúng một dòng Pricing V2, theo `routeId × direction × vehicleId × packageKey` đã hiển thị. Không sao chép giá sang chiều ngược lại hoặc gói khác.
5. Ghi người sửa, thời gian, lý do thao tác và ảnh chụp dữ liệu trước/sau vào lịch sử sẵn có. Nếu lưu lịch sử thất bại, khôi phục dữ liệu trước thao tác.
6. Sau khi WordPress lưu thành công, làm hết hạn cache danh sách tuyến và cache chi tiết tuyến vừa sửa, rồi làm mới trang của quản trị viên. Những trang khác đọc cùng nguồn giá nhận giá mới khi tải hoặc lấy lại dữ liệu; đây không phải cơ chế đẩy giá tức thì tới mọi thẻ trình duyệt đang mở.

Giá và thông tin đã lưu trong yêu cầu đặt xe trước đó không được cập nhật lại. Bộ tính ưu đãi hiện hành vẫn áp dụng quy tắc riêng trên giá gốc; chỉnh giá không chỉnh chương trình ưu đãi.

## Phạm vi dữ liệu được sửa

- Chỉ sửa dòng Pricing V2 đã tồn tại, đang ở trạng thái giá cụ thể hoặc liên hệ trên tuyến đã công khai, chiều đang bật.
- Dòng bị tắt, tổ hợp thiếu, dòng trùng, tuyến đang khóa hoặc Long Thành PRELAUNCH bị từ chối. Không tự tạo hoặc kích hoạt gói mới.
- Thẻ giá tuyến dùng đúng chiều và gói đang chọn, kể cả `3d2n` nếu có dữ liệu hợp lệ. Trang bảng giá giữ nguyên lựa chọn hiện tại; tính năng này không tự thêm gói hoặc bộ lọc.
- Không sửa giá kiểu cũ thiếu định danh Pricing V2. Các dòng này tiếp tục hiển thị theo giao diện hiện hành.
- Các dòng khác và trường điều kiện, nhãn riêng của dòng giữ nguyên.

## Bảo vệ quyền truy cập

WordPress bổ sung quyền `canEditPricing` vào phiên quản trị, không suy ra quyền sửa giá từ `canPublish`. Next chỉ hiện nút khi máy chủ trả quyền này. Endpoint mới `gocar/v1/admin/routes/{id}/pricing` kiểm tra quyền quản trị, quyền sửa tuyến và khóa dữ liệu. Proxy frontend dùng phiên HttpOnly, nguồn yêu cầu cùng website và mã bảo vệ yêu cầu; phản hồi phiên/quản trị không được lưu trong bộ nhớ đệm công khai.

Đường cập nhật giá cũ `/admin/apply`, bản nháp giá, kiểm tra trước phê duyệt và khôi phục lịch sử giá cũng yêu cầu quyền quản trị. Bộ lọc quyền metadata chặn tài khoản không phải quản trị viên ghi các trường giá qua WordPress REST chuẩn. Mã quản trị tùy biến khác hoặc mã máy chủ có quyền ghi trực tiếp database nằm ngoài phạm vi endpoint này.

## Điều kiện đưa lên website

Backend cần plugin **Gocar Core 0.17.5**; tên thư mục kỹ thuật `gocar-core` được giữ để nâng cấp đúng plugin hiện có. Frontend cần bản mã nguồn cùng phiên bản. `/quan-tri` cần cấu hình quản trị hiện có `GOCAR_ADMIN_WIZARD_ENABLED=true` tại môi trường muốn dùng. Cờ thương mại và quảng cáo không thay đổi.

Cài plugin trước khi phát hành frontend. Khi backend chưa có `canEditPricing`, frontend giữ trạng thái không có quyền sửa, không tự cấp quyền.

## Bằng chứng và giới hạn

- PHP kiểm tra hành vi bằng dữ liệu giả: quyền của năm nhóm tài khoản, từ chối đường API cũ/bản nháp/meta, sửa đúng tổ hợp, giá liên hệ/cụ thể, dòng 3 ngày 2 đêm, dữ liệu không hợp lệ, phiên bản cũ, chiều tắt, dòng tắt/trùng/thiếu, tuyến khóa và khôi phục khi lưu lịch sử thất bại.
- API Next thực chạy với máy chủ dữ liệu giả: phiên quản trị, từ chối khách/biên tập viên, bảo vệ nguồn yêu cầu/mã yêu cầu, phản hồi không lưu đệm, ghi một tổ hợp và bảng giá trả dữ liệu mới.
- TypeScript và bản dựng tối ưu đã đạt với dữ liệu WordPress giả. Kiểm tra mã giao diện không có lỗi; có một cảnh báo ảnh `<img>` sẵn có ở thẻ xe.
- Chưa kiểm tra bằng trình duyệt: trình duyệt kiểm tra không truy cập được máy chủ thử nghiệm nội bộ. Chưa nghiệm thu WordPress/MySQL thật hoặc website đang chạy; không có đặt xe hay email thật.

## Việc tiếp theo

1. Core: hoàn tất kiểm tra trực quan trên bản xem thử sau khi frontend được dựng ở môi trường trình duyệt truy cập được. Điều kiện: Sửa/Lưu/Hủy hoạt động trong ô trên máy tính và điện thoại; khách không có nút sửa.
2. Chủ dự án: cài plugin 0.17.5 khi chuẩn bị nghiệm thu tính năng, chọn thay thế plugin hiện tại; không nhập hoặc đổi giá kinh doanh để thử nếu chưa chọn mức giá cần sửa.
3. Core: xác nhận phiên quản trị, cấu hình frontend và kiểm tra chỉ đọc trên backend đã nâng cấp; đưa bản đã nghiệm thu lên website theo quyền phát hành áp dụng cho tính năng này. Trạng thái hiện tại: chưa phát hành.
4. SEO: sau phát hành, đối chiếu giá hiển thị với Pricing V2 cho đúng một tổ hợp được chủ dự án đổi; không mở kiểm tra lại toàn bộ bảng giá, URL, canonical hoặc indexability.

## Bản xem thử riêng

Bổ sung ngày 13/10/2026: `/quan-tri/xem-thu-gia` dùng chính các component bảng giá/thẻ tuyến và ô sửa giá với dữ liệu giả. Chọn người xem mô phỏng Quản trị viên/Khách để quan sát quyền trên giao diện; lựa chọn này không đăng nhập hay cấp quyền quản trị thật.

Các endpoint `/api/preview/pricing/*` chỉ hoạt động trên Vercel Preview hoặc môi trường phát triển có cờ thử riêng. Chúng không gọi WordPress, booking hoặc email. Thay đổi giá giả lưu trong cookie riêng của trình duyệt, hết hạn sau một giờ. Production trả 404 cho trang và API xem thử. Giá khởi tạo của bản xem thử không phải bảng giá kinh doanh.

## Giảm ISR Writes sau khi sửa giá — 14/10/2026

Đường Sửa/Lưu giá `/api/admin/routes/{id}/pricing` không còn làm hết hạn tag WordPress toàn cục hoặc layout gốc. Sau khi backend xác nhận thành công, frontend làm hết hạn tag danh sách tuyến và tag chi tiết đúng slug tuyến, dùng `{expire:0}` để yêu cầu đọc tiếp theo lấy dữ liệu mới. Các trang dùng danh sách này (bảng giá, thẻ tuyến, hub, tuyến liên quan, sitemap và các trang khác thực sự phụ thuộc) vẫn phải cập nhật; không được giữ giá cũ để tiết kiệm usage. Cache xe, bài viết, địa điểm và các nguồn không đổi không bị xóa vì thao tác sửa giá.

Plugin hiện tại trả mã tuyến. Frontend đọc riêng `id,slug` từ WordPress, không lưu đệm và giới hạn chờ năm giây. Nếu WordPress lỗi, trả sai mã hoặc thiếu slug, frontend vẫn giữ kết quả lưu thành công và làm hết hạn riêng nhóm dữ liệu tuyến. Không khôi phục lệnh xóa cache toàn website trong nhánh dự phòng này.

Cache tuyến có tag danh sách hoặc tag slug; vẫn giữ tag loại dữ liệu cũ để tương thích các callback hiện hành. Khóa cache tuyến chuyển phiên bản 2 sang 3 một lần khi phát hành nhằm tránh dùng các mục cũ chưa có tag mới. Khóa cache nguồn khác và thời gian dự phòng 300 giây giữ nguyên. Một số trang chi tiết cũng đọc danh sách tuyến để dựng phần liên quan nên vẫn được làm mới theo phụ thuộc dữ liệu; thay đổi này không bảo đảm mỗi lần lưu chỉ dựng lại một trang.

Nguồn snippet `wordpress/snippets/frontend-sync.php` bổ sung mã tuyến trong callback chỉ khi nhận sự kiện từ đúng endpoint WordPress Sửa giá, phương thức POST và người dùng có quyền quản trị. Callback và lần gửi lại sử dụng cùng phạm vi hẹp với frontend. Lưu nội dung, đổi slug, xóa tuyến, thay taxonomy và các thao tác API cũ giữ phạm vi hiện hành để tránh bỏ sót dữ liệu. Không đổi thuật toán giá, quyền sửa, cờ thương mại, domain hoặc DNS.

Điều kiện áp dụng đầy đủ: phát hành frontend mới trước, sau đó thay nội dung snippet WPCode hiện hành bằng nguồn đã kiểm tra, giữ secret/bootstrap hiện có. Không bật thêm một snippet song song và không kích hoạt lại bootstrap. Nếu chưa cập nhật snippet, frontend vẫn tương thích nhưng callback cũ tiếp tục làm mới cả nhóm tuyến. Bản sửa mã nguồn không đồng nghĩa đã áp dụng trên website.

Kiểm tra dùng dữ liệu giả: tag chi tiết độc lập; danh sách và tuyến vừa sửa đọc giá mới; nguồn xe/bài viết và chi tiết tuyến khác giữ cache; lỗi tra slug có dự phòng an toàn; GET, lỗi backend, khách và sai mã bảo vệ không làm mới cache; callback giá/gửi lại giữ đúng ID; lưu nội dung và taxonomy giữ hành vi cũ. Kiểm tra phạm vi invalidation là bằng chứng mã, chưa phải phép đo giảm ISR Writes thực tế trên Vercel.

Kết quả tại nhánh sửa: 26 kiểm tra cache/khả năng phục hồi/callback và 19 kiểm tra quản trị/giá công khai/schema/chiều–gói đạt; kiểm tra PHP callback, cú pháp snippet và quyền/lưu giá đạt. TypeScript, kiểm tra mã các tệp thay đổi và bản dựng Next.js 16.3.4 đạt. Kiểm tra HTTP chạy cả máy chủ phát triển và bản dựng tối ưu với WordPress giả: lưu một dòng, bảng giá và trang chi tiết đều nhận giá mới; các dòng khác giữ nguyên. Chưa thay website đang chạy, chưa nghiệm thu WordPress/MySQL thật hoặc đo usage sau phát hành.

Quy tắc làm việc bổ sung: sửa giá chỉ làm mới dữ liệu giá và nguồn phụ thuộc; dữ liệu giá hết hạn ngay sau lưu; không dùng deploy để cập nhật WordPress; kiểm tra phạm vi callback cùng proxy để tránh một đường còn xóa cache rộng; đo usage trước/sau phát hành trong cùng khoảng thời gian để xác nhận mức giảm.
