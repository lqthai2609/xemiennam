import { formatPriceShort } from "@/lib/wp";
import { routeComboHref, type Route, type RoutePricingPackage } from "@/types/route";
import { getPublicRouteLabel, getPublicLocationLabel } from "@/lib/public-location-label";
import { routeJourneyHref } from "@/lib/route-journey-selection";
import type { PromotionPriceView } from "@/types/promotion-price";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";

export type VehicleCategoryRoutePrice = {
  route: string;
  price: string;
  note: string;
  href: string;
  vehicleId: string;
  direction: "outbound" | "inbound";
  packageKey: string;
  packageLabel: string;
  promotionView?: PromotionPriceView;
};

function pickPackage(rows: RoutePricingPackage[], featuredPackage: string): RoutePricingPackage | undefined {
  const enabled = rows.filter((row) => row.mode !== "disabled");
  if (enabled.length === 0) return undefined;

  const preferred = enabled.filter((row) => row.packageKey === featuredPackage);
  const preferredFixed = preferred
    .filter((row) => row.mode === "fixed" && typeof row.price === "number" && row.price > 0)
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
  if (preferredFixed) return preferredFixed;

  const preferredContact = preferred.find((row) => row.mode === "contact");
  if (preferredContact) return preferredContact;

  const fixed = enabled
    .filter((row) => row.mode === "fixed" && typeof row.price === "number" && row.price > 0)
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
  if (fixed) return fixed;

  return enabled.find((row) => row.mode === "contact");
}

/** Same Pricing V2 rows as route pages, with exact vehicle, direction and package links. */
export function buildVehicleCategoryRoutePrices(
  routes: Route[],
  vehicleType: string,
  vehicleSlug: string,
): VehicleCategoryRoutePrice[] {
  return routes.flatMap((route) => {
    if (!canSuggestRelatedRoute(route)) return [];
    return (["outbound", "inbound"] as const).flatMap((direction) => {
      const pricing = route.pricingV2?.[direction];
      if (!pricing?.enabled) return [];
      const packageRow = pickPackage(pricing.packages.filter((row) => row.vehicleType === vehicleType), pricing.featuredPackage);
      if (!packageRow) return [];
      const price = packageRow.mode === "fixed" && typeof packageRow.price === "number" && Number.isFinite(packageRow.price) && packageRow.price > 0
        ? formatPriceShort(packageRow.price) : packageRow.contactText || "Liên hệ báo giá";
      return [{
        route: direction === "outbound" ? getPublicRouteLabel(route) : getPublicLocationLabel(route.to) + " – " + getPublicLocationLabel(route.from),
        price, note: packageRow.packageLabel,
        href: routeJourneyHref(routeComboHref(route, vehicleSlug), direction, packageRow.packageKey),
        vehicleId: packageRow.vehicleId, direction, packageKey: packageRow.packageKey,
        packageLabel: packageRow.packageLabel, promotionView: packageRow.promotionView,
      }];
    });
  });
}

/** Giá khởi điểm cho card loại xe, lấy từ fixed outbound Pricing V2 thay vì hard-code. */
export function getVehicleCategoryStartingPrice(routes: Route[], vehicleType: string): string | undefined {
  const rows = routes.flatMap((route) => {
    if (!canSuggestRelatedRoute(route)) return [];
    const outbound = route.pricingV2?.outbound;
    if (!outbound?.enabled) return [];
    return outbound.packages.filter((row) => row.vehicleType === vehicleType && row.mode !== "disabled");
  });

  const fixedPrices = rows
    .filter((row) => row.mode === "fixed" && typeof row.price === "number" && row.price > 0)
    .map((row) => row.price as number);

  if (fixedPrices.length > 0) {
    return `Từ ${formatPriceShort(Math.min(...fixedPrices))}`;
  }

  if (rows.some((row) => row.mode === "contact")) return "Liên hệ báo giá";
  return undefined;
}
