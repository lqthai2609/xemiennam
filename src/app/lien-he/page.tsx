import type { Metadata } from "next";
import { fetchRoutes, VEHICLE_TYPE_ORDER } from "@/lib/api/routes";
import { LienHePageClient } from "@/components/lien-he-page-client";

export const metadata: Metadata = {
  title: "Liên hệ đặt xe | Xe Miền Nam",
  description: "Gửi yêu cầu đặt xe hoặc liên hệ tư vấn — Xe Miền Nam phản hồi trong ít phút, hotline hỗ trợ 24/7.",
};

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật + fallback mock, Ngày 12) để lấy
 * danh sách tuyến thật cho select "Tuyến quan tâm" trong ContactBookingForm (Ngày 19), thay
 * vì hardcode 3 tuyến cứng như bản v0 xuất ra. onSubmit thật (gọi Route Handler /api/booking)
 * là việc của Ngày 20 — hiện tại LienHePageClient chỉ mô phỏng gửi thành công.
 */
export default async function Page() {
  const routes = await fetchRoutes();
  const routeOptions = [...new Set(routes.map((r) => `${r.from} – ${r.to}`))];
  return <LienHePageClient routeOptions={routeOptions} vehicleTypeOptions={VEHICLE_TYPE_ORDER} />;
}
