import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetailPage } from "@/components/route-detail";
import { fetchRoutes, fetchRouteBySlug, fetchRelatedRoutes } from "@/lib/api/routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = await fetchRouteBySlug(slug);
  if (!route) return { title: "Không tìm thấy tuyến | Xe Miền Nam" };
  return {
    title: `Thuê xe ${route.from} đi ${route.to} — giá từ ${route.price} | Xe Miền Nam`,
    description: route.summary,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const route = await fetchRouteBySlug(slug);
  if (!route) notFound();
  const relatedRoutes = await fetchRelatedRoutes(route.slug, 3);
  return <RouteDetailPage route={route} relatedRoutes={relatedRoutes} />;
}
