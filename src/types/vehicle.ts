export type Vehicle = {
  id: string; slug: string; name: string;
  /** Trước Ngày 25 là union cứng 4 giá trị — nới thành string vì taxonomy vehicle_type
   * thật trong WordPress đã tách thành 6 loại (4/7/16/29/45 chỗ + Limousine, xem
   * data/vehicle-categories.ts) và có thể còn đổi tiếp, union cứng dễ lệch với dữ liệu thật. */
  type: string;
  seats: string; capacity: string; description: string; badge?: string;
  color: "sand" | "gold" | "navy" | "orange"; imageLabel: string;
  /**
   * Ảnh xe thật (Ngày 21b) — mảng URL, phần tử đầu dùng cho ảnh chính (thẻ danh sách + hero
   * chi tiết xe), phần tử 2/3 dùng cho 2 ô phụ trong gallery chi tiết xe nếu có. Mảng rỗng =
   * chưa có ảnh thật → các component tự fallback về icon đồ hoạ như trước Ngày 21b.
   * Nối từ wp.meta.gallery_anh (chuỗi URL cách nhau dấu phẩy, xem lib/api/vehicles.ts).
   */
  images: string[];
  features: string[]; driverIncluded: boolean;
  routePrices: { route: string; price: string; note: string }[];
  /** `modified` thật từ WordPress (Ngày 23) — nhãn "Cập nhật lần cuối". Rỗng ở dữ liệu mock. */
  modifiedDate?: string;
  /** Rank Math SEO title/description, expose qua snippet WPCode ID 15 (Ngày 23). */
  rankMathTitle?: string;
  rankMathDescription?: string;
};
export type VehicleFilters = { type: string; seats: string; driver: string };
export const emptyVehicleFilters: VehicleFilters = { type: "", seats: "", driver: "" };
export const vehicleTypes = ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ", "Limousine"];
export const seatOptions = ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ"];
export const driverOptions = ["Có tài xế", "Tự lái"];
export const hasVehicleFilters = (filters: VehicleFilters) => Boolean(filters.type || filters.seats || filters.driver);
export const matchesVehicleFilters = (vehicle: Vehicle, filters: VehicleFilters) => (!filters.type || vehicle.type === filters.type) && (!filters.seats || vehicle.seats === filters.seats) && (!filters.driver || (filters.driver === "Có tài xế" ? vehicle.driverIncluded : !vehicle.driverIncluded));
