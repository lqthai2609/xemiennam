import type { Metadata } from "next";
import { fetchVehicles } from "@/lib/api/vehicles";
import { FleetPageClient } from "@/components/fleet-page-client";

export const metadata: Metadata = {
  title: "Đội xe cho thuê nguyên chiếc 4–45 chỗ & Limousine | Xe Miền Nam",
  description: "Xem toàn bộ đội xe 4–7 chỗ, 16–29 chỗ, 45 chỗ và Limousine, lọc theo loại xe, số chỗ và hình thức tự lái/có tài xế.",
};

/**
 * Server Component — gọi fetchVehicles() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho FleetPageClient xử lý lọc client-side. ISR áp dụng qua revalidate trong wpFetch().
 */
export default async function FleetPage() {
  const vehicles = await fetchVehicles();
  return <FleetPageClient vehicles={vehicles} />;
}
