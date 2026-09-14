# Day 14 — Thin-content Guard + Combo carry-over

## Goal

Ngăn Route × Vehicle combo page mỏng hoặc không có pricing/entity hợp lệ đi vào index, đồng thời giữ trang render an toàn cho người dùng khi chỉ thiếu nội dung biên tập.

Day 14 cũng nhận carry-over từ scope drift Day 13: combo template hiện vẫn còn các phần frontend/copy cần harden theo Pricing V2 và brand Gocar VN. Business pricing mới không được mở rộng dựa trên `pricingByVehicle`.

## Carry-over / dependencies

### Day 12 production dependency

Source `combo_descriptions` đã merge nhưng Gocar Core v0.2.0 vẫn cần deploy production và smoke verify:

- route editor có meta box Route × Vehicle;
- save `vehicle_id + description` thành công;
- REST trả `meta.combo_descriptions`;
- frontend nhận CMS description ở một combo có content;
- combo thiếu content vẫn render fallback và bị `noindex,follow` theo Day 14.

Dependency này không chặn source guard Day 14 nhưng chặn production acceptance cuối của content model.

### Day 13 scope drift

PR #67 đã harden `/loai-xe` + `/dich-vu`. Combo Template + Pricing của roadmap cũ chưa được hoàn tất toàn bộ. Day 14 xử lý phần data/SEO guard trong source và bàn giao phần UI bằng prompt v0 ở cuối tài liệu.

## Pricing contract

`src/lib/combo.ts` là adapter dùng chung cho combo page:

- nếu `Route.pricingV2` tồn tại, chỉ đọc Pricing V2;
- mặc định combo canonical dùng `pricingV2.outbound` vì URL route hiện mang orientation `from → to`;
- `fixed` chỉ renderable khi `price > 0`;
- `contact` là renderable và không bao giờ chuyển thành `0`;
- `disabled` không renderable/indexable;
- khi có nhiều package cho cùng vehicle: ưu tiên `featuredPackage` nếu hợp lệ, sau đó fixed thấp nhất, cuối cùng contact;
- `pricingByVehicle` chỉ fallback compatibility khi route/mock thật sự không có Pricing V2;
- fallback compatibility không được tính là tín hiệu SEO indexability.

## Thin-content policy

Một combo chỉ được `index,follow` khi đồng thời đạt tất cả điều kiện:

1. Route entity hợp lệ: có `id`, `slug`, `regionSlug`, `from`, `to`.
2. Vehicle slug map được vào một `VehicleCategory` hiện hành.
3. Route có Pricing V2.
4. Có pricing outbound renderable cho đúng vehicle: `fixed > 0` hoặc `contact`.
5. Có `combo_descriptions` CMS riêng cho đúng route × vehicle.
6. Nội dung CMS tối thiểu **120 ký tự** và **20 từ** sau trim.

Ngưỡng 120 ký tự + 20 từ chỉ là safety threshold để chặn nội dung quá mỏng, không phải thước đo chất lượng hoặc uniqueness tuyệt đối. Editor vẫn phải tuân thủ quy tắc unique content của Day 12: nội dung phải thực sự hữu ích cho đúng Route × Vehicle, không copy hàng loạt rồi thay tên.

### Nội dung không được tính là unique SEO content

- `comboDescriptionOrDefault()` fallback;
- `route.summary` ghép tự động;
- câu mô tả sinh từ price/route name;
- legacy `VehiclePrice.comboDescription` của mock/static data;
- text UI dùng chung trên mọi combo.

## Indexing behavior

### Combo đủ chuẩn

- render bình thường;
- metadata `robots: index,follow`;
- được đưa vào sitemap;
- Service JSON-LD tiếp tục dùng fixed price hợp lệ nếu có; contact không tạo fake numeric Offer.

### Combo có pricing/entity hợp lệ nhưng thiếu hoặc mỏng content

- vẫn render để người dùng có thể xem giá/đặt xe;
- dùng fallback description nếu cần;
- metadata `robots: noindex,follow`;
- không xuất hiện trong sitemap.

### Combo pricing/entity invalid

