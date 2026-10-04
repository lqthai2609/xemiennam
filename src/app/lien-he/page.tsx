import type { Metadata } from "next";
import { fetchRoutes, VEHICLE_TYPE_ORDER } from "@/lib/api/routes";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";
import { LienHePageClient } from "@/components/lien-he-page-client";
import { buildPageMetadata } from "@/lib/metadata";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import "../home-redesign.css";
import "./contact-redesign.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Liên hệ đặt xe | Alo Đặt Xe",
  description: "Gửi yêu cầu đặt xe hoặc liên hệ tư vấn — Alo Đặt Xe phản hồi trong ít phút, hotline hỗ trợ 24/7.",
  path: "/lien-he",
});

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật + fallback mock, Ngày 12) để lấy
 * danh sách tuyến thật cho select "Tuyến quan tâm" trong ContactBookingForm (Ngày 19), thay
 * vì hardcode 3 tuyến cứng như bản v0 xuất ra. onSubmit thật đã nối Route Handler /api/booking
 * (Ngày 20) trong LienHePageClient.
 */
export default async function Page() {
  const routes = (await fetchRoutes()).filter(canSuggestRelatedRoute);
  const locationOptions = [...new Set(routes.flatMap((route) => [getPublicLocationLabel(route.from), getPublicLocationLabel(route.to)]))].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"));
  return <LienHePageClient locationOptions={locationOptions} vehicleTypeOptions={VEHICLE_TYPE_ORDER} />;
}
