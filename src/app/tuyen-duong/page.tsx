import type { Metadata } from "next";
import { fetchRoutes } from "@/lib/api/routes";
import { RoutesPageClient } from "@/components/routes-page-client";
import { buildPageMetadata } from "@/lib/metadata";
import { HO_CHI_MINH_PUBLIC_LABEL } from "@/lib/public-location-label";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";
import "../home-redesign.css";
import "./routes-redesign.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Các tuyến cho thuê xe nguyên chiếc | Alo Đặt Xe",
  description: `Khám phá tuyến xe riêng có tài xế từ ${HO_CHI_MINH_PUBLIC_LABEL} đi Vũng Tàu, Cần Thơ, Đà Lạt và các điểm đến khác. Tìm tuyến và xem giá chuyến xe.`,
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
