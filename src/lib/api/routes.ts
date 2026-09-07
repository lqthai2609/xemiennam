import type { Route, VehiclePrice } from "@/types/route";
import { routes as mockRoutes } from "@/data/routes";
import { fetchRawRoutes, fetchRawRouteBySlug, embeddedTermName, type WPRoute } from "./raw";
import { getPricingTable, pricingForRoute, type PricingRow } from "./pricing";
import { splitCommaList } from "@/lib/wp";
import { buildRouteMapEmbedSrc } from "@/lib/maps";

/**
 * fetchRoutes()/fetchRouteBySlug() — Ngày 12.
 *
 * FALLBACK MOCK: WordPress hiện chưa có bài `route` nào được nhập thật (nhập liệu dời tới
 * Ngày 24), nên trong giai đoạn này API sẽ trả về mảng rỗng — đó là kỳ vọng, không phải lỗi.
 * Để các trang không hiển thị trống suốt 12 ngày còn lại, khi API trả về rỗng hoặc lỗi mạng,
 * các hàm dưới đây tự động dùng lại dữ liệu mock ở src/data/routes.ts. Khi Ngày 24 nhập dữ
 * liệu thật xong, fallback này tự động không còn kích hoạt nữa (API không còn rỗng) — không
 * cần sửa code gì thêm. Nếu bạn muốn tắt fallback ngay bây giờ để thấy đúng trạng thái CMS
 * thật, đổi `useMockFallback` thành false.
 */
const useMockFallback = true;

// Thứ tự cố định để bảng giá/loại xe hiển thị nhất quán, khớp taxonomy vehicle_type.
// Export để /bang-gia (Ngày 15) dùng lại đúng thứ tự này, không định nghĩa trùng lần 2.
export const VEHICLE_TYPE_ORDER = ["4–7 chỗ", "16–29 chỗ", "45 chỗ", "Limousine"];
function byVehicleTypeOrder(a: string, b: string) {
  return VEHICLE_TYPE_ORDER.indexOf(a) - VEHICLE_TYPE_ORDER.indexOf(b);
}

function mapWPRouteToRoute(wp: WPRoute, pricingRows: PricingRow[]): Route {
  const pricingByVehicle: VehiclePrice[] = pricingRows
    .filter((row) => row.vehicleType)
    .sort((a, b) => byVehicleTypeOrder(a.vehicleType, b.vehicleType))
    .map((row) => ({ vehicleType: row.vehicleType, price: row.priceLabel }));

  const vehicleTypes = pricingByVehicle.map((p) => p.vehicleType);
  const seatCount = vehicleTypes.filter((t) => t !== "Limousine");
  const cheapest = pricingRows.length
    ? pricingRows.reduce((min, row) => (row.price < min.price ? row : min))
    : null;

  const from = wp.meta.diem_di ?? "";
  const to = wp.meta.diem_den ?? "";
  const region = embeddedTermName(wp._embedded, "province") ?? to;

  return {
    id: String(wp.id),
    slug: wp.slug,
    from,
    to,
    time: wp.meta.thoi_gian_di_chuyen ?? "",
    distance: wp.meta.khoang_cach_km ? `${wp.meta.khoang_cach_km} km` : "",
    price: cheapest?.priceLabel ?? "",
    vehicleTypes,
    region,
    seatCount,
    pricingByVehicle,
    pickupPoints: splitCommaList(wp.meta.diem_don),
    dropoffPoints: splitCommaList(wp.meta.diem_tra),
    // Chưa có google_maps_embed thật (chờ nhập ACF-tương-đương Ngày 24) → dựng embed chỉ đường
    // tạm theo điểm đi/đến (Ngày 21, xem lib/maps.ts để biết vì sao không chỉ ghim 1 điểm).
    mapEmbedSrc: wp.meta.google_maps_embed || buildRouteMapEmbedSrc(from, to),
    // 4 field bổ sung snippet Ngày 12 (ID 20) — rỗng cho tới khi snippet được kích hoạt + nhập liệu Ngày 24.
    summary: wp.meta.tom_tat_ngan ?? "",
    heroNote: wp.meta.diem_nhan_hero ?? "",
    departures: wp.meta.khung_gio_hay_chon ?? [],
    notes: wp.meta.luu_y_tuyen ?? [],
  };
}

export async function fetchRoutes(): Promise<Route[]> {
  const [rawRoutes, pricingTable] = await Promise.all([fetchRawRoutes(), getPricingTable()]);
  if (rawRoutes.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchRoutes] WP chưa có route nào — dùng dữ liệu mock tạm (xem ghi chú trong routes.ts).");
      return mockRoutes;
    }
    return [];
  }
  return rawRoutes.map((wp) => mapWPRouteToRoute(wp, pricingForRoute(pricingTable, String(wp.id))));
}

export async function fetchRouteBySlug(slug: string): Promise<Route | undefined> {
  const wp = await fetchRawRouteBySlug(slug);
  if (!wp) {
    if (useMockFallback) return mockRoutes.find((route) => route.slug === slug);
    return undefined;
  }
  const pricingTable = await getPricingTable();
  return mapWPRouteToRoute(wp, pricingForRoute(pricingTable, String(wp.id)));
}

export async function fetchRelatedRoutes(currentSlug: string, count = 3): Promise<Route[]> {
  const all = await fetchRoutes();
  return all.filter((route) => route.slug !== currentSlug).slice(0, count);
}
