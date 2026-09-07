import type { Vehicle } from "@/types/vehicle";

/**
 * Nội dung "loại xe" (Ngày 13) — mang tính cấu trúc/tĩnh, giống 4 thẻ trong FleetShowcase
 * ở trang chủ, KHÔNG lấy từ WordPress. Xe cụ thể, bảng giá theo tuyến, và dịch vụ phù hợp
 * thuộc loại này đều lấy từ dữ liệu thật (fetchVehicles()/getPricingTable()/fetchServices())
 * lọc theo `type` ngay tại trang — xem src/app/loai-xe/[slug]/page.tsx.
 *
 * Quyết định Ngày 13: 4 term taxonomy `vehicle_type` thật trong WordPress để dành tạo ở
 * Ngày 24 cùng lúc với dữ liệu route/vehicle khác — chưa tạo trước, nên trang này không
 * fetch taxonomy, chỉ dùng đúng 4 mục cố định bên dưới.
 */
export type VehicleCategory = {
  /** Khớp đúng vehicleTypeSlug() trong types/route.ts — bắt buộc đồng bộ giữa 2 nơi. */
  slug: string;
  /** Dùng để lọc Vehicle[]/PricingRow[] theo đúng loại (so khớp chuỗi chính xác). */
  type: Vehicle["type"];
  label: string;
  title: string;
  description: string;
  color: Vehicle["color"];
  /**
   * Ảnh minh hoạ đại diện cho CẢ NHÓM loại xe (Ngày 21b) — khác `images` của 1 chiếc xe cụ
   * thể trong Vehicle, vì đây là nội dung tĩnh không gắn với 1 xe/1 bài WordPress nào. Để
   * trống (undefined) → fallback icon đồ hoạ như trước Ngày 21b.
   */
  imageUrl?: string;
  audience: string[];
  amenities: string[];
};
