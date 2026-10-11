# Core Day 51 — điều phối chuyến xe chiều trống

Ngày 09/10/2026. Nguồn: bàn giao Day 50 và kế hoạch Day 51. Phạm vi: writer riêng tư và màn hình điều phối thủ công. Giá nền Pricing V2 và Promotion Engine không được ghi hoặc ghép với giá riêng. Không có chuyến Vận hành thật được nhập trong phiên này.

## Màn hình và API

- Màn hình `/quan-tri/chieu-trong` dùng phiên quản trị hiện hành; chỉ có ở development/preview hoặc khi cờ quản trị được cho phép riêng. Robots noindex,nofollow,noarchive. Liên kết nằm trong quản trị sau đăng nhập. Nút gọi/Zalo nổi của trang khách được ẩn tại màn hình này để không che thao tác điều phối trên điện thoại.
- Proxy `/api/admin/empty-legs`, `/options`, `/{id}` chỉ GET/POST theo danh sách cho phép. POST cần phiên hợp lệ, Origin cùng miền và mã CSRF trong cookie trùng header. Không DELETE, activate hoặc URL tùy ý; không làm mới cache trang công khai.
- Backend `/wp-json/gocar/v1/admin/empty-legs` GET danh sách/POST tạo; `/options` GET nguồn chọn; `/{id}` GET/POST sửa. Mọi endpoint cần `edit_posts`. Callback tự kiểm quyền lần nữa. Dữ liệu và phản hồi riêng tư, no-store/noindex.
- Người chỉ có quyền biên tập xem/sửa chuyến do mình tạo. Người có `publish_posts` xem các chuyến và xác nhận Vận hành. Sửa hoặc thử lại thao tác của chuyến đã confirmed cần quyền xác nhận. Không dựa vào nút ẩn ở trình duyệt để kiểm quyền.
- Danh sách tối đa 50 chuyến mới nhất trong phạm vi được phép; mã chuyến dùng để tìm bản cũ. Nguồn chọn đọc tối đa 500 tuyến CMS và chỉ đúng tổ hợp tuyến–chiều–xe–one_way. Không fallback mock hoặc suy loại xe/giá riêng/approval.

## Hợp đồng ghi v1

POST có đúng `model`, `expected_revision`, `action=save/confirm`, `reason`, `operation_key`. Model giữ v1 Day 50; không nhận actor/time/confirmed_at hoặc trường SEO/booking/PII. Reason và source_ref tối đa 500 ký tự, không markup/control. Operation key 16–80 ký tự chữ, số hoặc dấu nối. Thiếu dữ liệu giữ null.

- Tạo: expected_revision=0, model.revision=1. Sửa: expected_revision và model.revision bằng bản vừa tải. Server cấp revision kế tiếp; xung đột trả 409, không ghi đè. Client giữ nội dung đang nhập và yêu cầu tải bản mới.
- `save` giữ approval=draft và chỉ draft/inactive/cancelled. `confirm` cần quyền xác nhận, approval=confirmed và source_ref Vận hành; đủ toàn bộ model và đúng nguồn hiện hành. Máy chủ cấp dấu actor, at UTC, revision, source_ref. Mã nguồn do người có quyền cung cấp; hệ thống không tự chứng thực nội dung hồ sơ Vận hành chỉ từ chuỗi mã.
- Validation đọc mới tuyến, chiều, xe, hai Location, readiness, đúng một dòng Pricing V2 version 2, mode fixed, giá thường bằng giá base hiện hành. Contact/disabled/trùng dòng/đổi giá nền/readiness làm xác nhận bị chặn. Long Thành ID 9102/9154 và slug sân bay/địa phương cùng danh sách D35-10 theo route/pair là hard gate, không mở bằng meta clear.
- Xác nhận available/reserved bị từ chối tại expiry hoặc sau giờ khởi hành. Cửa sổ nửa mở, expiry không sau departure, giờ nhập Việt Nam chuyển UTC rõ. Không cron tự gia hạn hoặc đổi giá. Chuyến reserved có thể hoàn tất sau expiry nhưng không sửa scope/ngày giờ/giá/thời hạn đã giữ.

| Trạng thái cũ | Trạng thái được chuyển |
| --- | --- |
| Chưa có / draft | draft, inactive, available, cancelled |
| inactive | draft, inactive, available, cancelled |
| available | draft, inactive, available, reserved, cancelled |
| reserved | inactive, reserved, completed, cancelled |
| completed / cancelled | Không mở lại hoặc sửa |

