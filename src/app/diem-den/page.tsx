import type { Metadata } from "next";
import { DestinationsPage } from "@/components/destinations-page";
import { fetchDestinationCards } from "@/lib/api/diem-den";

export const metadata: Metadata = {
  title: "Điểm đến | Xe Miền Nam",
  description: "Khám phá các khu vực và tuyến xe đang chạy cùng Xe Miền Nam.",
};

export default async function DestinationsRoute() {
  const destinations = await fetchDestinationCards();
  return <DestinationsPage destinations={destinations} />;
}
