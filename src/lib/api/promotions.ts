import type { Promotion } from "@/types/promotion";
import { formatDiscountLabel, isPromotionExpired } from "@/types/promotion";
import type { Route } from "@/types/route";
import type { Vehicle } from "@/types/vehicle";
import { promotions as mockPromotions } from "@/data/promotions";
import { fetchRawPromotions, type WPPromotion } from "./raw";
import { fetchRoutes } from "./routes";
import { fetchVehicles } from "./vehicles";
import { stripHtml } from "@/lib/wp";

/**
 * fetchPromotions() — Ngày 18.
 * Cùng chiến lược fallback mock như routes.ts/vehicles.ts/services.ts (Ngày 12/13): WP chưa
 * có bài `promotion` nào (nhập liệu thật dời tới Ngày 24/27), nên khi API trả về rỗng, dùng
 * lại data/promotions.ts. Đổi `useMockFallback` thành false để thấy đúng trạng thái CMS thật.
 */
const useMockFallback = true;

function mapWPPromotionToPromotion(wp: WPPromotion, routes: Route[], vehicles: Vehicle[]): Promotion {
  const discountType = wp.meta.loai_giam_gia ?? "phan_tram";
  const discountValue = wp.meta.gia_tri_giam ?? 0;
  const endDate = wp.meta.ngay_ket_thuc ?? "";

  // ap_dung_route/ap_dung_vehicle rỗng = áp dụng cho MỌI tuyến/loại xe (không phải lỗi thiếu dữ liệu) —
  // PromotionCard hiển thị "Tất cả tuyến"/"Mọi loại xe" cho trường hợp này.
  const routeIds = (wp.meta.ap_dung_route ?? []).map(String);
  const routeLabels = routeIds.length
    ? routes.filter((r) => routeIds.includes(r.id)).map((r) => `${r.from} – ${r.to}`)
    : [];

  const vehicleIds = (wp.meta.ap_dung_vehicle ?? []).map(String);
  const vehicleTypeLabels = vehicleIds.length
    ? [...new Set(vehicles.filter((v) => vehicleIds.includes(v.id)).map((v) => v.type))]
    : [];

  return {
    id: String(wp.id),
    slug: wp.slug,
    name: wp.title.rendered,
    description: stripHtml(wp.content?.rendered),
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
      console.warn("[fetchPromotions] WP chưa có khuyến mãi nào — dùng dữ liệu mock tạm (xem ghi chú trong promotions.ts).");
      return mockPromotions;
    }
    return [];
  }
  const [routes, vehicles] = await Promise.all([fetchRoutes(), fetchVehicles()]);
  return raw
    .map((wp) => mapWPPromotionToPromotion(wp, routes, vehicles))
    .sort((a, b) => Number(a.isExpired) - Number(b.isExpired)); // Đang áp dụng lên trước, hết hạn xuống cuối.
}
