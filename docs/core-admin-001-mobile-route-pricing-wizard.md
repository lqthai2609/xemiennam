# CORE-ADMIN-001 — Mobile Route & Pricing Wizard

Trạng thái: MVP PREVIEW SLICE. Owner: Core. Bắt đầu sau khi Day 35 đóng source/specification.

## Phạm vi lát cắt đầu tiên

- Route `/quan-tri` chỉ hoạt động ở local development, Vercel Preview hoặc khi `GOCAR_ADMIN_WIZARD_ENABLED=true`.
- Đọc dữ liệu thật từ Location V2, Route/Direction V2, Vehicle và Pricing V2 qua các adapter hiện có.
- Wizard mobile-first gồm sáu bước: endpoint, direction, vehicle, package, price state và review.
- Bản nháp chỉ lưu trong `localStorage`; không có POST/PUT/DELETE tới WordPress.
- Không tạo URL, canonical, sitemap entry, redirect, Offer schema hoặc price landing.
- Không kích hoạt production mapping. D35-10 vẫn là P0 blocker và Long Thành/KU-068…KU-072 vẫn PRELAUNCH.

## Guardrail

1. Không cho tạo route khi origin và destination giống nhau.
2. Không cho tạo cặp endpoint trùng với Route record hiện hữu theo đúng chiều canonical.
3. Hai direction được chọn độc lập.
4. Một price draft chỉ thuộc đúng một tuple `route × direction × vehicle × package`.
5. `fixed` yêu cầu amount nguyên dương; không dùng `price=0`.
6. `contact` và `disabled` không mang numeric amount.
7. Không gộp surcharge, modifier hoặc condition vào base price.
8. Không đọc hoặc lưu địa chỉ riêng, điểm dừng, ghi chú, tọa độ hay PII.

## Gate trước khi mở ghi production

- Deploy và REST read-back Gocar Core 0.8.0 đạt.
- API mutation yêu cầu WordPress authentication, nonce và capability riêng theo least privilege.
- Server validate lại toàn bộ tuple và không tin payload client.
- Mỗi thay đổi tạo audit record gồm actor, timestamp, before, after, reason và version.
- Route có booking/history chỉ được archive/disable, không hard delete.
- Draft → review → approve → publish; rollback giữ phiên bản trước.
- D35-10 phải được xử lý riêng trước khi cho phép thao tác với chín nhóm endpoint bị ảnh hưởng.
- Long Thành tiếp tục bị khóa cho tới khi có Core + Operations + SEO receipt.

## API dự kiến cho phase write

- `GET /gocar/v1/admin/bootstrap`: read model public-safe cho wizard.
- `POST /gocar/v1/admin/drafts`: tạo hoặc cập nhật draft.
- `POST /gocar/v1/admin/drafts/{id}/validate`: server validation và conflict report.
- `POST /gocar/v1/admin/drafts/{id}/submit`: gửi duyệt.
- `POST /gocar/v1/admin/drafts/{id}/publish`: capability phê duyệt riêng.
- `POST /gocar/v1/admin/routes/{id}/archive`: soft-delete có reason.
- `GET /gocar/v1/admin/audit`: lịch sử theo route/tuple.

Phase write không dùng WordPress core post endpoint trực tiếp từ browser. Next.js/WordPress boundary phải giữ credential ở server và log mọi mutation.
