import { vehicleTypeSlug, type Route, type VehiclePrice } from "@/types/route";

/**
 * Trang kết hợp /tuyen-duong/[slug]/[loai-xe].
 * Pricing vẫn đi qua compatibility surface `route.pricingByVehicle`, còn nội dung Day 12
 * được lấy riêng từ `route.comboDescriptions` để không trộn content với business pricing.
 */

/** Tìm đúng dòng giá (VehiclePrice) trong 1 route khớp với slug loại xe trên URL. */
export function findComboVehiclePrice(route: Route, vehicleSlug: string): VehiclePrice | undefined {
  return route.pricingByVehicle.find((vp) => vehicleTypeSlug(vp.vehicleType) === vehicleSlug);
}

/**
 * Lấy nội dung biên tập riêng của route × vehicle.
 * Dữ liệu CMS mới được ưu tiên; `VehiclePrice.comboDescription` chỉ giữ compatibility
 * với mock/static data cũ và không phải nguồn production dài hạn.
 */
export function findComboDescription(route: Route, vp: VehiclePrice): string | undefined {
  const cmsDescription = route.comboDescriptions?.find((item) => item.vehicleType === vp.vehicleType)?.description.trim();
  if (cmsDescription) return cmsDescription;

  const legacyDescription = vp.comboDescription?.trim();
  return legacyDescription || undefined;
}

/**
 * Mô tả dùng để render khi CMS chưa có content riêng.
 * Fallback này chỉ bảo đảm trang không lỗi/không rỗng; nó KHÔNG được xem là nội dung unique
 * để quyết định indexability. Thin-content guard sẽ xử lý ở Day 14.
 */
export function comboDescriptionOrDefault(route: Route, vp: VehiclePrice): string {
  const editorialDescription = findComboDescription(route, vp);
  if (editorialDescription) return editorialDescription;

  const prefix = route.summary ? `${route.summary} ` : "";
  if (vp.pricingMode === "contact") {
    return `${prefix}Thuê xe ${vp.vehicleType} tuyến ${route.from} – ${route.to}; liên hệ để nhận báo giá theo lịch thực tế.`;
  }

  return `${prefix}Giá thuê xe ${vp.vehicleType} tham khảo ${vp.price} cho tuyến ${route.from} – ${route.to}.`;
}
