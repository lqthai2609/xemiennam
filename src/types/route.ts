export interface VehiclePrice {
  vehicleType: string;
  price: string;
}

export interface Route {
  id: string;
  /** URL slug — chữ thường, không dấu, nối gạch ngang. Khớp với slug field của WordPress khi nối API thật (Ngày 12). */
  slug: string;
  from: string;
  to: string;
  time: string;
  distance: string;
  /** Giá từ — luôn bằng mức thấp nhất trong pricingByVehicle, dùng cho thẻ vé/danh sách. */
  price: string;
  vehicleTypes: string[];
  region: string;
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
}

export interface FilterState {
  region: string;
  vehicleType: string;
  seats: string;
}

export const emptyFilters: FilterState = {
  region: "",
  vehicleType: "",
  seats: "",
};

export function hasActiveFilters(filters: FilterState) {
  return Boolean(filters.region || filters.vehicleType || filters.seats);
}

/** Slug quy ước cho loại xe, dùng để link sang /loai-xe/[slug] (trang này ra mắt ở Ngày 13). */
export function vehicleTypeSlug(vehicleType: string): string {
  const map: Record<string, string> = {
    "4–7 chỗ": "4-7-cho",
    "16–29 chỗ": "16-29-cho",
    "45 chỗ": "45-cho",
    "Limousine": "limousine",
  };
  return map[vehicleType] ?? vehicleType.toLowerCase().replace(/\s+/g, "-");
}
