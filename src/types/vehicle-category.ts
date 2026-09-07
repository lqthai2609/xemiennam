import type { Vehicle } from "@/types/vehicle";

/**
 * Nội dung "loại xe" (Ngày 13) — mang tính cấu trúc/tĩnh, giống 4 thẻ trong FleetShowcase
 * ở trang chủ, KHÔNG lấy từ WordPress. Xe cụ thể, bảng giá theo tuyến, và dịch vụ phù hợp
 * thuộc loại này đều lấy từ dữ liệu thật (fetchVehicles()/getPricingTable()/fetchServices())
 * lọc theo `type` ngay tại trang — xem src/app/loai-xe/[slug]/page.tsx.
 *
 * Ngày 25: tách 4 loại cũ thành 6 loại thật khớp taxonomy vehicle_type trong WordPress
 * (4/7/16/29/45 chỗ + Limousine, xem data/vehicle-categories.ts). Thêm 3 field
 * shortDescription/driveOptions/startingPrice để khớp đúng thẻ danh sách loại xe
 * (VehicleCategoryIndex trong components/vehicle-type-landing.tsx).
 */
export type VehicleCategory = {
  /** Khớp đúng vehicleTypeSlug() trong types/route.ts — bắt buộc đồng bộ giữa 2 nơi. */
  slug: string;
  /** Dùng để lọc Vehicle[]/PricingRow[] theo đúng loại (so khớp chuỗi chính xác). */
  type: Vehicle["type"];
  label: string;
  title: string;
  /** Mô tả ngắn 1 dòng, hiển thị trên thẻ ở trang /loai-xe (danh sách). */
  shortDescription: string;
  description: string;
  color: Vehicle["color"];
  /** Hình thức thuê áp dụng cho loại xe này (vd ["Tự lái", "Có tài xế"]), hiển thị dạng badge trên thẻ. */
  driveOptions: string[];
  /** Giá khởi điểm hiển thị trên thẻ (vd "Từ 900.000đ/ngày") — chỉ mang tính tham khảo/marketing. */
  startingPrice: string;
  /**
   * Ảnh minh hoạ đại diện cho CẢ NHÓM loại xe (Ngày 21b) — khác `images` của 1 chiếc xe cụ
   * thể trong Vehicle, vì đây là nội dung tĩnh không gắn với 1 xe/1 bài WordPress nào. Để
   * trống (undefined) → fallback icon đồ hoạ như trước Ngày 21b.
   */
  imageUrl?: string;
  audience: string[];
  amenities: string[];
};