- không tạo static param từ Pricing V2 nếu package chỉ `disabled`/fixed invalid;
- request không có combo hợp lệ tiếp tục đi qua `notFound()`;
- metadata fallback không được index.

## Sitemap contract

`src/app/sitemap.ts` phải dùng cùng helper indexability với combo metadata. Không duy trì rule sitemap riêng để tránh drift giữa:

- page robots;
- static generation;
- sitemap exposure.

## Acceptance criteria — source

- [x] Combo helper ưu tiên Pricing V2, không mở rộng business logic mới trên `pricingByVehicle`.
- [x] `fixed <= 0` và `disabled` không trở thành renderable pricing.
- [x] `contact` renderable nhưng không sinh numeric zero.
- [x] Fallback content vẫn render nhưng không được tính là unique.
- [x] Combo thiếu CMS content nhận `noindex,follow`.
- [x] Combo CMS content dưới minimum threshold nhận `noindex,follow`.
- [x] Sitemap chỉ chứa combo đạt cùng indexability guard.
- [x] Similar-route lookup trong combo không còn trực tiếp dựa trên `pricingByVehicle` khi Pricing V2 có mặt.
- [ ] `npm run lint` pass trên head PR.
- [ ] `npm run test:location-migration` pass trên head PR.
- [ ] production build pass trên head PR.
- [ ] Production smoke sau merge: 1 combo có CMS content + 1 combo thiếu CMS content + sitemap.

## CẦN PROMPT V0 — Combo Template + Pricing UI hardening

### Findings hiện tại

`src/components/route-vehicle-combo.tsx` còn các vấn đề frontend/copy không thuộc thin-content guard thuần logic:

- hotline/header được hard-code thay vì dùng site config;
- fallback vehicle name còn chuỗi `TaxiGo`;
- CTA/footer cuối trang còn brand `Xe Miền Nam`;
- phone/footer copy còn hard-code;
- UI tự tạo giá gạch ngang bằng phép cộng 12,8%, không có compare-at-price business source;
- rating `4.9 · (1,250)` đang hard-code;
- mô tả `Xe sedan`, `2 vali` đang hard-code cho mọi loại xe, không đúng cho 16/29/45 chỗ hoặc limousine;
- một số câu cam kết phí/phụ phí đang là copy dùng chung, không được suy diễn thành policy nếu backend/CMS không có dữ liệu xác nhận;
- template hiện chỉ trình bày outbound; Pricing V2 đã có direction/package nên UI cần được harden mà không tạo pricing engine mới.

### Prompt v0

