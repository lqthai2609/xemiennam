# Technical Receipt — Day 36B source

Trạng thái: SOURCE IMPLEMENTED / PRODUCTION INACTIVE. Ngày: 21/09/2026.

## Implemented

- DEP-011 Phase 1: public brand trong frontend và WordPress admin surface chuyển sang Alo Đặt Xe; identifier kỹ thuật và hostname hiện hành được giữ nguyên.
- D36B-01: component giải thích `Giá từ`, `Ước tính chuyến`, `Liên hệ báo giá` dùng chung cho Route Pricing và bảng giá.
- SEO-005: field contract versioned, resolver indexability/sitemap/schema, WordPress REST meta và regression tests.
- D35-10: audit chín nhóm giữ OPEN/P0; thêm trạng thái block vào SEO-005, không đưa ra quyết định duplicate.
- Long Thành/KU-068–KU-072 tiếp tục PRELAUNCH; Route commercial surface không index và không phát Service/Offer schema.

## Không thực hiện

- Không đổi DNS, hostname production, canonical host, redirect, sitemap activation hoặc deployment.
- Không tạo URL/canonical mới, không merge/delete Route, không kích hoạt production mapping.
- Không thêm giá, phụ phí, modifier, condition, effective date hoặc dữ liệu Operations.
- Không đổi logo, favicon hoặc design system.

## Rollback

- Revert commit Day 36B để hoàn nguyên source.
- SEO-005 version `0` giữ policy chưa active; `noindex` là trạng thái explicit an toàn khi rollout version từ `1`.
- Domain/runtime migration tiếp tục theo DEP-011 receipts riêng.

