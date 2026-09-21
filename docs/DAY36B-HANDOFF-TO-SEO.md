# Day 36B — Handoff từ Core sang Organic Growth/SEO

Ngày: 21/09/2026  
Project gửi: Core  
Project nhận: Organic Growth/SEO  
Trạng thái: **CORE SOURCE IMPLEMENTED / READY FOR SEO REVIEW**  
Production migration: **INACTIVE**

## 1. Kết quả Core bàn giao

Day 36B đã triển khai phần source được phép trên nhánh `feat/day36b-price-readiness-rebrand`, Pull Request #115. Phạm vi bàn giao cho SEO gồm:

1. **SEO-005 Content Readiness contract** có version và các trạng thái editorial, service, canonical, mapping, indexability, schema.
2. Resolver dùng chung để kiểm soát metadata robots, sitemap và schema của Route Detail.
3. Guard bắt buộc cho `d35_10_blocked` và Long Thành/prelaunch.
4. Quy tắc Offer schema chỉ được phép khi Pricing V2 có giá `fixed` dương, hữu hạn; `contact` không tạo Offer.
5. Phase 1 rebrand các bề mặt public sang **Alo Đặt Xe**; technical identifiers và runtime hostname hiện hành được giữ nguyên.
6. UI giải thích thống nhất cho `Giá từ`, `Ước tính chuyến` và `Liên hệ báo giá`; không thêm số tiền, phụ phí hoặc điều kiện vận hành mới.

## 2. Trạng thái và bằng chứng kỹ thuật

| Hạng mục | Trạng thái |
|---|---|
| Pull Request | #115 — open, mergeable |
| Head commit trước handoff | `002ce9f95b0749d1ba93f84bd2c457233df4d206` |
| CI | PASS |
| Gocar Core Package/PHP checks | PASS |
| Location Migration Preview | PASS |
| Day 36B regression tests | 6/6 PASS |
| Production build | PASS — 580 trang |
| Production deployment | Chưa thực hiện |

Technical Receipt: `docs/technical-receipts/day36b-source.md`.  
Contract chi tiết: `docs/day36b-seo-005-content-readiness-contract.md`.

## 3. Contract SEO-005 mà SEO tiếp nhận

Các field public-safe trên Route:

| Field | Giá trị hợp lệ | Quyền/nguồn chính |
|---|---|---|
| `content_readiness_version` | số nguyên không âm | Core quản lý rollout |
| `content_editorial_state` | `missing`, `draft`, `review`, `ready` | SEO/Editorial |
| `content_service_state` | `unknown`, `prelaunch`, `live`, `paused` | Operations/Core |
| `content_canonical_state` | `missing`, `candidate`, `verified` | SEO + Core receipt |
| `content_mapping_state` | `clear`, `d35_10_blocked` | SEO-004/D35-10 |
| `content_indexability_state` | `noindex`, `index` | SEO đề nghị; resolver thực thi |
| `content_schema_state` | `none`, `service`, `offer` | SEO đề nghị trong giới hạn pricing |
| `content_readiness_reason` | reason code đã sanitize | Owner của trạng thái |
| `content_source_ref` | receipt/source reference public-safe | Owner của bằng chứng |

Quy tắc triển khai hiện tại:

- Version `0` hoặc thiếu record: SEO-005 chưa active, giữ hành vi runtime hiện hành để tránh noindex diện rộng ngoài ý muốn.
- Version từ `1`: chỉ index khi editorial=`ready`, service=`live`, canonical=`verified`, mapping=`clear` và indexability được yêu cầu là `index`.
- `d35_10_blocked` chặn index, sitemap và schema.
- Long Thành/prelaunch chặn Route commercial surface bất kể các field khác.
- Service schema chỉ phát khi trang đủ điều kiện index.
- Offer schema chỉ phát khi có giá `fixed` hợp lệ từ Pricing V2. Giá `contact` hoặc thiếu giá không tạo Offer.

## 4. Việc Organic Growth/SEO được phép tiếp tục

