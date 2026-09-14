import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchRegionSlugs, fetchRoutesByRegion } from "@/lib/api/routes";
import { fetchDiemDenBySlug, getDestinationImageUrl } from "@/lib/api/diem-den";
import { DiemDenDetailPage } from "@/components/diem-den-detail";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema, buildFaqPageSchema } from "@/lib/schema";
import { stripHtml } from "@/lib/wp";

type Props = { params: Promise<{ tinh: string }> };

export async function generateStaticParams() {
  const slugs = await fetchRegionSlugs();
  return slugs.map((tinh) => ({ tinh }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tinh } = await params;
  const [hub, routes] = await Promise.all([fetchDiemDenBySlug(tinh), fetchRoutesByRegion(tinh)]);
  if (routes.length === 0 && !hub) return { title: "Không tìm thấy điểm đến | Gocar VN" };

  const regionName = routes[0]?.region || hub?.title || tinh;
  return {
    title: hub?.rankMathTitle || `Thuê xe nguyên chiếc đi ${regionName} | Gocar VN`,
    description:
      hub?.rankMathDescription ||
      (hub ? stripHtml(hub.contentHtml).slice(0, 155) : `Thuê xe nguyên chiếc đi khắp khu vực ${regionName}, ${routes.length} tuyến đang chạy, giá theo từng loại xe.`),
  };
}

export default async function Page({ params }: Props) {
  const { tinh } = await params;
  const [hub, routes] = await Promise.all([fetchDiemDenBySlug(tinh), fetchRoutesByRegion(tinh)]);
  if (routes.length === 0 && !hub) notFound();

  const regionName = routes[0]?.region || hub?.title || tinh;
  const description = hub
    ? stripHtml(hub.contentHtml).slice(0, 200)
    : `Thuê xe nguyên chiếc đi khắp khu vực ${regionName}, ${routes.length} tuyến đang chạy.`;

  const serviceSchema = buildServiceSchema({
    name: `Thuê xe nguyên chiếc đi ${regionName}`,
    description,
    url: `/tuyen-duong/${tinh}`,
    areaServed: regionName,
    providerName: "Gocar VN",
  });

  return (
    <>
      <JsonLd data={serviceSchema} />
      {hub && hub.faqItems.length > 0 && <JsonLd data={buildFaqPageSchema(hub.faqItems)} />}
      <DiemDenDetailPage
        regionName={regionName}
        hub={hub}
        routes={routes}
        heroImageUrl={getDestinationImageUrl(tinh, hub?.featuredImageUrl)}
      />
    </>
  );
}
