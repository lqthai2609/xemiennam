# Day 47 — giao diện chọn xe theo thông tin đã xác nhận

## Phạm vi

Giao diện chọn xe dùng kết quả server Day 46. Không thay đổi giá, ưu đãi, snapshot/replay, taxonomy, URL/canonical/sitemap, CMS hoặc WordPress production. Plugin source vẫn 0.13.0, chưa cài production. Không tự nâng các gate CMS/Vận hành/runtime/SEO.

## Luồng dữ liệu

Khách nhập số hành khách không gồm tài xế, chọn hành lý chưa rõ/không hành lý/nhập chi tiết và cấp dịch vụ mong muốn. Nút “Kiểm tra xe” gọi `POST /api/vehicle-suggestions`, một endpoint chỉ đọc, `Cache-Control: no-store`. Endpoint kiểm dữ liệu đầu vào, đọc xe với `freshFacts: true` rồi dùng nguyên `fetchVehicleSuggestions()` Day 46; không tạo engine tại client, tính giá, ghi lead hoặc gửi thông báo.

Kết quả `model_version=1` trả từng vehicle riêng với fit/status/reason và các nhãn công khai. Không trả tên/mô tả/số chỗ legacy như bằng chứng, không trả evidence/actor/journal. Không dùng facts của một xe làm facts cho cả loại xe. UI lọc theo loại chỉ để hiển thị lựa chọn, không suy sức chứa.

## Trạng thái và giao diện

- Phù hợp cấu hình đã xác nhận: chỉ hiện khi server xác nhận số khách, mọi giới hạn hành lý và cấp dịch vụ yêu cầu trong cùng một cấu hình. Không xác nhận giá, còn xe hoặc xe giao thực tế.
- Xe quá nhỏ: hiện rõ cảnh báo số khách vượt sức chứa đã xác nhận; không hiện nút chọn tích cực cho cấu hình này. Khách vẫn có thể yêu cầu tư vấn để đổi cấu hình/loại xe.
- Thiếu thông tin/không rõ hành lý/ngoài cấu hình/cấp dịch vụ chưa khớp: “Cần tư vấn”. Không mặc định chưa rõ thành không hành lý.
- Đang tải, phản hồi sai phiên bản, lỗi API hoặc timeout: không giữ kết luận phù hợp cũ; giữ đường tư vấn.
- Khi đổi số khách, hành lý, cấp dịch vụ hoặc loại xe, kết quả cũ bị xóa. Phản hồi chậm sau đổi đầu vào hoặc đóng hộp thoại không được hiện lại. Đổi lại giá trị cũ không phục hồi kết quả trước đó.
- Các cấu hình hành lý hiển thị riêng từng dòng: số khách đồng thời, số kiện của từng nhóm, ba kích thước và tổng khối lượng. Không gộp cực đại. Chiều dài/rộng/cao giữ thứ tự, không tự xoay hành lý hoặc mặc định chuẩn hãng bay.
- Mẫu xe tham khảo/cấp dịch vụ chỉ từ facts confirmed được parser kiểm đúng vehicle_id. Null giữ “Cần tư vấn”. Ảnh và mẫu tham khảo không cam kết xe giao.

Selector nằm ở danh sách loại xe, trang loại xe, trang tuyến, trang tuyến theo loại xe, form liên hệ và hộp yêu cầu chuyến. Nhãn sức chứa/mẫu xe/cấp dịch vụ tĩnh chưa có bằng chứng trong home-fleet, category copy, route cards và combo đã được bỏ. Nội dung CMS không được tự sửa. Thông tin kiểm tra là tư vấn; không thêm fields hoặc tự xác nhận fit vào hợp đồng booking. Khách có thể ghi nhu cầu hành lý trong ghi chú; số khách ở hộp chuyến nối với field passengerCount hiện có. Chưa rõ số khách/hành lý không được tự điền 1 khách/0 kiện.

## Tương thích và kiểm tra

Backend cũ không có facts tiếp tục hiển thị tư vấn. Mock chỉ là dữ liệu giả, không được biến thành bằng chứng vận hành. Form gửi yêu cầu không phụ thuộc vào kết quả kiểm tra fit; các yêu cầu liên hệ/địa chỉ/chuyến bay hiện có giữ nguyên. Không có booking hoặc email thật trong nghiệm thu.

Mã kiểm tra: `npm run test:vehicle-selector`, `npm run test:vehicle-facts`, kiểm tra booking pickup/dropoff, snapshot, public pricing, journey navigation, lint/typecheck/build. Browser fixture chỉ chạy localhost, không ghi WordPress và chặn `/api/booking` tại browser. Start `node scripts/day47-browser-runner.mjs` với Playwright/Chromium đã có; `DAY47_UI_CHECKOUT` cho phép checkout thử riêng. Ảnh và báo cáo fixture không phải nghiệm thu production hoặc SEO.

## Gate còn mở

Vận hành phải cung cấp và xác nhận facts; Core nhập qua endpoint admin khi có quyền phù hợp và nghiệm thu WordPress/MySQL riêng. Organic Growth thực hiện SEO-013A/SEO-013B và joint DEP-004; không tự xem source/UI fixtures là nghiệm thu SEO. DEP-006, DEP-002/SEO-012B/M4 và DEP-011 giữ theo bàn giao Day 46. Không cài backend chỉ để khép biên nhận cũ.

Hai cờ thương mại false; Long Thành/KU-068–072 PRELAUNCH; D35-10 đúng phạm vi; nguồn khách chưa rõ; Paid/Budget/Campaign/GA/Meta INACTIVE.

Việc ưu tiên tiếp theo theo roadmap: Core Day 48, giờ đón sân bay gợi ý/buffer/kiểm thông tin chuyến bay; chỉ dùng dữ liệu Vận hành được xác nhận, thiếu thì tư vấn. Chưa bắt đầu trong Day 47.
