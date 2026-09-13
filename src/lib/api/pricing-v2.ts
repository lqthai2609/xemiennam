import { SITE_HOTLINE, SITE_HOTLINE_TEL } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";
import { fetchRawRoutes, type WPRoute } from "./raw";
import type { RouteDirectionKey } from "./route-directions";

/**
 * Ngày 5 V2 — Pricing Package Model.
 *
 * Pricing được xác định theo đúng 4 chiều dữ liệu:
 * route × direction × vehicle × package.
 * Airport Transfer không có engine riêng; airport chỉ là Location và dùng contract này như
 * mọi route khác. Module này chưa thay UI/CMS hiện tại — phần nhập liệu quản trị thuộc Ngày 6,
 * phần nối card/route/booking/schema thuộc Ngày 7.
 */
export const STANDARD_PRICING_PACKAGE_KEYS = ["one_way", "round_trip_day", "2d1n", "3d2n"] as const;

export type StandardPricingPackageKey = (typeof STANDARD_PRICING_PACKAGE_KEYS)[number];
/** String mở để sau này thêm 4d3n/5d4n hoặc package thương mại mà không phải đổi schema. */
export type PricingPackageKey = string;
export type PricingMode = "fixed" | "contact" | "disabled";
export type PricingSource = "v2" | "legacy";

export const DEFAULT_PRICING_CONTACT_TEXT = "Liên hệ để nhận báo giá";

export interface PricingPackageV2 {
  routeId: string;
  routeSlug: string;
  direction: RouteDirectionKey;
  vehicleId: string;
  packageKey: PricingPackageKey;
  mode: PricingMode;
  /** Chỉ tồn tại khi mode=fixed và luôn > 0. Không dùng 0 để biểu diễn chưa có giá. */
  price?: number;
  /** Chỉ có ý nghĩa với mode=contact. */
  contactText?: string;
  source: PricingSource;
}

export interface PricingLookupV2 {
  routeId: string;
  routeSlug: string;
  direction: RouteDirectionKey;
  vehicleId: string;
  packageKey: PricingPackageKey;
}

export interface FixedPriceRangeV2 {
  min: number;
  max: number;
}

export interface PricingSchemaRangeV2 {
  lowPrice: number;
  highPrice: number;
  priceCurrency: "VND";
}

type WPPricingPackageRowV2 = {
  direction?: string;
  vehicle_id?: number | string;
  package_key?: string;
  pricing_mode?: string;
  price?: number | string;
  contact_text?: string;
};

