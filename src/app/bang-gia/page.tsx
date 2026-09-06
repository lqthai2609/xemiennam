import { fetchRoutes } from "@/lib/api/routes";
import { BangGiaPageClient } from "@/components/bang-gia-page-client";

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho BangGiaPageClient xử lý tìm kiếm client-side. ISR áp dụng qua revalidate trong
 * wpFetch(). route.pricingByVehicle đã được mapWPRouteToRoute() gộp sẵn từ đúng 1
 * nguồn (repeater pricing_by_vehicle qua src/lib/api/pricing.ts) — /bang-gia chỉ cần
 * đọc lại field này, không tự fetch/parse riêng (tránh lệch dữ liệu với các trang khác).
 */
export default async function BangGiaPage() {
  const routes = await fetchRoutes();
  return <BangGiaPageClient routes={routes} />;
}
