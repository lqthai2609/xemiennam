import { NextRequest, NextResponse } from "next/server";

import { fetchLocationsV2 } from "@/lib/api/locations";
import { embeddedTerms, fetchRawRoutes, fetchRawVehicles, type WPRoute } from "@/lib/api/raw";
import { wpAuthedFetch } from "@/lib/api/wp-auth";

export const dynamic = "force-dynamic";

const APPLY_TOKEN = "day8-location-pricing-v2";
const PRODUCTION_TOKEN = "day8-prod-20260913-7b9a4e61";
const CONTACT_TEXT = "Liên hệ để nhận báo giá";

type RouteMetaV2 = WPRoute["meta"] & {
  route_model_version?: number | string;
  origin_location_id?: number | string;
  destination_location_id?: number | string;
  outbound_enabled?: boolean | number | string;
  outbound_featured_package?: string;
  inbound_enabled?: boolean | number | string;
  inbound_featured_package?: string;
  pricing_model_version?: number | string;
  pricing_packages_v2?: Array<{
    direction?: string;
    vehicle_id?: number | string;
    package_key?: string;
    pricing_mode?: string;
    price?: number | string;
    contact_text?: string;
  }>;
};

type LocationPlan = {
  title: string;
  slug: string;
  locationType: "city" | "locality" | "custom";
  provinceSlug: string;
  review: boolean;
};

function stripVietnamese(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d");
}

