import type { Service, ServiceIcon, ServiceVehicle, ServiceVehicleType } from "@/types/service";
import type { Vehicle } from "@/types/vehicle";
import { vehicleTypeSlug } from "@/types/route";
import { services as mockServices } from "@/data/services";
import { fetchRawServices, fetchRawServiceBySlug, embeddedTerms, embeddedFeaturedImage, type WPService } from "./raw";
import { fetchVehicles } from "./vehicles";
import { shouldUseMockFallback } from "./mock-fallback";
import { splitCommaList, stripHtml } from "@/lib/wp";
import { SITE_HOTLINE } from "@/lib/site-config";

const useMockFallback = shouldUseMockFallback();

const ICON_BY_SLUG: Record<string, ServiceIcon> = {
  "xe-cuoi": "wedding",
  "dua-don-san-bay": "airport",
  "thue-xe-theo-thang": "monthly",
  "city-tour": "city-tour",
};

async function mapWPServiceToService(wp: WPService, allVehicles: Vehicle[]): Promise<Service> {
  const vehicleTypes: ServiceVehicleType[] = embeddedTerms(wp._embedded, "vehicle_type").map((t) => ({
    name: t.name,
    slug: vehicleTypeSlug(t.name) || t.slug,
    description: "",
  }));

  const suggestedIds = (wp.meta.loai_xe_phu_hop ?? []).map(String);
  const suggestedVehicles: ServiceVehicle[] = allVehicles
    .filter((v) => suggestedIds.includes(v.id))
    .map((v) => ({
      name: v.name,
      // Day 25 đã gộp trang xe cụ thể vào /loai-xe. Link gợi ý phải trỏ tới slug loại xe,
      // không dùng vehicle post slug vì redirect /doi-xe/:slug -> /loai-xe/:slug sẽ 404.
      slug: vehicleTypeSlug(v.type),
      detail: v.description,
    }));

  const need = wp.meta.mo_ta_nhu_cau ?? "";
  const body = stripHtml(wp.content?.rendered) || need;

  return {
    slug: wp.slug,
    name: wp.title.rendered,
    shortDescription: (need || body).slice(0, 140),
    detailDescription: body,
    icon: ICON_BY_SLUG[wp.slug] ?? "city-tour",
    iconLabel: wp.title.rendered,
    image: embeddedFeaturedImage(wp._embedded),
    vehicleTypes,
    suggestedVehicles,
    notes: splitCommaList(wp.meta.luu_y_dich_vu),
    hotline: SITE_HOTLINE,
    modifiedDate: wp.modified,
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
  };
}

export async function fetchServices(): Promise<Service[]> {
  const raw = await fetchRawServices();
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchServices] WP chưa có dịch vụ nào — dùng dữ liệu mock theo policy môi trường.");
      return mockServices;
    }
    return [];
  }
  const vehicles = await fetchVehicles();
  return Promise.all(raw.map((wp) => mapWPServiceToService(wp, vehicles)));
}

export async function fetchServiceBySlug(slug: string): Promise<Service | undefined> {
  const wp = await fetchRawServiceBySlug(slug);
  if (wp) {
    const vehicles = await fetchVehicles();
    return mapWPServiceToService(wp, vehicles);
  }
  if (useMockFallback) {
    const raw = await fetchRawServices();
    if (raw.length === 0) {
      return mockServices.find((service) => service.slug === slug);
    }
  }
  return undefined;
}
