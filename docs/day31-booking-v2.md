# Day 31 — Booking V2 Pickup/Dropoff Field Inventory

Status: COMPLETE  
Owner: Gocar VN — Core  
Cross-project dependency: DEP-001  
Base: `main@6e50d3ff3b2c46b0ad98d84c18b14a8301224986`

## 1. Mục tiêu

Day 31 tách rõ ba lớp dữ liệu đang dễ bị trộn lẫn:

1. **Canonical journey** — Route Pair/Direction V2 xác định hành trình thương mại và Pricing V2 context.
2. **Canonical place** — Location V2 xác định địa phương/sân bay/khu vực có ID ổn định.
3. **Trip-instance pickup/dropoff** — địa chỉ hoặc điểm hẹn thực tế của đúng một yêu cầu đặt xe.

Địa chỉ đón/trả thực tế không được ghi đè Route endpoints và không được dùng để tạo một pricing engine riêng.

## 2. Field inventory

| Field | Client/API | WordPress persistence | Source of truth | Required in Day 31 UI | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Route ID | `routeId` | `tuyen_quan_tam` | Route Pair V2 | Có khi route canonical tồn tại | Stable route identity; label matching chỉ compatibility |
| Direction | `direction` | operator note/pricing context hiện tại | Route Direction V2 | Có khi booking xuất phát từ route | `outbound` / `inbound`; không suy diễn từ address text |
| Vehicle | `vehicleType` | `loai_xe_dat` | Vehicle CMS/taxonomy | Có | Giữ behavior hiện tại |
| Pricing mode | `pricingMode` | operator note/pricing context hiện tại | Pricing V2 | Theo flow hiện tại | Không tính giá từ pickup/dropoff Day 31 |
| Package | `packageKey` | operator note/pricing context hiện tại | Pricing V2 | Theo flow route hiện tại | Không đổi contract Day 31 |
| Pickup Location | `pickupLocationId` | `pickup_location_id` | Location V2 | Optional payload; API có thể derive | ID địa phương/sân bay phía đón, không phải exact address |
| Dropoff Location | `dropoffLocationId` | `dropoff_location_id` | Location V2 | Optional payload; API có thể derive | ID địa phương/sân bay phía trả, không phải exact address |
| Exact pickup | `pickupAddress` | `pickup_address` | Booking request | Có trong UI mới | Địa chỉ/điểm hẹn của chuyến cụ thể, tối đa 240 ký tự |
| Exact dropoff | `dropoffAddress` | `dropoff_address` | Booking request | Có trong UI mới | Địa chỉ/điểm trả của chuyến cụ thể, tối đa 240 ký tự |
| Pickup note | `pickupNote` | `pickup_note` | Booking request | Không bắt buộc | Mô tả cách tìm khách/điểm đón, tối đa 300 ký tự |
| General note | `note` | `ghi_chu` + notification | Booking request | Không bắt buộc | Giữ cho yêu cầu khác; không nhồi structured pickup/dropoff vào field này ở client mới |

## 3. Direction-aware Location mapping

Khi client không gửi Location ID hợp lệ cụ thể hơn, `/api/booking` dùng Route V2 để derive:

- `outbound`: pickup = `origin_location_id`, dropoff = `destination_location_id`;
- `inbound`: pickup = `destination_location_id`, dropoff = `origin_location_id`.

Client không được tự clone direction hoặc đảo Pricing V2 chỉ dựa trên chuỗi địa chỉ.

## 4. Boundary với Day 32

Day 31 **không** tạo các field authoritative như `center`, `suburb`, `outskirt`, `service_zone`, `surcharge` hoặc logic tương đương.

Day 32 — Zone / Service Area sẽ quyết định cách phân loại Location/address vào vùng phục vụ và cách surcharge tham gia Pricing/quote. Nếu Day 32 cần persist kết quả phân loại, contract đó phải được thêm riêng và có acceptance test riêng.

## 5. Quy tắc cho SEO / Organic Growth

- Route, Location và Pricing V2 có thể là nguồn cho SEO surface theo readiness policy.
- `pickup_address`, `dropoff_address`, `pickup_note` là dữ liệu booking riêng theo từng khách/chuyến; **không phải nguồn nội dung SEO, page-generation hoặc indexability**.
- Không scrape UI để lấy các field này.
- Không biến exact customer address thành landing page, schema hay internal-link entity.
- SEO dependency cần field kỹ thuật mới phải đi qua DEP-001 và Technical Receipt theo SEO ↔ Core Contract v1.1.

## 6. Backward compatibility

- `/api/booking` vẫn chấp nhận client cũ chưa gửi năm field pickup/dropoff mới.
- Với route canonical, API có thể persist Location endpoint IDs từ Route V2 ngay cả khi client cũ không gửi Location IDs.
- Existing Route ID, Vehicle ID, departure date, pricing context, notification flow và booking status không được phá vỡ.

## 7. Acceptance criteria Day 31 foundation

- Gocar Core đăng ký năm booking meta field mới, có sanitize và REST exposure.
- `/api/booking` validate và persist structured pickup/dropoff mà không thay đổi Route/Pricing source of truth.
- Direction-aware Location fallback hoạt động cho outbound và inbound.
- Client cũ vẫn gửi booking được.
- CI có regression guard cho contract này.
- UI mới gửi exact pickup/dropoff rõ ràng, không dùng route search label thay thế exact address.
- Không có Zone/surcharge business logic trong Day 31.

## 8. Production acceptance — 2026-09-16

- Production CMS: `https://xemiennam.datxesaigon.com`.
- Gocar Core `0.4.0` đã được cài và đang Active.
- `booking_request` REST endpoint hoạt động với năm meta mới: `pickup_location_id`, `dropoff_location_id`, `pickup_address`, `dropoff_address`, `pickup_note`.
- Smoke test tạo `booking_request` ID `9220` ở trạng thái `draft`, đọc lại đủ năm meta đúng giá trị, sau đó chuyển bản ghi sang `trash`.
- Smoke test không gọi `/api/booking`, không publish booking và không phát notification/lead giả.
- Technical Receipt: `docs/technical-receipts/dep-001-day31-booking-v2.md`.

Day 31 slice của DEP-001 hoàn tất ở Core. DEP-001 tổng thể tiếp tục lifecycle Day 31–36 cho Content Readiness API/fields; không được hiểu là đóng toàn bộ DEP-001 sớm.
