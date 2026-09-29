import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AirportHubPage } from "@/components/airport-hub-page";
import { JsonLd } from "@/components/json-ld";
import { fetchAirportHubBySlug } from "@/lib/api/airport-routes";
import { fetchPostsByAirportLocationId } from "@/lib/api/blog";
import { getAirportHubReadiness } from "@/lib/airport-readiness";
import { airportDisplayName, airportHubHref } from "@/lib/airport-seo";
import { buildPageMetadata } from "@/lib/metadata";
import { buildBreadcrumbListSchema, buildFixedServiceOffers, buildServiceSchema } from "@/lib/schema";
import { SITE_NAME } from "@/lib/site-config";
import { getPublicLocationLabel } from "@/lib/public-location-label";

type Props = { params: Promise<{ airportSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { airportSlug } = await params;
  const hub = await fetchAirportHubBySlug(airportSlug);
  if (!hub) {
    return buildPageMetadata({
      title: "Không tìm thấy sân bay",
      description: "Trang sân bay này không tồn tại hoặc hiện chưa có dữ liệu phù hợp.",
      noIndex: true,
    });
  }

  const readiness = getAirportHubReadiness(hub.airport.slug);
  const airportName = airportDisplayName(hub.airport.name);
  const canonicalPath = airportHubHref(hub.airport.slug);
  return buildPageMetadata({
    title:
      readiness.metadataTitle?.(hub.airport.name) ??
      `Xe Đưa Đón ${airportName} Đi Tỉnh | ${SITE_NAME}`,
    description:
      readiness.metadataDescription?.(hub.airport.name) ??
      `Thuê xe đưa đón ${airportName} đi các tỉnh và chiều về sân bay. Xe riêng có tài xế, nhiều loại xe, xem tuyến và liên hệ báo giá tại ${SITE_NAME}.`,
    path: canonicalPath,
    noIndex: readiness.phase === "prelaunch",
  });
}

export default async function Page({ params }: Props) {
  const { airportSlug } = await params;
  const hub = await fetchAirportHubBySlug(airportSlug);
  if (!hub) notFound();

  const relatedPosts = await fetchPostsByAirportLocationId(hub.airport.id, 3);
  const readiness = getAirportHubReadiness(hub.airport.slug);
  const airportName = airportDisplayName(hub.airport.name);
  const canonicalPath = airportHubHref(hub.airport.slug);
  const breadcrumbSchema = readiness.phase === "live" ? buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: "Đưa đón sân bay", url: "/dich-vu/dua-don-san-bay" },
    { name: airportName, url: canonicalPath },
  ]) : undefined;

  const airportOffers = buildFixedServiceOffers(
    hub.routes.flatMap((item) => {
      const pricing = item.route.pricingV2?.[item.pricingDirection];
      if (!pricing?.enabled) return [];
      return pricing.packages.map((pkg) => ({
        name: `${pkg.vehicleType} · ${pkg.packageLabel} · ${getPublicLocationLabel(item.from)} → ${getPublicLocationLabel(item.to)}`,
        mode: pkg.mode,
        price: pkg.price,
      }));
    }),
  );
  const areaServed = Array.from(new Set(hub.routes.map((item) => getPublicLocationLabel(item.counterpart)))).sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
  const serviceSchema =
    readiness.phase === "live"
      ? buildServiceSchema({
          name: `Xe đưa đón ${airportName}`,
          description: `Dịch vụ xe riêng có tài xế đưa đón ${airportName} và các địa phương đang có tuyến trong hệ thống ${SITE_NAME}.`,
          url: canonicalPath,
          areaServed: areaServed.length > 0 ? areaServed : undefined,
          offers: airportOffers,
          serviceType: "Dịch vụ đưa đón sân bay",
        })
      : undefined;

  return (
    <>
      {breadcrumbSchema ? <JsonLd data={breadcrumbSchema} /> : null}
      {serviceSchema ? <JsonLd data={serviceSchema} /> : null}
      <AirportHubPage data={hub} relatedPosts={relatedPosts} />
    </>
  );
}
