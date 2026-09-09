import type { Metadata } from "next";
import { ServicesPage } from "@/components/services-page";
import { fetchServices } from "@/lib/api/services";
import { fetchRoutes } from "@/lib/api/routes";

export const metadata: Metadata = {
  title: "Dịch vụ theo nhu cầu | Xe Miền Nam",
  description: "Chọn dịch vụ xe phù hợp với ngày vui, lịch bay, công việc và hành trình khám phá của bạn.",
};

/** Server Component — gọi fetchServices() (WP REST API thật + fallback mock, Ngày 13). */
export default async function Page() {
  const [services, routes] = await Promise.all([fetchServices(), fetchRoutes()]);
  return <ServicesPage services={services} routes={routes} />;
}
