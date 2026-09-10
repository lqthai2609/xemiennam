export type PriceType = "one_way" | "round_trip_same_day" | "two_days_one_night";

export function normalizePriceType(value: string | undefined | null): PriceType {
  const normalized = (value ?? "")
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[._-]+/g, " ");

  if (normalized.includes("2 ngay") || normalized.includes("hai ngay")) return "two_days_one_night";
  if (
    normalized.includes("2 chieu") ||
    normalized.includes("hai chieu") ||
    normalized.includes("khu hoi") ||
    normalized.includes("trong ngay")
  ) {
    return "round_trip_same_day";
  }
  return "one_way";
}

export function priceTypeLabel(type: PriceType | undefined): string {
  switch (type) {
    case "round_trip_same_day":
      return "Hai chiều trong ngày";
    case "two_days_one_night":
      return "2 ngày 1 đêm";
    default:
      return "Một chiều";
  }
}

export interface VehiclePrice {
  vehicleType: string;
  price: string;
  /** Cách tính giá do CMS đánh dấu cho từng dòng giá. Dữ liệu cũ mặc định là một chiều. */
  priceType?: PriceType;
  /**
   * Mô tả riêng cho đúng tổ hợp tuyến + loại xe này (Ngày 14) — dùng cho trang
   * /tuyen-duong/[slug]/[loai-xe]. Bắt buộc viết tay riêng từng tổ hợp, không nội suy
   * từ số liệu, để tránh nội dung mỏng/trùng lặp giữa các trang (mục 11, kiến trúc kỹ
   * thuật — đúng lỗi nhieuxe.vn mắc phải). Chưa có field ACF tương ứng bên WordPress —
   * dời nhập liệu thật tới Ngày 24 giống các field khác; nếu thiếu, xem fallback
   * `comboDescriptionOrDefault()` trong lib/combo.ts.
   */
  comboDescription?: string;
}

/** Mô tả riêng cho 1 tổ hợp tuyến + loại xe (Ngày 14) — dùng ở trang /tuyen-duong/[slug]/[loai-xe]. */
export interface ComboDescription {
  vehicleType: string;
  description: string;
}

export interface Route {
  id: string;
  /** URL slug — chữ thường, không dấu, nối gạch ngang. Khớp với slug field của WordPress khi nối API thật (Ngày 12). */
  slug: string;
  from: string;
  to: string;
  time: string;
  distance: string;
  /** Giá từ — luôn bằng mức thấp nhất trong pricingByVehicle, dùng cho thẻ giá/danh sách. */
  price: string;
  vehicleTypes: string[];
  region: string;
  /**
   * Slug của term `province` (Ngày 25 — hub tỉnh). Dùng để dựng URL lồng
   * `/tuyen-duong/[regionSlug]/[slug]`, khớp slug của post `diem_den` tương ứng (xem
   * routeHref()/routeComboHref() bên dưới — LUÔN dùng 2 hàm này thay vì tự ráp chuỗi
   * `/tuyen-duong/${route.slug}` để không lệch nhau giữa các trang khi đổi cấu trúc URL).
   * Rỗng nếu route chưa gắn taxonomy `province` (dữ liệu nhập thiếu) — routeHref() tự
   * fallback về "khac" trong trường hợp đó, xem ghi chú tại hàm.
   */
  regionSlug: string;
  seatCount: string[];
  /** Giá riêng theo từng loại xe — khớp đúng repeater pricing_by_vehicle trong kiến trúc dữ liệu CPT route. */
  pricingByVehicle: VehiclePrice[];
  /** Điểm đón — mô tả ngắn, có thể nhiều điểm. */
  pickupPoints: string[];
  /** Điểm trả — mô tả ngắn, có thể nhiều điểm. */
  dropoffPoints: string[];
  /** URL nhúng Google Maps (placeholder cho tới khi có toạ độ thật từ ACF). */
  mapEmbedSrc: string;
  /** Mô tả ngắn riêng cho tuyến — bắt buộc viết tay, không nội suy từ số liệu, tránh nội dung mỏng/trùng lặp giữa các trang (mục 11, kiến trúc kỹ thuật). */
  summary: string;
  /** Dòng nhấn ngắn trên hero, ví dụ "Tuyến biển được yêu thích nhất miền Nam". */
  heroNote: string;
  /** Khung giờ khởi hành gợi ý. */
  departures: string[];
  /** Vài lưu ý/cam kết riêng cho tuyến. */
  notes: string[];
  /** `modified` thật từ WordPress (Ngày 23) — dùng cho nhãn "Cập nhật lần cuối" (mục 5, kiến trúc kỹ thuật). Rỗng ở dữ liệu mock. */
  modifiedDate?: string;
  /** Rank Math SEO title/description, expose qua snippet WPCode ID 15 (Ngày 23) — generateMetadata() ưu tiên 2 field này trước khi tự soạn. */
  rankMathTitle?: string;
  rankMathDescription?: string;
}

