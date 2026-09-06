import type { Service, ServiceIcon, ServiceVehicle, ServiceVehicleType } from "@/types/service";
import type { Vehicle } from "@/types/vehicle";
import { vehicleTypeSlug } from "@/types/route";
import { services as mockServices } from "@/data/services";
import { fetchRawServices, fetchRawServiceBySlug, embeddedTerms, type WPService } from "./raw";
import { fetchVehicles } from "./vehicles";
import { splitCommaList, stripHtml } from "@/lib/wp";

/**
 * fetchServices()/fetchServiceBySlug() — Ngày 13.
 * Cùng chiến lược fallback mock như routes.ts/vehicles.ts (Ngày 12): WP chưa có bài
 * `dich_vu` nào (nhập liệu thật dời tới Ngày 24), nên khi API trả rỗng, dùng lại
 * data/services.ts. Đổi `useMockFallback` thành false để thấy đúng trạng thái CMS thật.
 */
const useMockFallback = true;

// slug bài viết → icon hiển thị (không có meta icon riêng bên WordPress, suy ra từ slug).
const ICON_BY_SLUG: Record<string, ServiceIcon> = {
  "xe-cuoi": "wedding",
  "dua-don-san-bay": "airport",
  "thue-xe-theo-thang": "monthly",
  "city-tour": "city-tour",
};

async function mapWPServiceToService(wp: WPService, allVehicles: Vehicle[]): Promise<Service> {
  // vehicle_type gắn trực tiếp vào dich_vu qua taxonomy (đăng ký Ngày 3) — dùng vehicleTypeSlug()
  // để suy slug thay vì term.slug thật của WordPress, đảm bảo luôn khớp đúng quy ước
  // /loai-xe/[slug] đã có từ Ngày 10, bất kể WordPress tự sinh slug term thế nào.
  const vehicleTypes: ServiceVehicleType[] = embeddedTerms(wp._embedded, "vehicle_type").map((t) => ({
    name: t.name,
    slug: vehicleTypeSlug(t.name) || t.slug,
    description: "",
  }));

  // loai_xe_phu_hop lưu ID bài `vehicle` liên quan — join theo id với danh sách vehicle thật.
  const suggestedIds = (wp.meta.loai_xe_phu_hop ?? []).map(String);
  const suggestedVehicles: ServiceVehicle[] = allVehicles
    .filter((v) => suggestedIds.includes(v.id))
    .map((v) => ({ name: v.name, slug: v.slug, detail: v.description }));

  const need = wp.meta.mo_ta_nhu_cau ?? "";
  const body = stripHtml(wp.content?.rendered) || need;

  return {
    slug: wp.slug,
    name: wp.title.rendered,
    shortDescription: (need || body).slice(0, 140),
    detailDescription: body,
    icon: ICON_BY_SLUG[wp.slug] ?? "city-tour",
    iconLabel: wp.title.rendered,
    vehicleTypes,
    suggestedVehicles,
    notes: splitCommaList(wp.meta.luu_y_dich_vu),
    hotline: "1900 6789",
  };
}

export async function fetchServices(): Promise<Service[]> {
  const raw = await fetchRawServices();
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchServices] WP chưa có dịch vụ nào — dùng dữ liệu mock tạm (xem ghi chú trong services.ts).");
      return mockServices;
    }
    return [];
  }
  const vehicles = await fetchVehicles();
  return Promise.all(raw.map((wp) => mapWPServiceToService(wp, vehicles)));
}

export async function fetchServiceBySlug(slug: string): Promise<Service | undefined> {
  const wp = await fetchRawServiceBySlug(slug);
  if (!wp) {
    if (useMockFallback) return mockServices.find((service) => service.slug === slug);
    return undefined;
  }
  const vehicles = await fetchVehicles();
  return mapWPServiceToService(wp, vehicles);
}