```text
Bạn đang sửa frontend cho project Gocar VN (Next.js App Router), repository hiện tại giữ nguyên routing/backend/API/database.

BỐI CẢNH
Trang Route × Vehicle hiện nằm tại:
/tuyen-duong/[tinh]/[tuyen]/[loai-xe]
Component chính:
src/components/route-vehicle-combo.tsx
Page/data wiring:
src/app/tuyen-duong/[tinh]/[tuyen]/[loai-xe]/page.tsx

Backend đã có Pricing V2 theo contract:
route × direction × vehicle × package
với mode: fixed | contact | disabled.
Day 14 đã thêm thin-content guard ở data/page layer. Không được tạo pricing engine mới và không được đưa business logic quay lại pricingByVehicle.

MỤC TIÊU
Harden giao diện combo Route × Vehicle theo Gocar VN và Pricing V2, giữ layout/responsive hiện có càng nhiều càng tốt, loại toàn bộ dữ liệu/copy giả hoặc hard-code có thể gây sai lệch.

PHẠM VI UI
1. Giữ URL/routing hiện tại.
2. Giữ component hierarchy hiện tại nếu không cần thay đổi.
3. Không thay database, WordPress schema, REST contract, booking API hoặc Pricing V2 contract.
4. Dùng site config hiện có cho brand/contact thay vì hard-code phone/brand trong component.
5. Không hiển thị lại tên “Xe Miền Nam” hoặc “TaxiGo” trong visible production copy.
6. Không tự tạo giá gạch ngang/compare-at-price bằng công thức. Nếu backend không có compare-at-price thật thì bỏ giá gạch ngang.
7. Không hiển thị rating/review count giả. Chỉ render rating khi có dữ liệu thật; nếu chưa có source thì bỏ block rating.
8. Không hard-code “Xe sedan”, số vali hoặc model xe cho mọi category. Dùng dữ liệu Vehicle/VehicleCategory hiện có khi đáng tin cậy; field không có dữ liệu thì ẩn, không đoán.
9. Không biến pricing_mode=contact thành 0 hoặc một giá giả. Contact phải hiển thị CTA gọi/Zalo/đặt xe phù hợp.
10. Package disabled không được hiển thị như lựa chọn đặt xe.

DIRECTION + PACKAGE
- UI cần chuẩn bị cho Pricing V2 outbound/inbound mà không tạo route/price state song song mới.
- Nếu page/data props hiện chỉ truyền representative outbound price, giữ behavior hiện tại nhưng cấu trúc component phải không chặn bước tiếp theo để truyền direction/packages từ Route.pricingV2.
- Nếu triển khai direction selector trong scope này, selector phải dùng trực tiếp Route.pricingV2, đồng bộ route label, package, giá và booking context; không suy ra inbound bằng cách đảo giá outbound.
- Không hiển thị selector direction khi direction còn lại disabled hoặc không có package renderable.

CONTENT / COPY
- Brand hiển thị: Gocar VN; logo/wordmark theo design system hiện tại.
- Không khẳng định “đã gồm mọi phí”, “không có phụ phí ẩn”, phí sân bay/cao tốc hoặc điều kiện dịch vụ nếu không có source/business rule hiện hữu chứng minh. Có thể dùng copy trung tính như “Giá và điều kiện chuyến được xác nhận trước khi khởi hành” khi cần.
- Hero description tiếp tục nhận content từ props; không sinh thêm SEO paragraph tự động trong component.

RESPONSIVE
- Desktop/tablet/mobile phải giữ cấu trúc dễ đọc hiện tại.
- Booking CTA phải dễ bấm trên mobile, không overflow và không che nội dung.
- Không làm thay đổi responsive behavior của các component dùng chung ngoài combo page.

STATE
- Loading: page hiện là Server Component/SSG-ISR; không thêm client loading giả nếu không có async interaction mới.
- Empty pricing: không render giá 0; nếu không còn package renderable thì page layer sẽ notFound hoặc UI chỉ hiện trạng thái không khả dụng theo props thực tế.
- Contact pricing: hiển thị “Liên hệ báo giá” + CTA hợp lệ.
- Missing vehicle image/details: fallback icon/image hiện có; ẩn field chi tiết không có dữ liệu thay vì bịa.
- Error: không thêm client-side error flow trùng với notFound/server handling hiện có.

SEO / ACCESSIBILITY / PERFORMANCE
- Không override robots metadata Day 14 từ component client.
- Heading giữ một H1 rõ ràng và hierarchy H2 hợp lý.
- Link/button có accessible name.
- Image có alt dựa trên vehicle/route data thật.
- Không thêm dependency UI nặng mới.

KHÔNG ĐƯỢC PHÁ VỠ
- routeComboHref / routeHref hiện tại;
- RouteBookingActions và booking context hiện có;
- Pricing V2;
- noindex/sitemap thin-content guard Day 14;
- production mock policy;
- responsive/layout chung của site.

ACCEPTANCE CRITERIA
1. Không còn visible “Xe Miền Nam” hoặc “TaxiGo” trên combo page.
2. Không còn synthetic old price 12,8%.
3. Không còn rating/review count giả.
4. Không còn vehicle detail sai do hard-code sedan/2 vali cho mọi category.
5. Header/footer/contact dùng config/shared component phù hợp.
6. Fixed price chỉ hiển thị khi > 0; contact có CTA; disabled không render.
7. Booking vẫn nhận đúng routeId, vehicleType, packageKey/packageLabel, pricingMode và direction đang dùng.
8. Không thêm business logic mới dựa trên pricingByVehicle.
9. Desktop/tablet/mobile không regression.
10. Lint/build pass sau khi code.

Hãy sửa trực tiếp các component frontend cần thiết, giữ thay đổi nhỏ và tập trung, không redesign toàn trang.
```
