# CORE-ADMIN-001 — Mobile Route & Pricing Wizard

Trạng thái: CORE-ADMIN-001 PRODUCTION READ-ONLY COMPLETE; CORE-ADMIN-002 SOURCE IMPLEMENTED / PRODUCTION PENDING. Owner: Core.

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
- Long Thành tiếp tục bị khóa cho tới khi có Core + Operations + SEO receipt; wizard không cho chọn endpoint Long Thành.

## API dự kiến cho phase write

- `GET /gocar/v1/admin/bootstrap`: read model public-safe cho wizard.
- `POST /gocar/v1/admin/drafts`: tạo hoặc cập nhật draft.
- `POST /gocar/v1/admin/drafts/{id}/validate`: server validation và conflict report.
- `POST /gocar/v1/admin/drafts/{id}/submit`: gửi duyệt.
- `POST /gocar/v1/admin/drafts/{id}/publish`: capability phê duyệt riêng.
- `POST /gocar/v1/admin/routes/{id}/archive`: soft-delete có reason.
- `GET /gocar/v1/admin/audit`: lịch sử theo route/tuple.

Phase write không dùng WordPress core post endpoint trực tiếp từ browser. Next.js/WordPress boundary phải giữ credential ở server và log mọi mutation.

## CORE-ADMIN-002 — source implementation

- `/quan-tri` yêu cầu đăng nhập bằng tài khoản WordPress có `edit_posts`.
- JWT chỉ tồn tại trong cookie `HttpOnly`, `Secure` ở production và `SameSite=Strict`; browser gọi proxy cùng origin thay vì gọi WordPress trực tiếp.
- Mutation yêu cầu CSRF token khớp cookie và chỉ đi qua danh sách endpoint cho phép.
- Draft được lưu bằng private post type, sau đó validate → submit → publish.
- `publish_posts` là capability phê duyệt; mọi vai trò khác chỉ tạo và gửi draft.
- Tạo Route mới chỉ tạo WordPress `draft`, giữ `content_readiness_version=0`, `noindex` và không cấp schema.
- Cập nhật giá chỉ thay đúng tuple `direction × vehicle × package`; không sao chép chéo direction.
- Tạm ngừng là soft archive: tắt hai direction và đưa Route về `draft`.
- Mỗi apply lưu actor, UTC timestamp, reason và before/after snapshot. Rollback từ chối khi snapshot hiện tại đã thay đổi.
- Backend hard-block Long Thành PRELAUNCH, chín nhóm endpoint cùng các Route ID thuộc D35-10.

Production write chỉ được mở sau khi Gocar Core 0.10.0 được deploy, REST session probe đạt,
frontend preview đạt CI và smoke test dùng draft QA an toàn được dọn sạch.


## Đồng bộ sau Day 36B

- Giao diện mang thương hiệu ALO ĐẶT XE; technical identifiers hiện hữu không tự đổi tên.
- Nhãn địa danh đi qua formatter dùng chung: public hiển thị “Sài Gòn”, canonical entity vẫn là “TP. Hồ Chí Minh”.
- PR này xếp chồng trên remediation Day 36B và không kích hoạt production deployment.
