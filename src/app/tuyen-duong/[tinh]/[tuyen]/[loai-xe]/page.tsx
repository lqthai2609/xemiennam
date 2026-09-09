import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComboLandingPage } from "@/components/route-vehicle-combo";
import { fetchRoutes, fetchRouteBySlug } from "@/lib/api/routes";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchPosts } from "@/lib/api/blog";
import { getVehicleCategory } from "@/data/vehicle-categories";
import { findComboVehiclePrice, comboDescriptionOrDefault } from "@/lib/combo";
import { routeComboHref, vehicleTypeSlug } from "@/types/route";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";

type Props = { params: Promise<{ tinh: string; tuyen: string; "loai-xe": string }> };

export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.flatMap((route) => route.pricingByVehicle.map((vp) => ({ tinh: route.regionSlug || "khac", tuyen: route.slug, "loai-xe": vehicleTypeSlug(vp.vehicleType) })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  const vp = route ? findComboVehiclePrice(route, loaiXe) : undefined;
  if (!route || !vp) return { title: "Không tìm thấy | Xe Miền Nam" };
  return { title: `Thuê xe ${vp.vehicleType} đi ${route.from} – ${route.to}, giá từ ${vp.price} | Xe Miền Nam`, description: comboDescriptionOrDefault(route, vp) };
}

export default async function Page({ params }: Props) {
  const { tinh, tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route || route.regionSlug !== tinh) notFound();
  const vp = findComboVehiclePrice(route, loaiXe);
  const category = getVehicleCategory(loaiXe);
  if (!vp || !category) notFound();

  const [allRoutes, vehicles, posts] = await Promise.all([fetchRoutes(), fetchVehicles(), fetchPosts()]);
  const similarRoutes = allRoutes.filter((item) => item.regionSlug === route.regionSlug && item.slug !== route.slug && item.pricingByVehicle.some((price) => price.vehicleType === vp.vehicleType)).slice(0, 3);
  const vehicle = vehicles.find((item) => item.type === vp.vehicleType && item.images.length > 0) || vehicles.find((item) => item.type === vp.vehicleType);
  const relatedPosts = posts.filter((post) => {
    const text = `${post.title} ${post.excerpt}`.toLowerCase();
    return text.includes(route.to.toLowerCase()) || text.includes(route.from.toLowerCase()) || text.includes(route.region.toLowerCase()) || text.includes(vp.vehicleType.toLowerCase());
  }).slice(0, 3);
  const description = comboDescriptionOrDefault(route, vp);
  const serviceSchema = buildServiceSchema({ name: `Thuê xe ${vp.vehicleType.toLowerCase()} đi ${route.from} – ${route.to}`, description, url: routeComboHref(route, loaiXe), areaServed: [route.from, route.to] });

  return <><JsonLd data={serviceSchema} /><ComboLandingPage route={route} vehiclePrice={vp} category={category} similarRoutes={similarRoutes} relatedPosts={relatedPosts} vehicle={vehicle} /></>;
}
