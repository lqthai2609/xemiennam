import { fetchLocationsV2, type LocationV2 } from "./locations";
import { fetchRoutePairsV2, type RouteDirectionKey, type RoutePairV2 } from "./route-directions";
import { fetchRoutes } from "./routes";
import { routeHref, type Route, type RoutePricingPackage } from "@/types/route";

export type AirportTravelDirection = "from_airport" | "to_airport";

export interface AirportHubRoute {
  route: Route;
  routePair: RoutePairV2;
  airport: LocationV2;
  counterpart: LocationV2;
  travelDirection: AirportTravelDirection;
  pricingDirection: RouteDirectionKey;
  from: string;
  to: string;
  href: string;
  featuredPrice?: RoutePricingPackage;
  priceLabel: string;
}

export interface AirportHubData {
  airport: LocationV2;
  routes: AirportHubRoute[];
  fromAirport: AirportHubRoute[];
  toAirport: AirportHubRoute[];
}

function featuredPriceForDirection(route: Route, direction: RouteDirectionKey) {
  return route.pricingV2?.[direction].featured;
}

function priceLabelForDirection(route: Route, direction: RouteDirectionKey): string {
  const pricing = route.pricingV2?.[direction];
  if (!pricing?.enabled) return "—";

  const featured = pricing.featured;
  if (!featured) return "Liên hệ báo giá";
  if (featured.mode === "fixed") return featured.priceLabel || "Liên hệ báo giá";
  if (featured.mode === "contact") return featured.contactText || "Liên hệ báo giá";
  return "—";
}

function buildAirportRoute(
  route: Route,
  pair: RoutePairV2,
  airport: LocationV2,
  counterpart: LocationV2,
  travelDirection: AirportTravelDirection,
  pricingDirection: RouteDirectionKey,
): AirportHubRoute {
  const from = travelDirection === "from_airport" ? airport.name : counterpart.name;
  const to = travelDirection === "from_airport" ? counterpart.name : airport.name;

  return {
    route,
    routePair: pair,
    airport,
    counterpart,
    travelDirection,
    pricingDirection,
    from,
    to,
    href: routeHref(route),
    featuredPrice: featuredPriceForDirection(route, pricingDirection),
    priceLabel: priceLabelForDirection(route, pricingDirection),
  };
}

function resolveAirportLocation(locations: LocationV2[], publicSlug: string): LocationV2 | undefined {
  const candidates = [publicSlug, `san-bay-${publicSlug}`];
  return locations.find(
    (location) => location.type === "airport" && candidates.includes(location.slug),
  );
}

/**
 * Day 17 — Airport Hub query layer.
 *
 * Airport vẫn là Location V2 bình thường. Hàm này chỉ ghép Location + Route Pair + Pricing V2
 * để consumer có thể dựng Airport Hub; không tạo route/pricing engine riêng.
 *
 * Public URL dùng slug ngắn như `/san-bay/tan-son-nhat`, trong khi Location CMS hiện có thể
 * dùng slug có tiền tố `san-bay-` (ví dụ `san-bay-tan-son-nhat`). Resolver chấp nhận cả hai
 * mà không đổi slug CMS hoặc tạo dữ liệu giả.
 */
export async function fetchAirportHubBySlug(airportSlug: string): Promise<AirportHubData | undefined> {
  const [locations, pairs, routes] = await Promise.all([
    fetchLocationsV2(),
    fetchRoutePairsV2(),
    fetchRoutes(),
  ]);

  const airport = resolveAirportLocation(locations, airportSlug);
  if (!airport) return undefined;

  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const routesBySlug = new Map(routes.map((route) => [route.slug, route]));
  const output: AirportHubRoute[] = [];

  for (const pair of pairs) {
    if (pair.usesLegacyLocationFallback) continue;

    const route = routesBySlug.get(pair.routeSlug);
    if (!route) continue;

    const origin = locationsById.get(pair.originLocationId);
    const destination = locationsById.get(pair.destinationLocationId);
    if (!origin || !destination) continue;

    if (pair.originLocationId === airport.id) {
      if (pair.outbound.enabled) {
        output.push(buildAirportRoute(route, pair, airport, destination, "from_airport", "outbound"));
      }
      if (pair.inbound.enabled) {
        output.push(buildAirportRoute(route, pair, airport, destination, "to_airport", "inbound"));
      }
      continue;
    }

    if (pair.destinationLocationId === airport.id) {
      if (pair.outbound.enabled) {
        output.push(buildAirportRoute(route, pair, airport, origin, "to_airport", "outbound"));
      }
      if (pair.inbound.enabled) {
        output.push(buildAirportRoute(route, pair, airport, origin, "from_airport", "inbound"));
      }
    }
  }

  output.sort((a, b) => {
    const directionOrder = a.travelDirection.localeCompare(b.travelDirection);
    if (directionOrder !== 0) return directionOrder;
    return a.counterpart.name.localeCompare(b.counterpart.name, "vi");
  });

  return {
    airport,
    routes: output,
    fromAirport: output.filter((item) => item.travelDirection === "from_airport"),
    toAirport: output.filter((item) => item.travelDirection === "to_airport"),
  };
}
