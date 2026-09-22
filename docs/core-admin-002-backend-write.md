# CORE-ADMIN-002 — Backend Write & Approval

Trạng thái: SOURCE IMPLEMENTED / PRODUCTION ACCEPTANCE PENDING  
Owner: Core  
Phụ thuộc: CORE-ADMIN-001, Pricing V2, Route/Direction V2, Location V2, Day 35 guardrails, Day 36B SEO-005.

## Mục tiêu

Cho phép người vận hành dùng `/quan-tri` trên điện thoại để tạo tuyến dạng backend draft, cập
nhật đúng một tuple Pricing V2, tạm ngừng tuyến, xem audit và rollback mà không truy cập trực
tiếp WordPress REST từ trình duyệt.

## Luồng quyền

1. Người dùng đăng nhập bằng tài khoản WordPress.
2. Next.js đổi thông tin đăng nhập lấy JWT, xác minh lại qua `GET /gocar/v1/admin/session` và
   chỉ giữ JWT trong cookie HttpOnly.
3. Tài khoản có `edit_posts` được tạo, sửa, validate và submit draft.
4. Tài khoản có `publish_posts` được approve/apply hoặc rollback.
5. Browser chỉ gọi `/api/admin/*` cùng origin; proxy giữ allowlist endpoint, kiểm tra Origin,
   CSRF và không trả JWT ra client.

## Mutation contract

- `create_route`: kiểm tra Location/Vehicle thật, pair không trùng hoặc đảo chiều, ít nhất một
  direction, giá fixed dương. Apply chỉ tạo `route` ở trạng thái `draft`.
- `update_pricing`: optimistic `baseVersion`, đúng route/direction/vehicle/package, direction
  đang bật và không thuộc vùng khóa. Apply thay đúng row và đặt `pricing_model_version=2`.
- `archive_route`: bắt buộc reason; apply tắt outbound/inbound rồi chuyển Route về `draft`.
- `rollback`: chỉ chạy khi snapshot hiện tại khớp `after` của audit được chọn.

## Guardrail bắt buộc

- Long Thành IDs `9102`, `9154` và mọi tên/slug Long Thành bị khóa.
- D35-10 giữ OPEN/P0: chín endpoint pair cùng 21 Route ID bị khóa backend.
- `fixed` bắt buộc số nguyên dương; `contact`/`disabled` không mang amount.
- Không ghi surcharge, modifier hoặc condition vào base price.
- Không thu thập địa chỉ, điểm dừng, ghi chú, tọa độ hoặc PII trong admin payload.
- Tuyến mới giữ `content_readiness_version=0`, `noindex`, schema `none`.
- Không hard delete Route đã có lịch sử.

## Rollout an toàn

1. CI: lint, typecheck, regression, build và PHP syntax/behavior.
2. Package Gocar Core 0.10.0.
3. Deploy plugin trước frontend để endpoint session tồn tại.
4. REST probe: unauthenticated nhận 401/403; tài khoản vận hành nhận session DTO tối thiểu.
5. Deploy frontend preview, đăng nhập và chạy draft QA không áp dụng.
6. QA apply bằng một tuple thử đã được duyệt hoặc Route draft riêng; read-back, audit và rollback.
7. Dọn fixture, xác nhận public route/canonical/sitemap không thay ngoài scope.
8. Merge frontend, theo dõi production logs và phát hành Technical Receipt.

## Rollback triển khai

- Frontend: rollback Vercel về deployment trước.
- WordPress: cài lại artifact Gocar Core 0.9.0; private draft/audit posts giữ nguyên nhưng không
  có endpoint công khai để thao tác.
- Dữ liệu: dùng audit rollback khi snapshot không có conflict; nếu có conflict, dừng và review
  thủ công, không ghi đè.
