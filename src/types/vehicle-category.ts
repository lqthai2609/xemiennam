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
  audience: string[];
  amenities: string[];
};
