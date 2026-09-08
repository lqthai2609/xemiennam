import type { DiemDen } from "@/types/diem-den";
import { fetchRawDiemDenBySlug, embeddedFeaturedImage, type WPDiemDen } from "./raw";
import { parseFaqItems } from "@/lib/wp";
import { fetchRawDiemDen } from "./raw";

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
