import { fetchRawRoutes, fetchRawVehicles, embeddedTermName, type WPVehicle } from "./raw";
import { formatPriceShort } from "@/lib/wp";

/**
 * Nguồn giá DUY NHẤT — đọc đúng 1 lần từ repeater `pricing_by_vehicle` trong CPT `route`
 * (Next.js request memoization tự gộp các lời gọi fetchRawRoutes()/fetchRawVehicles() giống hệt
 * nhau trong cùng 1 lượt render, nên routes.ts và vehicles.ts gọi hàm này song song không tốn
 * thêm request thật). Đúng nguyên tắc mục 3 kiến trúc kỹ thuật + ghi chú cuối xemiennam-v0-prompts.md:
 * trang tuyến, trang xe, trang kết hợp (Ngày 14) và /bang-gia (Ngày 15) đều phải đọc từ đây.
 */
export type PricingRow = {
  routeId: string;
  routeSlug: string;
  routeLabel: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  price: number;
  priceLabel: string;
};

export async function getPricingTable(): Promise<PricingRow[]> {
  const [rawRoutes, rawVehicles] = await Promise.all([fetchRawRoutes(), fetchRawVehicles()]);
  const vehicleById = new Map<string, WPVehicle>(rawVehicles.map((v) => [String(v.id), v]));
  const rows: PricingRow[] = [];

  for (const route of rawRoutes) {
    const pricing = route.meta?.pricing_by_vehicle ?? [];
    for (const p of pricing) {
      const vehicleId = String(p.vehicle_id);
      const vehicle = vehicleById.get(vehicleId);
      const price = Number(p.gia) || 0;
      rows.push({
        routeId: String(route.id),
        routeSlug: route.slug,
        routeLabel: [route.meta?.diem_di, route.meta?.diem_den].filter(Boolean).join(" → "),
        vehicleId,
        vehicleName: vehicle?.title.rendered ?? "",
        vehicleType: vehicle ? embeddedTermName(vehicle._embedded, "vehicle_type") ?? "" : "",
        price,
        priceLabel: formatPriceShort(price),
      });
    }
  }
  return rows;
}

/** Tiện ích: lọc bảng giá theo 1 route cụ thể (dùng lại cho trang chi tiết tuyến). */
export function pricingForRoute(table: PricingRow[], routeId: string): PricingRow[] {
  return table.filter((row) => row.routeId === routeId);
}

/** Tiện ích: lọc bảng giá theo 1 xe cụ thể (dùng lại cho trang chi tiết xe). */
export function pricingForVehicle(table: PricingRow[], vehicleId: string): PricingRow[] {
  return table.filter((row) => row.vehicleId === vehicleId);
}
