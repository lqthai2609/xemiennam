import "server-only";
import { embeddedTermName, fetchRawRoutes, fetchRawVehicles } from "@/lib/api/raw";
import { fetchLocationsV2, locationById } from "@/lib/api/locations";
import { mapWPRouteToRoutePairV2 } from "@/lib/api/route-directions";

const OTHER_ROUTE_LABEL = "Tuyến khác";

type ResolvedRouteContext = {
  routeId: number | null;
  originLocationId: number;
  destinationLocationId: number;
  validLocationIds: Set<number>;
  route: Awaited<ReturnType<typeof fetchRawRoutes>>[number] | undefined;
  locationsById: ReturnType<typeof locationById>;
};

export async function resolveRouteContext(
  routeId: string | undefined,
  routeLabel: string,
  fresh = false,
): Promise<ResolvedRouteContext> {
  const [routes, locations] = await Promise.all([fetchRawRoutes(fresh ? 0 : undefined), fetchLocationsV2(fresh ? 0 : undefined)]);
  const locationsById = locationById(locations);
  const validLocationIds = new Set(locations.map((location) => location.id));

  let match = routeId
    ? routes.find((route) => route.id === Number(routeId))
    : undefined;

  if (!match && routeLabel !== OTHER_ROUTE_LABEL) {
    match = routes.find((route) => {
      const pair = mapWPRouteToRoutePairV2(route);
      const origin = pair.originLocationId > 0 ? locationsById.get(pair.originLocationId) : undefined;
      const destination = pair.destinationLocationId > 0 ? locationsById.get(pair.destinationLocationId) : undefined;
      const from = origin?.name || route.meta.diem_di || "";
      const to = destination?.name || route.meta.diem_den || "";
      return `${from} – ${to}` === routeLabel;
    });
  }

  if (!match) {
    return {
      routeId: null,
      originLocationId: 0,
      destinationLocationId: 0,
      validLocationIds,
      route: undefined,
      locationsById,
    };
  }

  const pair = mapWPRouteToRoutePairV2(match);
  return {
    routeId: match.id,
    originLocationId: pair.originLocationId,
    destinationLocationId: pair.destinationLocationId,
    validLocationIds,
    route: match,
    locationsById,
  };
}

export function resolveBookingLocationId(
  requestedId: number | undefined,
  fallbackId: number,
  validLocationIds: Set<number>,
): number {
  if (requestedId && validLocationIds.has(requestedId)) return requestedId;
  if (fallbackId > 0 && validLocationIds.has(fallbackId)) return fallbackId;
  return 0;
}

export async function resolveVehicleId(vehicleTypeLabel: string, fresh = false): Promise<number | null> {
  const vehicles = await fetchRawVehicles(fresh ? 0 : undefined);
  const match = vehicles.find((v) => embeddedTermName(v._embedded, "vehicle_type") === vehicleTypeLabel);
  return match?.id ?? null;
}
