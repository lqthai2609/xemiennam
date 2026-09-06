import { fetchRoutes } from "@/lib/api/routes";
import { RoutesPageClient } from "@/components/routes-page-client";

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho RoutesPageClient xử lý lọc client-side. ISR áp dụng qua revalidate trong wpFetch().
 */
export default async function RoutesPage() {
  const routes = await fetchRoutes();
  return <RoutesPageClient routes={routes} />;
}
