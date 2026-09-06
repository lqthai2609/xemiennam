import { vehicleTypeSlug, type Route, type VehiclePrice } from "@/types/route";

/**
 * Trang kết hợp /tuyen-duong/[slug]/[loai-xe] — Ngày 14.
 * Nguồn dữ liệu DUY NHẤT vẫn là `route.pricingByVehicle` (đúng repeater pricing_by_vehicle
 * trong kiến trúc dữ liệu CPT route, mục 3 kiến trúc kỹ thuật) — trang này không thêm nguồn
 * dữ liệu mới, chỉ tìm đúng 1 dòng khớp slug loại xe trên URL.
 */

/** Tìm đúng dòng giá (VehiclePrice) trong 1 route khớp với slug loại xe trên URL. */
export function findComboVehiclePrice(route: Route, vehicleSlug: string): VehiclePrice | undefined {
  return route.pricingByVehicle.find((vp) => vehicleTypeSlug(vp.vehicleType) === vehicleSlug);
}

/**
 * Mô tả riêng cho tổ hợp tuyến + loại xe — ưu tiên nội dung biên tập tay
 * (vp.comboDescription, xem data/routes.ts). Chỉ sinh tạm khi thiếu (vd dữ liệu WP thật
 * chưa có field tương ứng — dời bổ sung ACF cho field này tới Ngày 24 giống các field khác).
 */
export function comboDescriptionOrDefault(route: Route, vp: VehiclePrice): string {
  return (
    vp.comboDescription ??
    `${route.summary} Giá thuê xe ${vp.vehicleType} tham khảo ${vp.price} cho tuyến ${route.from} – ${route.to}.`
  );
}
