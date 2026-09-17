# Technical Receipt — SEO-004 Day 35

**Trạng thái:** CORE ACCEPTED — đặc tả và chính sách URL; chưa kích hoạt mapping production.
**Ngày:** 17/09/2026. **Owner:** Core; Organic Growth xác nhận tiếp nhận receipt.
**Liên kết:** DEP-001, D34-06, D35-01…09. DEP-001 tổng thể tiếp tục IN PROGRESS.
**Nguồn source đã đối chiếu:** base main `a295bacd1149c14fa0afd26753dedb249b069349`; PR #111 đã squash-merge tại `46ce668bf642a1f803634d93099296b9f6e35ee1`. CI/PHP/package gates đạt.

## 1. Quyết định nghiệm thu

Core chấp nhận URL Map v1.0 và chính sách một canonical cho mỗi Route Pair. Direction là context độc lập; airport ở origin hoặc destination quyết định from/to airport. Không tạo URL chiều ngược, Price page, modifier page hay multi-stop page.

Đã so sánh trực tiếp workbook SEO-004 với Keyword Universe v0.5 gốc: 73 ID KU-001…KU-073 đầy đủ, không trùng; keyword và priority không đổi. Có 8 P0, 27 P1, 38 P2; 25 Route Detail, 21 Airport Route, 15 Guide, 9 Province Hub, 3 Airport Hub. Giữ 15 price clusters ở vai trò PRICE_SUPPORT.

Giữ nguyên trạng thái workbook bàn giao: 6 EXISTING VERIFIED dùng bốn URL; 5 PROPOSED REUSE; 57 URL GAP; 5 PRELAUNCH. Receipt này bổ sung bằng chứng, không tự đổi những candidate thành mapping xuất bản. URL GAP không đồng nghĩa thiếu trang đã được chứng minh.

## 2. Xác minh production công khai

Snapshot REST bắt đầu lúc 2026-09-17T06:55:17Z; tuple states được đọc bổ sung trong cùng phiên. Snapshot không phải giao dịch nguyên tử. Có 96 Route đã publish, 74 Location, 16 province terms (13 có count > 0), 6 Vehicle và 1.022 dòng tuple. 1.012 dòng thuộc direction được bật. State quan sát: 427 fixed, 593 contact, 2 disabled; không có tuple key trùng. Không xuất amount, không suy ra Operations đã phê duyệt hoặc giá fixed hợp lệ từ state quan sát.

Read model dùng allowlist: IDs, slug, relation, direction, publication, state và evidence. Không có booking record, địa chỉ riêng, điểm dừng, ghi chú khách hàng, tọa độ, danh tính, số điện thoại, email hoặc token. Inventory có hai Route dùng legacy endpoint fallback. Editorial/service readiness thiếu dữ liệu vẫn là unknown, không thành ready.

| Target đã được nghiệm thu từ trước | HTTP | Canonical | Sitemap |
|---|---|---|---|
| `/tuyen-duong/ba-ria-vung-tau/tp-hcm-vung-tau` | 200 | Self-canonical | Có |
| `/tuyen-duong/ba-ria-vung-tau/san-bay-tan-son-nhat-vung-tau` | 200 | Self-canonical | Có |
| `/tuyen-duong/ba-ria-vung-tau` | 200 | Self-canonical | Có |
| `/san-bay/tan-son-nhat` | 200 | Self-canonical | Có |

Hostname quan sát: `https://xemiennam.vercel.app`. Trong response thu được không thấy meta robots hoặc X-Robots-Tag cấm index. Đây không phải bằng chứng Google đã index. Hai request thêm `?direction=inbound` vẫn canonical về path sạch; URL query không nằm trong sitemap. Deployment commit của frontend và phiên bản plugin đang chạy chưa xác minh; không điền SHA nguồn thành deployed_commit.

| Cluster reverse | Bằng chứng kỹ thuật | Quyết định |
|---|---|---|
| KU-002 | Route 41; origin 9118 TP. Hồ Chí Minh; destination 9115 Vũng Tàu; hai direction bật; HTTP/canonical đạt | Giữ PROPOSED REUSE. Có thêm record cùng endpoint; cần D35-10 và editorial receipt. |
| KU-009 | Route 9117; origin 9101 Tân Sơn Nhất; destination 9115 Vũng Tàu; hai direction bật; HTTP/canonical đạt | Kỹ thuật tái sử dụng phù hợp; vẫn cần nội dung chiều ngược và readiness trước kích hoạt. |

Inventory Tân Sơn Nhất có 5 tuyến đi địa phương: 9117 Vũng Tàu, 9199 Biên Hòa, 9200 Tây Ninh, 9201 Phan Thiết, 9202 Cần Thơ; thêm Route 9001 TP. Hồ Chí Minh ↔ Tân Sơn Nhất. Không thay truy vấn cấp tỉnh bằng thành phố tương ứng để lấp gap. Các record hiện hữu không tự trở thành canonical được duyệt cho cluster khác.

## 3. Phát hiện xung đột endpoint — D35-10

Có 9 nhóm endpoint với nhiều Route record. Một số slug mang package/ngày lưu trú; chưa đủ căn cứ coi chúng là duplicate nội dung hoặc tự gộp.

