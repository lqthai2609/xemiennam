# Day 46 — thông tin xe được Vận hành xác nhận

## Phạm vi và nguồn

Core Day 46 bổ sung data model, lưu/đọc backend và logic gợi ý ở mã nguồn. Day 47 mới triển khai giao diện chọn xe. Không tự sửa CPT/meta cũ, dữ liệu CMS, taxonomy, Pricing V2, promotion, URL/canonical/sitemap hay nội dung SEO đã nghiệm thu. Các con số/tên xe trong fixtures là dữ liệu giả để kiểm mã, không phải phê duyệt nghiệp vụ.

Record riêng tư `_gocar_vehicle_facts_v1` thuộc từng `vehicle`, không thuộc nhãn loại xe. Cùng record có `model_version=1`, revision tăng dần, passenger_capacity, load_profiles, model_examples, service_level và approval. Không backfill `so_cho`, capacity, tên xe, loại xe hoặc ảnh thành dữ liệu xác nhận. `so_cho` hiện hành giữ làm nhãn số chỗ cũ, không được dùng để suy ra số hành khách hay hành lý.

## Các trường

| Trường | Nghĩa và kiểm tra |
| --- | --- |
| passenger_capacity | Số hành khách tối đa không gồm tài xế; số nguyên 1–100 hoặc null. Không tự trừ một chỗ từ nhãn xe. |
| load_profiles | Tối đa 30 cấu hình chở khách và hành lý đồng thời được duyệt. Có thể rỗng khi chưa đủ thông tin. |
| passengers trong cấu hình | Giới hạn hành khách của đúng cấu hình; không vượt passenger_capacity. |
| cabin_bags / checked_bags | Hai nhóm hành lý theo định nghĩa riêng của Vận hành, số nguyên 0–100. Không mặc định theo chuẩn hãng bay. |
| cabin_max_cm / checked_max_cm | Ba chiều tối đa theo đúng thứ tự chiều dài/rộng/cao; số nguyên 1–300 cm. Nhóm có hành lý bắt buộc có đủ giới hạn; nhóm không hành lý phải null. |
| total_luggage_kg | Tổng khối lượng hành lý cho toàn cấu hình, nguyên 1–5000 kg. Không phải tải trọng xe. Cấu hình không hành lý dùng null. Không đủ bằng chứng về khối lượng thì chưa tạo cấu hình hành lý. |
| model_examples | Null hoặc 1–10 tên xe tham khảo đã được xác nhận, không trùng/HTML/ký tự điều khiển. Không cam kết đúng mẫu xe giao khách, tình trạng xe hay còn xe. |
| service_level | Null hoặc standard/business/premium. Không suy ra từ nhãn Limousine, hãng xe hoặc giá. Không có thứ tự tự nâng cấp. |
| approval | draft/confirmed/rejected, source_ref riêng tư. Confirmed bắt buộc dẫn chiếu bằng chứng Vận hành. |

Một record confirmed vẫn có thể thiếu một số trường; trường thiếu tiếp tục cần tư vấn. Không tự điền mẫu xe hoặc cấp dịch vụ khi chỉ có capacity. Nhận dạng phiên bản không hỗ trợ, sai vehicle_id, thời điểm không hợp lệ/tương lai hoặc record hỏng đều trả cần tư vấn.

## Lưu và phân quyền

`GET/PUT /wp-json/gocar/v1/admin/vehicles/{id}/facts` yêu cầu quyền sửa đúng vehicle; không dùng anonymous hoặc key từ client làm chứng nhận. PUT gồm `expected_revision` và `model`; không nhận actor/time do client tự gán. Xác nhận hoặc sửa/rút record đang confirmed cần `manage_options`, được dùng cho người phụ trách Vận hành. Server đóng dấu actor/time ở mỗi lần lưu, ghi journal riêng tư trước write. Journal là lần thử lưu, không phải biên nhận thành công; write lỗi không tăng revision hoặc báo thành công. Khóa option duy nhất trên từng vehicle và revision ngăn ghi đè giữa worker. Không tự dọn khóa khi chưa đối soát worker cũ.

