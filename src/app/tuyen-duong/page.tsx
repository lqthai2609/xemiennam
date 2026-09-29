import type { Metadata } from "next";
import { fetchRoutes } from "@/lib/api/routes";
import { RoutesPageClient } from "@/components/routes-page-client";
import { buildPageMetadata } from "@/lib/metadata";
import { HO_CHI_MINH_PUBLIC_LABEL } from "@/lib/public-location-label";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";

export const metadata: Metadata = buildPageMetadata({
  title: "Các tuyến cho thuê xe nguyên chiếc | Alo Đặt Xe",
  description: `Toàn bộ tuyến cho thuê xe nguyên chiếc ${HO_CHI_MINH_PUBLIC_LABEL} đi Vũng Tàu, Cần Thơ, Đà Lạt... lọc theo khu vực, loại xe và số chỗ.`,
  path: "/tuyen-duong",
});

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho RoutesPageClient xử lý lọc client-side. ISR áp dụng qua revalidate trong wpFetch().
 */
export default async function RoutesPage() {
  const routes = (await fetchRoutes()).filter(canSuggestRelatedRoute);
  return <RoutesPageClient routes={routes} />;
}
