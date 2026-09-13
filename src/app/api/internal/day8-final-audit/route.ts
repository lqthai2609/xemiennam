import { NextResponse } from "next/server";

import { WP_API_BASE } from "@/lib/wp";

export const dynamic = "force-dynamic";

type WPLocation = {
  id: number;
  slug: string;
  title?: { rendered?: string };
  meta?: {
    location_type?: string;
    province_slug?: string;
  };
};

type PricingRow = {
  direction?: string;
  vehicle_id?: number | string;
  package_key?: string;
  pricing_mode?: string;
  price?: number | string;
  contact_text?: string;
};

type WPRoute = {
  id: number;
  slug: string;
  title?: { rendered?: string };
  meta?: {
    route_model_version?: number | string;
    origin_location_id?: number | string;
    destination_location_id?: number | string;
    pricing_model_version?: number | string;
    pricing_packages_v2?: PricingRow[];
    pricing_by_vehicle?: unknown[];
  };
};

async function fetchAll<T>(path: string): Promise<T[]> {
  const output: T[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`${WP_API_BASE}${path}${separator}per_page=100&page=${page}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    const batch = (await response.json()) as T[];
    output.push(...batch);
    if (batch.length < 100) break;
  }
  return output;
}

function positiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

export async function GET() {
  try {
    const [locations, routes] = await Promise.all([
      fetchAll<WPLocation>("/location"),
      fetchAll<WPRoute>("/route"),
    ]);

    const locationSlugCounts = new Map<string, number>();
    for (const location of locations) {
      locationSlugCounts.set(location.slug, (locationSlugCounts.get(location.slug) ?? 0) + 1);
    }
    const duplicateLocationSlugs = [...locationSlugCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([slug, count]) => ({ slug, count }));

    const routeSlugCounts = new Map<string, number>();
    for (const route of routes) {
      routeSlugCounts.set(route.slug, (routeSlugCounts.get(route.slug) ?? 0) + 1);
    }
    const duplicateRouteSlugs = [...routeSlugCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([slug, count]) => ({ slug, count }));

    const locationById = new Map(locations.map((location) => [location.id, location]));
    const unresolvedRoutePairs: Array<{ id: number; slug: string }> = [];
    const pricingNotV2: Array<{ id: number; slug: string }> = [];
    const invalidFixedRows: Array<{ routeId: number; slug: string; row: PricingRow }> = [];
    const numericPriceOnNonFixed: Array<{ routeId: number; slug: string; row: PricingRow }> = [];
    const zeroPriceRows: Array<{ routeId: number; slug: string; row: PricingRow }> = [];

    let locationBackedRoutes = 0;
    let pricingV2Routes = 0;
    let pricingRows = 0;

    for (const route of routes) {
      const meta = route.meta ?? {};
      const originId = positiveInt(meta.origin_location_id);
      const destinationId = positiveInt(meta.destination_location_id);
      const routeV2 = positiveInt(meta.route_model_version) >= 2 && originId > 0 && destinationId > 0;
      if (routeV2) locationBackedRoutes += 1;
      else unresolvedRoutePairs.push({ id: route.id, slug: route.slug });

      const rows = Array.isArray(meta.pricing_packages_v2) ? meta.pricing_packages_v2 : [];
      if (positiveInt(meta.pricing_model_version) >= 2) pricingV2Routes += 1;
      else pricingNotV2.push({ id: route.id, slug: route.slug });

      pricingRows += rows.length;
      for (const row of rows) {
        const mode = String(row.pricing_mode ?? "");
        const hasNumericPrice = typeof row.price === "number" && Number.isFinite(row.price);
        const numericPrice = hasNumericPrice ? Number(row.price) : undefined;
        if (numericPrice === 0) zeroPriceRows.push({ routeId: route.id, slug: route.slug, row });
        if (mode === "fixed" && (!hasNumericPrice || (numericPrice ?? 0) <= 0)) {
          invalidFixedRows.push({ routeId: route.id, slug: route.slug, row });
        }
        if (mode !== "fixed" && hasNumericPrice) {
          numericPriceOnNonFixed.push({ routeId: route.id, slug: route.slug, row });
        }
      }
    }

    const airportRoutes = routes
      .filter((route) => route.slug.includes("san-bay-tan-son-nhat") || route.slug.includes("san-bay-long-thanh"))
      .map((route) => {
        const meta = route.meta ?? {};
        const originId = positiveInt(meta.origin_location_id);
        const destinationId = positiveInt(meta.destination_location_id);
        const origin = locationById.get(originId);
        const destination = locationById.get(destinationId);
        const rows = Array.isArray(meta.pricing_packages_v2) ? meta.pricing_packages_v2 : [];
        return {
          id: route.id,
          slug: route.slug,
          title: route.title?.rendered ?? "",
          originId,
          originSlug: origin?.slug ?? "",
          originProvinceSlug: origin?.meta?.province_slug ?? "",
          destinationId,
          destinationSlug: destination?.slug ?? "",
          destinationProvinceSlug: destination?.meta?.province_slug ?? "",
          routeModelVersion: positiveInt(meta.route_model_version),
          pricingModelVersion: positiveInt(meta.pricing_model_version),
          pricingRows: rows.length,
          fixedRows: rows.filter((row) => row.pricing_mode === "fixed").length,
          contactRows: rows.filter((row) => row.pricing_mode === "contact").length,
        };
      });

    const vungTau = locations.find((location) => location.slug === "vung-tau");
    const longThanhLocation = locations.find((location) => location.slug === "san-bay-long-thanh");
    const tanSonNhatLocation = locations.find((location) => location.slug === "san-bay-tan-son-nhat");

    return NextResponse.json({
      ok:
        duplicateLocationSlugs.length === 0 &&
        duplicateRouteSlugs.length === 0 &&
        zeroPriceRows.length === 0 &&
        invalidFixedRows.length === 0 &&
        numericPriceOnNonFixed.length === 0,
      locationCount: locations.length,
      routeCount: routes.length,
      locationBackedRoutes,
      unresolvedRoutePairs,
      pricingV2Routes,
      pricingNotV2,
      pricingRows,
      duplicateLocationSlugs,
      duplicateRouteSlugs,
      zeroPriceRows,
      invalidFixedRows,
      numericPriceOnNonFixed,
      vungTau: vungTau
        ? { id: vungTau.id, provinceSlug: vungTau.meta?.province_slug ?? "", type: vungTau.meta?.location_type ?? "" }
        : null,
      airports: {
        tanSonNhatLocation: tanSonNhatLocation ? { id: tanSonNhatLocation.id, provinceSlug: tanSonNhatLocation.meta?.province_slug ?? "" } : null,
        longThanhLocation: longThanhLocation ? { id: longThanhLocation.id, provinceSlug: longThanhLocation.meta?.province_slug ?? "" } : null,
        routes: airportRoutes,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