function comparisonKey(value: string): string {
  return stripVietnamese(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return stripVietnamese(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const aliases = new Map<string, string>([
  ["tphcm", "TP. Hồ Chí Minh"],
  ["tp hcm", "TP. Hồ Chí Minh"],
  ["tp ho chi minh", "TP. Hồ Chí Minh"],
  ["thanh pho ho chi minh", "TP. Hồ Chí Minh"],
  ["ho chi minh", "TP. Hồ Chí Minh"],
  ["sai gon", "TP. Hồ Chí Minh"],
  ["tp vung tau", "Vũng Tàu"],
  ["thanh pho vung tau", "Vũng Tàu"],
  ["vung tau", "Vũng Tàu"],
  ["da lat lam dong", "Đà Lạt"],
  ["chau doc an giang", "Châu Đốc"],
  ["cai be tien giang", "Cái Bè"],
  ["tien giang my tho", "Mỹ Tho"],
  ["moc bai", "Cửa khẩu Mộc Bài"],
  ["cua khau moc bai", "Cửa khẩu Mộc Bài"],
]);

function normalizeLegacyLocation(raw: string): string {
  let label = raw.replace(/\s+/g, " ").trim();
  label = label.replace(/\s+\d+\s*(?:ngày|ngay)(?:\s+\d+\s*(?:đêm|dem))?\s*$/iu, "");
  label = label.replace(/\s+\d+\s*n\s*\d+\s*[đd]\s*$/iu, "");
  label = label.replace(/\s+/g, " ").trim();
  const canonical = aliases.get(comparisonKey(label));
  if (canonical) return canonical;
  const cityMatch = label.match(/^TP\s+(.+)$/iu);
  return cityMatch ? `TP. ${cityMatch[1].trim()}` : label;
}

function excludedLocation(label: string): boolean {
  return /^city\s*tour\b/i.test(stripVietnamese(label));
}

function reviewLocation(label: string): boolean {
  return /[\/()&]/u.test(label);
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function routeProvinceSlug(route: WPRoute): string {
  return embeddedTerms(route._embedded, "province")[0]?.slug ?? "";
}

function locationPlanFor(raw: string, role: "origin" | "destination", route: WPRoute): LocationPlan | null {
  const title = normalizeLegacyLocation(raw);
  if (!title || excludedLocation(title)) return null;
  const slug = slugify(title);
  if (!slug) return null;
  const key = comparisonKey(title);
  return {
    title,
    slug,
    locationType: key === "tp ho chi minh" ? "city" : reviewLocation(title) ? "custom" : "locality",
    provinceSlug: key === "tp ho chi minh" ? "ho-chi-minh" : role === "destination" ? routeProvinceSlug(route) : "",
    review: reviewLocation(title),
  };
}

function mergePlan(current: LocationPlan | undefined, next: LocationPlan): LocationPlan {
  if (!current) return next;
  return {
    ...current,
    provinceSlug: current.provinceSlug || next.provinceSlug,
    review: current.review || next.review,
    locationType: current.locationType === "custom" || next.locationType === "custom" ? "custom" : current.locationType,
  };
}

function legacyPricingRows(route: WPRoute) {
  const byVehicle = new Map<string, { vehicleId: string; price: number }>();
  const collisions: string[] = [];
  for (const row of route.meta.pricing_by_vehicle ?? []) {
    const vehicleIdNumber = asNumber(row.vehicle_id);
    if (vehicleIdNumber <= 0) continue;
    const vehicleId = String(Math.trunc(vehicleIdNumber));
    const price = asNumber(row.gia);
    if (byVehicle.has(vehicleId)) collisions.push(vehicleId);
    else byVehicle.set(vehicleId, { vehicleId, price });
  }
  return { rows: [...byVehicle.values()], collisions: [...new Set(collisions)] };
}

async function updateLocation(id: number, plan: LocationPlan) {
  return wpAuthedFetch(`/location/${id}`, {
    method: "PUT",
    body: { meta: { province_slug: plan.provinceSlug, location_type: plan.locationType } },
  });
}

async function createLocation(plan: LocationPlan) {
  return wpAuthedFetch<{ id: number }>("/location", {
    method: "POST",
    body: {
      title: plan.title,
      slug: plan.slug,
      status: "publish",
      meta: { location_type: plan.locationType, province_slug: plan.provinceSlug, parent_location_id: 0 },
    },
  });
}

export async function GET(request: NextRequest) {
  const environment = process.env.VERCEL_ENV;
  const productionAuthorized =
    environment === "production" && request.nextUrl.searchParams.get("production") === PRODUCTION_TOKEN;
  if (environment !== "preview" && !productionAuthorized) return NextResponse.json({ ok: false }, { status: 404 });

  const apply = request.nextUrl.searchParams.get("apply") === APPLY_TOKEN;
  const [routes, locations, vehicles] = await Promise.all([fetchRawRoutes(), fetchLocationsV2(), fetchRawVehicles()]);
  const plans = new Map<string, LocationPlan>();
  const excludedRoutes: Array<{ id: number; slug: string; endpoint: string }> = [];

  for (const route of routes) {
    const meta = route.meta as RouteMetaV2;
    if (asNumber(meta.route_model_version) >= 2 && asNumber(meta.origin_location_id) > 0 && asNumber(meta.destination_location_id) > 0) continue;
    for (const [key, role] of [["diem_di", "origin"], ["diem_den", "destination"]] as const) {
      const raw = route.meta[key];
      if (!raw?.trim()) continue;
      const plan = locationPlanFor(raw, role, route);
      if (!plan) {
        excludedRoutes.push({ id: route.id, slug: route.slug, endpoint: key });
        continue;
      }
      plans.set(plan.slug, mergePlan(plans.get(plan.slug), plan));
    }
  }

  const pricingCollisions = routes.flatMap((route) => {
    const meta = route.meta as RouteMetaV2;
    if (asNumber(meta.pricing_model_version) >= 2 || (meta.pricing_packages_v2?.length ?? 0) > 0) return [];
    const { collisions } = legacyPricingRows(route);
    return collisions.length ? [{ routeId: route.id, slug: route.slug, vehicleIds: collisions }] : [];
  });

  const existingBySlug = new Map(locations.map((item) => [item.slug, item]));
  const missingLocations = [...plans.values()].filter((plan) => !existingBySlug.has(plan.slug));
  const locationMetadataUpdates = [...plans.values()].filter((plan) => {
    const existing = existingBySlug.get(plan.slug);
    return Boolean(existing && ((!existing.provinceSlug && plan.provinceSlug) || (existing.type === "custom" && plan.locationType !== "custom")));
  });

  const preview = {
    route_count: routes.length,
    vehicle_count: vehicles.length,
    existing_location_count: locations.length,
    planned_location_count: plans.size,
    missing_location_count: missingLocations.length,
    location_metadata_update_count: locationMetadataUpdates.length,
    review_location_count: [...plans.values()].filter((item) => item.review).length,
    excluded_route_endpoint_count: excludedRoutes.length,
    pricing_collision_count: pricingCollisions.length,
    missing_locations: missingLocations,
    metadata_updates: locationMetadataUpdates,
    excluded_routes: excludedRoutes,
    pricing_collisions: pricingCollisions,
  };

  if (!apply) return NextResponse.json({ ok: true, mode: "preview", preview });
  if (pricingCollisions.length > 0) return NextResponse.json({ ok: false, error: "pricing_collisions", preview }, { status: 409 });

  const authProbe = await wpAuthedFetch<{ id: number }>("/users/me?context=edit");
  if (!authProbe.ok) {
    return NextResponse.json({ ok: false, error: "wordpress_auth_unavailable", message: authProbe.message, preview }, { status: 503 });
  }

  const locationIds = new Map(locations.map((item) => [item.slug, item.id]));
  const operations = { locationsCreated: 0, locationsUpdated: 0, routesUpdated: 0, airportRoutesCreated: 0, errors: [] as string[] };

  for (const plan of locationMetadataUpdates) {
    const id = locationIds.get(plan.slug);
    if (!id) continue;
    const result = await updateLocation(id, plan);
    if (result.ok) operations.locationsUpdated += 1;
    else operations.errors.push(`location ${id}: ${result.message}`);
  }

  for (const plan of missingLocations) {
    const result = await createLocation(plan);
    if (result.ok) {
      locationIds.set(plan.slug, result.data.id);
      operations.locationsCreated += 1;
    } else operations.errors.push(`create location ${plan.slug}: ${result.message}`);
  }

  for (const route of routes) {
    const meta = route.meta as RouteMetaV2;
    const routePatch: Record<string, unknown> = {};
    const originPlan = route.meta.diem_di ? locationPlanFor(route.meta.diem_di, "origin", route) : null;
    const destinationPlan = route.meta.diem_den ? locationPlanFor(route.meta.diem_den, "destination", route) : null;
    const originId = asNumber(meta.origin_location_id) || (originPlan ? locationIds.get(originPlan.slug) ?? 0 : 0);
    const destinationId = asNumber(meta.destination_location_id) || (destinationPlan ? locationIds.get(destinationPlan.slug) ?? 0 : 0);

    if (asNumber(meta.route_model_version) < 2 && originId > 0 && destinationId > 0) {
      Object.assign(routePatch, {
        route_model_version: 2,
        origin_location_id: originId,
        destination_location_id: destinationId,
        outbound_enabled: true,
        outbound_featured_package: "one_way",
        inbound_enabled: true,
        inbound_featured_package: "one_way",
      });
    }

    if (asNumber(meta.pricing_model_version) < 2 && (meta.pricing_packages_v2?.length ?? 0) === 0) {
      const { rows } = legacyPricingRows(route);
      const packages = rows.flatMap((row) => {
        const outbound = row.price > 0
          ? { direction: "outbound", vehicle_id: Number(row.vehicleId), package_key: "one_way", pricing_mode: "fixed", price: row.price, contact_text: "" }
          : { direction: "outbound", vehicle_id: Number(row.vehicleId), package_key: "one_way", pricing_mode: "contact", price: "", contact_text: CONTACT_TEXT };
        const inbound = { direction: "inbound", vehicle_id: Number(row.vehicleId), package_key: "one_way", pricing_mode: "contact", price: "", contact_text: CONTACT_TEXT };
        return [outbound, inbound];
      });
      Object.assign(routePatch, { pricing_model_version: 2, pricing_packages_v2: packages });
    }

    if (Object.keys(routePatch).length === 0) continue;
    const result = await wpAuthedFetch(`/route/${route.id}`, { method: "PUT", body: { meta: routePatch } });
    if (result.ok) operations.routesUpdated += 1;
    else operations.errors.push(`route ${route.id}: ${result.message}`);
  }

  const refreshed = await fetchRawRoutes();
  if (!refreshed.some((route) => route.slug === "san-bay-long-thanh-vung-tau")) {
    const longThanhId = locationIds.get("san-bay-long-thanh") ?? 0;
    const vungTauId = locationIds.get("vung-tau") ?? 0;
    const tanSonNhat = refreshed.find((route) => route.slug === "san-bay-tan-son-nhat-vung-tau");
    const tanSonNhatMeta = tanSonNhat?.meta as RouteMetaV2 | undefined;
    const airportVehicleIds = [...new Set((tanSonNhatMeta?.pricing_packages_v2 ?? []).map((row) => asNumber(row.vehicle_id)).filter((id) => id > 0))];
    const fallbackVehicleIds = vehicles.map((vehicle) => vehicle.id).filter((id) => id > 0);
    const vehicleIds = airportVehicleIds.length ? airportVehicleIds : fallbackVehicleIds;

    if (longThanhId > 0 && vungTauId > 0 && vehicleIds.length > 0) {
      const packages = vehicleIds.flatMap((vehicleId) => [
        { direction: "outbound", vehicle_id: vehicleId, package_key: "one_way", pricing_mode: "contact", price: "", contact_text: CONTACT_TEXT },
        { direction: "inbound", vehicle_id: vehicleId, package_key: "one_way", pricing_mode: "contact", price: "", contact_text: CONTACT_TEXT },
      ]);
      const result = await wpAuthedFetch<{ id: number }>("/route", {
        method: "POST",
        body: {
          title: "Sân bay Long Thành – Vũng Tàu",
          slug: "san-bay-long-thanh-vung-tau",
          status: "publish",
          meta: {
            diem_di: "Sân bay Long Thành",
            diem_den: "Vũng Tàu",
            route_model_version: 2,
            origin_location_id: longThanhId,
            destination_location_id: vungTauId,
            outbound_enabled: true,
            outbound_featured_package: "one_way",
            inbound_enabled: true,
            inbound_featured_package: "one_way",
            pricing_model_version: 2,
            pricing_packages_v2: packages,
          },
        },
      });
      if (result.ok) operations.airportRoutesCreated += 1;
      else operations.errors.push(`airport seed: ${result.message}`);
    }
  }

  return NextResponse.json({ ok: operations.errors.length === 0, mode: "apply", preview, operations }, { status: operations.errors.length ? 500 : 200 });
}
