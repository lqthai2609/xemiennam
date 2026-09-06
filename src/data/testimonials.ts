import type { Testimonial } from "@/types/testimonial";

/**
 * Dữ liệu mock (từ Ngày 14, bổ sung field `date` ở Ngày 18) — dùng cho 2 việc:
 * 1. Khối đánh giá trên trang kết hợp /tuyen-duong/[slug]/[loai-xe] (getTestimonialsForCombo).
 * 2. FALLBACK MOCK cho /danh-gia (Ngày 18): WP chưa có bài `testimonial` nào (nhập liệu thật
 *    dời tới Ngày 27), nên fetchTestimonials() (lib/api/testimonials.ts) tự dùng lại mảng
 *    này khi API trả về rỗng — không cần sửa code gì ở trang /danh-gia. Đổi `useMockFallback`
 *    trong lib/api/testimonials.ts thành false để thấy đúng trạng thái CMS thật.
 *
 * LƯU Ý quan trọng khi nối dữ liệu thật: luôn lọc đúng route + vehicleType của từng trang,
 * KHÔNG tái dùng chung 1 khối đánh giá cho nhiều trang không liên quan — đây đúng là lỗi
 * nhieuxe.vn mắc phải (mục 9.1, kiến trúc kỹ thuật): cùng 1 đánh giá xuất hiện lặp lại ở
 * nhiều bài viết chẳng liên quan, là dấu hiệu nội dung mỏng/trùng lặp với Google.
 */
export const testimonials: Testimonial[] = [
  { id: "t1", name: "Thu Hằng", initials: "TH", rating: 5, quote: "Đặt xe 16 chỗ đi Vũng Tàu cho công ty, tài xế đến đúng giờ, giá báo trước không đổi khi lên xe.", routeSlug: "hcm-vung-tau", vehicleType: "16–29 chỗ", date: "2026-08-18" },
  { id: "t2", name: "Minh Khôi", initials: "MK", rating: 5, quote: "Thuê limousine đi Đà Lạt, ghế nằm thoải mái hơn nhiều so với xe khách thường. Sẽ đặt lại lần sau.", routeSlug: "hcm-da-lat", vehicleType: "Limousine", date: "2026-08-25" },
  { id: "t3", name: "Ngọc Lan", initials: "NL", rating: 5, quote: "Tự lái xe 7 chỗ về Cần Thơ, thủ tục nhanh, xe sạch và đủ giấy tờ nên qua trạm không mất thời gian.", routeSlug: "hcm-can-tho", vehicleType: "4–7 chỗ", date: "2026-07-30" },
  { id: "t4", name: "Anh Quân", initials: "AQ", rating: 5, quote: "Xe 45 chỗ chở cả đoàn công ty đi Vũng Tàu, tài xế chạy êm, cả nhóm chợp mắt được một giấc trên xe.", routeSlug: "hcm-vung-tau", vehicleType: "45 chỗ", date: "2026-09-01" },
  { id: "t5", name: "Bảo Trân", initials: "BT", rating: 4, quote: "Đi Phan Thiết bằng xe 16 chỗ cho hội bạn học, giá hợp lý và tài xế hỗ trợ đồ đạc lỉnh kỉnh.", routeSlug: "hcm-phan-thiet", vehicleType: "16–29 chỗ", date: "2026-08-05" },
  { id: "t6", name: "Gia Huy", initials: "GH", rating: 5, quote: "Xe 4 chỗ đi Vũng Tàu cuối tuần, đón tận nhà sớm nên cả nhà ra biển kịp buổi sáng.", routeSlug: "hcm-vung-tau", vehicleType: "4–7 chỗ", date: "2026-08-30" },
  { id: "t7", name: "Thanh Phong", initials: "TP", rating: 5, quote: "Limousine đi Vũng Tàu êm và sạch sẽ, phù hợp đón ba mẹ lớn tuổi đi cùng.", routeSlug: "hcm-vung-tau", vehicleType: "Limousine", date: "2026-07-14" },
  { id: "t8", name: "Diễm My", initials: "DM", rating: 4, quote: "Xe 4 chỗ lên Đà Lạt, tài xế cho dừng vài điểm ngắm cảnh đèo Bảo Lộc theo yêu cầu.", routeSlug: "hcm-da-lat", vehicleType: "4–7 chỗ", date: "2026-08-12" },
  { id: "t9", name: "Việt Anh", initials: "VA", rating: 5, quote: "Đoàn công ty đi Cần Thơ bằng xe 29 chỗ, đủ chỗ để cả phòng đi chung, không phải chia xe.", routeSlug: "hcm-can-tho", vehicleType: "16–29 chỗ", date: "2026-09-03" },
  { id: "t10", name: "Hải Đăng", initials: "HD", rating: 5, quote: "Xe 4 chỗ ra Mũi Né tự lái, xe mới và đủ giấy tờ nên chạy cao tốc thoải mái.", routeSlug: "hcm-phan-thiet", vehicleType: "4–7 chỗ", date: "2026-07-22" },
  { id: "t11", name: "Xuân Mai", initials: "XM", rating: 5, quote: "Thuê xe 45 chỗ cho đoàn từ thiện về Cần Thơ, xe rộng rãi chở đủ người và hàng hoá.", routeSlug: "hcm-can-tho", vehicleType: "45 chỗ", date: "2026-08-20" },
];

/**
 * Lọc đánh giá đúng tuyến + loại xe của trang kết hợp. Nếu chưa đủ `count` cái khớp chính
 * xác, bổ sung thêm đánh giá cùng loại xe (khác tuyến) để trang luôn có nội dung — nhưng
 * luôn ưu tiên khớp chính xác trước, tránh hiển thị đánh giá không liên quan tới tuyến.
 */
export function getTestimonialsForCombo(routeSlug: string, vehicleType: string, count = 2): Testimonial[] {
  const exact = testimonials.filter((t) => t.routeSlug === routeSlug && t.vehicleType === vehicleType);
  if (exact.length >= count) return exact.slice(0, count);

  const sameVehicleType = testimonials.filter(
    (t) => t.vehicleType === vehicleType && !exact.some((e) => e.id === t.id),
  );
  return [...exact, ...sameVehicleType].slice(0, count);
}
