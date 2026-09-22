# Technical Receipt — CORE-ADMIN-002 Production

Ngày: 2026-09-22
Owner: Alo Đặt Xe — Core
Trạng thái: **PRODUCTION VERIFIED**

## Phạm vi đã phát hành

- Đăng nhập `/quan-tri` bằng WordPress JWT; JWT chỉ tồn tại trong cookie HttpOnly, `SameSite=Strict`,
  `Secure` ở production.
- Browser chỉ gọi proxy same-origin `/api/admin/*`; mutation kiểm tra Origin, CSRF và endpoint allowlist.
- Workflow `draft → validate → submit → publish`, cập nhật đúng một Pricing V2 tuple, soft archive,
  before/after audit và rollback có conflict guard.
- Draft chưa áp dụng có thể được dọn bằng xác nhận hai bước trong giao diện.
- D35-10 tiếp tục `OPEN/P0`; Long Thành tiếp tục `PRELAUNCH` và bị khóa ở frontend/backend.

## Source / PR

- PR: `#123` — `CORE-ADMIN-002: authenticated admin write workflow`.
- Branch: `core-admin-002-backend-write`.
- Head đã nghiệm thu: `fe9b57cb93e71eea0526d585c0bf8ddc64493245`.
- Merge commit: `972eac11d819404590ad510ff271f6302ca3d252`.
- Thay đổi: 15 files, 1,845 additions, 286 deletions.

## CI / artifact

Trên head `fe9b57c`:

- CI `#236`: SUCCESS.
- Gocar Core Package `#35`: SUCCESS.
- Location Migration Preview `#54`: SUCCESS.
- Vercel Preview deployment `dpl_5UQZKU1DK6ohCZvz4Qvh8pUUSRKo`: READY.
- Local verification: lint 0 errors (5 cảnh báo có sẵn ngoài scope), typecheck PASS,
  admin tests 5/5 PASS, build PASS với 581 static pages.

WordPress artifact:

- Plugin: Gocar Core `0.10.0`.
- Production CMS: `https://xemiennam.datxesaigon.com`.
- Trạng thái: Active.
- CI artifact SHA-256: `f0a64423b305a99c07094ed9afa8bc0c12dbeb267bfe99d51ca0cb3f7e2755f3`.

## Production deployment

- Vercel deployment: `dpl_7i2VaxXHDFuqk6gtRLSZBFfaQMAm`.
- Source commit: `972eac11d819404590ad510ff271f6302ca3d252`.
- Target/state: `production` / `READY`.
- Production alias: `https://xemiennam.vercel.app`.
- Runtime error scan sau deploy: không có error cluster trong 1 giờ; 5 request quan sát đều HTTP 200.

## Safe QA receipt

1. WordPress admin REST không đăng nhập trả HTTP 401.
2. Frontend `/api/admin/session` và `/api/admin/drafts` không đăng nhập trả HTTP 401.
3. Đăng nhập production thành công với tài khoản WordPress có quyền vận hành/phê duyệt.
4. Tạo private server draft `#9223`: Bàu Bàng → Cẩm Mỹ, outbound, xe 4 chỗ,
   gói `one_way`, mode `contact`, reason `QA CORE-ADMIN-002; không publish`.
5. Validate và submit đạt; tải lại đọc đúng trạng thái chờ duyệt.
6. Không bấm `Duyệt và áp dụng`; không có Route hoặc Pricing production nào được tạo/thay đổi.
7. Dọn draft `#9223` bằng endpoint DELETE; read-back về 0 draft chờ duyệt.
8. Audit vẫn 0 vì không có mutation nào được apply.

## SEO / public-surface guard

- `/quan-tri` trả 200 nhưng có `noindex, nofollow, noarchive`.
- `/quan-tri` không có trong sitemap production (132 URL tại thời điểm kiểm tra).
- Không tạo URL, canonical, redirect, sitemap entry, Offer/Service schema hay notification.
- Số liệu sau QA vẫn là 96 Route, 190 direction bật và 88 Route còn `contact`.

## Gates giữ nguyên

- D35-10: `OPEN/P0`; không merge/delete/chọn canonical cho chín nhóm conflict.
- Long Thành/KU-068…KU-072: `PRELAUNCH`; không commercial activation.
- DEP-011: không đổi hostname, DNS, canonical host hoặc redirect trong hạng mục này.
- Không thêm giá, phụ phí, modifier, condition hoặc effective date chưa được duyệt.

## Rollback

- Frontend: rollback về production deployment `dpl_CrsueaEiwC3XGnwkiev8QSnbuRGP`
  (commit `ae3aa148fd4a29cb3a0d6893e01fc8ff7ddaca80`).
- WordPress: cài lại artifact Gocar Core `0.9.0`; private draft/audit post vẫn được giữ.
- Dữ liệu: không cần rollback cho QA vì fixture chưa từng được apply và đã chuyển vào trash.
