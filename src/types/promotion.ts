export type DiscountType = "phan_tram" | "so_tien";

/**
 * Khớp CPT `promotion` thật ngoài WordPress (đăng ký Ngày 3, field post meta Ngày 4 —
 * snippet ID 12: loai_giam_gia, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc, ap_dung_route
 * [mảng ID route], ap_dung_vehicle [mảng ID vehicle]). title.rendered = tên chương trình,
 * content.rendered = mô tả ngắn. Nhập liệu thật dời tới Ngày 24/27 (mục 5, kế hoạch MVP) —
 * xem fallback mock trong lib/api/promotions.ts.
 */
export type Promotion = {
  id: string;
  slug: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  /** Nhãn hiển thị sẵn, vd "Giảm 15%" hoặc "Giảm 300.000đ" — tính từ discountType + discountValue. */
  discountLabel: string;
  /** ISO yyyy-mm-dd. */
  startDate: string;
  /** ISO yyyy-mm-dd. */
  endDate: string;
  isExpired: boolean;
  /** Tên tuyến áp dụng, đã map từ ap_dung_route sang "A – B". Rỗng = áp dụng mọi tuyến. */
  routeLabels: string[];
  /** Loại xe áp dụng, đã map từ ap_dung_vehicle sang vehicle_type. Rỗng = áp dụng mọi loại xe. */
  vehicleTypeLabels: string[];
};

export function formatDiscountLabel(type: DiscountType, value: number): string {
  if (!value) return "Ưu đãi đặc biệt";
  if (type === "phan_tram") return `Giảm ${value}%`;
  return `Giảm ${Math.round(value).toLocaleString("vi-VN")}đ`;
}

/** So ngày kết thúc với hôm nay (theo giờ server lúc render/revalidate) — hết hạn thì hiển thị mờ + nhãn "Đã kết thúc". */
export function isPromotionExpired(endDate: string): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime();
}
