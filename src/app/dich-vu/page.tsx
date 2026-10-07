import type { Metadata } from "next";
import { ServicesPage } from "@/components/services-page";
import { fetchServices } from "@/lib/api/services";
import { fetchVehicles } from "@/lib/api/vehicles";
import { vehicleTypeSlug } from "@/types/route";
import { fetchRoutes } from "@/lib/api/routes";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = buildPageMetadata({
  title: `Dịch vụ theo nhu cầu | ${SITE_NAME}`,
  description: "Chọn dịch vụ xe phù hợp với ngày vui, lịch bay, công việc và hành trình khám phá của bạn.",
  path: "/dich-vu",
});

/** Server Component — production dùng WordPress REST; mock chỉ theo policy môi trường. */
export default async function Page() {
  const [services, routes, vehicles] = await Promise.all([fetchServices(), fetchRoutes(), fetchVehicles()]);
  const vehicleImages: Record<string, string> = {};
  for (const vehicle of vehicles) {
    const type = vehicleTypeSlug(vehicle.type);
    if (!vehicleImages[type] && vehicle.images[0]) vehicleImages[type] = vehicle.images[0];
  }
  return <ServicesPage services={services} routes={routes} vehicleImages={vehicleImages} />;
}
