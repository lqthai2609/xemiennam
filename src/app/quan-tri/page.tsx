import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchLocationsV2 } from "@/lib/api/locations";
import { fetchRoutes } from "@/lib/api/routes";
import { fetchVehicles } from "@/lib/api/vehicles";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import { RoutePricingAdminWizard } from "./route-pricing-admin-wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản trị tuyến và giá",
  description: "Công cụ nội bộ quản trị Route, Direction và Pricing V2.",
  robots: { index: false, follow: false, noarchive: true },
};

function isPrelaunchLocation(name: string, slug: string) {
  const key = `${name} ${slug}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return key.includes("long thanh");
}

function isAdminPreviewEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.GOCAR_ADMIN_WIZARD_ENABLED === "true"
  );
}

export default async function RoutePricingAdminPage() {
  if (!isAdminPreviewEnabled()) notFound();

  const [locations, routes, vehicles] = await Promise.all([
    fetchLocationsV2(),
    fetchRoutes(),
    fetchVehicles(),
  ]);

  const adminLocations = locations
    .map((location) => ({
      id: location.id,
      name: getPublicLocationLabel(location),
      slug: location.slug,
      type: location.type,
      serviceAreaStatus: location.serviceAreaStatus,
      locked: isPrelaunchLocation(location.name, location.slug),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const adminRoutes = routes.map((route) => {
    const rows = route.pricingV2
      ? [...route.pricingV2.outbound.packages, ...route.pricingV2.inbound.packages]
      : [];
    return {
      id: route.id,
      slug: route.slug,
      from: getPublicLocationLabel(route.originLocation ?? route.from),
      to: getPublicLocationLabel(route.destinationLocation ?? route.to),
      originLocationId: route.originLocation?.id,
      destinationLocationId: route.destinationLocation?.id,
      outboundEnabled: route.pricingV2?.outbound.enabled ?? false,
      inboundEnabled: route.pricingV2?.inbound.enabled ?? false,
      fixedCount: rows.filter((row) => row.mode === "fixed").length,
      contactCount: rows.filter((row) => row.mode === "contact").length,
      priceLabel: route.price,
    };
  });

  const adminVehicles = vehicles
    .map((vehicle) => ({ id: vehicle.id, name: vehicle.name, type: vehicle.type }))
    .sort((a, b) => a.type.localeCompare(b.type, "vi") || a.name.localeCompare(b.name, "vi"));

  return (
    <RoutePricingAdminWizard
      locations={adminLocations}
      routes={adminRoutes}
      vehicles={adminVehicles}
    />
  );
}