Available/reserved/completed vẫn cần confirmed đủ điều kiện model. Đây là trạng thái điều phối nội bộ, không chứng minh xe thực, đặt xe xác nhận hoặc doanh thu; không tạo booking/email/thông báo. Rút xác nhận bằng save trạng thái draft/inactive phù hợp sẽ xóa dấu xác nhận hiện hành, giữ dấu cũ trong audit. Nguồn không hợp lệ vẫn bị chặn; không sửa ngầm model cũ để vượt kiểm nguồn.

## Lưu trữ, xung đột và thử lại

CPT gocar_empty_leg lưu post_status=private; show_ui/show_in_rest/public/archive/query/search/nav/rewrite false, không sitemap. Meta model/history chỉ writer dùng SQL được ghi. Generic add/update/delete vẫn chặn; không có migration/seed/backfill.

Writer yêu cầu posts/postmeta InnoDB và MySQL GET_LOCK hoạt động; thiếu trả 503 hoặc 409, không hạ xuống lưu không an toàn. Khóa nhận diện bản ghi (hoặc actor+operation_key khi tạo), transaction và SELECT FOR UPDATE cùng revision bảo vệ nhiều writer. Đọc model/history một truy vấn SQL, tránh meta cache cũ; xóa cache references trước kiểm nguồn. Dữ liệu đầu vào và model được kiểm trong transaction trước ghi.

Model mới và audit được ghi trong cùng transaction; lỗi model/history/COMMIT rollback, không trả thành công. Audit chỉ thêm: actor/time/action/reason, before/after, confirmation và operation fingerprint. Không sửa/xóa lịch sử. Tạo lỗi không để record mồ côi trong transaction; runtime WordPress hooks/object cache/multi-worker cần nghiệm thu riêng.

Thử lại cùng actor, operation_key, path và payload trả snapshot của thao tác đã lưu, không tạo chuyến hoặc audit lần hai. Dùng lại key với nội dung khác trả 409. Thử lại thao tác cũ không hạ revision hiện hành. Assessment vẫn kiểm nguồn và thời gian mới, nên không coi snapshot replay là bằng chứng chuyến còn hiệu lực.

Client chặn nhấn lưu đồng thời. Lỗi mạng/503 hoặc write_busy khóa biểu mẫu, cho thử lại đúng body/path/key cũ; phản hồi lỗi xác định khác cho sửa dữ liệu. Không đổi key tự động khi kết quả chưa rõ. Không lưu nội dung vào localStorage, gửi booking/email hoặc gán xe/tài xế thực.

## Giới hạn và nghiệm thu riêng

Commercial empty-leg/promotion/modifier false; sellable=false. Không endpoint inventory công khai, public URL/canonical/Offer hoặc sitemap entry. Long Thành/KU-068–072 PRELAUNCH, D35-10 đúng scope, nguồn khách chưa rõ, Paid/Budget/Campaign/Ads/GA/Meta INACTIVE.

Plugin nguồn 0.16.0. Backend production vẫn 0.11.1 theo bàn giao; chưa cài, merge hoặc phát hành. Kiểm local PHP sử dụng WordPress/SQL doubles; kiểm browser dùng fixture server biệt lập. Chúng không thay nghiệm thu WordPress/MySQL thật, nhiều worker, object cache, hooks, runtime auth hoặc hồ sơ Vận hành. Không tự đóng SEO-015A/015B/DEP-008/DEP-004.

Rollback gỡ/khóa writer và UI, giữ CPT/model/history private. Không restore database hoặc xóa lịch sử; giữ replay v2/lead/snapshot/audit hiện hành. Nếu COMMIT mất kết nối hoặc kết quả ghi chưa rõ, thử lại cùng thao tác; runtime phải xác nhận hành vi trên hạ tầng thật trước phát hành.

## Việc tiếp theo — đúng một ưu tiên

Core Day 52: xây phần hiển thị chuyến chiều trống và giá riêng, tự ẩn đúng hạn; nguồn từ máy chủ, tách Pricing V2 và giữ cờ thương mại tắt/noindex. Không tự mở bán hoặc tạo URL index. Hồ sơ SEO cho Day 53–54 phải có trạng thái rõ READY/BLOCKED/NEEDS REVISION; không bắt đầu Day 53–54 hoặc đoán phần SEO còn thiếu.
