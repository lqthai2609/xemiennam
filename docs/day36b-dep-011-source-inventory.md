# DEP-011 — Source/public-surface inventory Day 36B

Trạng thái: PHASE 1 SOURCE COMPLETE / PRODUCTION INACTIVE. Baseline: `60d54d492aaee2def6b0f3306d3171b62ae44af4`.

| Surface | Phân loại | Day 36B |
|---|---|---|
| UI copy, metadata, Open Graph, schema provider label, footer và WordPress admin label | `PUBLIC_REPLACE` | Đổi sang Alo Đặt Xe |
| `SITE_NAME`, mô tả thương hiệu, label Sài Gòn | `PUBLIC_REPLACE` | Cập nhật; canonical entity vẫn TP. Hồ Chí Minh trong data model |
| Package/repository name `xemiennam`, PHP class/prefix `Gocar_*`, constant `GOCAR_*`, REST/meta keys | `TECHNICAL_KEEP` | Giữ nguyên; không global rename |
| CMS API hostname `xemiennam.datxesaigon.com` và preview fallback `xemiennam.vercel.app` | `MIGRATE_SEPARATELY` | Giữ nguyên trong source; không đổi hostname |
| `NEXT_PUBLIC_SITE_URL`, DNS, Vercel domain, canonical host, robots/sitemap host và redirect | `MIGRATE_SEPARATELY` | Không kích hoạt; chờ domain/deployment receipts |
| Day 31–35 receipts và historical URLs | `HISTORICAL_EVIDENCE` | Không sửa |
| Logo, favicon, ảnh và design tokens | `MIGRATE_SEPARATELY` | Không thay trong Day 36B |

Public source guard trong CI chặn `Gocar VN`, `GOCARVN` và `Xe Miền Nam` dưới `src/`. Metadata sanitizer vẫn nhận diện chuỗi legacy bằng token ghép để nội dung CMS cũ không phát ra public metadata.

