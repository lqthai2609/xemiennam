import type { Route, RouteDirectionPricing, RoutePricingPackage } from "@/types/route";

/**
 * No route price has an Operations approval receipt yet. Preserve every stored tuple
 * for admin editing and booking history; publish only a contact-safe projection.
 * A future release must require approval for each exact route/direction/vehicle/package
 * tuple before exposing a fixed amount. Entering a number alone is not approval.
 */
function contactIfUnapproved(row: RoutePricingPackage): RoutePricingPackage {
  return row.mode === "fixed"
    ? { ...row, mode: "contact", price: undefined, priceLabel: undefined, contactText: "Liên hệ báo giá" }
    : row;
}

function publicDirection(direction: RouteDirectionPricing): RouteDirectionPricing {
  return {
    ...direction,
    packages: direction.packages.map(contactIfUnapproved),
    featured: direction.featured ? contactIfUnapproved(direction.featured) : undefined,
  };
}

export function publicRouteWithoutApprovedPrices(route: Route): Route {
  return {
    ...route,
    price: "Liên hệ báo giá",
    pricingByVehicle: route.pricingByVehicle.map((row) => ({
      ...row,
      price: "Liên hệ báo giá",
      pricingMode: "contact" as const,
      numericPrice: undefined,
    })),
    pricingV2: route.pricingV2 ? {
      outbound: publicDirection(route.pricingV2.outbound),
      inbound: publicDirection(route.pricingV2.inbound),
    } : undefined,
    // These fields can contain legacy hand-entered price claims without tuple approval.
    rankMathTitle: undefined,
    rankMathDescription: undefined,
  };
}
