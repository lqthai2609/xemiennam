# Technical Receipt — CORE-ADMIN-003 Production

Ngày: 2026-09-22
Owner: Alo Đặt Xe — Core
Trạng thái: **PRODUCTION VERIFIED**

## Phạm vi đã phát hành

- `/quan-tri` giữ nguyên quy trình `lưu nháp → gửi duyệt → áp dụng` và bổ sung đường ghi trực tiếp dành cho tài khoản có quyền `publish_posts`.
- Có ô tìm kiếm tuyến với gợi ý từ danh mục backend xác thực; hỗ trợ tìm không dấu theo Route ID, slug, điểm đi và điểm đến.
- Ghi trực tiếp hỗ trợ tạo Route dưới trạng thái WordPress `draft` và cập nhật đúng một Pricing V2 tuple.
- Xóa trực tiếp dùng WordPress Trash, không xóa cứng; mutation lưu before/after audit và có thể rollback.
- `baseVersion` chặn ghi đè khi dữ liệu tuyến đã thay đổi trên backend.
- D35-10 tiếp tục `OPEN/P0`; Long Thành tiếp tục `PRELAUNCH` và bị khóa ở giao diện lẫn backend.

## Source / PR

- PR: `#125` — `Add direct route writes, search, and recoverable deletion`.
- Branch: `core-admin-003-direct-write-search-delete`.
- Head đã nghiệm thu: `107805edf31918ecb421ce701be06baf0db65190`.
- Merge commit: `1e1519ac8a646e2131d6cfb4911f3f4963502401`.
- Thay đổi thực: 9 files, 369 additions, 26 deletions.
- Gói ZIP tạm dùng để cập nhật WordPress đã được loại khỏi tree trước khi merge.

## CI / artifact

Trên head `107805e`:

- CI `#242` (`35699441208`): SUCCESS.
- Gocar Core Package `#39` (`35699441239`): SUCCESS.
- Location Migration Preview `#57` (`35699441195`): SUCCESS.
- Vercel Preview deployment `dpl_3dytJtWV7byXR9yFxbxotY5V3jXL`: READY.
- Local verification: lint 0 errors (5 cảnh báo có sẵn ngoài scope), typecheck PASS,
  Node tests 102/102 PASS và production build PASS.

WordPress artifact:

- Plugin: Gocar Core `0.11.0`.
- Production CMS: `https://xemiennam.datxesaigon.com`.
- Trạng thái: Active.
- GitHub artifact: `10681274752`, tên `gocar-core-plugin`.
- Artifact ZIP SHA-256: `8f2701f1652facbf721eca4fa1c18fc0b429636a2f21a8802ef27618ea0ae406`.
- Inner `gocar-core.zip` SHA-256: `40bbe1783f8f41299775be439ecde04e4269d3b8b1913544be10962538a03449`.
- Nội dung plugin trong artifact khớp hoàn toàn với `wordpress/gocar-core` ở accepted head.

## Production deployment

- Vercel deployment: `dpl_FJzoJHCYXuyAgMMeqTcVxsLdt1xR`.
- Source commit: `1e1519ac8a646e2131d6cfb4911f3f4963502401`.
- Target/state: `production` / `READY`.
- Production alias: `https://xemiennam.vercel.app`.
- Runtime error scan sau deploy: không có error cluster trong 1 giờ gần nhất.

## Safe QA receipt

1. Xác nhận WordPress đang chạy Gocar Core `0.11.0` và tài khoản kết nối có quyền `publish_posts`.
2. Authenticated `GET /gocar/v1/admin/routes` trả danh mục Route cùng `postStatus`, `backendVersion` và cờ `locked`.
3. Preview tìm `sai gon` và trả đúng các gợi ý `Sài Gòn`; Route Long Thành hiển thị nhưng bị khóa.
4. Chọn Route `#9051` rồi mở hộp xác nhận xóa; nội dung nêu rõ đưa vào WordPress Trash và có thể rollback.
5. Bấm `Hủy`; không gọi endpoint mutation và không có Route nào bị xóa.
6. Draft `#9224` có sẵn từ trước QA vẫn giữ nguyên trạng thái `pending`; audit vẫn là 0.
7. Production tải đúng 84 Route, 166 direction đang bật, 76 Route còn mức `contact` và 1 draft đang chờ duyệt.
8. Production tìm không dấu trả đúng gợi ý; nút ghi trực tiếp chỉ bật khi dữ liệu hợp lệ.

## Security / public-surface guard

- WordPress `routes`, `drafts` và `apply` không đăng nhập đều trả HTTP 401.
- Frontend `/api/admin/routes` không có session trả HTTP 401.
- `/quan-tri` có `noindex, nofollow, noarchive`, không phát canonical công khai.
- Sitemap production trả HTTP 200 và không chứa `/quan-tri`.
- Không tạo URL, canonical, redirect, sitemap entry, Offer/Service schema hoặc notification.
- Không thêm hay thay đổi giá, phụ phí, modifier, condition hoặc effective date trong QA.

## Gates giữ nguyên

- D35-10: `OPEN/P0`; không merge/delete/chọn canonical cho các nhóm conflict thuộc gate.
- Long Thành/KU-068…KU-072: `PRELAUNCH`; không commercial activation.
- DEP-011: không đổi hostname, DNS, canonical host hoặc redirect trong hạng mục này.
- Tạo Route trực tiếp vẫn tạo WordPress `draft`, không tự mở bề mặt công khai.

## Rollback

- Frontend: rollback về production deployment `dpl_3rT5mASJYfMRjZz2uz5CPKARfYp4`
  (commit `510ee4b22721d20971a60b3d26a797f9244f7607`).
- WordPress: cài lại Gocar Core `0.10.0` nếu cần rollback code plugin.
- Dữ liệu: QA không áp dụng mutation nên không cần rollback dữ liệu. Các thao tác xóa thực tế trong tương lai dùng WordPress Trash và audit rollback.
