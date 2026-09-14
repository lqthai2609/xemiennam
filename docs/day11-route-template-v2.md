# Day 11 — Route Template 2 chiều

## Mục tiêu

Hoàn thiện route landing page dùng Pricing V2 theo đúng `route × direction × vehicle × package`, không suy diễn hoặc dùng giá outbound làm mặc định cho inbound.

## Phạm vi triển khai

- Một direction state duy nhất ở Route Detail.
- Hero/H1/content đổi theo chiều đang chọn.
- Switch outbound/inbound chỉ hiển thị các direction được enable trong Pricing V2.
- Giá/package đọc đúng `pricingV2[direction]`; package `disabled` không render.
- `pricing_mode=contact` hiển thị CTA Gọi/Zalo rõ ràng thay vì giả lập giá số.
- Điểm đón/trả và bản đồ hành trình đảo đúng theo direction.
- Booking context tiếp tục truyền stable `routeId`, `direction`, `packageKey`, `pricingMode`.
- Related routes tiếp tục dùng dữ liệu route động hiện có.
- Giữ static generation/ISR của route page; không đưa `searchParams` vào Server Page chỉ để quản lý switch direction.
- Không tạo pricing engine riêng và không mở rộng business logic dựa trên `pricingByVehicle`.

## Prompt v0 triển khai UI/UX

Cập nhật Route Detail Template hiện tại của Gocar VN để hỗ trợ Pricing V2 hai chiều mà không thay đổi routing, API, database, booking API hoặc responsive behavior nền tảng.

Bối cảnh source hiện tại:
- Route page: `src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx`.
- Template chính: `src/components/route-detail.tsx`.
- Pricing component: `src/components/route-pricing-section.tsx`.
- Booking CTA: `src/components/route-booking-actions.tsx`.
- Pricing V2 đã có contract `outbound/inbound`, vehicle, package, mode `fixed/contact/disabled`.

Yêu cầu UI/flow:
1. Tạo một direction state duy nhất tại Route Detail, mặc định outbound nếu enabled, nếu không thì inbound.
2. Switch direction hiển thị nhãn `{from} → {to}` và `{to} → {from}`; chỉ render chiều được enabled.
3. Khi đổi direction, cập nhật đồng bộ Hero H1, mô tả hướng đi, section giá, booking context, điểm đón/trả, bản đồ hành trình và label liên quan.
4. Không được dùng giá outbound làm fallback cho inbound.
5. Pricing card nhóm theo vehicle, bên trong hiển thị package của đúng direction.
6. `fixed`: hiện price label + CTA đặt xe online, Gọi và Zalo hiện có.
7. `contact`: không hiện giá số giả; hiển thị text liên hệ và CTA rõ `Nhắn Zalo báo giá` / `Gọi nhận báo giá`.
8. `disabled`: không render package đó.
9. Điểm đón/trả outbound dùng `pickupPoints → dropoffPoints`; inbound đảo lại `dropoffPoints → pickupPoints`.
10. Bản đồ outbound giữ map CMS hiện có; inbound đảo `saddr/daddr` khi có thể và fallback về tên hai đầu tuyến nếu URL CMS không hỗ trợ đảo trực tiếp.
11. Related routes tiếp tục dùng dữ liệu động hiện tại; không hard-code tuyến.
12. Desktop/tablet/mobile phải giữ layout hiện tại, switch wrap tốt ở mobile, CTA contact không overflow.
13. Giữ design system và brand palette hiện tại; không redesign toàn trang.
14. Không chuyển Server Page sang request-time rendering chỉ để đọc query param; giữ SSG/ISR hiện tại.
15. Không thay đổi API, database, Pricing V2 schema, route slug hay booking endpoint.

Loading/empty/error:
- Route data loading tiếp tục theo Server Component hiện có.
- Nếu direction enabled nhưng không có package renderable, hiện empty message liên hệ báo giá.
- Nếu route legacy chưa có `pricingV2`, giữ compatibility grid hiện tại; không tạo inbound giả.

Accessibility:
- Direction switch dùng `role=group`, `aria-label` và `aria-pressed`.
- CTA Gọi/Zalo có accessible label cụ thể theo vehicle.
- Không làm mất keyboard navigation hiện tại.

Acceptance criteria:
- Route có outbound + inbound: switch đổi H1, content, pricing, pickup/dropoff, map và booking direction đồng bộ.
- Giá outbound và inbound khác nhau vẫn hiển thị đúng, không cross-fallback.
- Contact package chỉ hiện contact state + Gọi/Zalo.
- Disabled package không xuất hiện.
- Route chỉ có một direction enabled không hiển thị switch dư thừa.
- Route legacy không pricingV2 vẫn render như trước.
- `npm run lint`, `npm run test:location-migration`, `npm run build` đều pass.
- Build vẫn static-generate route pages như trước.
