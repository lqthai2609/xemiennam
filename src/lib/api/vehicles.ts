import type { Vehicle } from "@/types/vehicle";
import { vehicles as mockVehicles } from "@/data/vehicles";
import { fetchRawVehicles, fetchRawVehicleBySlug, embeddedTermName, type WPVehicle } from "./raw";
import { getPricingTable, pricingForVehicle } from "./pricing";
import { shouldUseMockFallback } from "./mock-fallback";
import { stripHtml, wpFetch } from "@/lib/wp";

const useMockFallback = shouldUseMockFallback();

const COLOR_BY_TYPE: Record<string, Vehicle["color"]> = {
  "4 chỗ": "sand",
  "7 chỗ": "gold",
  "16 chỗ": "navy",
  "29 chỗ": "orange",
  "45 chỗ": "navy",
  "Limousine": "orange",
};

function mapDriverOption(hinh_thuc_lai: WPVehicle["meta"]["hinh_thuc_lai"]): boolean {
  return hinh_thuc_lai === "co_tai_xe" || hinh_thuc_lai === "ca_hai";
}

async function resolveGalleryImages(mediaIds: number[] | undefined): Promise<string[]> {
  if (!mediaIds || mediaIds.length === 0) return [];
  const ids = mediaIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return [];

  const media = await wpFetch<{ id: number; source_url: string }[]>(
    `/media?include=${ids.join(",")}&_fields=id,source_url&per_page=${ids.length}`,
  );
  if (!media) return [];

  const urlById = new Map(media.map((m) => [m.id, m.source_url]));
  return ids.map((id) => urlById.get(id)).filter((url): url is string => Boolean(url));
}

async function mapWPVehicleToVehicle(wp: WPVehicle): Promise<Vehicle> {
  const [pricingTable, images] = await Promise.all([getPricingTable(), resolveGalleryImages(wp.meta.gallery_anh)]);
  const type = embeddedTermName(wp._embedded, "vehicle_type") ?? "4 chỗ";
  const routePrices = pricingForVehicle(pricingTable, String(wp.id)).map((row) => ({
    route: row.routeLabel,
    price: row.priceLabel,
    note: "Giá tham khảo, có thể thay đổi theo mùa/lễ",
  }));

  return {
    id: String(wp.id),
    slug: wp.slug,
    name: wp.title.rendered,
    type,
    seats: wp.meta.so_cho ? `${wp.meta.so_cho} chỗ` : "",
    capacity: "",
    description: stripHtml(wp.content.rendered),
    color: COLOR_BY_TYPE[type] ?? "sand",
    imageLabel: wp.title.rendered,
    images,
    features: wp.meta.tien_ich ?? [],
    driverIncluded: mapDriverOption(wp.meta.hinh_thuc_lai),
    routePrices,
    modifiedDate: wp.modified,
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
  };
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const rawVehicles = await fetchRawVehicles();
  if (rawVehicles.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchVehicles] WP chưa có vehicle nào — dùng dữ liệu mock theo policy môi trường.");
      return mockVehicles;
    }
    return [];
  }
  return Promise.all(rawVehicles.map(mapWPVehicleToVehicle));
}

export async function fetchVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  const wp = await fetchRawVehicleBySlug(slug);
  if (wp) return mapWPVehicleToVehicle(wp);
  if (useMockFallback) {
    const rawVehicles = await fetchRawVehicles();
    if (rawVehicles.length === 0) {
      return mockVehicles.find((vehicle) => vehicle.slug === slug);
    }
  }
  return undefined;
}

export async function fetchSimilarVehicles(currentSlug: string, count = 3): Promise<Vehicle[]> {
  const all = await fetchVehicles();
  const current = all.find((vehicle) => vehicle.slug === currentSlug);
  const others = all.filter((vehicle) => vehicle.slug !== currentSlug);
  if (!current) return others.slice(0, count);
  const sameType = others.filter((vehicle) => vehicle.type === current.type);
  const rest = others.filter((vehicle) => vehicle.type !== current.type);
  return [...sameType, ...rest].slice(0, count);
}
