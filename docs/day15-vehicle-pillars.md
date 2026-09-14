# Day 15 — Vehicle Pillars

Ngày audit: 14/09/2026

## Mục tiêu roadmap

Hoàn thiện 6 vehicle pillar cho các nhóm xe production hiện hành:

- 4 chỗ (`4-cho`)
- 7 chỗ (`7-cho`)
- 16 chỗ (`16-cho`)
- 29 chỗ (`29-cho`)
- 45 chỗ (`45-cho`)
- Limousine (`limousine`)

Checklist Day 15:

- Audit 6 loại xe
- Pricing / routes
- Services
- Gallery / blog
- Internal links sang Route × Vehicle combo

## Preflight / carry-over Day 14

Roadmap snapshot trước Day 15 còn ghi UI Combo Template chưa hoàn tất. Kiểm tra `main` xác nhận carry-over này đã được xử lý sau khi roadmap snapshot được tạo:

- main commit `1f25cb261a27b80a3ee1c1ccdb418c0b19f47ef2`
- commit message: `Day 14: integrate hardened combo UI from v0`
- Vercel status: success

Do đó UI carry-over Day 14 không còn là blocker của Day 15.

Dependency WordPress từ Day 12 vẫn tồn tại: deploy/verify Gocar Core v0.2.0 production cho `combo_descriptions` và REST/editor smoke. Dependency này không chặn source acceptance của Vehicle Pillars.

## Audit source hiện tại

### 1. 6 vehicle pillar có route tĩnh và content riêng

`src/data/vehicle-categories.ts` khai báo đúng 6 taxonomy production với slug/type riêng và content khác nhau cho từng nhóm: title, short description, description, audience, amenities và drive options.

`src/app/loai-xe/[slug]/page.tsx` dùng `generateStaticParams()` từ đúng 6 category; slug ngoài danh sách trả `notFound()`.

Kết luận: **PASS**.

### 2. Pricing / routes dùng Pricing V2

`src/lib/vehicle-category-pricing.ts` đọc `route.pricingV2.outbound`, lọc đúng `vehicleType`, ưu tiên featured package và chỉ render:

- `fixed` khi `price > 0`
- `contact` bằng contact text / “Liên hệ báo giá”
- bỏ `disabled`

Không mở rộng business logic trên `pricingByVehicle`.

`getVehicleCategoryStartingPrice()` cũng lấy fixed price thấp nhất từ Pricing V2; `/loai-xe` override marketing price hard-code bằng Pricing V2 hoặc “Liên hệ báo giá”.

Kết luận: **PASS**.

### 3. Route × Vehicle internal linking

Mỗi row trong `buildVehicleCategoryRoutePrices()` tạo `href` bằng `routeComboHref(route, vehicleSlug)`.

`src/app/loai-xe/[slug]/page.tsx` chuyển các href này thành `relatedRoutes`; `VehicleTypeLanding` render chúng trong section “TUYẾN CÓ THỂ ĐI”. Vì vậy vehicle pillar liên kết trực tiếp sang combo Route × Vehicle hiện hành, không chỉ sang route generic.

Kết luận: **PASS**.

### 4. Service relation

Vehicle detail fetch toàn bộ service production rồi lọc bằng taxonomy relation:

`service.vehicleTypes.some((vehicleType) => vehicleType.slug === category.slug)`

Chỉ service thực sự được gắn đúng vehicle taxonomy mới xuất hiện trên pillar. Link đi tới `/dich-vu/[slug]`.

Kết luận: **PASS**.

### 5. Gallery

Pillar lấy toàn bộ Vehicle cùng `category.type`, ưu tiên ảnh thật CMS cho hero qua `withRealCategoryImage()` và tạo gallery từ `vehicle.images`, loại duplicate bằng `Set`, giới hạn 7 ảnh.

Khi chưa có ảnh thật, hero giữ placeholder; gallery không render nếu không có ảnh. Không tạo gallery giả trong production flow.

Kết luận source contract: **PASS**.

Dependency dữ liệu: chất lượng/độ phủ gallery phụ thuộc CMS Vehicle có ảnh thật.

### 6. Blog relation

`fetchPostsByVehicleType(category.slug, 3)` dùng WordPress embedded taxonomy `vehicle_type` để lấy bài liên quan đúng loại xe. Không dùng text matching.

Nếu không có bài đúng taxonomy, section không render thay vì đưa bài không liên quan vào pillar.

Kết luận source contract: **PASS**.

Dependency dữ liệu: cần biên tập/gắn taxonomy blog trong CMS để từng pillar có bài liên quan thực tế.

### 7. SEO / schema baseline

Mỗi vehicle pillar có metadata title/description theo category và `Service` JSON-LD dùng tên/description/url của đúng loại xe.

Day 15 không mở rộng schema pricing vì structured-data pricing được xử lý ở technical SEO phase; không đưa giá suy đoán/hard-code vào schema.

Kết luận: **PASS trong scope Day 15**.

## UI audit

Vehicle pillar hiện đã có đầy đủ các section cần cho scope Day 15:

- hero riêng cho loại xe
- audience / use case
- amenities
- gallery thực tế khi có dữ liệu
- bảng giá tuyến phổ biến từ Pricing V2
- internal links Route × Vehicle
- dịch vụ phù hợp
- bài viết liên quan
- cross-link sang loại xe khác
- CTA booking

Không phát hiện missing UI bắt buộc nào khiến Day 15 thất bại. Vì vậy **không tạo prompt v0 mới chỉ để thay đổi giao diện khi chưa có vấn đề UI cụ thể cần sửa**.

Technical debt không chặn Day 15:

- component vẫn mang tên `vehicle-type-landing-day13.tsx`; đây là naming debt, không ảnh hưởng runtime/SEO.
- placeholder trong `vehicleCategories` vẫn tồn tại làm fallback có chủ đích; production ưu tiên ảnh CMS.
- nội dung blog/gallery thực tế phụ thuộc CMS taxonomy/media coverage.

## Acceptance Day 15

Day 15 được xem là source-complete khi:

1. Đúng 6 vehicle pillars được generate.
2. Pricing/routes đọc Pricing V2, không dùng marketing price hard-code làm source production.
3. Vehicle → Route × Vehicle combo có internal links.
4. Service relation dùng taxonomy vehicle type.
5. Gallery ưu tiên ảnh Vehicle CMS và không sinh fake gallery.
6. Blog relation dùng taxonomy `vehicle_type`.
7. Thiếu dữ liệu gallery/blog không làm page lỗi và không dùng nội dung không liên quan để lấp chỗ trống.
8. Carry-over UI Day 14 đã được xác minh hoàn tất trên `main`.

Kết quả audit: **8/8 PASS**.

## Carry-over sau Day 15

Không có source blocker mới cho Day 16.

Các dependency đã tồn tại và tiếp tục theo roadmap:

- Deploy/verify Gocar Core v0.2.0 production cho `combo_descriptions` và Rank Math REST/editor acceptance.
- Bổ sung ảnh xe thật trong CMS cho category còn thiếu coverage.
- Gắn taxonomy `vehicle_type` cho blog content để tăng semantic coverage trên từng pillar.

Hai mục cuối là dependency nội dung/CMS, không phải lỗi source của Day 15.
