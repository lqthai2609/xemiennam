import { fetchVehicles } from "@/lib/api/vehicles";
import { FleetPageClient } from "@/components/fleet-page-client";

/**
 * Server Component — gọi fetchVehicles() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho FleetPageClient xử lý lọc client-side. ISR áp dụng qua revalidate trong wpFetch().
 */
export default async function FleetPage() {
  const vehicles = await fetchVehicles();
  return <FleetPageClient vehicles={vehicles} />;
}
