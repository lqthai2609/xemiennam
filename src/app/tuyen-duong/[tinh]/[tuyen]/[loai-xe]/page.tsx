import type { Metadata } from "next";
import "../../../../home-redesign.css";
import "./combo-redesign.css";
import { notFound } from "next/navigation";
import { ComboLandingPage } from "@/components/route-vehicle-combo";
import { fetchRoutes, fetchRouteBySlug } from "@/lib/api/routes";
import { fetchVehicles } from "@/lib/api/vehicles";
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
import { promotionOfferCandidate, firstPromotionExpiry } from "@/lib/promotion-schema";
import { availablePackages, findVehiclePackage } from "@/lib/route-package-capability";
import { buildBreadcrumbListSchema, buildFixedServiceOffers, buildServiceSchema } from "@/lib/schema";
import { canSuggestRelatedRoute, resolveRouteContentReadiness, routeStructuredDataAllowed } from "@/lib/content-readiness";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";
import { SITE_NAME } from "@/lib/site-config";
import { formatPublicLocationText, getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";
import { resolveRouteJourneySelection, type JourneyQuery } from "@/lib/route-journey-selection";

type Props = { params: Promise<{ tinh: string; tuyen: string; "loai-xe": string }>; searchParams: Promise<JourneyQuery> };

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
  if (isPrelaunchAirportRoute(route)) {
    return buildPageMetadata({
      title: `Chuẩn bị xe ${vp.vehicleType} cho tuyến ${getPublicRouteLabel(route, " – ")} | ${SITE_NAME}`,
      description: `Thông tin chuẩn bị tuyến ${getPublicRouteLabel(route, " – ")}. Liên hệ tư vấn trước; chưa xác nhận chuyến khi lịch sân bay chưa được kiểm chứng.`,
      path: routeComboHref(route, loaiXe),
      noIndex: true,
    });
  }
  const priceText = vp.pricingMode === "contact" ? "liên hệ báo giá" : `giá từ ${vp.price}`;
  return buildPageMetadata({
    title: `Thuê xe ${vp.vehicleType} đi ${getPublicRouteLabel(route, " – ")}, ${priceText} | ${SITE_NAME}`,
    description: formatPublicLocationText(comboDescriptionOrDefault(route, vp)),
    path: routeComboHref(route, loaiXe),
    noIndex: !guard.indexable || !readiness.indexable,
  });
}

export default async function Page({ params, searchParams }: Props) {
  const { tinh, tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route || route.regionSlug !== tinh) notFound();
  const vp = findComboVehiclePrice(route, loaiXe);
  const category = getVehicleCategory(loaiXe);
  if (!vp || !category) notFound();
  const selection = resolveRouteJourneySelection(route, await searchParams, category.type);

  const [allRoutes, vehicles] = await Promise.all([fetchRoutes(), fetchVehicles()]);
  const similarRoutes = allRoutes
    .filter(
      (item) =>
        item.regionSlug === route.regionSlug &&
        item.slug !== route.slug &&
        canSuggestRelatedRoute(item) &&
        Boolean(findComboVehiclePrice(item, loaiXe)),
    )
    .sort((a, b) => Number(a.from !== route.from) - Number(b.from !== route.from) || Number(/sân bay/i.test(a.from)) - Number(/sân bay/i.test(b.from)))
    .slice(0, 3);
  const vehicle =
    vehicles.find((item) => item.type === vp.vehicleType && item.images.length > 0) ||
    vehicles.find((item) => item.type === vp.vehicleType);
  const description = comboDescriptionOrDefault(route, vp);
  const guard = getComboIndexability(route, loaiXe);
  const readiness = resolveRouteContentReadiness(route);
  const selectedRows = (route.pricingV2?.[selection.direction].packages ?? []).filter((row) => row.vehicleType === category.type);
  const available = availablePackages(selectedRows);
  const selectedJourney = available.includes(selection.journey) ? selection.journey : available[0];
  const selectedRow = selectedJourney ? findVehiclePackage(selectedRows, category.type, selectedJourney) : undefined;
  const schemaDirectionLabel = selection.direction === "outbound" ? getPublicRouteLabel(route) : `${getPublicLocationLabel(route.to)} → ${getPublicLocationLabel(route.from)}`;
  const candidate = selectedRow ? promotionOfferCandidate(route, selectedRow, `${selectedRow.vehicleType} · ${selectedRow.packageLabel} · ${schemaDirectionLabel}`) : undefined;
  const serviceOffers = buildFixedServiceOffers(candidate ? [candidate] : []);
  const fallbackOffers = buildFixedServiceOffers(candidate ? [{ ...candidate, promotionView: undefined }] : []);
  const serviceSchema = guard.indexable && readiness.serviceSchemaEligible ? buildServiceSchema({
    name: `Thuê xe ${vp.vehicleType.toLowerCase()} đi ${getPublicRouteLabel(route, " – ")}`,
    description: formatPublicLocationText(description),
    url: routeComboHref(route, loaiXe),
    areaServed: [getPublicLocationLabel(route.from), getPublicLocationLabel(route.to)],
    offers: readiness.offerSchemaEligible ? serviceOffers : undefined,
  }) : undefined;
  const fallbackSchema = serviceSchema ? buildServiceSchema({
    name: serviceSchema.name, description: serviceSchema.description, url: routeComboHref(route, loaiXe),
    areaServed: [getPublicLocationLabel(route.from), getPublicLocationLabel(route.to)],
    offers: readiness.offerSchemaEligible ? fallbackOffers : undefined,
  }) : undefined;
  const expiresAt = firstPromotionExpiry(selectedRow ? [selectedRow] : []);
  const structuredDataAllowed = routeStructuredDataAllowed(route, readiness);
  const breadcrumbSchema = structuredDataAllowed ? buildBreadcrumbListSchema([
    { name: "Trang chủ", url: "/" },
    { name: getPublicLocationLabel(route.region), url: `/tuyen-duong/${route.regionSlug || "khac"}` },
    { name: getPublicRouteLabel(route), url: routeHref(route) },
    { name: vp.vehicleType, url: routeComboHref(route, loaiXe) },
  ]) : undefined;

  return (
    <>
      {breadcrumbSchema ? <JsonLd data={breadcrumbSchema} /> : null}
      <ComboLandingPage
        key={`${route.id}:${category.slug}:${selection.direction}:${selection.journey}`}
        serviceSchema={serviceSchema && fallbackSchema ? { data: serviceSchema, fallback: fallbackSchema, unpriced: { ...serviceSchema, offers: undefined }, expiresAt } : undefined}
        initialSelection={selection}
        route={route}
        vehiclePrice={vp}
        category={category}
        similarRoutes={similarRoutes}
        vehicle={vehicle}
      />
    </>
  );
}
