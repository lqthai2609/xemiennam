# Day 44 — giao diện ưu đãi, schema và thời hạn

Ngày 09/10/2026. Tiếp nối Day 43 trên PR #144, nhánh core/day42-promotion-model. Phạm vi hoàn thành ở mã nguồn/kiểm tra; không bật thương mại, merge, cài WordPress hoặc phát hành production. DEP-006 vẫn OPEN; snapshot/idempotency Day 45 chưa triển khai.

## Một kết quả máy chủ cho từng tổ hợp

withRoutePromotionViews gọi resolvePriceRulesWithPromotion cho từng dòng Pricing V2 hiện hành. Khóa là route ID, direction, vehicle ID, package key; không dùng tên xe, giá thấp nhất hoặc chiều ngược để suy ưu đãi. Nhánh cờ tắt trả ngay, không đọc nguồn riêng tư hoặc thay giá CMS. Mock route không được trang trí promotion. Source loader riêng tư chưa nối CMS thật và vẫn là điều kiện trước activation.

buildPromotionPriceView nhận duy nhất projection evaluator và display context do server dựng. Giá gốc phải khớp đúng lớp giá, VND và đơn vị gói; chỉ sao chép cặp trước/sau đã tính, kiểm nhất quán BigInt, không tái tính phần trăm ở client. requiresTripContext do evaluator xác định từ predicate có cấu trúc; kết quả phụ thuộc ngày/giờ chuyến không được nâng thành ưu đãi catalog.

- base_catalog hiển thị giá cơ bản của đúng dòng gói; chỉ ưu đãi base_price tạo cặp gạch giá cơ bản.
- trip_estimate so sánh đúng base/estimated_total/surcharge; nếu miễn toàn khoản phụ phí, khoản đó được phép là 0 nhưng tổng chuyến luôn dương. Tổng cuối được ghi nhãn riêng. Thành phần này dùng cho kết quả server, chưa có endpoint báo giá hoặc lưu snapshot mới.
- Benefit giữ giá, quyền lợi và điều kiện riêng, không có cặp giảm giá giả.
- Contact/disabled không có giá giảm hoặc Offer. Scheduled/expired/ambiguity giữ giá chưa giảm và có thông báo rõ. Sai tổ hợp/cấu hình không tạo claim.
- CTA hiện hành tiếp tục dùng giá gốc làm tham khảo; server tính lại khi nhận yêu cầu. Không hứa giữ giá ưu đãi trong form, không sửa nghĩa estimated_total.

## Giao diện và schema

RoutePricingSection và ComboLandingPage lấy presentation của đúng dòng đang chọn. /khuyen-mai chỉ dùng các presentation được server chọn; đã loại luồng map legacy/mock, nhãn tất cả tuyến/mọi loại xe và nội dung CMS tự khẳng định giảm giá. Trang giữ noindex theo SEO-009; không tạo URL chương trình mới.

Offer sử dụng cùng tuple và giá cơ bản được hiển thị; không lấy một tổng báo giá riêng hoặc khoản phụ phí làm lowPrice. Candidate phải fixed dương; promotion phải offerEligible, còn hạn và đúng giá gốc. Có validFrom/validThrough theo giờ Việt Nam và UnitPriceSpecification ghi đơn vị gói. Giá gốc của chương trình được giữ cho fallback; Benefit không tạo Offer giảm.

Schema combo lần render đầu dựa vào đúng chiều/xe/gói đang được chọn, thay vì luôn lấy giá outbound đại diện. Schema tuyến chỉ chứa các dòng cùng chiều/gói lựa chọn ban đầu. Khi người dùng đổi lựa chọn ngay trên trang, component bỏ Offers của lựa chọn cũ và giữ Service; không suy tính một Offer mới trong trình duyệt. Khi tải URL lựa chọn mới, server dựng lại Offer đúng context. Long Thành/readiness/D35-10 giữ cửa kiểm hiện hành, không thêm schema vào tổ hợp bị chặn.

## Không giữ ưu đãi cũ

- /khuyen-mai chờ connection mỗi yêu cầu. Khi cờ thương mại bật trong một phát hành tương lai có đủ gate, adapter cũng gọi connection và toàn bộ dữ liệu WordPress được đọc no-store. Không dùng ISR/stale-while-revalidate để lưu HTML có claim; không cần khóa cache promotion vì không cache kết quả. Cờ đang false nên dữ liệu giá thông thường vẫn dùng chính sách cache hiện hành.
- Mỗi claim có hạn ngắn nhất của endExclusive, nextBoundaryAt của evaluator và evaluationTime + 60 giây. Hạn 60 giây là giới hạn phản hồi tạm thời, không phải thời gian kết thúc chương trình. Bản hết hạn chuyển về giá trước giảm và yêu cầu kiểm lại; không tự cộng thời gian hoặc tự áp chương trình kế tiếp.
- PromotionPrice và ExpiringJsonLd dùng cùng hook expiry: hẹn tới đúng hạn, kiểm lại pageshow/focus/visibilitychange, và dọn listener/timer khi unmount. Kết quả đã hết hạn không hồi sinh khi đồng hồ thiết bị bị chỉnh lùi. Client chỉ gỡ claim, không cấp eligibility hoặc tính tiền.
- ExpiringJsonLd chuyển sang fallback do server dựng, cập nhật cả giá/lowPrice/highPrice/validity. Escape ký tự < trong JSON-LD mới để không đóng thẻ script từ chuỗi dữ liệu.
- Webhook promotion xác thực hiện hành làm mới ngay tag và các trang tuyến/combo/listing. Không bổ sung endpoint bật cờ, không có claim cache riêng để giữ revision cũ sau sửa/tạm dừng. Tab đang mở được giới hạn tối đa 60 giây; nghiệm thu CMS thực trước activation vẫn riêng.

## Kiểm tra và giới hạn

Bộ Day 44 kiểm hành vi evaluator → presentation → HTML/Offer, exact tuple/layer/package, mọi trạng thái, quyền lợi, phụ phí miễn, dữ liệu sai, dữ liệu riêng tư, thời điểm kết thúc, chương trình cạnh tranh bắt đầu, hạn phản hồi, subscriber resume/cleanup/clock rewind, nguồn cờ tắt, adapter request-time, no-store và webhook invalidation. Giá và chương trình trong kiểm tra là tổng hợp, không nhập CMS.

Kiểm HTML thật trong bản dựng với cờ tắt chỉ chứng minh không có ưu đãi đang chạy. Công cụ trình duyệt local chưa sẵn có; kiểm tương tác/ảnh desktop-mobile với chương trình thật trên CMS/Vercel chưa được nghiệm thu và phải làm trong gate activation. Kiểm component render và bố cục CSS không được gọi là nghiệm thu trực quan độc lập của SEO. Không mở lại mẫu SEO Day 41 đã đạt.

## Việc tiếp theo

Core Day 45: snapshot promotion có version ở backend, giữ pricing cũ, replay idempotency đúng kết quả đã lưu và kiểm biến động giá/chương trình giữa các lần gửi. Không tự bật cờ, merge hoặc production. Nối nguồn CMS riêng tư và nghiệm thu giao diện/runtime thật chỉ trước activation theo quyền và gate còn mở; không dùng chương trình giả công khai để đóng biên nhận.
