# SEO-005 — Content Readiness và indexability contract

Trạng thái: SOURCE IMPLEMENTED / PRODUCTION INACTIVE. Owner: Core + Organic Growth. Ngày: 21/09/2026.

## Phạm vi

Contract này đưa các quyết định editorial, service, canonical, mapping, indexability và schema về một record có version. Nó không tạo URL, không đổi canonical, không bật sitemap, không kích hoạt redirect và không cấp quyền công bố Long Thành.

Các field public-safe trên Route:

| Field | Giá trị | Mặc định an toàn |
|---|---|---|
| `content_readiness_version` | số nguyên không âm | `0`, policy chưa active |
| `content_editorial_state` | `missing`, `draft`, `review`, `ready` | `missing` |
| `content_service_state` | `unknown`, `prelaunch`, `live`, `paused` | `unknown` |
| `content_canonical_state` | `missing`, `candidate`, `verified` | `missing` |
| `content_mapping_state` | `clear`, `d35_10_blocked` | `clear` |
| `content_indexability_state` | `noindex`, `index` | `noindex` |
| `content_schema_state` | `none`, `service`, `offer` | `none` |
| `content_readiness_reason` | reason code đã sanitize | rỗng |
| `content_source_ref` | receipt/source reference public-safe | rỗng |

## Quy tắc quyết định

- Version `0` hoặc thiếu record không kích hoạt SEO-005; runtime hiện hành được giữ để rollout không gây noindex diện rộng ngoài ý muốn.
- Version từ `1` chỉ cho phép index khi editorial=`ready`, service=`live`, canonical=`verified`, mapping=`clear` và requested indexability=`index`.
- `d35_10_blocked` chặn index, sitemap và schema cho mapping bị ảnh hưởng.
- Long Thành/prelaunch luôn thắng mọi field khác và tiếp tục bị chặn ở Route commercial surface.
- Service schema chỉ hợp lệ khi trang đủ điều kiện index và schema state là `service` hoặc `offer`.
- Offer chỉ hợp lệ khi schema state=`offer` và tồn tại giá `fixed` dương, hữu hạn từ Pricing V2. `contact` không tạo Offer.
- Không field nào chứa địa chỉ đón/trả riêng, ghi chú booking, tọa độ, số điện thoại, email hoặc PII.

## Rollout

1. Merge source và kiểm thử, không deploy/kích hoạt trong Day 36B.
2. Organic Growth/Core cấp receipt theo URL đại diện.
3. D35-10 phải được giải quyết riêng cho chín nhóm bị ảnh hưởng trước khi đặt mapping=`clear`.
4. Operations xác nhận service/pricing readiness; thiếu dữ liệu tiếp tục contact.
5. Chỉ tăng version và đặt index sau staging crawl + acceptance. Rollback bằng version `0` hoặc `noindex`.

