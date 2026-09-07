import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetailPage } from "@/components/route-detail";
import { fetchRoutes, fetchRouteBySlug, fetchRelatedRoutes } from "@/lib/api/routes";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.map(({ slug }) => ({ slug }));
}

/**
 * Ngày 23 — ưu tiên rankMathTitle/rankMathDescription (nhập tay trong Rank Math ở Ngày 24)
 * trước khi dùng title/description tự soạn từ dữ liệu route, đúng mục 5 kiến trúc kỹ thuật.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = await fetchRouteBySlug(slug);
  if (!route) return { title: "Không tìm thấy tuyến | Xe Miền Nam" };
  return {
    title: route.rankMathTitle || `Thuê xe ${route.from} đi ${route.to} — giá từ ${route.price} | Xe Miền Nam`,
    description: route.rankMathDescription || route.summary,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const route = await fetchRouteBySlug(slug);
  if (!route) notFound();
  const relatedRoutes = await fetchRelatedRoutes(route.slug, 3);
  const serviceSchema = buildServiceSchema({
    name: `Thuê xe nguyên chiếc ${route.from} đi ${route.to}`,
    description: route.summary || `Thuê xe nguyên chiếc tuyến ${route.from} – ${route.to}, giá từ ${route.price}.`,
    url: `/tuyen-duong/${route.slug}`,
    areaServed: [route.from, route.to],
  });
  return (
    <>
      <JsonLd data={serviceSchema} />
      <RouteDetailPage route={route} relatedRoutes={relatedRoutes} />
    </>
  );
}
