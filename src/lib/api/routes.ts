import type { Route, VehiclePrice } from "@/types/route";
import { routes as mockRoutes } from "@/data/routes";
import { fetchRawRoutes, fetchRawRouteBySlug, embeddedFeaturedImage, embeddedTermName, embeddedTerms, type WPRoute } from "./raw";
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
 *
 * Bugfix (xem fetchRouteBySlug bên dưới): fallback theo slug riêng lẻ chỉ còn kích hoạt khi
 * TOÀN BỘ danh mục route trên WP rỗng — không còn fallback khi 1 slug cụ thể không tìm thấy
 * trong khi WP đã có route khác, để tránh bài đã bị xoá thật vẫn "hồi sinh" bằng mock trùng slug.
 */
const useMockFallback = true;

// Thứ tự cố định để bảng giá/loại xe hiển thị nhất quán, khớp taxonomy vehicle_type.
// Export để /bang-gia (Ngày 15) dùng lại đúng thứ tự này, không định nghĩa trùng lần 2.
// Ngày 25: thêm 2 nhãn cũ "4–7 chỗ"/"16–29 chỗ" làm lưới an toàn tạm thời — vehicle post
// 37/38 trong WordPress chưa kịp retag sang taxonomy mới (bị chặn quota WPVibe giữa chừng),
// nên route.vehicleTypes vẫn đang trả về 2 tên cũ này. Không thêm vào đây thì bảng giá MẤT
// HẲN 2 cột đó thay vì chỉ hiển thị tạm theo tên cũ. Khi retag WP xong, 2 nhãn cũ tự động
// không còn route nào khớp nữa (present.has() trả false) → tự rụng khỏi bảng, không cần sửa
// lại dòng này lần 2.
export const VEHICLE_TYPE_ORDER = ["4 chỗ", "4–7 chỗ", "7 chỗ", "16 chỗ", "16–29 chỗ", "29 chỗ", "45 chỗ", "Limousine"];
function byVehicleTypeOrder(a: string, b: string) {
  return VEHICLE_TYPE_ORDER.indexOf(a) - VEHICLE_TYPE_ORDER.indexOf(b);
}

function mapWPRouteToRoute(wp: WPRoute, pricingRows: PricingRow[]): Route {
  const pricingByVehicle: VehiclePrice[] = pricingRows
    .filter((row) => row.vehicleType)
    .sort((a, b) => byVehicleTypeOrder(a.vehicleType, b.vehicleType))
    .map((row) => ({
      vehicleType: row.vehicleType,
      price: row.priceLabel,
      priceType: row.priceType,
    }));

  const vehicleTypes = pricingByVehicle.map((p) => p.vehicleType);
  const seatCount = vehicleTypes.filter((t) => t !== "Limousine");
  const cheapest = pricingRows.length
    ? pricingRows.reduce((min, row) => (row.price < min.price ? row : min))
    : null;

  const from = wp.meta.diem_di ?? "";
  const to = wp.meta.diem_den ?? "";
  const region = embeddedTermName(wp._embedded, "province") ?? to;
  // Ngày 25: slug của term province đầu tiên — dùng dựng URL hub `/tuyen-duong/[regionSlug]/...`
  // (xem routeHref() trong types/route.ts). Khác `region` (tên hiển thị) ở trên.
  const regionSlug = embeddedTerms(wp._embedded, "province")[0]?.slug ?? "";
  const featuredImage = embeddedFeaturedImage(
    wp._embedded as { "wp:featuredmedia"?: { source_url?: string; code?: string }[] } | undefined,
  );

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
    regionSlug,
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
    featuredImage,
    departures: wp.meta.khung_gio_hay_chon ?? [],
    notes: wp.meta.luu_y_tuyen ?? [],
    modifiedDate: wp.modified,
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
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
  if (wp) {
    const pricingTable = await getPricingTable();
    return mapWPRouteToRoute(wp, pricingForRoute(pricingTable, String(wp.id)));
  }
  if (useMockFallback) {
    // Bugfix: chỉ fallback về mock khi CẢ danh mục route trên WP đang rỗng (CMS chưa nhập gì).
    // Trước đây fallback theo từng slug riêng lẻ, nên xoá 1 route thật trùng slug mock (vd.
    // vung-tau, can-tho, da-lat) sẽ khiến trang "hồi sinh" bằng nội dung mock thay vì báo 404.
    const rawRoutes = await fetchRawRoutes();
    if (rawRoutes.length === 0) {
      return mockRoutes.find((route) => route.slug === slug);
    }
  }
  return undefined;
}

export async function fetchRelatedRoutes(currentSlug: string, count = 3): Promise<Route[]> {
  const all = await fetchRoutes();
  return all.filter((route) => route.slug !== currentSlug).slice(0, count);
}

/**
 * Các tuyến thuộc đúng 1 hub tỉnh (Ngày 25) — dùng cho trang `/tuyen-duong/[tinh]`.
 * Không gọi fetchRawRoutes() lọc riêng vì sẽ tính lại pricing 2 lần; lọc trên kết quả
 * fetchRoutes() đã map sẵn (Next.js request memoization gộp các lần gọi fetch giống hệt
 * nhau trong cùng 1 lượt render, nên gọi lại fetchRoutes() ở đây không tốn thêm request thật).
 */
export async function fetchRoutesByRegion(regionSlug: string): Promise<Route[]> {
  const all = await fetchRoutes();
  return all.filter((route) => route.regionSlug === regionSlug);
}

/** Danh sách slug tỉnh có ít nhất 1 tuyến — dùng cho generateStaticParams() của `/tuyen-duong/[tinh]`. */
export async function fetchRegionSlugs(): Promise<string[]> {
  const all = await fetchRoutes();
  return Array.from(new Set(all.map((route) => route.regionSlug).filter(Boolean)));
}
