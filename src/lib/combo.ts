import { getVehicleCategory } from "@/data/vehicle-categories";
import { formatPriceShort } from "@/lib/wp";
import {
  vehicleTypeSlug,
  type Route,
  type RoutePricingDirectionKey,
  type RoutePricingPackage,
  type VehiclePrice,
} from "@/types/route";

/**
 * Day 14 — Thin-content Guard.
 *
 * Trang tổ hợp `/tuyen-duong/[tinh]/[tuyen]/[loai-xe]` phải dùng Pricing V2 làm nguồn
 * business pricing. `pricingByVehicle` chỉ còn là fallback compatibility cho route/mock cũ
 * chưa có Pricing V2; fallback đó không được dùng làm tín hiệu SEO indexability.
 */

export const MIN_COMBO_EDITORIAL_CHARS = 120;
export const MIN_COMBO_EDITORIAL_WORDS = 20;

export type ComboIndexabilityReason =
  | "indexable"
  | "invalid-route-entity"
  | "invalid-vehicle-entity"
  | "missing-pricing-v2"
  | "invalid-pricing"
  | "missing-editorial-content"
  | "thin-editorial-content";

export type ComboIndexability = {
  indexable: boolean;
  reason: ComboIndexabilityReason;
  vehiclePrice?: VehiclePrice;
  editorialDescription?: string;
};

function isRenderablePricingPackage(row: RoutePricingPackage): boolean {
  if (row.mode === "contact") return true;
  return row.mode === "fixed" && typeof row.price === "number" && row.price > 0;
}

function pickComboPricingPackage(
  route: Route,
  vehicleSlug: string,
  direction: RoutePricingDirectionKey,
): RoutePricingPackage | undefined {
  const pricing = route.pricingV2?.[direction];
  if (!pricing?.enabled) return undefined;

  const rows = pricing.packages.filter(
    (row) => vehicleTypeSlug(row.vehicleType) === vehicleSlug && isRenderablePricingPackage(row),
  );
  if (rows.length === 0) return undefined;

  const preferred = rows.find((row) => row.packageKey === pricing.featuredPackage);
  if (preferred) return preferred;

  const lowestFixed = rows
    .filter(
      (row): row is RoutePricingPackage & { mode: "fixed"; price: number } =>
        row.mode === "fixed" && typeof row.price === "number" && row.price > 0,
    )
    .sort((a, b) => a.price - b.price)[0];
  if (lowestFixed) return lowestFixed;

  return rows.find((row) => row.mode === "contact");
}

function pricingPackageToVehiclePrice(row: RoutePricingPackage): VehiclePrice {
  const isFixed = row.mode === "fixed" && typeof row.price === "number" && row.price > 0;
  return {
    vehicleType: row.vehicleType,
    price: isFixed ? formatPriceShort(row.price) : row.contactText || "Liên hệ",
    pricingMode: isFixed ? "fixed" : "contact",
    packageKey: row.packageKey,
    packageLabel: row.packageLabel,
    numericPrice: isFixed ? row.price : undefined,
  };
}

/**
 * Tìm giá đại diện của một combo route × vehicle.
 *
 * - Route có Pricing V2: chỉ đọc `pricingV2.outbound` và bỏ `disabled`/fixed <= 0.
 * - Route không có Pricing V2: mới fallback `pricingByVehicle` để giữ compatibility render.
 */
export function findComboVehiclePrice(route: Route, vehicleSlug: string): VehiclePrice | undefined {
  return findComboVehiclePriceForDirection(route, vehicleSlug, "outbound");
}

/**
 * Giá đại diện cho đúng một tổ hợp route × direction × vehicle.
 * Trang combo canonical vẫn là outbound; direction khác chỉ là trạng thái UI từ booking search.
 */
export function findComboVehiclePriceForDirection(
  route: Route,
  vehicleSlug: string,
  direction: RoutePricingDirectionKey,
): VehiclePrice | undefined {
  if (route.pricingV2) {
    const selected = pickComboPricingPackage(route, vehicleSlug, direction);
    return selected ? pricingPackageToVehiclePrice(selected) : undefined;
  }

  if (direction === "inbound") return undefined;
  return route.pricingByVehicle.find((vp) => vehicleTypeSlug(vp.vehicleType) === vehicleSlug);
}

/**
 * Slug vehicle có combo renderable. Thin-content vẫn được render cho người dùng nhưng sẽ
 * được `noindex,follow`; chỉ pricing invalid/disabled mới bị loại khỏi tập renderable.
 */
