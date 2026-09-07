import type { Metadata } from "next";
import { fetchRoutes } from "@/lib/api/routes";
import { RoutesPageClient } from "@/components/routes-page-client";

export const metadata: Metadata = {
  title: "Các tuyến cho thuê xe nguyên chiếc | Xe Miền Nam",
  description: "Toàn bộ tuyến cho thuê xe nguyên chiếc TP.HCM đi Vũng Tàu, Cần Thơ, Đà Lạt... lọc theo khu vực, loại xe và số chỗ.",
};

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho RoutesPageClient xử lý lọc client-side. ISR áp dụng qua revalidate trong wpFetch().
 */
export default async function RoutesPage() {
  const routes = await fetchRoutes();
  return <RoutesPageClient routes={routes} />;
}
