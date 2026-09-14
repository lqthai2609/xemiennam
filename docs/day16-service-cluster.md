# Ngày 16 — Service Cluster

## Mục tiêu

Chuẩn hóa Service Pillar theo search intent riêng và khép kín internal-link graph giữa Service → Vehicle → Route → Route × Vehicle mà không dùng text-match hoặc entity giả.

## Phạm vi đã triển khai

### 1. Service cluster contract

`src/types/service.ts` bổ sung:

- `searchIntent`: intent biên tập riêng cho từng service đã có contract.
- `useCases`: các nhu cầu thực tế dùng để giải thích service cho người dùng.
- `relatedRoutes`: route liên quan được derive từ dữ liệu route thật.
- `ServiceRouteComboLink`: link Route × Vehicle từ vehicle type thật của route.

Các field mới là optional để service mới/chưa có editorial contract không bị ép sinh content giả.

### 2. Search intent và use case

`src/lib/api/services.ts` khai báo editorial mapping cho 4 service hiện hữu:

- `xe-cuoi`
- `dua-don-san-bay`
- `thue-xe-theo-thang`
- `city-tour`

Service slug không có trong mapping sẽ không tự động được gán search intent/use case.

### 3. Service ↔ Vehicle

Relation `vehicle_type` vẫn lấy từ `_embedded["wp:term"]` của WordPress.

Ngày 16 bổ sung đọc `description` của taxonomy term để frontend không còn bắt buộc render mô tả rỗng. Nếu term chưa có description, UI bỏ hẳn đoạn mô tả thay vì tạo fallback giả.

`loai_xe_phu_hop` vẫn resolve bằng vehicle post ID thật.

### 4. Service → Route

Related route chỉ được chọn khi route có ít nhất một `vehicleType` tương thích với taxonomy của service.

Quy tắc nhóm được khai báo rõ:

- `4–7 chỗ` → `4 chỗ`, `7 chỗ`
- `16–29 chỗ` → `16 chỗ`, `29 chỗ`

Ngoài hai nhóm này, matching là exact theo slug chuẩn hóa.

Mỗi service lấy tối đa 4 route để tránh biến Service Pillar thành route directory.

### 5. Service → Route × Vehicle

Với mỗi related route, combo link chỉ được sinh từ chính `route.vehicleTypes` đã match với service. URL dùng helper chuẩn:

- `routeHref(route)`
- `routeComboHref(route, vehicleTypeSlug(vehicleType))`

Không dựng URL bằng text tự do.

### 6. Frontend

`ServiceDetail` bổ sung hai block có điều kiện:

- `PHÙ HỢP KHI BẠN CẦN`
- `TUYẾN ĐƯỜNG PHÙ HỢP`

Block route chứa link tới Route Pillar và các Route × Vehicle tương ứng.

`searchIntent` không hiển thị dưới dạng thuật ngữ SEO cho khách hàng.

## Guardrails

- Không text-match title/body để xác định relation.
- Không tạo route/vehicle/combo giả để lấp giao diện.
- Service mới không có editorial mapping vẫn render bình thường.
- Service không có taxonomy `vehicle_type` sẽ không sinh related route.
- Taxonomy term không có description sẽ không render đoạn mô tả rỗng.
- Pricing V2 và route content model hiện hữu không bị thay đổi.

## Acceptance status

- [x] Service ↔ Vehicle dùng relation có cấu trúc.
- [x] Search intent riêng cho 4 service hiện hữu.
- [x] Use case riêng cho 4 service hiện hữu.
- [x] Internal links Service → Vehicle.
- [x] Internal links Service → Route.
- [x] Internal links Service → Route × Vehicle.
- [x] Không sinh dữ liệu giả khi thiếu relation.
- [x] Giữ nguyên Pricing V2 source of truth.
- [ ] Xác minh build/lint trên CI hoặc môi trường build.
- [ ] Production smoke test sau deploy.

## Ghi chú kiểm thử

GitHub connector không trả workflow run cho commit cuối tại thời điểm hoàn tất implementation; do đó build/lint chưa được đánh dấu PASS chỉ dựa trên giả định. Cần xác minh bằng CI/deploy trước khi đóng Ngày 16 hoàn toàn.
