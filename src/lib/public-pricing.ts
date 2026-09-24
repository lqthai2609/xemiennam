import type { Route, RouteDirectionPricing, RoutePricingPackage } from "@/types/route";

// Owner-provided CMS evidence, 24 September 2026: Route 9056, outbound, vehicle 63,
// one-way, 850,000 VND. Fail closed if the stored value or tuple changes.
const publicPriceApprovals = [{
  routeId: "9056",
  direction: "outbound",
  vehicleId: "63",
  packageKey: "one_way",
  amount: 850_000,
}] as const;

function approvedFixedPrice(route: Route, row: RoutePricingPackage): boolean {
  return row.mode === "fixed"
    && typeof row.price === "number"
    && Number.isFinite(row.price)
    && publicPriceApprovals.some((approval) =>
      route.id === approval.routeId
      && row.direction === approval.direction
      && row.vehicleId === approval.vehicleId
      && row.packageKey === approval.packageKey
      && row.price === approval.amount,
    );
}

function publicPackage(route: Route, row: RoutePricingPackage): RoutePricingPackage {
  if (row.mode !== "fixed" || approvedFixedPrice(route, row)) return row;
  return { ...row, mode: "contact", price: undefined, priceLabel: undefined, contactText: "Liên hệ báo giá" };
}

function publicDirection(route: Route, direction: RouteDirectionPricing): RouteDirectionPricing {
  return {
    ...direction,
    packages: direction.packages.map((row) => publicPackage(route, row)),
    featured: direction.featured ? publicPackage(route, direction.featured) : undefined,
  };
}

export function publicRouteWithoutApprovedPrices(route: Route): Route {
  const approved = route.pricingV2?.outbound.enabled
    ? route.pricingV2.outbound.packages.find((row) => approvedFixedPrice(route, row))
    : undefined;
  return {
    ...route,
    price: approved?.priceLabel ?? "Liên hệ báo giá",
    pricingByVehicle: route.pricingByVehicle.map((row) => {
      const matchingApproved = approved
        && row.vehicleType === approved.vehicleType
        && row.packageKey === approved.packageKey
        && row.numericPrice === approved.price;
      return matchingApproved ? row : {
        ...row, price: "Liên hệ báo giá", pricingMode: "contact" as const, numericPrice: undefined,
      };
    }),
    pricingV2: route.pricingV2 ? {
      outbound: publicDirection(route, route.pricingV2.outbound),
      inbound: publicDirection(route, route.pricingV2.inbound),
    } : undefined,
    // Legacy SEO overrides may contain prices for unapproved tuples.
    rankMathTitle: undefined,
    rankMathDescription: undefined,
  };
}
