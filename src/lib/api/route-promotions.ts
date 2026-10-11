import "server-only";
import { connection } from "next/server";
import { PROMOTION_COMMERCIAL_ENABLED } from "./promotion-model";
import { resolvePriceRulesWithPromotion } from "./promotion-pricing";
import { buildPromotionPriceView } from "./promotion-presentation";
import type { Route } from "@/types/route";
import type { WPRoute } from "./raw";
import type { LocationV2 } from "./locations";
import { resolveRouteContentReadiness } from "@/lib/content-readiness";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";

type SourceLoader = Parameters<typeof resolvePriceRulesWithPromotion>[1];
/** The private CMS source is deliberately not wired until its activation gates pass. */
export async function withRoutePromotionViews(route: Route, raw: WPRoute, locations: Map<number, LocationV2>, loadSource?: SourceLoader): Promise<Route> {
  if (!PROMOTION_COMMERCIAL_ENABLED || !route.pricingV2 || isPrelaunchAirportRoute(route)) return route;
  // No Full Route Cache for any response containing a time-dependent claim.
  await connection();
  const readiness = resolveRouteContentReadiness(route);
  const pricing = { ...route.pricingV2 };
  for (const direction of ["outbound", "inbound"] as const) {
    if (!pricing[direction].enabled) continue;
    const packages = await Promise.all(pricing[direction].packages.map(async (row) => {
      const tuple = { route_id: raw.id, direction, vehicle_id: Number(row.vehicleId), package_key: row.packageKey };
      const pickupId = direction === "outbound" ? route.originLocation?.id : route.destinationLocation?.id;
      const dropoffId = direction === "outbound" ? route.destinationLocation?.id : route.originLocation?.id;
      const evaluation = await resolvePriceRulesWithPromotion({ route: raw, direction, vehicleId: tuple.vehicle_id, packageKey: row.packageKey,
        pickup: pickupId ? locations.get(pickupId) : undefined, dropoff: dropoffId ? locations.get(dropoffId) : undefined }, loadSource);
      return { ...row, promotionView: buildPromotionPriceView(evaluation.promotion, {
        tuple, purpose: "base_catalog", mode: row.mode, amount: row.price, offerEligible: readiness.offerSchemaEligible,
      }, Date.now()) };
    }));
    pricing[direction] = { ...pricing[direction], packages };
  }
  return { ...route, pricingV2: pricing };
}
