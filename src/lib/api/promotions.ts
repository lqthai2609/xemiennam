import "server-only";
import { PROMOTION_COMMERCIAL_ENABLED, promotionTupleKey } from "./promotion-model";
import { fetchRoutes } from "./routes";
import { getPublicRouteLabel, getPublicLocationLabel } from "@/lib/public-location-label";
import { routeComboHref, vehicleTypeSlug } from "@/types/route";
import { routeJourneyHref } from "@/lib/route-journey-selection";
import type { PromotionPriceView } from "@/types/promotion-price";

export interface PublicPromotionCard {
  id: string;
  routeLabel: string;
  vehicleLabel: string;
  packageLabel: string;
  href: string;
  view: PromotionPriceView;
}

/** Only selected, server-resolved tuple results. Never legacy CMS claims or demo data. */
export async function fetchPromotions(): Promise<PublicPromotionCard[]> {
  if (!PROMOTION_COMMERCIAL_ENABLED) return [];
  const routes = await fetchRoutes();
  return routes.flatMap((route) => (["outbound", "inbound"] as const).flatMap((direction) => {
    const pricing = route.pricingV2?.[direction];
    if (!pricing?.enabled) return [];
    return pricing.packages.flatMap((row) => {
      const view = row.promotionView;
      if (!view?.claim) return [];
      return [{ id: promotionTupleKey(view.tuple),
        routeLabel: direction === "outbound" ? getPublicRouteLabel(route, " – ") : `${getPublicLocationLabel(route.to)} – ${getPublicLocationLabel(route.from)}`,
        vehicleLabel: row.vehicleType, packageLabel: row.packageLabel,
        href: routeJourneyHref(routeComboHref(route, vehicleTypeSlug(row.vehicleType)), direction, row.packageKey), view }];
    });
  }));
}