Generic add/update/delete meta không được vượt guard. Các editor vẫn có thể lưu bản draft chưa confirmed. Draft/rejected thay phiên bản confirmed khi người có thẩm quyền rút xác nhận; projection public trở về null. Khôi phục dữ liệu cần gửi phiên bản mới và phê duyệt mới, không phục hồi database hay xóa history.

REST `vehicle.gocar_vehicle_facts` chỉ đọc, chỉ cho vehicle đã publish với record confirmed hợp lệ. Không lộ source_ref, actor_id, journal hoặc approval nội bộ. Backend cũ không có field này vẫn hoạt động; frontend giữ consultation. Plugin source 0.13.0 chưa cài production.

## Logic gợi ý

`fetchVehicleSuggestions()` chạy server và đọc danh sách xe không cache để tránh dùng phê duyệt đã bị rút. `evaluateVehicleSuggestions()` chia kết quả recommended/consultation/excluded, không tính giá hoặc gửi booking. Chỉ recommended khi đầy đủ dữ liệu yêu cầu, số khách phù hợp và toàn bộ số kiện, kích thước, tổng khối lượng nằm trong **cùng một** cấu hình đã xác nhận. Không ghép số khách tối đa của cấu hình A với hành lý tối đa của B. Các cấu hình là khoảng giới hạn mà Vận hành xác nhận: yêu cầu nhỏ hơn hoặc bằng từng giới hạn được phép.

- Quá passenger_capacity đã confirmed: excluded với lý do passenger_limit.
- Không có capacity hoặc luggage chưa biết: consultation, không coi là không hành lý.
- Hành lý quá giới hạn hoặc chưa có cấu hình phù hợp: consultation, không tự kết luận giới hạn vật lý từ dữ liệu chưa đầy đủ.
- Không khớp/thiếu cấp dịch vụ yêu cầu: consultation.
- Không đoán cách xoay vali hay hành lý khác hình dạng/kích cỡ; Vận hành cần tư vấn.
- Giá trị không hợp lệ, chuỗi số, âm, NaN, phân số, trường không hỗ trợ: consultation.
- Thông tin verified không đồng nghĩa xe sẵn sàng bán, còn xe, giá đã duyệt hoặc chuyến đã đặt.

Adapter danh sách/chi tiết dùng chung `readVehicleFacts`; mẫu giả preview luôn consultation. Trường capacity cũ nằm cạnh biểu tượng hành lý nên giữ “Cần tư vấn” cho tới giao diện có yêu cầu khách/hành lý Day 47. Không lấy passenger_capacity làm nhãn hành lý. Similar vehicles hiện tại chỉ là liên kết xem xe liên quan, không phải biên nhận phù hợp tải.

## Gate và bước tiếp theo

Source/test không thay nghiệm thu WordPress/MySQL, dữ liệu Vận hành/CMS thật hoặc SEO độc lập. SEO-013A draft chưa được Organic Growth thực hiện/tiếp nhận; SEO-013B và DEP-004 joint tiếp tục mở. DEP-006 và các tồn đọng Day 45 giữ nguyên. Cờ promotion false, Long Thành PRELAUNCH, nguồn khách unknown và Paid/Budget/Campaign INACTIVE.

Day 47 dùng kết quả server cho selector và nhãn thông tin, cảnh báo số khách vượt dữ liệu đã duyệt. Cần thay những copy capacity/model/service tĩnh ở home-fleet, vehicle-index-redesign, vehicle-type-detail-redesign, route-pricing-section và route-vehicle-combo trước khi tuyên bố toàn website chỉ dùng facts verified; chưa coi UI cũ đã nghiệm thu Day 47. Không tự mở lại mẫu SEO cũ. Dữ liệu thiếu hiển thị tư vấn, không chặn khách gửi yêu cầu tư vấn.
