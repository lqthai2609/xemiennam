import type { DiemDen, DestinationCard } from "@/types/diem-den";
import { fetchRawDiemDenBySlug, embeddedFeaturedImage, type WPDiemDen } from "./raw";
import { fetchRawDiemDen } from "./raw";
import { parseFaqItems, stripHtml } from "@/lib/wp";
import { fetchRoutes } from "./routes";

/**
 * fetchDiemDenBySlug() — Ngày 25.
 *
 * KHÔNG có fallback mock (khác routes.ts/blog.ts/vehicles.ts): hub tỉnh là nội dung biên tập
 * thuần tuý, không có "dữ liệu tối thiểu" hợp lý để bịa ra khi thiếu — nếu WP chưa có bài
 * `diem_den` cho 1 tỉnh, trang `/tuyen-duong/[tinh]` vẫn hoạt động bình thường (vẫn liệt kê
 * đủ tuyến trong tỉnh đó, xem app/tuyen-duong/[tinh]/page.tsx), chỉ là không có khối nội dung
 * mô tả + FAQ ở đầu trang. Component tự xử lý trường hợp `undefined` này.
 */
function mapWPDiemDenToDiemDen(wp: WPDiemDen): DiemDen {
  return {
    id: String(wp.id),
    slug: wp.slug,
    title: wp.title.rendered,
    contentHtml: wp.content.rendered,
    featuredImageUrl: embeddedFeaturedImage(wp._embedded),
    faqItems: parseFaqItems(wp.faq_items),
    modifiedDate: wp.modified,
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
  };
}

export async function fetchDiemDen(): Promise<DiemDen[]> {
  const items = await fetchRawDiemDen();
  return items.map(mapWPDiemDenToDiemDen);
}

export async function fetchDiemDenBySlug(slug: string): Promise<DiemDen | undefined> {
  const wp = await fetchRawDiemDenBySlug(slug);
  return wp ? mapWPDiemDenToDiemDen(wp) : undefined;
}

/**
 * fetchDestinationCards() — dữ liệu cho trang `/diem-den`.
 *
 * QUAN TRỌNG: nguồn dẫn danh sách PHẢI là `fetchRoutes()` (mọi tỉnh có ít nhất 1 tuyến),
 * không phải `fetchDiemDen()` (chỉ tỉnh đã có bài `diem_den`) — hiện chỉ 2/13 tỉnh có bài,
 * nếu lấy `fetchDiemDen()` làm nguồn dẫn thì 11 tỉnh còn lại (có tuyến thật, chỉ chưa có nội
 * dung hub) sẽ biến mất khỏi trang, dù vẫn truy cập được qua `/tuyen-duong/[tinh]` bình thường.
 * `fetchRawDiemDen()` chỉ dùng để LÀM GIÀU thêm (tên/ảnh/mô tả) cho tỉnh nào đã có bài, lấy
 * 1 lần duy nhất (không lặp fetchDiemDenBySlug() cho từng tỉnh, tránh N+1 request).
 */
export async function fetchDestinationCards(): Promise<DestinationCard[]> {
  const [routes, rawHubs] = await Promise.all([fetchRoutes(), fetchRawDiemDen()]);
  const hubBySlug = new Map(rawHubs.map((wp) => [wp.slug, wp]));

  const grouped = new Map<string, { name: string; count: number }>();
  for (const route of routes) {
    if (!route.regionSlug) continue;
    const entry = grouped.get(route.regionSlug);
    if (entry) entry.count += 1;
    else grouped.set(route.regionSlug, { name: route.region, count: 1 });
  }

  return Array.from(grouped.entries())
    .map(([slug, info]) => {
      const hub = hubBySlug.get(slug);
      return {
        slug,
        name: hub?.title.rendered || info.name,
        routeCount: info.count,
        blurb: hub ? stripHtml(hub.content.rendered).slice(0, 110) : `${info.count} tuyến đang chạy trong khu vực này.`,
        imageUrl: embeddedFeaturedImage(hub?._embedded),
      };
    })
    .sort((a, b) => b.routeCount - a.routeCount);
}