| Endpoint IDs | Route IDs cần đối soát |
|---|---|
| 9118 / 9119 | 9095, 9026 |
| 9118 / 9120 | 9079, 48 |
| 9118 / 9123 | 9076, 9075, 44 |
| 9118 / 9138 | 9059, 9058 |
| 9118 / 9139 | 9057, 9056 |
| 9115 / 9118 | 9055, 9054, 41 |
| 9118 / 9140 | 9053, 9052, 42 |
| 9118 / 9144 | 9048, 9047 |
| 9118 / 9184 | 9006, 9005 |

D35-10: Core + SEO, P0, BLOCKER riêng cho mapping bị ảnh hưởng, mốc Day 36 trước activation. Cần audit record/package/content/canonical hiện tại, sau đó đề xuất quyết định riêng. Giữ các target lịch sử đã duyệt; không đổi canonical, xóa record hay redirect trong phiên này. Danh sách chi tiết nằm trong `day35-pair-conflicts.json`.

## 4. Acceptance criteria

| AC | Kết quả Core | Giới hạn hoặc bước tiếp |
|---|---|---|
| 01 | PASS | So sánh đủ 73 ID, keyword và priority với workbook nguồn. |
| 02 | PASS | Mỗi cluster một trong năm family. |
| 03 | PASS | Counts và null/candidate semantics đúng. |
| 04 | PASS | Giữ provenance Day 31; bổ sung HTTP Day 35 có timestamp. |
| 05 | PASS | 15 price owners giữ nguyên; KU-072 không network canonical. |
| 06 | PASS source/fixture | Hai direction cùng URL; activation từng cluster còn gate. |
| 07 | PASS source/fixture | Inbound tắt không tự bật; missing IDs có legacy flag; airport resolver loại legacy pair. |
| 08 | PASS source/fixture | Airport ở cả hai đầu cho đúng pricingDirection. |
| 09 | PASS cho hai URL query đã kiểm tra | Canonical path sạch; không thêm sitemap query. Không mở rộng kết luận sang alias chưa kiểm tra. |
| 10 | PASS boundary | Giữ province/city granularity; inventory đã trả, chưa tự map các gap. |
| 11 | PASS đặc tả; editorial PENDING | KU-006/012/073 còn D35-05/06. |
| 12 | PASS | Không đổi routing, canonical, sitemap hoặc redirect. |
| 13 | PASS cho snapshot allowlist | Runtime SEO API/attribution chưa triển khai ở slice này. |
| 14 | PASS source/fixture | KU-068…072 prelaunch; release/production readiness riêng vẫn mở. |
| 15 | PARTIAL | HTTP, hostname, canonical, sitemap đã có; deployment commit chưa có. |
| 16 | CORE ACCEPTED đặc tả; runtime DEFERRED | Primary proposals KU-001/008/005/007 cho bốn URL tương ứng; taxonomy seo004_url_map_v1; chưa effective dates; triển khai Day 38. |
| 17 | PASS | Gap có dependency; thêm D35-10 từ inventory mới. |
| 18 | PASS | Receipt tách spec, source, production, activation và dependency. |

Tám behavioral fixtures URL Map đã chạy đạt trên source thực: hai chiều; outbound-only; missing IDs; inbound chưa có package; airport ở origin; airport ở destination; legacy airport pair; Long Thành ở hai đầu. Conflict được xác nhận từ snapshot production; chưa có conflict-resolution runtime. Nhiều cluster một URL mới được chấp nhận ở mức đặc tả, chưa phải kiểm thử attribution.

## 5. Disposition dependency

- D35-01 / D34-01: đã export inventory, public IDs, URL paths và tuple states. Còn editorial/service approval, fixed validity và exact cluster joins. Không đóng toàn bộ D34-01.
- D35-02: bốn URL và hai query đạt; deployment/commit verification còn mở đến Day 36.
- D35-03 / D34-06: policy một URL/pair được CORE ACCEPTED. Activation/ownership tại các record xung đột và các reverse cluster còn mở.
- D35-04 / D34-05: snapshot allowlist đã có; primary taxonomy được nhận ở mức spec. API/runtime mapping/version activation và attribution tiếp tục Day 38; chưa đóng toàn bộ.
- D35-05/06: editorial reuse, Content Readiness, schema/display, D34-09 tiếp tục Day 36.
- D35-07: Long Thành giữ prelaunch, cần Core + Operations + SEO receipt trước commercial release hoặc Day 40.
- D35-08: SEO/Growth cung cấp demand evidence trước Day 41; không bịa volume.
- D35-09: đã khôi phục đúng Integrated Plan v1.7-day34-closed làm nguồn cập nhật checkpoint Day 35.
- D35-10: đối soát 9 nhóm endpoint trước khi mở mapping bị ảnh hưởng.
- D34-02/03/04 và production Day 32–34: còn approval/deploy/REST smoke/mobile QA; giữ contact fallback.

SEO-003B/DEP-005 Day 34 spec slice vẫn CORE ACCEPTED/CLOSED; display/schema và production còn mở. SEO-004 đặc tả đã CORE ACCEPTED; Organic Growth xác nhận receipt trước khi đóng slice đặc tả. Source Day 35 đã merge và CI/PHP đạt; production verification vẫn là carry-over, không được diễn giải thành production verified.
