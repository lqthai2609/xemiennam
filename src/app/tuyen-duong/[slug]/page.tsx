import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetailPage } from "@/components/route-detail";
import { getRouteDetail, routeDetails } from "@/data/route-details";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return routeDetails.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = getRouteDetail(slug);
  if (!route) return { title: "Không tìm thấy tuyến | Xe Miền Nam" };
  return { title: `${route.from} → ${route.to} | Xe Miền Nam`, description: route.summary };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const route = getRouteDetail(slug);
  if (!route) notFound();
  const relatedRoutes = routeDetails.filter((item) => item.id !== route.id).slice(0, 2);
  return <RouteDetailPage route={route} relatedRoutes={relatedRoutes} />;
}