type WPRoutePricingV2Meta = {
  pricing_model_version?: number | string;
  pricing_packages_v2?: WPPricingPackageRowV2[];
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toPositivePrice(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toPositiveId(value: unknown): string | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(Math.trunc(parsed)) : undefined;
}

function toPricingModelVersion(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1;
}

function normalizeDirection(value: unknown): RouteDirectionKey {
  return typeof value === "string" && normalizeKey(value) === "inbound" ? "inbound" : "outbound";
}

function normalizeContactText(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || DEFAULT_PRICING_CONTACT_TEXT;
}

/**
 * Chuẩn hóa key package mới và alias dữ liệu cũ.
 * Unknown key vẫn được giữ ở dạng snake_case để model có thể mở rộng package về sau mà không
 * cần đổi schema/database chỉ vì thêm 4d3n, 5d4n hoặc package thương mại khác.
 */
export function normalizePricingPackageKey(value: unknown): PricingPackageKey {
  const key = typeof value === "string" ? normalizeKey(value) : "";

  if (!key || ["mot_chieu", "oneway", "one_way"].includes(key)) return "one_way";
  if (
    [
      "round_trip_day",
      "round_trip_same_day",
      "hai_chieu_trong_ngay",
      "2_chieu_trong_ngay",
      "khu_hoi_trong_ngay",
    ].includes(key)
  ) {
    return "round_trip_day";
  }
  if (["2d1n", "2_ngay_1_dem", "two_days_one_night"].includes(key)) return "2d1n";
  if (["3d2n", "3_ngay_2_dem", "three_days_two_nights"].includes(key)) return "3d2n";

  return key;
}

export function pricingPackageLabel(packageKey: PricingPackageKey): string {
  switch (packageKey) {
    case "one_way":
      return "Một chiều";
    case "round_trip_day":
      return "Khứ hồi trong ngày";
    case "2d1n":
      return "2 ngày 1 đêm";
    case "3d2n":
      return "3 ngày 2 đêm";
    default:
      return packageKey;
  }
}

/**
 * Quy tắc an toàn cốt lõi:
 * - disabled luôn là disabled;
 * - contact không mang price;
 * - fixed chỉ hợp lệ khi price > 0;
 * - fixed nhưng thiếu/0/âm tự hạ về contact, tuyệt đối không đẩy price=0 ra consumer.
 */
export function normalizePricingMode(value: unknown, price: number | undefined): PricingMode {
  const mode = typeof value === "string" ? normalizeKey(value) : "";
  if (mode === "disabled") return "disabled";
  if (mode === "contact") return "contact";
  if (mode === "fixed") return price ? "fixed" : "contact";
  return price ? "fixed" : "contact";
}

function mapExplicitV2Rows(route: WPRoute, rows: WPPricingPackageRowV2[]): PricingPackageV2[] {
  const output: PricingPackageV2[] = [];

  for (const row of rows) {
    const vehicleId = toPositiveId(row.vehicle_id);
    if (!vehicleId) continue;

    const price = toPositivePrice(row.price);
    const mode = normalizePricingMode(row.pricing_mode, price);

    output.push({
      routeId: String(route.id),
      routeSlug: route.slug,
      direction: normalizeDirection(row.direction),
      vehicleId,
      packageKey: normalizePricingPackageKey(row.package_key),
      mode,
      price: mode === "fixed" ? price : undefined,
      contactText: mode === "contact" ? normalizeContactText(row.contact_text) : undefined,
      source: "v2",
    });
  }

  return output;
}

/**
 * Fallback dữ liệu cũ: pricing_by_vehicle được hiểu là outbound + package theo loai_gia,
 * mặc định one_way. Chỉ các dòng có giá >0 trở thành fixed; giá rỗng/0/âm không bao giờ được
 * phát ra dưới dạng số 0.
 */
function mapLegacyRows(route: WPRoute): PricingPackageV2[] {
  const rows = route.meta?.pricing_by_vehicle ?? [];
  const output: PricingPackageV2[] = [];

  for (const row of rows) {
    const vehicleId = toPositiveId(row.vehicle_id);
    if (!vehicleId) continue;

    const price = toPositivePrice(row.gia);
    const mode: PricingMode = price ? "fixed" : "contact";

    output.push({
      routeId: String(route.id),
      routeSlug: route.slug,
      direction: "outbound",
      vehicleId,
      packageKey: normalizePricingPackageKey(row.loai_gia),
      mode,
      price: mode === "fixed" ? price : undefined,
      contactText: mode === "contact" ? DEFAULT_PRICING_CONTACT_TEXT : undefined,
      source: "legacy",
    });
  }

  return output;
}

/**
 * Một route chỉ chuyển sang đọc thuần V2 khi pricing_model_version>=2 hoặc đã có row V2.
 * Nhờ vậy chỉ việc đăng ký meta mới trong WordPress không làm các route legacy mất giá ngay.
 */
export function mapWPRouteToPricingPackagesV2(route: WPRoute): PricingPackageV2[] {
  const meta = route.meta as WPRoute["meta"] & WPRoutePricingV2Meta;
  const v2Rows = Array.isArray(meta.pricing_packages_v2) ? meta.pricing_packages_v2 : [];
  const modelVersion = toPricingModelVersion(meta.pricing_model_version);

  if (modelVersion >= 2 || v2Rows.length > 0) {
    return mapExplicitV2Rows(route, v2Rows);
  }

  return mapLegacyRows(route);
}

export async function fetchPricingPackagesV2(): Promise<PricingPackageV2[]> {
  const routes = await fetchRawRoutes();
  return routes.flatMap(mapWPRouteToPricingPackagesV2);
}

export function pricingForRouteV2(rows: PricingPackageV2[], routeId: string): PricingPackageV2[] {
  return rows.filter((row) => row.routeId === routeId);
}

export function getPackageV2(rows: PricingPackageV2[], lookup: PricingLookupV2): PricingPackageV2 | undefined {
  return rows.find(
    (row) =>
      row.routeId === lookup.routeId &&
      row.direction === lookup.direction &&
      row.vehicleId === lookup.vehicleId &&
      row.packageKey === lookup.packageKey,
  );
}

/**
 * Resolver dành cho consumer: nếu tổ hợp chưa có row thì mặc định contact thay vì tự đoán 0.
 * Đây là contract quan trọng để card/route/airport/booking có cùng hành vi ở Ngày 7.
 */
export function resolvePackageV2(rows: PricingPackageV2[], lookup: PricingLookupV2): PricingPackageV2 {
  return (
    getPackageV2(rows, lookup) ?? {
      ...lookup,
      mode: "contact",
      contactText: DEFAULT_PRICING_CONTACT_TEXT,
      source: "v2",
    }
  );
}

/**
 * Lấy giá đại diện cho một scope (thường là các row cùng route + direction + vehicle).
 * Ưu tiên package được direction cấu hình; nếu không có thì lấy fixed thấp nhất. Nếu chưa có
 * fixed nhưng có contact thì trả contact; chỉ trả disabled khi toàn bộ scope bị tắt.
 */
export function getFeaturedPriceV2(
  rows: PricingPackageV2[],
  featuredPackage?: PricingPackageKey | string | null,
): PricingPackageV2 | undefined {
  if (rows.length === 0) return undefined;

  const preferredKey = featuredPackage ? normalizePricingPackageKey(featuredPackage) : undefined;
  if (preferredKey) {
    const preferred = rows.filter((row) => row.packageKey === preferredKey);
    const preferredFixed = preferred
      .filter((row) => row.mode === "fixed" && row.price)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
    if (preferredFixed) return preferredFixed;

    const preferredContact = preferred.find((row) => row.mode === "contact");
    if (preferredContact) return preferredContact;

    const preferredDisabled = preferred.find((row) => row.mode === "disabled");
    if (preferredDisabled) return preferredDisabled;
  }

  const fixed = rows
    .filter((row) => row.mode === "fixed" && row.price)
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
  if (fixed) return fixed;

  return rows.find((row) => row.mode === "contact") ?? rows.find((row) => row.mode === "disabled");
}

/** Min/max chỉ tính fixed >0. contact/disabled không được biến thành 0 trong schema. */
export function getFixedPriceRangeV2(rows: PricingPackageV2[]): FixedPriceRangeV2 | undefined {
  const prices = rows
    .filter((row) => row.mode === "fixed" && typeof row.price === "number" && row.price > 0)
    .map((row) => row.price as number);

  if (prices.length === 0) return undefined;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getPricingSchemaRangeV2(rows: PricingPackageV2[]): PricingSchemaRangeV2 | undefined {
  const range = getFixedPriceRangeV2(rows);
  if (!range) return undefined;
  return { lowPrice: range.min, highPrice: range.max, priceCurrency: "VND" };
}

/** CTA contact dùng cấu hình site hiện hữu; Pricing V2 không hard-code hotline/Zalo riêng. */
export function getPricingContactContext(contactText?: string | null) {
  return {
    contactText: normalizeContactText(contactText),
    hotline: SITE_HOTLINE,
    telHref: `tel:${SITE_HOTLINE_TEL}`,
    zaloHref: getZaloChatLink(),
  };
}
