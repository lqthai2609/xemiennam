import type { BlogPost } from "@/types/blog";

/**
 * Mock tạm cho `post` mặc định WordPress — dùng khi WP chưa có bài blog thật (nhập liệu
 * thật là Ngày 25–26, xem mục "5 — Nhập nội dung & QA" trong kế hoạch). Theo đúng cơ chế
 * fallback đã dùng cho routes/vehicles/services (Ngày 12/13): khi API trả rỗng, dùng lại
 * 3 tiêu đề mock đã có sẵn ở trang chủ (giữ đúng nguyên văn, không đổi) + thêm 2 bài để
 * trang /blog có đủ nội dung minh hoạ bộ lọc danh mục.
 *
 * Lưu ý copy: dịch vụ là thuê xe NGUYÊN CHIẾC, khách tự chủ động giờ giấc — nội dung mock
 * dưới đây tránh từ "vé" và không ngụ ý lịch trình khởi hành cố định.
 */
export const blogPosts: BlogPost[] = [
  {
    id: "di-vung-tau-2-ngay-1-dem",
    slug: "di-vung-tau-2-ngay-1-dem-cho-gia-dinh-co-tre-nho",
    title: "Đi Vũng Tàu 2 ngày 1 đêm cho gia đình có trẻ nhỏ",
    excerpt: "Gợi ý lịch trình thong thả, chọn xe rộng rãi và vài lưu ý khi đi cùng trẻ nhỏ để chuyến biển cuối tuần thoải mái từ lúc lên xe.",
    contentHtml:
      "<p>Đi Vũng Tàu cùng trẻ nhỏ thoải mái hơn nhiều nếu bạn chủ động được giờ xuất phát và điểm đón. Thuê nguyên xe theo gia đình giúp bạn không phải canh giờ theo người khác, có thể dừng nghỉ bất cứ khi nào bé cần.</p><p>Gợi ý lịch trình 2 ngày 1 đêm: sáng ngày đầu khởi hành sớm để tránh nắng, ghé Bãi Sau nghỉ ngơi, chiều nhận phòng khách sạn gần biển. Ngày thứ hai dạo Bãi Trước hoặc tham quan Tượng Chúa Kitô Vua trước khi về lại thành phố.</p><p>Xem thêm <a href=\"/tuyen-duong/hcm-vung-tau\">tuyến TP.HCM – Vũng Tàu</a> để chọn loại xe phù hợp với số lượng người trong gia đình.</p>",
    category: "Kinh nghiệm",
    publishedDate: "2026-07-12T02:00:00+07:00",
    modifiedDate: "2026-07-12T02:00:00+07:00",
  },
  {
    id: "thue-xe-16-cho-di-da-lat-luu-y",
    slug: "thue-xe-16-cho-di-da-lat-can-luu-y-gi-truoc-khi-dat",
    title: "Thuê xe 16 chỗ đi Đà Lạt cần lưu ý gì trước khi đặt",
    excerpt: "Từ số lượng người thực tế, hành lý mang theo cho tới cung đường đèo dốc — vài điều nên xác nhận trước khi thuê nguyên chiếc 16 chỗ lên Đà Lạt.",
    contentHtml:
      "<p>Xe 16–29 chỗ phù hợp cho nhóm công ty hoặc lớp học muốn cả đoàn đi chung một chuyến. Trước khi đặt, nên xác nhận rõ số ghế thực tế còn trống sau khi tính cả hành lý, vì cung đường lên Đà Lạt có đoạn đèo dốc nên xe chở đúng tải sẽ êm và an toàn hơn.</p><p>Vì thuê nguyên chiếc, bạn hoàn toàn chủ động giờ xuất phát và điểm dừng nghỉ dọc đường — không phải chờ theo người khác. Nên thống nhất trước với tài xế các điểm dừng chân mong muốn (trạm dừng, quán ăn quen) để hành trình thoải mái hơn.</p><p>Tham khảo <a href=\"/loai-xe/16-29-cho\">trang loại xe 16–29 chỗ</a> để xem đầy đủ tiện ích trước khi quyết định.</p>",
    category: "Cẩm nang",
    publishedDate: "2026-07-20T02:00:00+07:00",
    modifiedDate: "2026-07-20T02:00:00+07:00",
  },
  {
    id: "tram-dung-chan-cao-toc-long-thanh-dau-giay",
    slug: "cac-tram-dung-chan-tren-cao-toc-hcm-long-thanh-dau-giay",
    title: "Các trạm dừng chân trên cao tốc TP.HCM – Long Thành – Dầu Giây",
    excerpt: "Điểm qua vài trạm dừng chân quen thuộc trên cung đường ra hướng Đà Lạt, Phan Thiết — tiện ghé khi thuê xe tự chủ động giờ giấc.",
    contentHtml:
      "<p>Cao tốc TP.HCM – Long Thành – Dầu Giây là đoạn đường hầu hết các chuyến đi hướng Đà Lạt, Phan Thiết đều đi qua. Vì thuê nguyên xe không có lịch trình cố định, bạn có thể chủ động ghé bất kỳ trạm dừng chân nào phù hợp với thời gian của cả đoàn.</p><p>Một vài điểm quen thuộc: trạm dừng gần nút giao Dầu Giây có khu vệ sinh sạch và quán ăn nhẹ, phù hợp để nghỉ ngơi giữa chặng trước khi tiếp tục lên Đà Lạt hoặc rẽ hướng Phan Thiết.</p>",
    category: "Review",
    publishedDate: "2026-07-28T02:00:00+07:00",
    modifiedDate: "2026-07-28T02:00:00+07:00",
  },
  {
    id: "kinh-nghiem-thue-xe-doan-cong-ty",
    slug: "kinh-nghiem-thue-xe-cho-doan-cong-ty-di-team-building",
    title: "Kinh nghiệm thuê xe cho đoàn công ty đi team building",
    excerpt: "Chọn xe 45 chỗ hay chia nhiều xe nhỏ, sắp xếp giờ đón ở nhiều điểm trong thành phố — vài kinh nghiệm khi đặt xe cho đoàn đông người.",
    contentHtml:
      "<p>Với đoàn công ty trên 30 người, nên cân nhắc giữa 1 xe 45 chỗ hoặc chia thành 2 xe nhỏ hơn tuỳ số điểm đón trong thành phố. Nếu nhân viên ở rải rác nhiều quận, chia nhỏ xe giúp rút ngắn thời gian đón so với dồn về 1 điểm tập trung.</p><p>Vì là thuê nguyên chuyến, giờ xuất phát và điểm dừng giữa đường hoàn toàn theo lịch trình của công ty, không bị ràng buộc theo giờ chạy cố định.</p>",
    category: "Kinh nghiệm",
    publishedDate: "2026-08-02T02:00:00+07:00",
    modifiedDate: "2026-08-02T02:00:00+07:00",
  },
  {
    id: "review-diem-den-can-tho-mien-tay",
    slug: "review-mot-ngay-kham-pha-cho-noi-can-tho",
    title: "Review một ngày khám phá chợ nổi Cần Thơ",
    excerpt: "Giờ nào chợ nổi đông nhất, di chuyển từ trung tâm Cần Thơ ra bến tàu mất bao lâu — ghi chép nhanh từ chuyến đi thực tế.",
    contentHtml:
      "<p>Chợ nổi Cái Răng đông nhất vào khoảng 5–7 giờ sáng, nên nếu muốn thấy trọn vẹn không khí mua bán trên sông, nên sắp xếp có mặt ở bến tàu trước 6 giờ. Từ trung tâm Cần Thơ ra bến tàu Cái Răng chỉ mất khoảng 15–20 phút di chuyển.</p><p>Vì chủ động được giờ giấc khi thuê nguyên xe, bạn có thể xuất phát từ TP.HCM từ tối hôm trước hoặc sáng thật sớm để kịp giờ chợ nổi đông vui nhất.</p>",
    category: "Review",
    publishedDate: "2026-08-09T02:00:00+07:00",
    modifiedDate: "2026-08-09T02:00:00+07:00",
  },
];
