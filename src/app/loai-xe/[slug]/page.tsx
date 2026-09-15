import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleTypeLanding } from "@/components/vehicle-type-landing-day13";
import { getVehicleCategory, vehicleCategories, withRealCategoryImage, withRealCategoryImages } from "@/data/vehicle-categories";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchRoutes } from "@/lib/api/routes";
import { fetchServices } from "@/lib/api/services";
import { fetchPostsByVehicleType } from "@/lib/api/blog";
import { fetchAirportRouteLinksForVehicleType } from "@/lib/api/airport-routes";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site-config";
import { buildVehicleCategoryRoutePrices, getVehicleCategoryStartingPrice } from "@/lib/vehicle-category-pricing";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return vehicleCategories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getVehicleCategory(slug);
  return category
    ? buildPageMetadata({
        title: `${category.label} | ${SITE_NAME}`,
        description: category.description,
        path: `/loai-xe/${category.slug}`,
      })
    : buildPageMetadata({
        title: "Không tìm thấy loại xe",
        description: "Loại xe này không tồn tại hoặc hiện không khả dụng.",
        noIndex: true,
      });
}

export default async function VehicleTypeDetailPage({ params }: Props) {
  const { slug } = await params;
  const category = getVehicleCategory(slug);
  if (!category) notFound();

  const [allVehicles, allRoutes, allServices, relatedPosts, airportRoutes] = await Promise.all([
    fetchVehicles(),
    fetchRoutes(),
    fetchServices(),
    fetchPostsByVehicleType(category.slug, 3),
    fetchAirportRouteLinksForVehicleType(category.type),
  ]);

  const vehicles = allVehicles.filter((vehicle) => vehicle.type === category.type);
  const displayCategory = withRealCategoryImage(category, vehicles);
  const galleryImages = Array.from(new Set(vehicles.flatMap((vehicle) => vehicle.images))).slice(0, 7);

  const routePrices = buildVehicleCategoryRoutePrices(allRoutes, category.type, category.slug);
  const relatedRoutes = routePrices.map((row) => ({ label: row.route, href: row.href }));

  const services = allServices
    .filter((service) => service.vehicleTypes.some((vehicleType) => vehicleType.slug === category.slug))
    .map((service) => ({
      title: service.name,
      description: service.shortDescription,
      href: `/dich-vu/${service.slug}`,
    }));

  const otherCategories = withRealCategoryImages(
    vehicleCategories.filter((item) => item.slug !== category.slug),
    allVehicles,
  )
    .map((item) => ({
      ...item,
      startingPrice: getVehicleCategoryStartingPrice(allRoutes, item.type) ?? "Liên hệ báo giá",
    }))
    .slice(0, 3);

  const serviceSchema = buildServiceSchema({
    name: `Thuê xe ${category.label.toLowerCase()} nguyên chiếc`,
    description: category.description,
    url: `/loai-xe/${category.slug}`,
  });

  return (
    <>
      <JsonLd data={serviceSchema} />
      <VehicleTypeLanding
        category={displayCategory}
        routePrices={routePrices}
        relatedRoutes={relatedRoutes}
        airportRoutes={airportRoutes}
        services={services}
        galleryImages={galleryImages}
        relatedPosts={relatedPosts}
        otherCategories={otherCategories}
      />
    </>
  );
}
