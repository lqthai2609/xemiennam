# Day 53 — chốt tương thích backend cho luồng nhận yêu cầu

Ngày 10/10/2026. Đúng một việc RELEASE-01: ngăn dựng frontend production khi backend chưa hỗ trợ hợp đồng nhận và gửi lại yêu cầu của Day 45. Không thay giao diện, bảng giá, D04, D01 đã bỏ, canonical hoặc graph Day 54.

## Vấn đề và thay đổi

Frontend tại ee4c18c gọi POST `/gocar/v1/leads/replay` trước khi đọc CMS hoặc tạo lead. Hồ sơ production giữ plugin 0.11.1; REST index của backend tham chiếu `https://xemiennam.datxesaigon.com/wp-json/` ngày 10/10 có `/gocar/v1/leads` POST nhưng thiếu `/gocar/v1/leads/replay`. Cờ ưu đãi false không loại bỏ yêu cầu replay này. Vì vậy phát hành frontend hiện tại trước backend tương thích có thể khiến mọi yêu cầu hợp lệ bị dừng. Giữ nguyên fail-closed của gateway; không fallback v1 hoặc tạo lead lần hai.

`npm run build` kiểm trước `next build` khi VERCEL=1 và VERCEL_ENV hoặc VERCEL_TARGET_ENV là production. Preview/local/CI thông thường không chạy probe live. `vercel.json` chốt buildCommand=`npm run build`. Môi trường Vercel không xác định sẽ bị chặn. Bản dựng production phải có WP_API_BASE_URL rõ ràng; không tự suy URL mặc định. Ngoài Vercel dùng `npm run build:production`; kiểm riêng dùng `npm run release:preflight` với cùng WP_API_BASE_URL của môi trường đích.

Probe chỉ gửi GET tới REST index và `/gocar/v1/leads/contract` trên đúng origin mà wp-auth sử dụng. Không JWT, POST, UUID, khách hàng, lead lookup, email, ghi dữ liệu hoặc gọi bên thứ ba. HTTP lỗi, JSON hỏng, timeout, redirect, route thiếu/sai method, version sai hoặc capability false đều exit 1. Không ghi response body hoặc bí mật vào log.

Plugin nguồn 0.17.1 bổ sung GET `/gocar/v1/leads/contract`: contract_version=1, intent_version=2, snapshot_version=1, replay_lookup và snapshot_persistence từ các class hiện hành. Endpoint chỉ công bố khả năng của mã nguồn; no-store và noindex/nofollow/noarchive, không đọc khách/lead/CMS và không thay quyền của các endpoint POST. Production chưa cài plugin này.

## Giới hạn bắt buộc

PASS chỉ là tương thích capability đã công bố và route registration. Không chứng minh đăng nhập JWT, phân quyền ghi, MySQL/đa worker, reservation, persistence/recovery thật, thực nhận email, dữ liệu Vận hành hoặc toàn bộ DEP-006. Các gate đó tiếp tục riêng; không gửi giao dịch thật trong phiên này.

Chốt tự động áp dụng cho đường Vercel dùng buildCommand của repository và bật system environment variables. Việc bỏ script, tắt system variables hoặc phát hành prebuilt ngoài đường này không được phép suy là đã qua chốt; trước phát hành phải kiểm cấu hình và chạy lệnh production trên đúng môi trường đích. Không sửa cấu hình tài khoản Vercel trong phiên này. Tham khảo nguồn chính thức: https://vercel.com/docs/environment-variables/system-environment-variables.

## Thứ tự xử lý tiếp theo

Core/quản trị hệ thống chuẩn bị môi trường thử WordPress/MySQL biệt lập và kiểm plugin 0.17.1 ở đó, dùng dữ liệu tổng hợp, không gửi email. Bằng chứng cần gồm auth/quyền, snapshot/replay, response mất và hai worker cạnh tranh không tạo trùng. Chỉ khi có biên nhận và quyền phát hành backend riêng mới nâng backend thật; kiểm GET capability trên backend đích trước khi cho phép frontend. Không đóng readiness của các tính năng mới chưa nghiệm thu.

## Rollback

Chưa có production mutation trong thay đổi này. Nếu cần rút phần nguồn, chỉ gỡ capability endpoint và chốt build của RELEASE-01; không trả toàn nhánh về Day 52/53 trước D04, không khôi phục D01. Sau khi client v2 đã được phát hành, phải giữ backend hỗ trợ replay v2 và toàn bộ lead/snapshot/reservation; không hạ plugin làm mất protocol, không restore database. Dừng claim thương mại bằng cờ riêng vẫn false, không xóa lịch sử.

## Trạng thái giữ nguyên

QG-15 bảng giá PASS đúng mẫu đã chấp nhận, không kiểm lại. Day 53 toàn phần chưa đóng, Day 54 chưa bắt đầu. PR #144 chưa gộp; không phát hành production, không nhập CMS thật. Long Thành/KU-068–072 PRELAUNCH; commercial=false/sellable=false; Paid/Budget/Campaign/Ads/GA/Meta INACTIVE; nguồn khách chưa rõ. GSC/DEP-011, D35-10 đúng mapping, email thực nhận và nghiệm thu SEO/runtime khác không được tự đóng từ chốt này.
