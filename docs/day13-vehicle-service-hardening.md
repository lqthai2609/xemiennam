# Day 13 — Loại xe + Dịch vụ hardening

## Scope

- `/loai-xe` và `/loai-xe/[slug]`
- `/dich-vu` và `/dich-vu/[slug]`
- pricing hiển thị trên surface loại xe phải dùng Pricing V2 đã normalize trên `Route`
- internal link dịch vụ ↔ loại xe phải dùng slug category hiện hành
- metadata/footer/content hiển thị phải dùng brand Gocar VN và site config tập trung

## Carry-over từ Day 12

Day 12 source đã merge nhưng production vẫn cần deploy Gocar Core v0.2.0 và smoke test editor/REST/frontend. Đây là preflight/QA dependency, không được quên khi kết thúc Day 13.

## Backend foundation

`src/lib/vehicle-category-pricing.ts` cung cấp:

- `buildVehicleCategoryRoutePrices()` — lấy giá đại diện outbound theo route × vehicle type từ `Route.pricingV2`.
- `getVehicleCategoryStartingPrice()` — lấy giá fixed thấp nhất từ Pricing V2; nếu chỉ có contact thì trả `Liên hệ báo giá`.

Không mở rộng business logic dựa trên `pricingByVehicle`.

`src/lib/api/services.ts` map xe gợi ý sang `vehicleTypeSlug(v.type)` vì trang xe cụ thể `/doi-xe/[slug]` đã được gộp vào `/loai-xe/[slug]`.

## Frontend handoff

Frontend phải giữ layout/responsive/component hierarchy hiện tại; chỉ harden data wiring, empty state tối thiểu, brand copy và metadata. Mọi thay đổi UI được triển khai theo prompt v0 của Day 13.

## Acceptance criteria

- Không còn metadata/footer Day 13 hiển thị `Xe Miền Nam`.
- `/loai-xe` không dùng giá hard-code làm nguồn production khi Pricing V2 có dữ liệu.
- `/loai-xe/[slug]` không gọi `getPricingTable()` legacy để dựng bảng giá.
- Giá `fixed`, `contact`, `disabled` tuân thủ Pricing V2; không biến contact/disabled thành `0`.
- Link từ dịch vụ sang loại xe không tạo slug không tồn tại.
- Production không phụ thuộc mock service/route data nếu mock fallback bị tắt.
- Không thay đổi Pricing V2 schema, REST contract, database, booking flow hoặc routing.
- Lint, regression tests và production build phải pass trước merge.
