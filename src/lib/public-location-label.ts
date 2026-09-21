import type { Route } from "@/types/route";

export const HO_CHI_MINH_CANONICAL_NAME = "TP. Hồ Chí Minh";
export const HO_CHI_MINH_PUBLIC_LABEL = "Sài Gòn";

type LocationLike =
  | string
  | {
      name?: string | null;
      slug?: string | null;
    }
  | null
  | undefined;

const HO_CHI_MINH_ALIAS_KEYS = new Set([
  "hcm",
  "ho chi minh",
  "sai gon",
  "saigon",
  "thanh pho ho chi minh",
  "tp hcm",
  "tp ho chi minh",
  "tphcm",
]);

const PUBLIC_TEXT_HO_CHI_MINH_PATTERN =
  /(?:Thành phố\s+)?(?:TP\.?\s*)?Hồ\s+Chí\s+Minh|TP\.?\s*HCM/giu;

function publicLocationKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Presentation-only formatter. It never mutates IDs, slugs, URLs, route identity,
 * database values or canonical API values.
 */
export function getPublicLocationLabel(location: LocationLike): string {
  if (!location) return "";
  const name = typeof location === "string" ? location : location.name ?? "";
  const slug = typeof location === "string" ? "" : location.slug ?? "";

  if (
    HO_CHI_MINH_ALIAS_KEYS.has(publicLocationKey(name)) ||
    HO_CHI_MINH_ALIAS_KEYS.has(publicLocationKey(slug))
  ) {
    return HO_CHI_MINH_PUBLIC_LABEL;
  }
  return name.trim();
}

/** Rewrites location wording in user-facing prose/HTML but deliberately leaves URL slugs untouched. */
export function formatPublicLocationText(value: string): string {
  return value.replace(PUBLIC_TEXT_HO_CHI_MINH_PATTERN, HO_CHI_MINH_PUBLIC_LABEL);
}

export function getPublicRouteLocations(route: Pick<Route, "from" | "to">) {
  return {
    from: getPublicLocationLabel(route.from),
    to: getPublicLocationLabel(route.to),
  };
}

export function getPublicRouteLabel(
  route: Pick<Route, "from" | "to">,
  separator = " → ",
): string {
  const { from, to } = getPublicRouteLocations(route);
  return `${from}${separator}${to}`;
}
