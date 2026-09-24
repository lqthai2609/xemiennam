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
import { SITE_NAME } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import { routeHref, type Route } from "@/types/route";
import { resolveRouteContentReadiness, routeStructuredDataAllowed } from "@/lib/content-readiness";
import { formatPublicLocationText, getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";

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
  const base = `Thuê xe nguyên chiếc tuyến ${getPublicRouteLabel(route, " – ")}`;
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
        name: `${item.vehicleType} · ${item.packageLabel} · ${item.direction === "outbound" ? getPublicRouteLabel(route) : `${getPublicLocationLabel(route.to)} → ${getPublicLocationLabel(route.from)}`}`,
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
  if (!route) {
    return buildPageMetadata({
      title: "Không tìm thấy tuyến",
      description: "Tuyến xe này không tồn tại hoặc hiện không khả dụng.",
      noIndex: true,
    });
  }

  const canonicalPath = routeHref(route);
  const readiness = resolveRouteContentReadiness(route);
  const publicFrom = getPublicLocationLabel(route.from);
  const publicTo = getPublicLocationLabel(route.to);
  if (isPrelaunchAirportRoute(route)) {
    return buildPageMetadata({
      title: `Chuẩn bị tuyến xe ${publicFrom} ↔ ${publicTo} | ${SITE_NAME}`,
      description: `Thông tin chuẩn bị tuyến ${publicFrom} ↔ ${publicTo}. Liên hệ ${SITE_NAME} để ghi nhận nhu cầu; lịch khai thác sân bay thực tế cần đối chiếu thông báo chính thức.`,
      path: canonicalPath,
      noIndex: !readiness.indexable,
    });
  }

  return buildPageMetadata({
    title: formatPublicLocationText(route.rankMathTitle || `Thuê xe ${publicFrom} đi ${publicTo}${metadataPriceSuffix(route)} | ${SITE_NAME}`),
    description: formatPublicLocationText(route.rankMathDescription || route.summary || fallbackRouteDescription(route)),
    path: canonicalPath,
    noIndex: !readiness.indexable,
  });
}

export default async function Page({ params }: Props) {
  const { tinh, tuyen } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route || route.regionSlug !== tinh) notFound();
  const readiness = resolveRouteContentReadiness(route);
  const publicFrom = getPublicLocationLabel(route.from);
  const publicTo = getPublicLocationLabel(route.to);

  const [regionRoutes, vehicleImageByType, allTestimonials, relatedPosts] = await Promise.all([
    fetchRoutesByRegion(route.regionSlug),
    buildVehicleImageByType(),
    fetchTestimonials(),
    fetchPostsByRegion(route.regionSlug, 3),
  ]);
  const relatedRoutes = regionRoutes.filter((item) => item.slug !== route.slug).slice(0, 6);
  const matchingTestimonials = allTestimonials.filter((item) => item.routeSlug === route.slug);
  const routeTestimonials = (matchingTestimonials.length > 0 ? matchingTestimonials : allTestimonials).slice(0, 6);
  const serviceSchema = !readiness.serviceSchemaEligible
    ? undefined
    : buildServiceSchema({
        name: `Thuê xe nguyên chiếc ${publicFrom} đi ${publicTo}`,
        description: formatPublicLocationText(route.summary || fallbackRouteDescription(route)),
        url: routeHref(route),
        areaServed: [publicFrom, publicTo],
        offers: readiness.offerSchemaEligible ? buildRouteSchemaOffers(route) : undefined,
      });
  const structuredDataAllowed = routeStructuredDataAllowed(route, readiness);
  const breadcrumbSchema = structuredDataAllowed ? buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: getPublicLocationLabel(route.region), url: `/tuyen-duong/${route.regionSlug || "khac"}` },
    { name: getPublicRouteLabel(route), url: routeHref(route) },
  ]) : undefined;

  return (
    <>
      {breadcrumbSchema ? <JsonLd data={breadcrumbSchema} /> : null}
      {serviceSchema ? <JsonLd data={serviceSchema} /> : null}
      <RouteDetailPage route={route} relatedRoutes={relatedRoutes} testimonials={routeTestimonials} relatedPosts={relatedPosts} vehicleImageByType={vehicleImageByType} />
    </>
  );
}