export interface FilterState {
  region: string;
  /** Khu vực cụ thể bên trong tỉnh đã chọn — khớp `route.to` (vd. "Vũng Tàu" trong tỉnh Bà Rịa - Vũng Tàu). */
  area: string;
  vehicleType: string;
  seats: string;
}

export const emptyFilters: FilterState = {
  region: "",
  area: "",
  vehicleType: "",
  seats: "",
};

export function hasActiveFilters(filters: FilterState) {
  return Boolean(filters.region || filters.area || filters.vehicleType || filters.seats);
}

/**
 * Dựng URL trang chi tiết 1 tuyến — Ngày 25: cấu trúc đổi từ `/tuyen-duong/[slug]` phẳng sang
 * `/tuyen-duong/[tinh]/[tuyen]` lồng theo hub tỉnh. TẤT CẢ nơi cần link tới trang tuyến phải
 * gọi hàm này (không tự ráp chuỗi) để khi cấu trúc URL đổi lần nữa chỉ cần sửa 1 chỗ.
 * Fallback "khac" chỉ xảy ra với dữ liệu lỗi (route chưa gắn `province`) — không nên gặp ở
 * dữ liệu thật vì taxonomy `province` bắt buộc khi tạo route (xem snippet WPCode ID 11).
 */
export function routeHref(route: { regionSlug: string; slug: string }): string {
  return `/tuyen-duong/${route.regionSlug || "khac"}/${route.slug}`;
}

/** Dựng URL trang kết hợp tuyến + loại xe (Ngày 14) — cùng nguyên tắc như routeHref() ở trên. */
export function routeComboHref(route: { regionSlug: string; slug: string }, vehicleSlug: string): string {
  return `${routeHref(route)}/${vehicleSlug}`;
}

/** Slug quy ước cho loại xe, dùng để link sang /loai-xe/[slug] (trang này ra mắt ở Ngày 13). */
export function vehicleTypeSlug(vehicleType: string): string {
  const map: Record<string, string> = {
    "4 chỗ": "4-cho",
    "7 chỗ": "7-cho",
    "16 chỗ": "16-cho",
    "29 chỗ": "29-cho",
    "45 chỗ": "45-cho",
    "Limousine": "limousine",
    // 2 mapping cũ giữ lại cho dữ liệu mock dự phòng (data/routes.ts) vẫn còn dùng nhãn gộp cũ.
    "4–7 chỗ": "4-7-cho",
    "16–29 chỗ": "16-29-cho",
  };
  return map[vehicleType] ?? vehicleType.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Mở rộng dữ liệu giá cũ đang gộp 4–7 và 16–29 chỗ,
 * để mỗi loại xe có URL chi tiết riêng.
 */
export function expandVehiclePrices(prices: VehiclePrice[]): VehiclePrice[] {
  const legacyGroups: Record<string, string[]> = {
    "4–7 chỗ": ["4 chỗ", "7 chỗ"],
    "16–29 chỗ": ["16 chỗ", "29 chỗ"],
  };

  const direct = prices.filter((price) => !legacyGroups[price.vehicleType]);
  const present = new Set(direct.map((price) => price.vehicleType));

  const expandedLegacy = prices.flatMap((price) =>
    (legacyGroups[price.vehicleType] ?? [])
      .filter((type) => !present.has(type))
      .map((type) => ({ ...price, vehicleType: type })),
  );

  const order = ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ", "Limousine"];

  return [...direct, ...expandedLegacy].sort(
    (a, b) => order.indexOf(a.vehicleType) - order.indexOf(b.vehicleType),
  );
}
