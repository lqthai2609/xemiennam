import type { Route, RoutePricingPackage } from "@/types/route";
import type { ServiceOfferCandidateInput } from "./schema";

export function promotionOfferCandidate(route: Route, row: RoutePricingPackage, name: string): ServiceOfferCandidateInput {
  return { name, mode: row.mode, price: row.price,
    tuple: { route_id: Number(route.id), direction: row.direction, vehicle_id: Number(row.vehicleId), package_key: row.packageKey },
    promotionView: row.promotionView };
}

export function firstPromotionExpiry(rows: RoutePricingPackage[]): string | undefined {
  const times = rows.flatMap((row) => row.promotionView?.claim ? [Date.parse(row.promotionView.claim.expiresAt)] : []);
  return times.length ? new Date(Math.min(...times)).toISOString() : undefined;
}
