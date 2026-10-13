import type { Route, RoutePricingDirectionKey, RoutePricingPackage } from "@/types/route";

/** Synthetic data only; never imports WordPress transports or booking services. */
export const PRICING_PREVIEW_COOKIE = "alo_pricing_demo";
export type PreviewChanges = Record<string, { mode: "fixed" | "contact"; price?: number }>;
export type PreviewState = { revision: number; changes: PreviewChanges };
const packages = { one_way: "Một chiều", round_trip_day: "Khứ hồi trong ngày", "2d1n": "2 ngày 1 đêm", "3d2n": "3 ngày 2 đêm" };

export function previewRowKey(row: Pick<RoutePricingPackage, "direction" | "vehicleId" | "packageKey">) {
  return `${row.direction}:${row.vehicleId}:${row.packageKey}`;
}

export function pricingPreviewRoute(changes: PreviewChanges = {}): Route {
  function direction(key: RoutePricingDirectionKey) {
    const rows = ["4 chỗ", "7 chỗ", "16 chỗ"].flatMap((vehicleType, index) => Object.entries(packages).map(([packageKey, packageLabel]): RoutePricingPackage => {
      const vehicleId = String(2001 + index);
      const update = changes[`${key}:${vehicleId}:${packageKey}`];
      const mode = update?.mode ?? (index === 2 || packageKey === "3d2n" ? "contact" : "fixed");
      const amount = update?.price ?? ((key === "outbound" ? 1000000 : 900000) + index * 200000 + Object.keys(packages).indexOf(packageKey) * 600000);
      return { direction: key, vehicleId, vehicleType, packageKey, packageLabel, mode, ...(mode === "fixed" ? { price: amount, priceLabel: `${Math.round(amount / 1000).toLocaleString("vi-VN")}K` } : { contactText: "Liên hệ báo giá" }) };
    }));
    return { key, enabled: true, featuredPackage: "one_way", packages: rows, featured: rows[0] };
  }
  const outbound = direction("outbound"), inbound = direction("inbound");
  return {
    id: "1001", slug: "tuyen-mo-phong", from: "Sài Gòn", to: "Vũng Tàu", time: "", distance: "", price: outbound.featured.priceLabel || "Liên hệ báo giá", vehicleTypes: ["4 chỗ", "7 chỗ", "16 chỗ"], region: "Vũng Tàu", regionSlug: "ba-ria-vung-tau", seatCount: ["4", "7", "16"],
    pricingV2: { outbound, inbound }, pricingByVehicle: [], pickupPoints: [], dropoffPoints: [], mapEmbedSrc: "", summary: "Dữ liệu giả để thử sửa giá.", heroNote: "", departures: [], notes: [],
  };
}

export function decodePreviewState(value?: string): PreviewState {
  try {
    const data = JSON.parse(Buffer.from(value || "", "base64url").toString());
    if (!Number.isSafeInteger(data.revision) || data.revision < 0 || typeof data.changes !== "object" || !data.changes || Array.isArray(data.changes)) throw new Error();
    const allowed = pricingPreviewRoute().pricingV2!;
    const keys = new Set([...allowed.outbound.packages, ...allowed.inbound.packages].map(previewRowKey));
    const changes: PreviewChanges = {};
    for (const [key, row] of Object.entries(data.changes)) {
      if (!keys.has(key) || !row || typeof row !== "object") continue;
      const r = row as { mode?: string; price?: number };
      if (r.mode === "contact") changes[key] = { mode: "contact" };
      if (r.mode === "fixed" && Number.isSafeInteger(r.price) && r.price! > 0) changes[key] = { mode: "fixed", price: r.price };
    }
    return { revision: data.revision, changes };
  } catch { return { revision: 0, changes: {} }; }
}
