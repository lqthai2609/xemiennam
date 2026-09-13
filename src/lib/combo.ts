import { vehicleTypeSlug, type Route, type VehiclePrice } from "@/types/route";

/**
 * Trang kết hợp /tuyen-duong/[slug]/[loai-xe] — Ngày 14.
 * Ngày 7: `route.pricingByVehicle` vẫn là compatibility surface cho trang combo, nhưng dữ liệu
 * route thật đã được derive từ Pricing V2 ở `lib/api/routes.ts`; component không parse pricing
 * meta riêng lần nữa.
 */

/** Tìm đúng dòng giá (VehiclePrice) trong 1 route khớp với slug loại xe trên URL. */
export function findComboVehiclePrice(route: Route, vehicleSlug: string): VehiclePrice | undefined {
  return route.pricingByVehicle.find((vp) => vehicleTypeSlug(vp.vehicleType) === vehicleSlug);
}

/**
 * Mô tả riêng cho tổ hợp tuyến + loại xe — ưu tiên nội dung biên tập tay.
 * Contact pricing dùng wording báo giá tự nhiên, không ghép chuỗi kiểu "giá tham khảo Liên hệ".
 */
export function comboDescriptionOrDefault(route: Route, vp: VehiclePrice): string {
  if (vp.comboDescription) return vp.comboDescription;

  const prefix = route.summary ? `${route.summary} ` : "";
  if (vp.pricingMode === "contact") {
    return `${prefix}Thuê xe ${vp.vehicleType} tuyến ${route.from} – ${route.to}; liên hệ để nhận báo giá theo lịch thực tế.`;
  }

  return `${prefix}Giá thuê xe ${vp.vehicleType} tham khảo ${vp.price} cho tuyến ${route.from} – ${route.to}.`;
}
