import { NextResponse } from "next/server";

import { fetchLocationsV2, locationById } from "@/lib/api/locations";
import { embeddedTerms, fetchRawRoutes } from "@/lib/api/raw";
import { mapWPRouteToRoutePairV2 } from "@/lib/api/route-directions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const [routes, locations] = await Promise.all([fetchRawRoutes(), fetchLocationsV2()]);
  const byId = locationById(locations);

  const routeAudit = routes.map((route) => {
    const pair = mapWPRouteToRoutePairV2(route);
    const origin = pair.originLocationId > 0 ? byId.get(pair.originLocationId) : undefined;
    const destination = pair.destinationLocationId > 0 ? byId.get(pair.destinationLocationId) : undefined;
    const provinceTerm = embeddedTerms(route._embedded, "province")[0];

    return {
      id: route.id,
      slug: route.slug,
      legacy_from: route.meta.diem_di ?? "",
      legacy_to: route.meta.diem_den ?? "",
      origin_location_id: pair.originLocationId,
      destination_location_id: pair.destinationLocationId,
      origin_resolved: Boolean(origin),
      destination_resolved: Boolean(destination),
      province_term_slug: provinceTerm?.slug ?? "",
      destination_province_slug: destination?.provinceSlug ?? "",
      effective_region_slug: provinceTerm?.slug ?? destination?.provinceSlug ?? "",
    };
  });

  return NextResponse.json({
    ok: true,
    location_count: locations.length,
    locations,
    route_count: routes.length,
    unresolved_route_count: routeAudit.filter((item) => !item.origin_resolved || !item.destination_resolved).length,
    empty_region_slug_count: routeAudit.filter((item) => !item.effective_region_slug).length,
    routes: routeAudit,
  });
}
