import type { Metadata } from "next";
import { DestinationsPage } from "@/components/destinations-page";
import { fetchDestinationCards } from "@/lib/api/diem-den";
import { fetchRoutes } from "@/lib/api/routes";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Điểm đến | Gocar VN",
  description: "Khám phá các khu vực và tuyến xe đang chạy cùng Gocar VN.",
  path: "/diem-den",
});

export default async function DestinationsRoute() {
  const [destinations, routes] = await Promise.all([fetchDestinationCards(), fetchRoutes()]);
  return <DestinationsPage destinations={destinations} routes={routes} />;
}
