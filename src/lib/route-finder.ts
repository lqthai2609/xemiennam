import type { Route } from "@/types/route";

export interface RouteFinderArea {
  /** Tên khu vực cụ thể trong tỉnh — khớp `route.to` (vd. "Vũng Tàu", "Long Hải"). */
  name: string;
  vehicleTypes: string[];
}

export interface RouteFinderProvince {
  regionSlug: string;
  /** Tên tỉnh/thành hiển thị — khớp `route.region` (term `province`). */
  region: string;
  areas: RouteFinderArea[];
}

/**
 * Dựng cây Điểm đến (tỉnh) → Khu vực (route.to) → Loại xe cho RouteFinderForm — form
 * "Tìm tuyến phù hợp" đặt dưới hero (trang chủ, /tuyen-duong, /diem-den). Hàm thuần, không
 * đụng dữ liệu server, nên dùng được cả ở component client lẫn server component cha.
 */
export function buildRouteFinderProvinces(routes: Route[]): RouteFinderProvince[] {
  const provinceMap = new Map<string, { region: string; areas: Map<string, Set<string>> }>();

  for (const route of routes) {
    if (!route.regionSlug || !route.to) continue;
    const province = provinceMap.get(route.regionSlug) ?? { region: route.region, areas: new Map<string, Set<string>>() };
    const vehicleSet = province.areas.get(route.to) ?? new Set<string>();
    for (const vehicleType of route.vehicleTypes) vehicleSet.add(vehicleType);
    province.areas.set(route.to, vehicleSet);
    provinceMap.set(route.regionSlug, province);
  }

  return Array.from(provinceMap.entries()).map(([regionSlug, { region, areas }]) => ({
    regionSlug,
    region,
    areas: Array.from(areas.entries()).map(([name, vehicleTypes]) => ({
      name,
      vehicleTypes: Array.from(vehicleTypes),
    })),
  }));
}