1. Review và nghiệm thu semantics của SEO-005 so với SEO-004, SEO-003B và Keyword Universe v0.6.
2. Chuẩn bị mapping public-safe giữa cluster, canonical target và readiness record; chưa kích hoạt production.
3. Gán `content_editorial_state` dựa trên kiểm duyệt nội dung có bằng chứng.
4. Đề nghị `content_canonical_state`, `content_indexability_state` và `content_schema_state` cho từng URL đại diện; Core chỉ thực thi sau acceptance và rollout gate.
5. Giữ chín nhóm D35-10 ở `d35_10_blocked` cho đến khi có quyết định duplicate/reuse/canonical được phê duyệt.
6. Giữ KU-068 đến KU-072 và mọi Route commercial Long Thành ở PRELAUNCH.
7. Trả SEO acceptance hoặc danh sách sai lệch cụ thể cho Core; không cần yêu cầu tạo URL chỉ để nghiệm thu contract.

## 5. Những việc chưa được phép

- Không tự tạo landing URL, slug hoặc canonical ownership mới.
- Không merge/delete Route và không cấu hình redirect.
- Không đổi DNS, production domain, canonical host hoặc sitemap host.
- Không kích hoạt production migration hoặc deployment.
- Không tự đặt giá, phụ phí, modifier, condition hay effective date.
- Không dùng địa chỉ đón/trả riêng, ghi chú booking, tọa độ hoặc PII làm nguồn SEO.
- Không coi việc Pull Request được merge là bằng chứng production đã active.

## 6. Carry-over bắt buộc

| ID/phạm vi | Trạng thái | Ảnh hưởng |
|---|---|---|
| DEP-011 | BLOCKER/P0 | Chặn domain/canonical/redirect/sitemap production migration |
| D35-10 | OPEN/P0 | Chặn index, sitemap và schema của mapping liên quan |
| Long Thành, KU-068–KU-072 | PRELAUNCH | Chặn Route commercial surface |
| Production migration | INACTIVE | Không được suy diễn từ source hoặc Pull Request |
| Giá/phụ phí chưa được Operations duyệt | Chưa có thẩm quyền | Tiếp tục `contact` fallback |

## 7. Acceptance đề nghị cho SEO

SEO có thể trả **SEO-005 ACCEPTED FOR SOURCE / PRODUCTION INACTIVE** khi xác nhận:

- Contract không làm thay đổi canonical ownership đã khóa.
- Version `0` không kích hoạt policy mới hàng loạt.
- D35-10 và Long Thành luôn override yêu cầu index.
- Sitemap, robots và schema dùng cùng một readiness decision.
- `contact` không phát Offer và không bị chuyển thành giá hard-code.
- Không có URL, redirect, domain hoặc production activation mới trong Day 36B.
- Các field không chứa PII hoặc dữ liệu booking riêng tư.

Nếu có sai lệch, SEO trả theo cấu trúc: `field/rule → URL hoặc cluster bị ảnh hưởng → expected → actual → source_ref → priority`.

## 8. Nguồn đối chiếu

- `DAY36A-FINAL-HANDOFF.md`
- `DAY36A-GOVERNANCE-ACCEPTANCE.md`
- `01-ALO-DAT-XE-DOMAIN-MIGRATION-PLAN-DAY36A.md`
- `02-ALO-DAT-XE-SEO-CORE-CONTRACT-v1.2.md`
- `SEO-004-DAY35-ORGANIC-GROWTH-CLOSURE.md`
- `seo-004-day35-core-acceptance.md`
- `SEO-004-KEYWORD-PAGE-FAMILY-URL-MAP-v1.1-DAY36A.xlsx`
- `ALO-DAT-XE-KEYWORD-UNIVERSE-v0.6-DAY36A.xlsx`
- `docs/day36b-seo-005-content-readiness-contract.md`
- `docs/day36b-d35-10-audit.md`
- `docs/technical-receipts/day36b-source.md`

## 9. Kết luận bàn giao

Core đã hoàn tất source Day 36B và chuyển SEO-005 sang trạng thái **READY FOR SEO REVIEW**. Bàn giao này không đóng DEP-011, không đóng D35-10, không mở Long Thành và không kích hoạt production. Organic Growth/SEO là bên xác nhận acceptance cho semantics/readiness; mọi activation sau đó vẫn cần receipt và các gate được phê duyệt theo roadmap.
