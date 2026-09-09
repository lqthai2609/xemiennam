import type { Metadata } from "next";
import { DestinationsPage } from "@/components/destinations-page";
import { fetchDestinationCards } from "@/lib/api/diem-den";
import { fetchRoutes } from "@/lib/api/routes";

export const metadata: Metadata = {
  title: "Điểm đến | Xe Miền Nam",
  description: "Khám phá các khu vực và tuyến xe đang chạy cùng Xe Miền Nam.",
};

export default async function DestinationsRoute() {
  const [destinations, routes] = await Promise.all([fetchDestinationCards(), fetchRoutes()]);
  return <DestinationsPage destinations={destinations} routes={routes} />;
}
