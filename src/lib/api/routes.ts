import type {
  PriceType,
  Route,
  RouteDirectionPricing,
  RoutePricingPackage,
  RoutePricingV2,
  VehiclePrice,
} from "@/types/route";
import { routes as mockRoutes } from "@/data/routes";
import {
  fetchRawRoutes,
  fetchRawRouteBySlug,
  fetchRawVehicles,
  embeddedFeaturedImage,
  embeddedTermName,
  embeddedTerms,
  type WPRoute,
  type WPVehicle,
} from "./raw";
import {
  getFeaturedPriceV2,
  mapWPRouteToPricingPackagesV2,
  pricingPackageLabel,
  type PricingPackageV2,
} from "./pricing-v2";
import { mapWPRouteToRoutePairV2, type RouteDirectionKey } from "./route-directions";
import { formatPriceShort, splitCommaList } from "@/lib/wp";
import { buildRouteMapEmbedSrc } from "@/lib/maps";

/**
 * fetchRoutes()/fetchRouteBySlug() — Ngày 12, chuyển consumer pricing sang V2 ở Ngày 7.
 *
 * FALLBACK MOCK: WordPress hiện chưa có bài `route` nào được nhập thật (nhập liệu dời tới
 * Ngày 24), nên trong giai đoạn này API sẽ trả về mảng rỗng — đó là kỳ vọng, không phải lỗi.
 * Để các trang không hiển thị trống, khi API trả về rỗng các hàm dưới đây dùng dữ liệu mock.
 */
const useMockFallback = true;

// Thứ tự cố định để bảng giá/loại xe hiển thị nhất quán, khớp taxonomy vehicle_type.
// Hai nhãn gộp cũ giữ làm lưới an toàn cho dữ liệu chưa retag hoàn tất.
export const VEHICLE_TYPE_ORDER = ["4 chỗ", "4–7 chỗ", "7 chỗ", "16 chỗ", "16–29 chỗ", "29 chỗ", "45 chỗ", "Limousine"];
function byVehicleTypeOrder(a: string, b: string) {
  const ai = VEHICLE_TYPE_ORDER.indexOf(a);
  const bi = VEHICLE_TYPE_ORDER.indexOf(b);
  return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
}

function legacyPriceTypeForPackage(packageKey: string): PriceType | undefined {
  if (packageKey === "one_way") return "one_way";
  if (packageKey === "round_trip_day") return "round_trip_same_day";
  if (packageKey === "2d1n") return "two_days_one_night";
  return undefined;
}

function buildVehicleTypeById(rawVehicles: WPVehicle[]): Map<string, string> {
  return new Map(
    rawVehicles.map((vehicle) => [
      String(vehicle.id),
      embeddedTermName(vehicle._embedded, "vehicle_type") ?? "",
    ]),
  );
}

function toPresentationPackage(
  row: PricingPackageV2,
  vehicleTypeById: Map<string, string>,
): RoutePricingPackage | undefined {
  const vehicleType = vehicleTypeById.get(row.vehicleId) ?? "";
  if (!vehicleType) return undefined;

  return {
    direction: row.direction,
    vehicleId: row.vehicleId,
    vehicleType,
    packageKey: row.packageKey,
    packageLabel: pricingPackageLabel(row.packageKey),
    mode: row.mode,
    price: row.mode === "fixed" ? row.price : undefined,
    priceLabel: row.mode === "fixed" && row.price ? formatPriceShort(row.price) : undefined,
    contactText: row.mode === "contact" ? row.contactText : undefined,
  };
}

function buildDirectionPricing(
  direction: RouteDirectionKey,
  enabled: boolean,
  featuredPackage: string,
  pricingRows: PricingPackageV2[],
  vehicleTypeById: Map<string, string>,
): RouteDirectionPricing {
  const rows = pricingRows.filter((row) => row.direction === direction && row.mode !== "disabled");
  const packages = rows
    .map((row) => toPresentationPackage(row, vehicleTypeById))
    .filter((row): row is RoutePricingPackage => Boolean(row));
  const featuredRow = enabled ? getFeaturedPriceV2(rows, featuredPackage) : undefined;
  const featured = featuredRow ? toPresentationPackage(featuredRow, vehicleTypeById) : undefined;

  return {
    key: direction,
    enabled,
    featuredPackage,
    packages,
    featured,
  };
}

/**
 * Adapter duy nhất từ Pricing Package V2 sang shape presentation của Route.
 * Component không đọc raw meta và không parse `pricing_by_vehicle` lần nữa.
 */
function buildRoutePricingV2(wp: WPRoute, rawVehicles: WPVehicle[]): RoutePricingV2 {
  const pair = mapWPRouteToRoutePairV2(wp);
  const pricingRows = mapWPRouteToPricingPackagesV2(wp);
  const vehicleTypeById = buildVehicleTypeById(rawVehicles);

  return {
    outbound: buildDirectionPricing(
      "outbound",
      pair.outbound.enabled,
      pair.outbound.featuredPackage,
      pricingRows,
      vehicleTypeById,
    ),
    inbound: buildDirectionPricing(
      "inbound",
      pair.inbound.enabled,
      pair.inbound.featuredPackage,
      pricingRows,
      vehicleTypeById,
    ),
  };
}

/**
 * Compatibility adapter cho các consumer cũ (`route.pricingByVehicle`).
 * Chỉ derive từ outbound Pricing V2; contact vẫn là một combination hợp lệ, disabled bị loại.
 */
