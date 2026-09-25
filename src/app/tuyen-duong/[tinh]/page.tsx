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
import { formatPublicLocationText, getPublicLocationLabel } from "@/lib/public-location-label";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";

type Props = { params: Promise<{ tinh: string }> };

export async function generateStaticParams() {
  const slugs = await fetchRegionSlugs();
  return slugs.map((tinh) => ({ tinh }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tinh } = await params;
  const [hub, regionRoutes] = await Promise.all([fetchDiemDenBySlug(tinh), fetchRoutesByRegion(tinh)]);
  const routes = regionRoutes.filter(canSuggestRelatedRoute);
  if (routes.length === 0 && !hub) {
    return buildPageMetadata({
      title: "Không tìm thấy điểm đến",
      description: "Điểm đến này không tồn tại hoặc hiện chưa có dữ liệu tuyến phù hợp.",
      noIndex: true,
    });
  }

  const regionName = routes[0]?.region || hub?.title || tinh;
  const publicRegionName = getPublicLocationLabel(regionName);
  return buildPageMetadata({
    title: formatPublicLocationText(hub?.rankMathTitle || `Thuê xe nguyên chiếc đi ${publicRegionName} | ${SITE_NAME}`),
    description:
      formatPublicLocationText(hub?.rankMathDescription ||
      (hub ? stripHtml(hub.contentHtml).slice(0, 155) : `Thuê xe nguyên chiếc đi khắp khu vực ${publicRegionName}, ${routes.length} tuyến đang chạy, giá theo từng loại xe.`)),
    path: `/tuyen-duong/${tinh}`,
  });
}

export default async function Page({ params }: Props) {
  const { tinh } = await params;
  const [hub, regionRoutes, airportConnections] = await Promise.all([
    fetchDiemDenBySlug(tinh),
    fetchRoutesByRegion(tinh),
    fetchAirportConnectionsByProvinceSlug(tinh),
  ]);
  const routes = regionRoutes.filter(canSuggestRelatedRoute);
  if (routes.length === 0 && !hub) notFound();

  const regionName = routes[0]?.region || hub?.title || tinh;
  const publicRegionName = getPublicLocationLabel(regionName);
  const canonicalPath = `/tuyen-duong/${tinh}`;
  const description = hub
    ? formatPublicLocationText(stripHtml(hub.contentHtml).slice(0, 200))
    : `Thuê xe nguyên chiếc đi khắp khu vực ${publicRegionName}, ${routes.length} tuyến đang chạy.`;

  const serviceSchema = buildServiceSchema({
    name: `Thuê xe nguyên chiếc đi ${publicRegionName}`,
    description,
    url: canonicalPath,
    areaServed: publicRegionName,
    providerName: SITE_NAME,
  });
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: publicRegionName, url: canonicalPath },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={serviceSchema} />
      {hub && hub.faqItems.length > 0 && <JsonLd data={buildFaqPageSchema(hub.faqItems.map((item) => ({
        question: formatPublicLocationText(item.question),
        answer: formatPublicLocationText(item.answer),
      })))} />}
      <DiemDenDetailPage
        regionName={publicRegionName}
        hub={hub}
        routes={routes}
        airportConnections={airportConnections}
        heroImageUrl={getDestinationImageUrl(tinh, hub?.featuredImageUrl)}
      />
    </>
  );
}
