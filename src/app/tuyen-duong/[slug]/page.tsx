import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetailPage } from "@/components/route-detail";
import { routes, getRouteBySlug, getRelatedRoutes } from "@/data/routes";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return routes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = getRouteBySlug(slug);
  if (!route) return { title: "Không tìm thấy tuyến | Xe Miền Nam" };
  return {
    title: `Thuê xe ${route.from} đi ${route.to} — giá từ ${route.price} | Xe Miền Nam`,
    description: route.summary,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const route = getRouteBySlug(slug);
  if (!route) notFound();
  const relatedRoutes = getRelatedRoutes(route.slug, 3);
  return <RouteDetailPage route={route} relatedRoutes={relatedRoutes} />;
}
