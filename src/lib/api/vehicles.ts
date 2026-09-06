import type { Vehicle } from "@/types/vehicle";
import { vehicles as mockVehicles } from "@/data/vehicles";
import { fetchRawVehicles, fetchRawVehicleBySlug, embeddedTermName, type WPVehicle } from "./raw";
import { getPricingTable, pricingForVehicle } from "./pricing";
import { stripHtml } from "@/lib/wp";

/**
 * fetchVehicles()/fetchVehicleBySlug() — Ngày 12.
 * Cùng chiến lược fallback mock như routes.ts (xem ghi chú ở đó) — tắt bằng cách đổi
 * `useMockFallback` thành false khi muốn thấy đúng trạng thái CMS thật.
 */
const useMockFallback = true;

const COLOR_BY_TYPE: Record<string, Vehicle["color"]> = {
  "4–7 chỗ": "sand",
  "16–29 chỗ": "gold",
  "45 chỗ": "navy",
  "Limousine": "orange",
};

function mapDriverOption(hinh_thuc_lai: WPVehicle["meta"]["hinh_thuc_lai"]): boolean {
  // 'tu_lai' => false (tự lái, không có tài xế). 'co_tai_xe'/'ca_hai' => true.
  // Ghi chú: field Vehicle.driverIncluded là boolean nên "cả hai" (hỗ trợ cả 2 hình thức)
  // tạm quy về true (có tài xế) — cân nhắc đổi field này sang enum 3 giá trị nếu cần phân biệt rõ ở Ngày 24.
  return hinh_thuc_lai === "co_tai_xe" || hinh_thuc_lai === "ca_hai";
}

async function mapWPVehicleToVehicle(wp: WPVehicle): Promise<Vehicle> {
  const pricingTable = await getPricingTable();
  const type = (embeddedTermName(wp._embedded, "vehicle_type") as Vehicle["type"]) ?? "4–7 chỗ";
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
    // Chưa có meta tương ứng bên WordPress — để rỗng tạm, bổ sung khi nhập liệu thật Ngày 24.
    capacity: "",
    description: stripHtml(wp.content.rendered),
    color: COLOR_BY_TYPE[type] ?? "sand",
    imageLabel: wp.title.rendered,
    features: wp.meta.tien_ich ? wp.meta.tien_ich.split(",").map((s) => s.trim()).filter(Boolean) : [],
    driverIncluded: mapDriverOption(wp.meta.hinh_thuc_lai),
    routePrices,
  };
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const rawVehicles = await fetchRawVehicles();
  if (rawVehicles.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchVehicles] WP chưa có vehicle nào — dùng dữ liệu mock tạm (xem ghi chú trong vehicles.ts).");
      return mockVehicles;
    }
    return [];
  }
  return Promise.all(rawVehicles.map(mapWPVehicleToVehicle));
}

export async function fetchVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  const wp = await fetchRawVehicleBySlug(slug);
  if (!wp) {
    if (useMockFallback) return mockVehicles.find((vehicle) => vehicle.slug === slug);
    return undefined;
  }
  return mapWPVehicleToVehicle(wp);
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
