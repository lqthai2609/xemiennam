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

const escapedSiteName = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const leadingBrandPattern = new RegExp(`^${escapedSiteName}\\s*(?:[|:·\\-–—])\\s*`, "i");
const trailingBrandPattern = new RegExp(`\\s*(?:[|:·\\-–—])\\s*${escapedSiteName}$`, "i");

/**
 * Normalizes page titles before the root `%s | Gocar VN` template is applied.
 * CMS / Rank Math titles are allowed to contain the brand; this removes only a
 * leading or trailing brand token so metadata never renders the brand twice.
 */
export function normalizeMetadataTitle(title: string): string {
  let normalized = title.trim();

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

  return {
    title: normalizedTitle === SITE_NAME ? { absolute: SITE_NAME } : normalizedTitle,
    description,
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
      description,
      ...(path ? { url: path } : {}),
    },
    twitter: {
      card: "summary",
      title: shareTitle,
      description,
    },
  };
}