export function getRenderableComboVehicleSlugs(route: Route): string[] {
  if (route.pricingV2) {
    if (!route.pricingV2.outbound.enabled) return [];
    return Array.from(
      new Set(
        route.pricingV2.outbound.packages
          .filter(isRenderablePricingPackage)
          .map((row) => vehicleTypeSlug(row.vehicleType))
          .filter((slug) => Boolean(getVehicleCategory(slug))),
      ),
    );
  }

  return Array.from(
    new Set(
      route.pricingByVehicle
        .map((row) => vehicleTypeSlug(row.vehicleType))
        .filter((slug) => Boolean(getVehicleCategory(slug))),
    ),
  );
}

/** Nội dung CMS biên tập riêng cho đúng route × vehicle; đây là tín hiệu SEO duy nhất. */
export function findComboEditorialDescription(route: Route, vp: VehiclePrice): string | undefined {
  const description = route.comboDescriptions
    ?.find((item) => item.vehicleType === vp.vehicleType)
    ?.description.trim();
  return description || undefined;
}

/**
 * Nội dung dùng để render. Legacy `VehiclePrice.comboDescription` chỉ giữ compatibility
 * với mock/static data cũ và KHÔNG được dùng làm bằng chứng rằng trang đủ unique để index.
 */
export function findComboDescription(route: Route, vp: VehiclePrice): string | undefined {
  const cmsDescription = findComboEditorialDescription(route, vp);
  if (cmsDescription) return cmsDescription;

  const legacyDescription = vp.comboDescription?.trim();
  return legacyDescription || undefined;
}

function editorialWordCount(value: string): number {
  return value.split(/\s+/u).filter(Boolean).length;
}

function hasValidRouteEntity(route: Route): boolean {
  return Boolean(
    route.id.trim() &&
      route.slug.trim() &&
      route.regionSlug.trim() &&
      route.from.trim() &&
      route.to.trim(),
  );
}

/**
 * Quyết định indexability cho combo.
 *
 * Guard tối thiểu: route + vehicle entity hợp lệ, có Pricing V2 renderable và có nội dung
 * CMS riêng >= 120 ký tự + >= 20 từ. Đây là safety threshold để chặn trang quá mỏng,
 * không phải thước đo chất lượng/uniqueness tuyệt đối của nội dung biên tập.
 */
export function getComboIndexability(route: Route, vehicleSlug: string): ComboIndexability {
  if (!hasValidRouteEntity(route)) {
    return { indexable: false, reason: "invalid-route-entity" };
  }
  if (!getVehicleCategory(vehicleSlug)) {
    return { indexable: false, reason: "invalid-vehicle-entity" };
  }
  if (!route.pricingV2) {
    return { indexable: false, reason: "missing-pricing-v2" };
  }

  const vehiclePrice = findComboVehiclePrice(route, vehicleSlug);
  if (!vehiclePrice) {
    return { indexable: false, reason: "invalid-pricing" };
  }

  const editorialDescription = findComboEditorialDescription(route, vehiclePrice);
  if (!editorialDescription) {
    return {
      indexable: false,
      reason: "missing-editorial-content",
      vehiclePrice,
    };
  }

  if (
    editorialDescription.length < MIN_COMBO_EDITORIAL_CHARS ||
    editorialWordCount(editorialDescription) < MIN_COMBO_EDITORIAL_WORDS
  ) {
    return {
      indexable: false,
      reason: "thin-editorial-content",
      vehiclePrice,
      editorialDescription,
    };
  }

  return {
    indexable: true,
    reason: "indexable",
    vehiclePrice,
    editorialDescription,
  };
}

/** Sitemap chỉ nhận combo đủ điều kiện index. */
export function getIndexableComboVehicleSlugs(route: Route): string[] {
  return getRenderableComboVehicleSlugs(route).filter(
    (vehicleSlug) => getComboIndexability(route, vehicleSlug).indexable,
  );
}

/**
 * Mô tả dùng để render khi CMS chưa có content riêng.
 * Fallback này chỉ bảo đảm trang không lỗi/không rỗng; nó KHÔNG được xem là nội dung unique
 * để quyết định indexability.
 */
export function comboDescriptionOrDefault(route: Route, vp: VehiclePrice): string {
  const editorialDescription = findComboDescription(route, vp);
  if (editorialDescription) return editorialDescription;

  const prefix = route.summary ? `${route.summary} ` : "";
  if (vp.pricingMode === "contact") {
    return `${prefix}Thuê xe ${vp.vehicleType} tuyến ${route.from} – ${route.to}; liên hệ để nhận báo giá theo lịch thực tế.`;
  }

  return `${prefix}Giá thuê xe ${vp.vehicleType} tham khảo ${vp.price} cho tuyến ${route.from} – ${route.to}.`;
}
