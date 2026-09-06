import type { Promotion } from "@/types/promotion";
import { formatDiscountLabel, isPromotionExpired } from "@/types/promotion";

/**
 * Dữ liệu mock TẠM (Ngày 18) — WP chưa có bài `promotion` nào (nhập liệu thật dời tới
 * Ngày 24/27, xem mục 5 kế hoạch MVP). Khi fetchPromotions() (lib/api/promotions.ts) thấy
 * WP trả về rỗng, nó tự dùng lại mảng này — không cần sửa code gì ở trang /khuyen-mai.
 *
 * `isExpired` tính sẵn ở đây bằng isPromotionExpired() giống hệt cách lib/api/promotions.ts
 * sẽ tính cho dữ liệu thật, để 2 nguồn luôn hiển thị nhất quán (1 chương trình cố ý để hết
 * hạn — "Ưu đãi hè rộn ràng" — nhằm demo đúng trạng thái mờ + nhãn "Đã kết thúc" theo mục 9,
 * xemiennam-v0-prompts.md).
 */
const raw: Omit<Promotion, "discountLabel" | "isExpired">[] = [
  {
    id: "p1",
    slug: "giam-15-vung-tau",
    name: "Giảm 15% tuyến TP.HCM – Vũng Tàu",
    description: "Áp dụng cho mọi lượt thuê nguyên chuyến đi Vũng Tàu, không giới hạn số lần đặt trong tháng.",
    discountType: "phan_tram",
    discountValue: 15,
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    routeLabels: ["TP. Hồ Chí Minh – Vũng Tàu"],
    vehicleTypeLabels: [],
  },
  {
    id: "p2",
    slug: "dat-som-da-lat",
    name: "Đặt sớm đi Đà Lạt — giảm 300.000đ",
    description: "Ưu đãi cho khách đặt xe limousine trước lịch trình tối thiểu 5 ngày.",
    discountType: "so_tien",
    discountValue: 300000,
    startDate: "2026-07-15",
    endDate: "2026-09-15",
    routeLabels: ["TP. Hồ Chí Minh – Đà Lạt"],
    vehicleTypeLabels: ["Limousine"],
  },
  {
    id: "p3",
    slug: "doan-cong-ty-16-29",
    name: "Ưu đãi đoàn công ty xe 16–29 chỗ",
    description: "Giảm giá cho đoàn công ty thuê xe 16–29 chỗ trên mọi tuyến miền Nam, áp dụng cả ngày thường và cuối tuần.",
    discountType: "phan_tram",
    discountValue: 10,
    startDate: "2026-09-01",
    endDate: "2026-10-31",
    routeLabels: [],
    vehicleTypeLabels: ["16–29 chỗ"],
  },
  {
    id: "p4",
    slug: "giam-500k-can-tho",
    name: "Giảm 500.000đ thuê xe 45 chỗ đi Cần Thơ",
    description: "Dành cho đoàn từ thiện, trường học và công ty tổ chức chuyến đi đông người.",
    discountType: "so_tien",
    discountValue: 500000,
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    routeLabels: ["TP. Hồ Chí Minh – Cần Thơ"],
    vehicleTypeLabels: ["45 chỗ"],
  },
  {
    id: "p5",
    slug: "uu-dai-he-ron-rang",
    name: "Ưu đãi hè rộn ràng — giảm 20%",
    description: "Chương trình hè đã kết thúc — theo dõi các ưu đãi đang áp dụng phía trên hoặc liên hệ để được báo giá mới nhất.",
    discountType: "phan_tram",
    discountValue: 20,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    routeLabels: [],
    vehicleTypeLabels: [],
  },
];

export const promotions: Promotion[] = raw
  .map((p) => ({
    ...p,
    discountLabel: formatDiscountLabel(p.discountType, p.discountValue),
    isExpired: isPromotionExpired(p.endDate),
  }))
  .sort((a, b) => Number(a.isExpired) - Number(b.isExpired));
