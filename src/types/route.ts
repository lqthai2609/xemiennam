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
  /** Ngày 7: context Pricing V2 cho combo/bảng giá; route mock cũ có thể không có. */
  pricingMode?: "fixed" | "contact";
  packageKey?: string;
  packageLabel?: string;
  numericPrice?: number;
  /**
   * Compatibility cho mock/static data cũ. Route thật ưu tiên `Route.comboDescriptions`
   * làm nguồn content riêng của tổ hợp tuyến + loại xe.
   */
  comboDescription?: string;
}

/**
 * Ngày 7 — presentation contract cho consumer Pricing V2.
 * Giữ riêng khỏi kiểu dữ liệu REST/raw để component không phải hiểu schema WordPress.
 */
export type RoutePricingDirectionKey = "outbound" | "inbound";
export type RoutePricingMode = "fixed" | "contact" | "disabled";

export interface RoutePricingPackage {
  direction: RoutePricingDirectionKey;
  vehicleId: string;
  vehicleType: string;
  packageKey: string;
  packageLabel: string;
  mode: RoutePricingMode;
  price?: number;
  priceLabel?: string;
  contactText?: string;
}

export interface RouteDirectionPricing {
  key: RoutePricingDirectionKey;
  enabled: boolean;
  featuredPackage: string;
  packages: RoutePricingPackage[];
  featured?: RoutePricingPackage;
}

export interface RoutePricingV2 {
  outbound: RouteDirectionPricing;
  inbound: RouteDirectionPricing;
}

/** Day 12: nội dung biên tập riêng cho đúng một route × vehicle. */
export interface ComboDescription {
  vehicleId: string;
  vehicleType: string;
  description: string;
}

export interface RouteLocationRef {
  id: number;
  name: string;
  slug: string;
  type: string;
}

export interface Route {
  id: string;
  /** URL slug — chữ thường, không dấu, nối gạch ngang. Khớp với slug field của WordPress khi nối API thật (Ngày 12). */
  slug: string;
  from: string;
  to: string;
  time: string;
  distance: string;
  /** Giá đại diện outbound dùng cho card/list legacy. Ngày 7 derive từ Pricing V2. */
  price: string;
  vehicleTypes: string[];
  region: string;
  /** Slug của term `province` dùng dựng URL hub tỉnh. */
  regionSlug: string;
  seatCount: string[];
  /** Adapter compatibility cho consumer cũ, derive từ outbound Pricing V2. */
  pricingByVehicle: VehiclePrice[];
  /** Pricing V2 đầy đủ theo direction × vehicle × package. Mock route cũ có thể chưa có. */
  pricingV2?: RoutePricingV2;
  /** Day 12: content CMS riêng cho route × vehicle, độc lập với Pricing V2. */
  comboDescriptions?: ComboDescription[];
  /** Location Model V2 endpoints, when the route is backed by Location IDs. */
  originLocation?: RouteLocationRef;
  destinationLocation?: RouteLocationRef;
  /** Điểm đón — mô tả ngắn, có thể nhiều điểm. */
  pickupPoints: string[];
  /** Điểm trả — mô tả ngắn, có thể nhiều điểm. */
  dropoffPoints: string[];
  /** URL nhúng Google Maps (placeholder cho tới khi có toạ độ thật từ ACF). */
  mapEmbedSrc: string;
  /** Mô tả ngắn riêng cho tuyến. */
  summary: string;
  /** Dòng nhấn ngắn trên hero. */
  heroNote: string;
  /** Ảnh đại diện của bài route trong WordPress. */
  featuredImage?: string;
  /** Khung giờ khởi hành gợi ý. */
  departures: string[];
  /** Vài lưu ý/cam kết riêng cho tuyến. */
  notes: string[];
  /** `modified` thật từ WordPress. */
  modifiedDate?: string;
  /** Rank Math SEO title/description. */
  rankMathTitle?: string;
  rankMathDescription?: string;
}

/** Nhãn phía trên giá card/list: contact không được hiện thành "Giá từ Liên hệ". */
export function routePriceKicker(route: Pick<Route, "pricingV2">): string {
  if (!route.pricingV2) return "Giá từ";
  return route.pricingV2.outbound.featured?.mode === "fixed" ? "Giá từ" : "Báo giá";
}

export interface FilterState {
  region: string;
  /** Khu vực cụ thể bên trong tỉnh đã chọn — khớp `route.to`. */
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

/** Dựng URL trang chi tiết 1 tuyến. */
export function routeHref(route: { regionSlug: string; slug: string }): string {
  return `/tuyen-duong/${route.regionSlug || "khac"}/${route.slug}`;
}

/** Dựng URL trang kết hợp tuyến + loại xe. */
export function routeComboHref(route: { regionSlug: string; slug: string }, vehicleSlug: string): string {
  return `${routeHref(route)}/${vehicleSlug}`;
}

/** Slug quy ước cho loại xe, dùng để link sang /loai-xe/[slug]. */
export function vehicleTypeSlug(vehicleType: string): string {
  const map: Record<string, string> = {
    "4 chỗ": "4-cho",
    "7 chỗ": "7-cho",
    "16 chỗ": "16-cho",
    "29 chỗ": "29-cho",
    "45 chỗ": "45-cho",
    "Limousine": "limousine",
    "4–7 chỗ": "4-7-cho",
    "16–29 chỗ": "16-29-cho",
  };
  return map[vehicleType] ?? vehicleType.toLowerCase().replace(/\s+/g, "-");
}
