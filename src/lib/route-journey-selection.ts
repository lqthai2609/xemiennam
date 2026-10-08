import { availablePackages, packageMatches, type JourneyPackage } from "@/lib/route-package-capability";
import type { Route, RoutePricingDirectionKey } from "@/types/route";

export type JourneyQuery = Record<string, string | string[] | undefined>;
export type RouteJourneySelection = { direction: RoutePricingDirectionKey; journey: JourneyPackage };

/** Query selects public UI context only; it never authorizes a price or booking. */
export function resolveRouteJourneySelection(route: Route, query: JourneyQuery = {}, vehicleType?: string): RouteJourneySelection {
  const pricing = route.pricingV2;
  const requested = query.direction;
  const direction = (requested === "outbound" || requested === "inbound") && pricing?.[requested].enabled
    ? requested : pricing?.outbound.enabled ? "outbound" : pricing?.inbound.enabled ? "inbound" : "outbound";
  const rows = (pricing?.[direction].packages ?? []).filter((row) => !vehicleType || row.vehicleType === vehicleType);
  const available = availablePackages(rows);
  const key = typeof query.package === "string" ? query.package : query.trip_type === "round_trip" ? "round_trip_day" : undefined;
  const row = rows.find((item) => item.mode !== "disabled" && item.packageKey === key);
  const journey = row ? available.find((item) => packageMatches(row, item)) : query.trip_type === "round_trip" && available.includes("roundTrip") ? "roundTrip" : undefined;
  return { direction, journey: journey ?? available[0] ?? "oneWay" };
}

export function routeJourneyHref(path: string, direction: RoutePricingDirectionKey, packageKey?: string): string {
  const query = new URLSearchParams({ direction });
  if (packageKey) query.set("package", packageKey);
  return `${path}?${query.toString()}`;
}