function buildLegacyPricingByVehicle(pricingV2: RoutePricingV2): VehiclePrice[] {
  if (!pricingV2.outbound.enabled) return [];

  const byVehicle = new Map<string, RoutePricingPackage[]>();
  for (const row of pricingV2.outbound.packages) {
    const current = byVehicle.get(row.vehicleType) ?? [];
    current.push(row);
    byVehicle.set(row.vehicleType, current);
  }

  return Array.from(byVehicle.entries())
    .sort(([a], [b]) => byVehicleTypeOrder(a, b))
    .flatMap(([vehicleType, packages]) => {
      const rawRows: PricingPackageV2[] = packages.map((row) => ({
        routeId: "",
        routeSlug: "",
        direction: row.direction,
        vehicleId: row.vehicleId,
        packageKey: row.packageKey,
        mode: row.mode,
        price: row.price,
        contactText: row.contactText,
        source: "v2",
      }));
      const featured = getFeaturedPriceV2(rawRows, pricingV2.outbound.featuredPackage);
      if (!featured) return [];
      return [
        {
          vehicleType,
          price: featured.mode === "fixed" && featured.price ? formatPriceShort(featured.price) : "Liên hệ",
          priceType: legacyPriceTypeForPackage(featured.packageKey),
        },
      ];
    });
}

function routeFeaturedPriceLabel(pricingV2: RoutePricingV2): string {
  const featured = pricingV2.outbound.featured;
  if (!pricingV2.outbound.enabled || !featured) return "—";
  if (featured.mode === "fixed" && featured.price) return formatPriceShort(featured.price);
  if (featured.mode === "contact") return featured.contactText || "Liên hệ báo giá";
  return "—";
}

function mapWPRouteToRoute(wp: WPRoute, rawVehicles: WPVehicle[]): Route {
  const pricingV2 = buildRoutePricingV2(wp, rawVehicles);
  const pricingByVehicle = buildLegacyPricingByVehicle(pricingV2);
  const vehicleTypes = pricingByVehicle.map((p) => p.vehicleType);
  const seatCount = vehicleTypes.filter((t) => t !== "Limousine");

  const from = wp.meta.diem_di ?? "";
  const to = wp.meta.diem_den ?? "";
  const region = embeddedTermName(wp._embedded, "province") ?? to;
  const regionSlug = embeddedTerms(wp._embedded, "province")[0]?.slug ?? "";
  const featuredImage = embeddedFeaturedImage(
    wp._embedded as { "wp:featuredmedia"?: { source_url?: string; code?: string }[] } | undefined,
  );

  return {
    id: String(wp.id),
    slug: wp.slug,
    from,
    to,
    time: wp.meta.thoi_gian_di_chuyen ?? "",
    distance: wp.meta.khoang_cach_km ? `${wp.meta.khoang_cach_km} km` : "",
    price: routeFeaturedPriceLabel(pricingV2),
    vehicleTypes,
    region,
    regionSlug,
    seatCount,
    pricingByVehicle,
    pricingV2,
    pickupPoints: splitCommaList(wp.meta.diem_don),
    dropoffPoints: splitCommaList(wp.meta.diem_tra),
    mapEmbedSrc: wp.meta.google_maps_embed || buildRouteMapEmbedSrc(from, to),
    summary: wp.meta.tom_tat_ngan ?? "",
    heroNote: wp.meta.diem_nhan_hero ?? "",
    featuredImage,
    departures: wp.meta.khung_gio_hay_chon ?? [],
    notes: wp.meta.luu_y_tuyen ?? [],
    modifiedDate: wp.modified,
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
  };
}

export async function fetchRoutes(): Promise<Route[]> {
  const [rawRoutes, rawVehicles] = await Promise.all([fetchRawRoutes(), fetchRawVehicles()]);
  if (rawRoutes.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchRoutes] WP chưa có route nào — dùng dữ liệu mock tạm (xem ghi chú trong routes.ts).");
      return mockRoutes;
    }
    return [];
  }
  return rawRoutes.map((wp) => mapWPRouteToRoute(wp, rawVehicles));
}

export async function fetchRouteBySlug(slug: string): Promise<Route | undefined> {
  const wp = await fetchRawRouteBySlug(slug);
  if (wp) {
    const rawVehicles = await fetchRawVehicles();
    return mapWPRouteToRoute(wp, rawVehicles);
  }
  if (useMockFallback) {
    // Chỉ fallback về mock khi CẢ danh mục route trên WP đang rỗng.
    const rawRoutes = await fetchRawRoutes();
    if (rawRoutes.length === 0) {
      return mockRoutes.find((route) => route.slug === slug);
    }
  }
  return undefined;
}

export async function fetchRelatedRoutes(currentSlug: string, count = 3): Promise<Route[]> {
  const all = await fetchRoutes();
  return all.filter((route) => route.slug !== currentSlug).slice(0, count);
}

/** Các tuyến thuộc đúng 1 hub tỉnh (Ngày 25). */
export async function fetchRoutesByRegion(regionSlug: string): Promise<Route[]> {
  const all = await fetchRoutes();
  return all.filter((route) => route.regionSlug === regionSlug);
}

/** Danh sách slug tỉnh có ít nhất 1 tuyến — dùng cho generateStaticParams() của `/tuyen-duong/[tinh]`. */
export async function fetchRegionSlugs(): Promise<string[]> {
  const all = await fetchRoutes();
  return Array.from(new Set(all.map((route) => route.regionSlug).filter(Boolean)));
}
