import type { Route, RoutePricingDirectionKey, RoutePricingPackage } from "@/types/route";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";
import { getPublicLocationLabel } from "@/lib/public-location-label";

export function vehicleJourneyRows(route: Route, direction: RoutePricingDirectionKey, vehicleType: string): RoutePricingPackage[] {
  const pricing = route.pricingV2?.[direction];
  if (!pricing?.enabled) return [];
  return pricing.packages.filter((row) => row.vehicleType === vehicleType && row.mode !== "disabled");
}

export function vehicleJourneyChoices(routes: Route[], vehicleType: string) {
  return routes.flatMap((route) => {
    if (!canSuggestRelatedRoute(route)) return [];
    return (["outbound", "inbound"] as const).flatMap((direction) => {
      if (!vehicleJourneyRows(route, direction, vehicleType).length) return [];
      const from = direction === "outbound" ? route.from : route.to;
      const to = direction === "outbound" ? route.to : route.from;
      return [{ key: route.id + ":" + direction, route, direction, label: getPublicLocationLabel(from) + " đi " + getPublicLocationLabel(to) }];
    });
  });
}

export function vehicleJourneyPrice(row: RoutePricingPackage | undefined): "fixed" | "contact" | "disabled" {
  if (!row || row.mode === "disabled") return "disabled";
  return row.mode === "fixed" && typeof row.price === "number" && Number.isFinite(row.price) && row.price > 0 ? "fixed" : "contact";
}

/** Keep only the selected category's public context in the client payload. */
export function projectVehicleJourneyRoutes(routes: Route[], vehicleType: string): Route[] {
  return routes.filter((route) => canSuggestRelatedRoute(route) && (vehicleJourneyRows(route, "outbound", vehicleType).length || vehicleJourneyRows(route, "inbound", vehicleType).length))
    .map((route) => ({
      ...route, summary: "", heroNote: "", featuredImage: undefined, rankMathTitle: undefined, rankMathDescription: undefined,
      price: "", vehicleTypes: [vehicleType], seatCount: [], pricingByVehicle: [], comboDescriptions: [],
      pickupPoints: [], dropoffPoints: [], mapEmbedSrc: "", departures: [],
      pricingV2: route.pricingV2 ? {
        outbound: { ...route.pricingV2.outbound, packages: vehicleJourneyRows(route, "outbound", vehicleType), featured: route.pricingV2.outbound.featured?.vehicleType === vehicleType ? route.pricingV2.outbound.featured : undefined },
        inbound: { ...route.pricingV2.inbound, packages: vehicleJourneyRows(route, "inbound", vehicleType), featured: route.pricingV2.inbound.featured?.vehicleType === vehicleType ? route.pricingV2.inbound.featured : undefined },
      } : undefined,
    }));
}
