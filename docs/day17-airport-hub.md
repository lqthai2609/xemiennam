# Day 17 — Airport Hub Tân Sơn Nhất

## Mục tiêu

Tạo nền tảng Airport Hub cho Tân Sơn Nhất bằng chính Location V2 + Route Pair/Direction V2 + Pricing V2 hiện có. Không tạo airport route engine hoặc pricing engine riêng.

## Data contract

Module `src/lib/api/airport-routes.ts` cung cấp `fetchAirportHubBySlug(airportSlug)`.

- Airport được resolve bằng `LocationV2.type === "airport"` + slug.
- Chỉ nhận route pair đã migrate đủ Location ID; route legacy fallback bị loại khỏi Airport Hub.
- Một Route Pair có thể sinh tối đa hai entry cho hub tùy direction được enable.
- `travelDirection` biểu diễn ý nghĩa thương mại: `from_airport` hoặc `to_airport`.
- `pricingDirection` giữ direction thật của Pricing V2: `outbound` hoặc `inbound`.
- Giá đại diện lấy từ featured package của đúng direction.
- `fixed` hiển thị giá; `contact` hiển thị text liên hệ; thiếu featured price dùng `Liên hệ báo giá`; direction disabled không sinh entry.
- Link route tiếp tục dùng `routeHref`, không tạo URL engine riêng.

## UI scope dành cho v0

UI Day 17 là một Airport Hub chuyên biệt cho Tân Sơn Nhất, nhưng phải tái sử dụng design system, màu Gocar VN, CTA hiện có và route URLs hiện có.

Trang cần có:

1. Hero rõ intent `Đưa đón sân bay Tân Sơn Nhất ↔ các tỉnh/thành`.
2. Hai nhóm tuyến riêng: `Từ Tân Sơn Nhất` và `Đến Tân Sơn Nhất`.
3. Route cards đọc từ `AirportHubData`, không hard-code danh sách tuyến hay giá.
4. Giá fixed/contact phải giữ đúng semantics của Pricing V2; tuyệt đối không hiển thị 0 đồng khi chưa có giá.
5. CTA: xem tuyến/đặt xe, gọi ngay, Zalo; không thay đổi booking API.
6. Empty/error state khi WordPress chưa có airport location hoặc chưa có route hợp lệ.
7. FAQ Tân Sơn Nhất và breadcrumb.
8. Internal links tới Service `dua-don-san-bay`, province hub và route detail khi có dữ liệu.
9. Responsive/mobile, accessibility và brand palette Gocar VN theo quy ước dự án.

## Acceptance criteria

- Không có business logic mới dựa trên `pricingByVehicle`.
- Không duplicate Route/Direction/Pricing logic.
- Một route có airport ở origin hoặc destination đều được map đúng hai chiều.
- `contact` không bị biến thành giá số.
- `disabled` không xuất hiện như route có thể bán.
- UI không hard-code tuyến ưu tiên Day 20 vào Day 17.
- Build/lint phải xanh trước merge.

## Carry-over production

Tại thời điểm bắt đầu Day 17, Vercel production vẫn đang ở commit cũ hơn Day 16 trong khi `main` đã ở `e5382c63...`. Việc promote/smoke production Day 16 vẫn là pre-flight QA cần hoàn tất trước khi tuyên bố Day 17 production-ready.
