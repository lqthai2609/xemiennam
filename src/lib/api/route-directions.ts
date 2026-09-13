import { fetchRawRouteBySlug, fetchRawRoutes, type WPRoute } from "./raw";

/**
 * Ngày 4 V2 — Route Pair / Direction model.
 *
 * Một post `route` là một Route Pair giữa 2 Location entity. Hai chiều outbound/inbound
 * là hai direction logic độc lập, không tạo thêm CPT direction để tránh nhân đôi route.
 * Pricing theo từng direction + vehicle + package được nối ở Ngày 5; module này chỉ chịu
 * trách nhiệm contract tuyến/chiều và giữ backward compatibility cho dữ liệu route cũ.
 */
export type RouteDirectionKey = "outbound" | "inbound";

export interface RouteDirectionV2 {
  key: RouteDirectionKey;
  enabled: boolean;
  originLocationId: number;
  destinationLocationId: number;
  /**
   * Key package được ưu tiên cho direction này. Ngày 4 chỉ lưu key dạng string;
   * enum/package contract thật được định nghĩa bởi Pricing Package Model V2 ở Ngày 5.
   */
  featuredPackage: string;
}

export interface RoutePairV2 {
  routeId: string;
  routeSlug: string;
  modelVersion: number;
  originLocationId: number;
  destinationLocationId: number;
  outbound: RouteDirectionV2;
  inbound: RouteDirectionV2;
  /**
   * true khi route chưa được migrate sang Location ID. Trong trạng thái này consumer phải
   * tiếp tục coi `diem_di` → `diem_den` legacy là outbound; tuyệt đối không tự tạo Location giả.
   */
  usesLegacyLocationFallback: boolean;
}

type WPRouteV2Meta = {
  route_model_version?: number | string;
  origin_location_id?: number | string;
  destination_location_id?: number | string;
  outbound_enabled?: boolean | number | string;
  outbound_featured_package?: string;
  inbound_enabled?: boolean | number | string;
  inbound_featured_package?: string;
};

function toLocationId(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
}

function toModelVersion(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1;
}

/**
 * Map REST meta sang Route Pair V2 mà không thay đổi object Route legacy đang được UI dùng.
 *
 * Backward compatibility cố ý:
 * - route cũ chưa có meta V2 => outbound=true, inbound=false;
 * - Location ID thiếu => 0 và usesLegacyLocationFallback=true;
 * - không đọc/ghi lại diem_di, diem_den hay pricing_by_vehicle.
 */
export function mapWPRouteToRoutePairV2(wp: WPRoute): RoutePairV2 {
  const meta = wp.meta as WPRoute["meta"] & WPRouteV2Meta;
  const originLocationId = toLocationId(meta.origin_location_id);
  const destinationLocationId = toLocationId(meta.destination_location_id);

  return {
    routeId: String(wp.id),
    routeSlug: wp.slug,
    modelVersion: toModelVersion(meta.route_model_version),
    originLocationId,
    destinationLocationId,
    outbound: {
      key: "outbound",
      enabled: toBoolean(meta.outbound_enabled, true),
      originLocationId,
      destinationLocationId,
      featuredPackage: meta.outbound_featured_package?.trim() ?? "",
    },
    inbound: {
      key: "inbound",
      enabled: toBoolean(meta.inbound_enabled, false),
      originLocationId: destinationLocationId,
      destinationLocationId: originLocationId,
      featuredPackage: meta.inbound_featured_package?.trim() ?? "",
    },
    usesLegacyLocationFallback: originLocationId === 0 || destinationLocationId === 0,
  };
}

/** Chọn đúng direction mà không để caller tự đảo origin/destination. */
export function getRouteDirectionV2(pair: RoutePairV2, direction: RouteDirectionKey): RouteDirectionV2 {
  return direction === "inbound" ? pair.inbound : pair.outbound;
}

/** Route đã sẵn sàng chạy thuần Location Model khi cả hai đầu đều là Location ID thật. */
export function isLocationBackedRoutePair(pair: RoutePairV2): boolean {
  return pair.originLocationId > 0 && pair.destinationLocationId > 0;
}

export async function fetchRoutePairsV2(): Promise<RoutePairV2[]> {
  const routes = await fetchRawRoutes();
  return routes.map(mapWPRouteToRoutePairV2);
}

export async function fetchRoutePairV2BySlug(slug: string): Promise<RoutePairV2 | undefined> {
  const route = await fetchRawRouteBySlug(slug);
  return route ? mapWPRouteToRoutePairV2(route) : undefined;
}
