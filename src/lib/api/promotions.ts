import type { Promotion } from "@/types/promotion";
import { formatDiscountLabel, isPromotionExpired } from "@/types/promotion";
import type { Route } from "@/types/route";
import type { Vehicle } from "@/types/vehicle";
import { promotions as mockPromotions } from "@/data/promotions";
import { fetchRawPromotions, type WPPromotion } from "./raw";
import { fetchRoutes } from "./routes";
import { fetchVehicles } from "./vehicles";
import { shouldUseMockFallback } from "./mock-fallback";
import { stripHtml } from "@/lib/wp";
import { formatPublicLocationText, getPublicRouteLabel } from "@/lib/public-location-label";

const useMockFallback = shouldUseMockFallback();

function mapWPPromotionToPromotion(wp: WPPromotion, routes: Route[], vehicles: Vehicle[]): Promotion {
  const discountType = wp.meta.loai_giam_gia ?? "phan_tram";
  const discountValue = wp.meta.gia_tri_giam ?? 0;
  const endDate = wp.meta.ngay_ket_thuc ?? "";

  const routeIds = (wp.meta.ap_dung_route ?? []).map(String);
  const routeLabels = routeIds.length
    ? routes.filter((route) => routeIds.includes(route.id)).map((route) => getPublicRouteLabel(route, " – "))
    : [];

  const vehicleIds = (wp.meta.ap_dung_vehicle ?? []).map(String);
  const vehicleTypeLabels = vehicleIds.length
    ? [...new Set(vehicles.filter((v) => vehicleIds.includes(v.id)).map((v) => v.type))]
    : [];

  return {
    id: String(wp.id),
    slug: wp.slug,
    name: formatPublicLocationText(wp.title.rendered),
    description: formatPublicLocationText(stripHtml(wp.content?.rendered)),
    discountType,
    discountValue,
    discountLabel: formatDiscountLabel(discountType, discountValue),
    startDate: wp.meta.ngay_bat_dau ?? "",
    endDate,
    isExpired: isPromotionExpired(endDate),
    routeLabels,
    vehicleTypeLabels,
  };
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const raw = await fetchRawPromotions();
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchPromotions] WP chưa có khuyến mãi nào — dùng dữ liệu mock theo policy môi trường.");
      return mockPromotions;
    }
    return [];
  }
  const [routes, vehicles] = await Promise.all([fetchRoutes(), fetchVehicles()]);
  return raw
    .map((wp) => mapWPPromotionToPromotion(wp, routes, vehicles))
    .sort((a, b) => Number(a.isExpired) - Number(b.isExpired));
}
