# SEO-006A Day 37 — WordPress và production readiness audit

Ngày kiểm tra: 24/09/2026. Phạm vi: GET công khai, chỉ đọc. Trạng thái: **RUNTIME EVIDENCE WITH OPEN GATES**. Không tạo lead, sửa WordPress, kích hoạt mapping, triển khai hoặc thay URL.

## Các phiên bản phải tách biệt

| Bề mặt | Phiên bản / trạng thái | Giới hạn kết luận |
|---|---|---|
| PR #128 `day37-lead-lifecycle` | Head `d94b85c8c26f93483f522a39bad4b64968db2804`, draft, chưa merge; CI #258, Gocar Core Package #51, Location Migration Preview #68 PASS | Sửa source và bằng chứng CI/built HTML; không phải production. |
| Production `xemiennam.vercel.app` | Deployment `dpl_EHLNJD9XuHU8yxyr9ZGuXTFQHvfH`, `main` tại `dad97006ab422be2be40ceeafce4566a930220b3` | Chưa chứa commit `bbb9444` chặn BreadcrumbList Long Thành; không dùng để nghiệm thu patch PR #128. |
| WordPress REST công khai | `https://xemiennam.datxesaigon.com/wp-json/wp/v2/route/{id}` | Trả các giá trị meta công khai và mặc định; không chứng minh meta đã được duyệt hoặc giá trị nội bộ của record không công khai. |

## Kết quả chỉ đọc theo instance

| ID | WordPress REST Content Readiness (projection công khai) | Production HTTP/robots/JSON-LD/sitemap | Kết luận |
|---|---|---|---|
| 9190 Long Thành → Vũng Tàu | HTTP 200; version `0`, editorial `missing`, service `unknown`, canonical `missing`, mapping `clear`, requested indexability `noindex`, schema `none` | HTTP 200; `noindex, follow`; **1 JSON-LD**; canonical kỹ thuật hiện hữu; không nằm trong sitemap | Long Thành được noindex và loại khỏi sitemap; BreadcrumbList còn trên production cũ. PR #128 build mới là **0 JSON-LD**. Không coi version 0 đã ready. |
| 9117 Tân Sơn Nhất → Vũng Tàu | HTTP 200; cùng các giá trị mặc định version `0`, `missing`, `unknown`, `missing`, `clear`, `noindex`, `none` | HTTP 200; không có robots meta explicit; **2 JSON-LD**; canonical kỹ thuật hiện hữu; có trong sitemap | Version 0 không kích hoạt SEO-005. Trạng thái public hiện có không xác nhận service/facts hoặc giá approved. |
| 9055 (một record D35-10) | REST công khai HTTP 401; không đọc được record/version | Route kỹ thuật cũ HTTP 404; không nằm trong sitemap; CI của PR #128 báo `NOT_BUILT` | Không thể dùng 9055 làm bằng chứng instance `d35_10_blocked`; không suy ra đã bị xóa hay đổi canonical. |
| 41 Sài Gòn ↔ Vũng Tàu (tuyến chung thuộc nhóm D35-10) | HTTP 200; version `0`, mapping `clear` | HTTP 200; không có robots meta explicit; **2 JSON-LD**; có trong sitemap | D35-10 đang chặn **quyết định mapping mới**, chưa chứng minh tuyến đại diện cũ bị noindex. Không tự đặt `d35_10_blocked` hoặc loại URL production khỏi sitemap. |

Các số trên lấy từ các GET `route/{id}`, HTML các path canonical kỹ thuật nêu trong `docs/seo/day35/public-inventory.json`, và `sitemap.xml` tại thời điểm kiểm tra. Không đọc nội dung booking, địa chỉ riêng hoặc dữ liệu cá nhân.

## Chín nhóm D35-10: đối chiếu phạm vi blocker

Theo `docs/day36b-d35-10-audit.md`, mỗi nhóm hiện có ít nhất một Route ID đại diện trả HTTP 200 công khai: `9026`, `48`, `44`, `9058`, `9056`, `41`, `42`, `9047`, `9005`. Cả **9/9** có REST projection `content_readiness_version=0`, `content_mapping_state=clear`, và slug của chúng xuất hiện trong sitemap production tại thời điểm kiểm tra. Những record khác trong các nhóm có thể trả HTTP 401 công khai. Dữ liệu này **không** cấp quyền tạo mapping đảo chiều, hợp nhất, redirect hoặc chọn canonical mới. Nó làm rõ rằng blocker D35-10 hiện kiểm soát **mapping chưa được phê duyệt**, không thể được trình bày là mọi trang cũ đều noindex/ngoài sitemap.

SEO-005 chỉ kích hoạt readiness khi version >= 1; version 0 giữ runtime cũ theo contract. Trước khi yêu cầu một instance `d35_10_blocked` có 0 JSON-LD, `noindex` và không nằm trong sitemap, Core và SEO phải chỉ rõ Route record nào và môi trường nào có version >= 1, mapping `d35_10_blocked`. Thay đổi indexability production của các Route đại diện hiện hành là quyết định release riêng, không tự động phát sinh từ receipt này.

## Việc còn chờ cho SEO VERIFY

1. WordPress/preview version chạy đúng PR #128 và record có version >= 1, mapping `d35_10_blocked` để kiểm thử instance D35-10. Không thay production mapping để tạo fixture.
2. Output sau hydration của cả hai chiều 9117, gói thực có, H1, card, lời kêu gọi hành động và canonical; bản build HTML tĩnh chưa đủ.
3. WordPress cộng frontend preview cho malformed response, timeout, retry và replay cùng `lead_id`; không gửi booking giả vào production.
4. Fact ledger public-safe của Operations cho service, xe/gói, stops/wait và FAQ. Chưa có giá nhập và duyệt: giữ `contact`, không `Offer`.

DEP-011 **BLOCKER/P0**, D35-10 **OPEN/P0**, Long Thành/KU-068–KU-072 **PRELAUNCH**, production migration **INACTIVE**, launch eligibility **NOT READY**. PR #128 tiếp tục draft. SEO-006A có source/built HTML evidence; instance/SEO VERIFY và Day 37 joint còn mở.
