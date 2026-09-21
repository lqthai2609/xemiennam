import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchRegionSlugs, fetchRoutesByRegion } from "@/lib/api/routes";
import { fetchAirportConnectionsByProvinceSlug } from "@/lib/api/airport-routes";
import { fetchDiemDenBySlug, getDestinationImageUrl } from "@/lib/api/diem-den";
import { DiemDenDetailPage } from "@/components/diem-den-detail";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbListSchema, buildServiceSchema, buildFaqPageSchema } from "@/lib/schema";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site-config";
import { stripHtml } from "@/lib/wp";

type Props = { params: Promise<{ tinh: string }> };

export async function generateStaticParams() {
  const slugs = await fetchRegionSlugs();
  return slugs.map((tinh) => ({ tinh }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tinh } = await params;
  const [hub, routes] = await Promise.all([fetchDiemDenBySlug(tinh), fetchRoutesByRegion(tinh)]);
  if (routes.length === 0 && !hub) {
    return buildPageMetadata({
      title: "Không tìm thấy điểm đến",
      description: "Điểm đến này không tồn tại hoặc hiện chưa có dữ liệu tuyến phù hợp.",
      noIndex: true,
    });
  }

  const regionName = routes[0]?.region || hub?.title || tinh;
  return buildPageMetadata({
    title: hub?.rankMathTitle || `Thuê xe nguyên chiếc đi ${regionName} | ${SITE_NAME}`,
    description:
      hub?.rankMathDescription ||
      (hub ? stripHtml(hub.contentHtml).slice(0, 155) : `Thuê xe nguyên chiếc đi khắp khu vực ${regionName}, ${routes.length} tuyến đang chạy, giá theo từng loại xe.`),
    path: `/tuyen-duong/${tinh}`,
  });
}

export default async function Page({ params }: Props) {
  const { tinh } = await params;
  const [hub, routes, airportConnections] = await Promise.all([
    fetchDiemDenBySlug(tinh),
    fetchRoutesByRegion(tinh),
    fetchAirportConnectionsByProvinceSlug(tinh),
  ]);
  if (routes.length === 0 && !hub) notFound();

  const regionName = routes[0]?.region || hub?.title || tinh;
  const canonicalPath = `/tuyen-duong/${tinh}`;
  const description = hub
    ? stripHtml(hub.contentHtml).slice(0, 200)
    : `Thuê xe nguyên chiếc đi khắp khu vực ${regionName}, ${routes.length} tuyến đang chạy.`;

  const serviceSchema = buildServiceSchema({
    name: `Thuê xe nguyên chiếc đi ${regionName}`,
    description,
    url: canonicalPath,
    areaServed: regionName,
    providerName: SITE_NAME,
  });
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: regionName, url: canonicalPath },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={serviceSchema} />
      {hub && hub.faqItems.length > 0 && <JsonLd data={buildFaqPageSchema(hub.faqItems)} />}
      <DiemDenDetailPage
        regionName={regionName}
        hub={hub}
        routes={routes}
        airportConnections={airportConnections}
        heroImageUrl={getDestinationImageUrl(tinh, hub?.featuredImageUrl)}
      />
    </>
  );
}
