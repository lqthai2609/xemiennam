# D35-10 — Affected endpoint audit Day 36B

Trạng thái: OPEN / P0. Kết luận Day 36B: chưa đủ bằng chứng nghiệp vụ để gộp, xóa, redirect hoặc chọn canonical giữa các Route record cùng endpoint.

| Endpoint IDs | Route IDs | Nhận định kỹ thuật |
|---|---|---|
| 9118 / 9119 | 9095, 9026 | Hai slug Mộc Bài khác intent wording; cần editorial/package review. |
| 9118 / 9120 | 9079, 48 | Một record mang `3n2d`; chưa phải duplicate đã chứng minh. |
| 9118 / 9123 | 9076, 9075, 44 | Hai record package/ngày và một route chung; cần quyết định content/package ownership. |
| 9118 / 9138 | 9059, 9058 | Hai duration khác nhau; chưa được phép gộp. |
| 9118 / 9139 | 9057, 9056 | Hai duration khác nhau; chưa được phép gộp. |
| 9115 / 9118 | 9055, 9054, 41 | Mapping KU-002 bị ảnh hưởng; giữ target lịch sử, không kích hoạt reverse mapping mới. |
| 9118 / 9140 | 9053, 9052, 42 | Hai package/ngày và một route chung; cần receipt riêng. |
| 9118 / 9144 | 9048, 9047 | Hai duration khác nhau; chưa được phép gộp. |
| 9118 / 9184 | 9006, 9005 | Hai duration khác nhau; chưa được phép gộp. |

SEO-005 bổ sung `content_mapping_state=d35_10_blocked` để chặn indexability, sitemap và schema khi policy version được kích hoạt. Field này là guard kỹ thuật, không thay thế quyết định Core + SEO về từng nhóm.

