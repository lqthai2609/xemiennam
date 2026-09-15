import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AirportHubPage } from "@/components/airport-hub-page";
import { fetchAirportHubBySlug } from "@/lib/api/airport-routes";
import { getAirportHubReadiness } from "@/lib/airport-readiness";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

type Props = { params: Promise<{ airportSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { airportSlug } = await params;
  const hub = await fetchAirportHubBySlug(airportSlug);
  if (!hub) return { title: `Không tìm thấy sân bay | ${SITE_NAME}` };

  const readiness = getAirportHubReadiness(hub.airport.slug);
  return {
    title:
      readiness.metadataTitle?.(hub.airport.name) ??
      `Xe Đưa Đón Sân Bay ${hub.airport.name} Đi Tỉnh | ${SITE_NAME}`,
    description:
      readiness.metadataDescription?.(hub.airport.name) ??
      `Thuê xe đưa đón sân bay ${hub.airport.name} đi các tỉnh và chiều về sân bay. Xe riêng có tài xế, nhiều loại xe, xem tuyến và liên hệ báo giá tại ${SITE_NAME}.`,
    alternates: { canonical: `${SITE_URL}/san-bay/${airportSlug}` },
  };
}

export default async function Page({ params }: Props) {
  const { airportSlug } = await params;
  const hub = await fetchAirportHubBySlug(airportSlug);
  if (!hub) notFound();
  return <AirportHubPage data={hub} />;
}
