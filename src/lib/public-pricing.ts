import type { Route, RouteDirectionPricing, RoutePricingPackage } from "@/types/route";

/** The owner's CMS "Có giá" selection is the public price switch for each tuple. */
function validFixed(row: RoutePricingPackage): boolean {
  return row.mode === "fixed"
    && typeof row.price === "number"
    && Number.isFinite(row.price)
    && row.price > 0;
}

function publicPackage(row: RoutePricingPackage): RoutePricingPackage {
  if (validFixed(row)) return row;
  if (row.mode === "disabled") return { ...row, price: undefined, priceLabel: undefined };
  return { ...row, mode: "contact", price: undefined, priceLabel: undefined, contactText: row.contactText || "Liên hệ báo giá" };
}

function publicDirection(direction: RouteDirectionPricing): RouteDirectionPricing {
  if (!direction.enabled) return { ...direction, packages: [], featured: undefined };
  return {
    ...direction,
    packages: direction.packages.map(publicPackage),
    featured: direction.featured ? publicPackage(direction.featured) : undefined,
  };
}

export function publicRouteWithCmsPricing(route: Route): Route {
  const outbound = route.pricingV2 ? publicDirection(route.pricingV2.outbound) : undefined;
  const inbound = route.pricingV2 ? publicDirection(route.pricingV2.inbound) : undefined;
  const featured = outbound?.featured;

  return {
    ...route,
    price: featured && validFixed(featured) ? featured.priceLabel ?? `${featured.price!.toLocaleString("vi-VN")} đ` : "Liên hệ báo giá",
    pricingByVehicle: route.pricingByVehicle.map((row) => {
      const matchingFixed = outbound?.packages.some((pkg) =>
        validFixed(pkg)
        && pkg.vehicleType === row.vehicleType
        && pkg.packageKey === row.packageKey
        && pkg.price === row.numericPrice,
      );
      return matchingFixed ? row : {
        ...row, price: "Liên hệ báo giá", pricingMode: "contact" as const, numericPrice: undefined,
      };
    }),
    pricingV2: outbound && inbound ? { outbound, inbound } : undefined,
    // Legacy SEO overrides may contain stale hand-entered prices unrelated to a CMS tuple.
    rankMathTitle: undefined,
    rankMathDescription: undefined,
  };
}
