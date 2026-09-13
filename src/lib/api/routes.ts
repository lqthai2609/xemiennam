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
import { fetchLocationsV2, locationById, type LocationV2 } from "./locations";
import { shouldUseMockFallback } from "./mock-fallback";
import { formatPriceShort, splitCommaList } from "@/lib/wp";
import { buildRouteMapEmbedSrc } from "@/lib/maps";

const useMockFallback = shouldUseMockFallback();

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
          pricingMode: featured.mode === "contact" ? "contact" : "fixed",
          packageKey: featured.packageKey,
          packageLabel: pricingPackageLabel(featured.packageKey),
          numericPrice: featured.mode === "fixed" ? featured.price : undefined,
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

function resolveRouteEndpoints(wp: WPRoute, locations: Map<number, LocationV2>) {
  const pair = mapWPRouteToRoutePairV2(wp);
  const origin = pair.originLocationId > 0 ? locations.get(pair.originLocationId) : undefined;
  const destination = pair.destinationLocationId > 0 ? locations.get(pair.destinationLocationId) : undefined;
  const from = origin?.name || wp.meta.diem_di || "";
  const to = destination?.name || wp.meta.diem_den || "";

  return { pair, origin, destination, from, to };
}

function mapWPRouteToRoute(
  wp: WPRoute,
  rawVehicles: WPVehicle[],
  locations: Map<number, LocationV2>,
): Route {
  const pricingV2 = buildRoutePricingV2(wp, rawVehicles);
  const pricingByVehicle = buildLegacyPricingByVehicle(pricingV2);
  const vehicleTypes = pricingByVehicle.map((p) => p.vehicleType);
  const seatCount = vehicleTypes.filter((t) => t !== "Limousine");

  const { destination, from, to } = resolveRouteEndpoints(wp, locations);
  const provinceTerm = embeddedTerms(wp._embedded, "province")[0];
  const region = provinceTerm?.name ?? to;
  const regionSlug = provinceTerm?.slug ?? destination?.provinceSlug ?? "";
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
  const [rawRoutes, rawVehicles, locations] = await Promise.all([
    fetchRawRoutes(),
    fetchRawVehicles(),
    fetchLocationsV2(),
  ]);
  if (rawRoutes.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchRoutes] WP chưa có route nào — dùng dữ liệu mock theo policy môi trường.");
      return mockRoutes;
    }
    return [];
  }
  const locationsById = locationById(locations);
  return rawRoutes.map((wp) => mapWPRouteToRoute(wp, rawVehicles, locationsById));
}

export async function fetchRouteBySlug(slug: string): Promise<Route | undefined> {
  const wp = await fetchRawRouteBySlug(slug);
  if (wp) {
    const [rawVehicles, locations] = await Promise.all([fetchRawVehicles(), fetchLocationsV2()]);
    return mapWPRouteToRoute(wp, rawVehicles, locationById(locations));
  }
  if (useMockFallback) {
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

export async function fetchRoutesByRegion(regionSlug: string): Promise<Route[]> {
  const all = await fetchRoutes();
  return all.filter((route) => route.regionSlug === regionSlug);
}

export async function fetchRegionSlugs(): Promise<string[]> {
  const all = await fetchRoutes();
  return Array.from(new Set(all.map((route) => route.regionSlug).filter(Boolean)));
}
