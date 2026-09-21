import type { Service, ServiceIcon, ServiceRelatedRoute, ServiceUseCase, ServiceVehicle, ServiceVehicleType } from "@/types/service";
import type { Route } from "@/types/route";
import type { Vehicle } from "@/types/vehicle";
import { routeComboHref, routeHref, vehicleTypeSlug } from "@/types/route";
import { services as mockServices } from "@/data/services";
import { fetchRawServices, fetchRawServiceBySlug, embeddedTerms, embeddedFeaturedImage, type WPService } from "./raw";
import { fetchVehicles } from "./vehicles";
import { fetchRoutes } from "./routes";
import { shouldUseMockFallback } from "./mock-fallback";
import { splitCommaList, stripHtml } from "@/lib/wp";
import { SITE_HOTLINE } from "@/lib/site-config";
import { formatPublicLocationText, getPublicRouteLabel } from "@/lib/public-location-label";

const useMockFallback = shouldUseMockFallback();

const ICON_BY_SLUG: Record<string, ServiceIcon> = {
  "xe-cuoi": "wedding",
  "dua-don-san-bay": "airport",
  "thue-xe-theo-thang": "monthly",
  "city-tour": "city-tour",
};

type ServiceClusterEditorial = {
  searchIntent: string;
  useCases: ServiceUseCase[];
};

const SERVICE_CLUSTER_BY_SLUG: Record<string, ServiceClusterEditorial> = {
  "xe-cuoi": {
    searchIntent: "Thuê xe cưới có tài xế, đúng giờ, phù hợp lễ cưới và đoàn rước dâu.",
    useCases: [
      { title: "Xe cô dâu chú rể", description: "Ưu tiên xe chỉn chu, riêng tư và phù hợp phong cách ngày cưới." },
      { title: "Đoàn rước dâu", description: "Chọn loại xe theo số người và lịch trình nhiều điểm đón trả." },
    ],
  },
  "dua-don-san-bay": {
    searchIntent: "Thuê xe đưa đón sân bay theo giờ bay, có tài xế và hỗ trợ hành lý.",
    useCases: [
      { title: "Khách cá nhân và công tác", description: "Đi đúng giờ, ít người, cần hành trình gọn và chủ động." },
      { title: "Gia đình và nhóm có hành lý", description: "Ưu tiên khoang xe rộng và đủ chỗ cho người cùng hành lý." },
    ],
  },
  "thue-xe-theo-thang": {
    searchIntent: "Thuê xe dài hạn theo tháng cho doanh nghiệp, chuyên gia, gia đình hoặc đưa đón nhân sự.",
    useCases: [
      { title: "Doanh nghiệp và chuyên gia", description: "Nhu cầu đi lại thường xuyên với lịch cố định hoặc linh hoạt." },
      { title: "Đưa đón đội nhóm", description: "Chọn xe theo quy mô nhân sự và tần suất sử dụng thực tế." },
    ],
  },
  "city-tour": {
    searchIntent: "Thuê xe city tour có tài xế cho nhóm du lịch, gia đình hoặc đoàn tham quan trong ngày.",
    useCases: [
      { title: "Gia đình và nhóm nhỏ", description: "Lịch trình linh hoạt, nhiều điểm dừng và dễ điều chỉnh trong ngày." },
      { title: "Đoàn tham quan", description: "Chọn xe theo quy mô đoàn để cả nhóm di chuyển cùng lịch trình." },
    ],
  },
};

const GROUP_COMPATIBILITY: Record<string, string[]> = {
  "4-7-cho": ["4-cho", "7-cho"],
  "16-29-cho": ["16-cho", "29-cho"],
};

function acceptedVehicleSlugs(service: Service): Set<string> {
  const accepted = new Set<string>();
  for (const type of service.vehicleTypes) {
    const slug = type.slug || vehicleTypeSlug(type.name);
    accepted.add(slug);
    for (const expanded of GROUP_COMPATIBILITY[slug] ?? []) accepted.add(expanded);
  }
  return accepted;
}

function relatedRoutesForService(service: Service, routes: Route[], count = 4): ServiceRelatedRoute[] {
  const accepted = acceptedVehicleSlugs(service);
  if (accepted.size === 0) return [];

  return routes
    .map((route) => {
      const matchingTypes = route.vehicleTypes.filter((type) => accepted.has(vehicleTypeSlug(type)));
      if (matchingTypes.length === 0) return undefined;
      return {
        name: getPublicRouteLabel(route),
        href: routeHref(route),
        summary: formatPublicLocationText(route.summary || [route.distance, route.time].filter(Boolean).join(" · ")),
        combos: matchingTypes.map((vehicleType) => ({
          vehicleType,
          href: routeComboHref(route, vehicleTypeSlug(vehicleType)),
        })),
      } satisfies ServiceRelatedRoute;
    })
    .filter((route): route is ServiceRelatedRoute => Boolean(route))
    .slice(0, count);
}

