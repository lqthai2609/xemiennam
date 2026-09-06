import type { Metadata } from "next";
import { ServicesPage } from "@/components/services-page";
import { fetchServices } from "@/lib/api/services";

export const metadata: Metadata = {
  title: "Dịch vụ theo nhu cầu | Xe Miền Nam",
  description: "Chọn dịch vụ xe phù hợp với ngày vui, lịch bay, công việc và hành trình khám phá của bạn.",
};

/** Server Component — gọi fetchServices() (WP REST API thật + fallback mock, Ngày 13). */
export default async function Page() {
  const services = await fetchServices();
  return <ServicesPage services={services} />;
}
