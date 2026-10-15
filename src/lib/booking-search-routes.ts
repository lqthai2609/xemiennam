import type { Route, RoutePricingDirectionKey, RoutePricingMode } from "@/types/route";
import { canonicalLocationKey } from "@/lib/location-search";

/** The search form routes to a price page; it does not render or authorize prices. */
export type BookingSearchRoute = Pick<Route, "id" | "slug" | "regionSlug" | "from" | "to" | "vehicleTypes"> & {
  originLocation?: { type: string };
  destinationLocation?: { type: string };
  pricingByVehicle: { vehicleType: string }[];
  pricingV2?: Record<RoutePricingDirectionKey, {
    enabled: boolean;
    packages: { vehicleType: string; mode: RoutePricingMode }[];
  }>;
};

/** Project at the boundary, retaining route order and vehicle availability modes. */
export function projectBookingSearchRoutes(routes: Route[]): BookingSearchRoute[] {
  return routes.map((route) => ({
    id: route.id, slug: route.slug, regionSlug: route.regionSlug,
    from: route.from, to: route.to, vehicleTypes: route.vehicleTypes,
    pricingByVehicle: route.pricingByVehicle.map(({ vehicleType }) => ({ vehicleType })),
    ...(route.originLocation ? { originLocation: { type: route.originLocation.type } } : {}),
    ...(route.destinationLocation ? { destinationLocation: { type: route.destinationLocation.type } } : {}),
    ...(route.pricingV2 ? { pricingV2: {
      outbound: projectDirection(route.pricingV2.outbound),
      inbound: projectDirection(route.pricingV2.inbound),
    } } : {}),
  }));
}

function projectDirection(direction: NonNullable<Route["pricingV2"]>["outbound"]) {
  const seen = new Set<string>();
  return {
    enabled: direction.enabled,
    // Search only lists vehicle choices; repeated packages for the same mode/type
    // add no information. The destination price page still receives every package.
    packages: direction.packages.flatMap(({ vehicleType, mode }) => {
      const key = JSON.stringify([vehicleType, mode]);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ vehicleType, mode }];
    }),
  };
}

export type BookingSearchJourney = { route: BookingSearchRoute; direction: RoutePricingDirectionKey };
const journeyKey = (from: string, to: string) => JSON.stringify([from, to]);

/** First match wins, exactly as the previous ordered scan (outbound before inbound). */
export function buildBookingJourneyIndex(routes: BookingSearchRoute[]): ReadonlyMap<string, BookingSearchJourney> {
  const index = new Map<string, BookingSearchJourney>();
  for (const route of routes) {
    const from = canonicalLocationKey(route.from);
    const to = canonicalLocationKey(route.to);
    for (const direction of ["outbound", "inbound"] as const) {
      if (route.pricingV2 ? !route.pricingV2[direction].enabled : direction !== "outbound") continue;
      const key = direction === "outbound" ? journeyKey(from, to) : journeyKey(to, from);
      if (!index.has(key)) index.set(key, { route, direction });
    }
  }
  return index;
}

export function findBookingJourney(index: ReadonlyMap<string, BookingSearchJourney>, pickup: string, destination: string): BookingSearchJourney | undefined {
  const from = canonicalLocationKey(pickup);
  const to = canonicalLocationKey(destination);
  return !from || !to || from === to ? undefined : index.get(journeyKey(from, to));
}
