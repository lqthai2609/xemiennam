import { decodeHtmlEntities, wpFetch } from "@/lib/wp";

/**
 * Location Model V2 — dùng chung cho city/province/district/locality/airport/custom.
 * Airport không có resolver riêng: frontend chỉ cần Location ID + type + label giống mọi
 * Location khác.
 */
export type LocationType = "city" | "province" | "district" | "locality" | "airport" | "custom" | string;

export interface LocationV2 {
  id: number;
  slug: string;
  name: string;
  type: LocationType;
  parentLocationId: number;
  provinceSlug: string;
  latitude?: number;
  longitude?: number;
  serviceZoneId?: string;
  serviceZoneTier?: "center" | "suburb" | "outskirt";
  serviceAreaStatus: "covered" | "contact" | "outside" | "unverified";
}

type WPLocation = {
  id: number;
  slug: string;
  title: { rendered: string };
  meta?: {
    location_type?: string;
    parent_location_id?: number | string;
    province_slug?: string;
    latitude?: number | string;
    longitude?: number | string;
    service_zone_id?: string;
    service_zone_tier?: string;
    service_area_status?: string;
  };
};

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapWPLocationToLocationV2(wp: WPLocation): LocationV2 {
  const latitude = toNumber(wp.meta?.latitude);
  const longitude = toNumber(wp.meta?.longitude);
  const tier = wp.meta?.service_zone_tier;
  const status = wp.meta?.service_area_status;
  return {
    id: wp.id,
    slug: wp.slug,
    name: decodeHtmlEntities(wp.title.rendered).trim(),
    type: wp.meta?.location_type?.trim() || "custom",
    parentLocationId: Math.max(0, Math.trunc(toNumber(wp.meta?.parent_location_id))),
    provinceSlug: wp.meta?.province_slug?.trim() || "",
    latitude: latitude || undefined,
    longitude: longitude || undefined,
    serviceZoneId: wp.meta?.service_zone_id?.trim() || undefined,
    serviceZoneTier: tier === "center" || tier === "suburb" || tier === "outskirt" ? tier : undefined,
    serviceAreaStatus:
      status === "covered" || status === "contact" || status === "outside" ? status : "unverified",
  };
}

/**
 * Đọc toàn bộ Location theo trang 100 bản ghi. Không N+1 theo route; khi dữ liệu vượt 100
 * Location vẫn tiếp tục đọc trang kế tiếp cho tới khi gặp trang cuối.
 */
export async function fetchLocationsV2(): Promise<LocationV2[]> {
  const output: LocationV2[] = [];
  const perPage = 100;

  for (let page = 1; page <= 20; page += 1) {
    const batch =
      (await wpFetch<WPLocation[]>(`/location?per_page=${perPage}&page=${page}`)) ?? [];
    output.push(...batch.map(mapWPLocationToLocationV2));
    if (batch.length < perPage) break;
  }

  return output;
}

export function locationById(locations: LocationV2[]): Map<number, LocationV2> {
  return new Map(locations.map((location) => [location.id, location]));
}
