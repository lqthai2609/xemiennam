import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site-config";

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  openGraphType?: "website" | "article";
};

const LEGACY_BRAND_PATTERN = /Xe Miền Nam/gi;
const escapedSiteName = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const leadingBrandPattern = new RegExp(`^${escapedSiteName}\\s*(?:[|:·\\-–—])\\s*`, "i");
const trailingBrandPattern = new RegExp(`\\s*(?:[|:·\\-–—])\\s*${escapedSiteName}$`, "i");

/**
 * Metadata is allowed to consume CMS / Rank Math content, but the public brand
 * must remain Gocar VN even while legacy CMS copy is being cleaned separately.
 */
export function sanitizeMetadataText(value: string): string {
  return value.replace(LEGACY_BRAND_PATTERN, SITE_NAME).trim();
}

/**
 * Normalizes page titles before the root `%s | Gocar VN` template is applied.
 * CMS / Rank Math titles are allowed to contain the brand; this removes only a
 * leading or trailing brand token so metadata never renders the brand twice.
 */
export function normalizeMetadataTitle(title: string): string {
  let normalized = sanitizeMetadataText(title);

  for (let index = 0; index < 2; index += 1) {
    normalized = normalized.replace(leadingBrandPattern, "").replace(trailingBrandPattern, "").trim();
  }

  return normalized || SITE_NAME;
}

export function brandedMetadataTitle(title: string): string {
  const normalized = normalizeMetadataTitle(title);
  return normalized === SITE_NAME ? SITE_NAME : `${normalized} | ${SITE_NAME}`;
}

/**
 * Shared Technical SEO contract for indexable page families.
 * `metadataBase` lives in the root layout, therefore canonical and Open Graph
 * URLs can remain path-relative and automatically follow NEXT_PUBLIC_SITE_URL.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  noFollow = false,
  openGraphType = "website",
}: PageMetadataOptions): Metadata {
  const normalizedTitle = normalizeMetadataTitle(title);
  const shareTitle = brandedMetadataTitle(title);
  const sanitizedDescription = sanitizeMetadataText(description);

  return {
    title: normalizedTitle === SITE_NAME ? { absolute: SITE_NAME } : normalizedTitle,
    description: sanitizedDescription,
    ...(path ? { alternates: { canonical: path } } : {}),
    ...(noIndex || noFollow
      ? {
          robots: {
            index: !noIndex,
            follow: !noFollow,
          },
        }
      : {}),
    openGraph: {
      type: openGraphType,
      locale: "vi_VN",
      siteName: SITE_NAME,
      title: shareTitle,
      description: sanitizedDescription,
      ...(path ? { url: path } : {}),
    },
    twitter: {
      card: "summary",
      title: shareTitle,
      description: sanitizedDescription,
    },
  };
}
