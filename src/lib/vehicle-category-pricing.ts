import { formatPriceShort } from "@/lib/wp";
import { routeComboHref, type Route, type RoutePricingPackage } from "@/types/route";
import { getPublicRouteLabel } from "@/lib/public-location-label";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";

export type VehicleCategoryRoutePrice = {
  route: string;
  price: string;
  note: string;
  href: string;
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

/**
 * Day 13: bảng giá trên trang loại xe phải đọc Pricing V2 đã normalize trên Route.
 * Chỉ dùng outbound ở surface này để giữ cùng ngữ nghĩa với route-combo URL hiện tại;
 * inbound vẫn được hiển thị/chọn ở route detail theo contract Day 11.
 */
export function buildVehicleCategoryRoutePrices(
  routes: Route[],
  vehicleType: string,
  vehicleSlug: string,
): VehicleCategoryRoutePrice[] {
  return routes.flatMap((route) => {
    if (!canSuggestRelatedRoute(route)) return [];
    const outbound = route.pricingV2?.outbound;
    if (!outbound?.enabled) return [];

    const packageRow = pickPackage(
      outbound.packages.filter((row) => row.vehicleType === vehicleType),
      outbound.featuredPackage,
    );
    if (!packageRow) return [];

    const price =
      packageRow.mode === "fixed" && typeof packageRow.price === "number" && packageRow.price > 0
        ? formatPriceShort(packageRow.price)
        : packageRow.contactText || "Liên hệ báo giá";

    return [
      {
        route: getPublicRouteLabel(route),
        price,
        note: `${packageRow.packageLabel} · Giá tham khảo, thay đổi theo mùa/lễ`,
        href: routeComboHref(route, vehicleSlug),
      },
    ];
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