function enrichServiceCluster(service: Service, routes: Route[]): Service {
  const editorial = SERVICE_CLUSTER_BY_SLUG[service.slug];
  return {
    ...service,
    name: formatPublicLocationText(service.name),
    shortDescription: formatPublicLocationText(service.shortDescription),
    detailDescription: formatPublicLocationText(service.detailDescription),
    iconLabel: formatPublicLocationText(service.iconLabel),
    vehicleTypes: service.vehicleTypes.map((item) => ({
      ...item,
      name: formatPublicLocationText(item.name),
      description: formatPublicLocationText(item.description),
    })),
    suggestedVehicles: service.suggestedVehicles.map((item) => ({
      ...item,
      name: formatPublicLocationText(item.name),
      detail: formatPublicLocationText(item.detail),
    })),
    notes: service.notes.map(formatPublicLocationText),
    rankMathTitle: service.rankMathTitle ? formatPublicLocationText(service.rankMathTitle) : undefined,
    rankMathDescription: service.rankMathDescription ? formatPublicLocationText(service.rankMathDescription) : undefined,
    searchIntent: editorial?.searchIntent ? formatPublicLocationText(editorial.searchIntent) : undefined,
    useCases: editorial?.useCases.map((item) => ({
      title: formatPublicLocationText(item.title),
      description: formatPublicLocationText(item.description),
    })),
    relatedRoutes: relatedRoutesForService(service, routes),
  };
}

async function mapWPServiceToService(wp: WPService, allVehicles: Vehicle[]): Promise<Service> {
  const vehicleTypes: ServiceVehicleType[] = embeddedTerms(wp._embedded, "vehicle_type").map((t) => ({
    name: t.name,
    slug: vehicleTypeSlug(t.name) || t.slug,
    description: formatPublicLocationText(stripHtml(t.description ?? "")),
  }));

  const suggestedIds = (wp.meta.loai_xe_phu_hop ?? []).map(String);
  const suggestedVehicles: ServiceVehicle[] = allVehicles
    .filter((v) => suggestedIds.includes(v.id))
    .map((v) => ({
      name: v.name,
      slug: vehicleTypeSlug(v.type),
      detail: formatPublicLocationText(v.description),
    }));

  const need = wp.meta.mo_ta_nhu_cau ?? "";
  const body = stripHtml(wp.content?.rendered) || need;

  return {
    slug: wp.slug,
    name: formatPublicLocationText(wp.title.rendered),
    shortDescription: formatPublicLocationText((need || body).slice(0, 140)),
    detailDescription: formatPublicLocationText(body),
    icon: ICON_BY_SLUG[wp.slug] ?? "city-tour",
    iconLabel: formatPublicLocationText(wp.title.rendered),
    image: embeddedFeaturedImage(wp._embedded),
    vehicleTypes,
    suggestedVehicles,
    notes: splitCommaList(wp.meta.luu_y_dich_vu).map(formatPublicLocationText),
    hotline: SITE_HOTLINE,
    modifiedDate: wp.modified,
    rankMathTitle: wp.rank_math_title ? formatPublicLocationText(wp.rank_math_title) : undefined,
    rankMathDescription: wp.rank_math_description ? formatPublicLocationText(wp.rank_math_description) : undefined,
  };
}

export async function fetchServices(): Promise<Service[]> {
  const raw = await fetchRawServices();
  const routes = await fetchRoutes();
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchServices] WP chưa có dịch vụ nào — dùng dữ liệu mock theo policy môi trường.");
      return mockServices.map((service) => enrichServiceCluster(service, routes));
    }
    return [];
  }
  const vehicles = await fetchVehicles();
  const services = await Promise.all(raw.map((wp) => mapWPServiceToService(wp, vehicles)));
  return services.map((service) => enrichServiceCluster(service, routes));
}

export async function fetchServiceBySlug(slug: string): Promise<Service | undefined> {
  const wp = await fetchRawServiceBySlug(slug);
  const routes = await fetchRoutes();
  if (wp) {
    const vehicles = await fetchVehicles();
    return enrichServiceCluster(await mapWPServiceToService(wp, vehicles), routes);
  }
  if (useMockFallback) {
    const raw = await fetchRawServices();
    if (raw.length === 0) {
      const service = mockServices.find((item) => item.slug === slug);
      return service ? enrichServiceCluster(service, routes) : undefined;
    }
  }
  return undefined;
}
