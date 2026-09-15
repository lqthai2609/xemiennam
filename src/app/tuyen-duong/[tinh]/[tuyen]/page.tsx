import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetailPage } from "@/components/route-detail";
import { fetchRoutes, fetchRouteBySlug, fetchRoutesByRegion } from "@/lib/api/routes";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchTestimonials } from "@/lib/api/testimonials";
import { fetchPostsByRegion } from "@/lib/api/blog";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbListSchema, buildFixedServiceOffers, buildServiceSchema } from "@/lib/schema";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { routeHref, type Route } from "@/types/route";

/** Ảnh đại diện theo loại xe (loại xe → images[0] của xe THẬT đầu tiên thuộc loại đó). */
async function buildVehicleImageByType(): Promise<Record<string, string>> {
  const vehicles = await fetchVehicles();
  const byType: Record<string, string> = {};
  for (const vehicle of vehicles) {
    if (!byType[vehicle.type] && vehicle.images[0]) byType[vehicle.type] = vehicle.images[0];
  }
  return byType;
}

function metadataPriceSuffix(route: Route): string {
  if (!route.pricingV2) return route.price && route.price !== "—" ? ` — giá từ ${route.price}` : "";
  const featured = route.pricingV2.outbound.featured;
  if (featured?.mode === "fixed" && featured.price) return ` — giá từ ${route.price}`;
  if (featured?.mode === "contact") return " — liên hệ báo giá";
  return "";
}

function fallbackRouteDescription(route: Route): string {
  const base = `Thuê xe nguyên chiếc tuyến ${route.from} – ${route.to}`;
  if (!route.pricingV2) return route.price && route.price !== "—" ? `${base}, giá từ ${route.price}.` : `${base}.`;
  const featured = route.pricingV2.outbound.featured;
  if (featured?.mode === "fixed" && featured.price) return `${base}, giá từ ${route.price}.`;
  if (featured?.mode === "contact") return `${base}, liên hệ để nhận báo giá theo lịch thực tế.`;
  return `${base}.`;
}

function buildRouteSchemaOffers(route: Route) {
  if (!route.pricingV2) return undefined;
  return buildFixedServiceOffers(
    [route.pricingV2.outbound, route.pricingV2.inbound].flatMap((direction) => {
      if (!direction.enabled) return [];
      return direction.packages.map((item) => ({
        name: `${item.vehicleType} · ${item.packageLabel} · ${item.direction === "outbound" ? `${route.from} → ${route.to}` : `${route.to} → ${route.from}`}`,
        mode: item.mode,
        price: item.price,
      }));
    }),
  );
}

type Props = { params: Promise<{ tinh: string; tuyen: string }> };

export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.map(({ slug, regionSlug }) => ({ tinh: regionSlug || "khac", tuyen: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tuyen } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route) return { title: `Không tìm thấy tuyến | ${SITE_NAME}` };

  const canonical = `${SITE_URL}${routeHref(route)}`;
  if (isPrelaunchAirportRoute(route)) {
    return {
      title: `Chuẩn bị tuyến xe ${route.from} ↔ ${route.to} | ${SITE_NAME}`,
      description: `Thông tin chuẩn bị tuyến ${route.from} ↔ ${route.to}. Liên hệ ${SITE_NAME} để ghi nhận nhu cầu; lịch khai thác sân bay thực tế cần đối chiếu thông báo chính thức.`,
      robots: { index: false, follow: true },
      alternates: { canonical },
    };
  }

  return {
    title: route.rankMathTitle || `Thuê xe ${route.from} đi ${route.to}${metadataPriceSuffix(route)} | ${SITE_NAME}`,
    description: route.rankMathDescription || route.summary || fallbackRouteDescription(route),
    alternates: { canonical },
  };
}

export default async function Page({ params }: Props) {
  const { tinh, tuyen } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route || route.regionSlug !== tinh) notFound();
  const isPrelaunch = isPrelaunchAirportRoute(route);

  const [regionRoutes, vehicleImageByType, allTestimonials, relatedPosts] = await Promise.all([
    fetchRoutesByRegion(route.regionSlug),
    buildVehicleImageByType(),
    fetchTestimonials(),
    fetchPostsByRegion(route.regionSlug, 3),
  ]);
  const relatedRoutes = regionRoutes.filter((item) => item.slug !== route.slug).slice(0, 6);
  const matchingTestimonials = allTestimonials.filter((item) => item.routeSlug === route.slug);
  const routeTestimonials = (matchingTestimonials.length > 0 ? matchingTestimonials : allTestimonials).slice(0, 6);
  const serviceSchema = isPrelaunch
    ? undefined
    : buildServiceSchema({
        name: `Thuê xe nguyên chiếc ${route.from} đi ${route.to}`,
        description: route.summary || fallbackRouteDescription(route),
        url: routeHref(route),
        areaServed: [route.from, route.to],
        offers: buildRouteSchemaOffers(route),
      });
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: route.region, url: `/tuyen-duong/${route.regionSlug || "khac"}` },
    { name: `${route.from} → ${route.to}`, url: routeHref(route) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      {serviceSchema ? <JsonLd data={serviceSchema} /> : null}
      <RouteDetailPage route={route} relatedRoutes={relatedRoutes} testimonials={routeTestimonials} relatedPosts={relatedPosts} vehicleImageByType={vehicleImageByType} />
    </>
  );
}
