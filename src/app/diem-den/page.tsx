import type { Metadata } from "next";
import { DestinationsPage, type DestinationCard } from "@/components/destinations-page";
import { fetchDiemDen } from "@/lib/api/diem-den";
import { fetchRoutes } from "@/lib/api/routes";

export const metadata: Metadata = {
  title: "Điểm đến | Xe Miền Nam",
  description: "Khám phá các khu vực và tuyến xe đang chạy cùng Xe Miền Nam.",
};

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export default async function DestinationsRoute() {
  const [destinations, routes] = await Promise.all([fetchDiemDen(), fetchRoutes()]);
  const cards: DestinationCard[] = destinations.map((destination) => ({
    slug: destination.slug,
    name: destination.title,
    routeCount: routes.filter((route) => route.regionSlug === destination.slug).length,
    blurb: destination.rankMathDescription || plainText(destination.contentHtml).slice(0, 170),
    imageUrl: destination.featuredImageUrl,
  }));

  return <DestinationsPage destinations={cards} />;
}
