import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComboLandingPage } from "@/components/route-vehicle-combo";
import { fetchRoutes, fetchRouteBySlug } from "@/lib/api/routes";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchPosts } from "@/lib/api/blog";
import { getVehicleCategory } from "@/data/vehicle-categories";
import {
  comboDescriptionOrDefault,
  findComboVehiclePrice,
  getComboIndexability,
  getRenderableComboVehicleSlugs,
} from "@/lib/combo";
import { buildPageMetadata } from "@/lib/metadata";
import { routeComboHref, routeHref } from "@/types/route";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbListSchema, buildFixedServiceOffers, buildServiceSchema } from "@/lib/schema";
import { resolveRouteContentReadiness } from "@/lib/content-readiness";
import { SITE_NAME } from "@/lib/site-config";
import { formatPublicLocationText, getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";

type Props = { params: Promise<{ tinh: string; tuyen: string; "loai-xe": string }> };

export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.flatMap((route) =>
    getRenderableComboVehicleSlugs(route).map((vehicleSlug) => ({
      tinh: route.regionSlug || "khac",
      tuyen: route.slug,
      "loai-xe": vehicleSlug,
    })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  const vp = route ? findComboVehiclePrice(route, loaiXe) : undefined;
  if (!route || !vp) {
    return buildPageMetadata({
      title: "Không tìm thấy",
      description: "Trang kết hợp tuyến và loại xe này không tồn tại hoặc hiện không khả dụng.",
      noIndex: true,
    });
  }

  const guard = getComboIndexability(route, loaiXe);
  const readiness = resolveRouteContentReadiness(route);
  const priceText = vp.pricingMode === "contact" ? "liên hệ báo giá" : `giá từ ${vp.price}`;
  return buildPageMetadata({
    title: `Thuê xe ${vp.vehicleType} đi ${getPublicRouteLabel(route, " – ")}, ${priceText} | ${SITE_NAME}`,
    description: formatPublicLocationText(comboDescriptionOrDefault(route, vp)),
    path: routeComboHref(route, loaiXe),
    noIndex: !guard.indexable || !readiness.indexable,
  });
}

export default async function Page({ params }: Props) {
  const { tinh, tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route || route.regionSlug !== tinh) notFound();
  const vp = findComboVehiclePrice(route, loaiXe);
  const category = getVehicleCategory(loaiXe);
  if (!vp || !category) notFound();

  const [allRoutes, vehicles, posts] = await Promise.all([fetchRoutes(), fetchVehicles(), fetchPosts()]);
  const similarRoutes = allRoutes
    .filter(
      (item) =>
        item.regionSlug === route.regionSlug &&
        item.slug !== route.slug &&
        Boolean(findComboVehiclePrice(item, loaiXe)),
    )
    .slice(0, 3);
  const vehicle =
    vehicles.find((item) => item.type === vp.vehicleType && item.images.length > 0) ||
    vehicles.find((item) => item.type === vp.vehicleType);
  const relatedPosts = posts
    .filter((post) => {
      const text = `${post.title} ${post.excerpt}`.toLowerCase();
      return (
        text.includes(route.to.toLowerCase()) ||
        text.includes(route.from.toLowerCase()) ||
        text.includes(route.region.toLowerCase()) ||
        text.includes(vp.vehicleType.toLowerCase())
      );
    })
    .slice(0, 3);
  const description = comboDescriptionOrDefault(route, vp);
  const guard = getComboIndexability(route, loaiXe);
  const readiness = resolveRouteContentReadiness(route);
  const serviceOffers = buildFixedServiceOffers([
    {
      name: `${vp.vehicleType} · ${vp.packageLabel || "Gói hành trình"} · ${getPublicRouteLabel(route)}`,
      mode: vp.pricingMode ?? "contact",
      price: vp.numericPrice,
    },
  ]);
  const serviceSchema = guard.indexable && readiness.serviceSchemaEligible ? buildServiceSchema({
    name: `Thuê xe ${vp.vehicleType.toLowerCase()} đi ${getPublicRouteLabel(route, " – ")}`,
    description: formatPublicLocationText(description),
    url: routeComboHref(route, loaiXe),
    areaServed: [getPublicLocationLabel(route.from), getPublicLocationLabel(route.to)],
    offers: readiness.offerSchemaEligible ? serviceOffers : undefined,
  }) : undefined;
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: getPublicLocationLabel(route.region), url: `/tuyen-duong/${route.regionSlug || "khac"}` },
    { name: getPublicRouteLabel(route), url: routeHref(route) },
    { name: vp.vehicleType, url: routeComboHref(route, loaiXe) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      {serviceSchema ? <JsonLd data={serviceSchema} /> : null}
      <ComboLandingPage
        route={route}
        vehiclePrice={vp}
        category={category}
        similarRoutes={similarRoutes}
        relatedPosts={relatedPosts}
        vehicle={vehicle}
      />
    </>
  );
}
