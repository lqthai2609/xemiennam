import { fetchRoutes } from "./routes";
import type { Route } from "@/types/route";
import { fetchLocationsV2, locationById, type LocationV2 } from "./locations";
import { mapWPRouteToRoutePairV2 } from "./route-directions";
import { fetchRawRouteBySlug } from "./raw";

export type AirportHubRoute = {
  route: Route;
  airport: LocationV2;
  counterpart: LocationV2 | undefined;
  travelDirection: "from_airport" | "to_airport";
  pricingDirection: "outbound" | "inbound";
  from: string;
  to: string;
  href: string;
  featuredPrice: number | undefined;
  priceLabel: string;
};

export interface AirportHubData {
  airport: LocationV2;
  routes: AirportHubRoute[];
  fromAirport: AirportHubRoute[];
  toAirport: AirportHubRoute[];
}

export async function fetchAirportHubBySlug(airportSlug: string): Promise<AirportHubData | undefined> {
  const [allRoutes, locations] = await Promise.all([fetchRoutes(), fetchLocationsV2()]);
  const locationsMap = locationById(locations);

  const airport = locations.find((loc) => loc.slug === airportSlug && loc.type === "airport");
  if (!airport) return undefined;

  const routes: AirportHubRoute[] = [];

  for (const route of allRoutes) {
    const rawRoute = await fetchRawRouteBySlug(route.slug);
    if (!rawRoute) continue;

    const pair = mapWPRouteToRoutePairV2(rawRoute);

    const isOriginAirport = pair.originLocationId === airport.id;
    const isDestinationAirport = pair.destinationLocationId === airport.id;

    if (!isOriginAirport && !isDestinationAirport) continue;

    let counterpartLocationId: number | undefined;
    let travelDirection: "from_airport" | "to_airport";
    let pricingDirection: "outbound" | "inbound";

    if (isOriginAirport) {
      counterpartLocationId = pair.destinationLocationId;
      travelDirection = "from_airport";
      pricingDirection = "outbound";
    } else {
      counterpartLocationId = pair.originLocationId;
      travelDirection = "to_airport";
      pricingDirection = "inbound";
    }

    const directionConfig =
      pricingDirection === "outbound" ? pair.outbound : pair.inbound;

    if (!directionConfig.enabled) continue;

    const counterpart =
      counterpartLocationId > 0 ? locationsMap.get(counterpartLocationId) : undefined;

    const pricingDirectionData =
      route.pricingV2?.[pricingDirection];
    const featured = pricingDirectionData?.featured;

    let featuredPrice: number | undefined;
    let priceLabel: string = "—";

    if (featured) {
      if (featured.mode === "fixed" && featured.price) {
        featuredPrice = featured.price;
        priceLabel = featured.priceLabel || "—";
      } else if (featured.mode === "contact") {
        priceLabel = featured.contactText || "Liên hệ báo giá";
      }
    }

    routes.push({
      route,
      airport,
      counterpart,
      travelDirection,
      pricingDirection,
      from: route.from,
      to: route.to,
      href: route.slug ? `/tuyen-duong/${route.regionSlug || "khac"}/${route.slug}` : "",
      featuredPrice,
      priceLabel,
    });
  }

  return {
    airport,
    routes,
    fromAirport: routes.filter((r) => r.travelDirection === "from_airport"),
    toAirport: routes.filter((r) => r.travelDirection === "to_airport"),
  };
}
