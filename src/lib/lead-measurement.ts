/** First-party measurement only. No visitor ID, cookies, storage or third-party sender. */
export const LEAD_MEASUREMENT_POLICY = "visit_30d_v1";
export const LEAD_MEASUREMENT_RETENTION_DAYS = 30;
const PUBLIC_LANDINGS: Record<string, string> = {
  "/": "homepage", "/lien-he": "service", "/tuyen-duong": "route_index",
  "/bang-gia": "price", "/loai-xe": "vehicle_pillar",
  "/tuyen-duong/ba-ria-vung-tau/tp-hcm-vung-tau": "route_detail",
};
const SOURCE_FIELDS = ["utm_source", "utm_medium", "utm_campaign"] as const;
// A small reviewed launch vocabulary avoids retaining names disguised as campaign slugs.
const SAFE_TOKENS = {
  utm_source: ["google", "bing", "facebook", "zalo", "youtube", "newsletter", "partner"],
  utm_medium: ["organic", "cpc", "ppc", "paid_search", "paid_social", "referral", "email", "social", "affiliate", "direct", "other"],
  utm_campaign: ["sg_vt_launch_v1"],
};
type SourceField = typeof SOURCE_FIELDS[number];
export type LeadAcquisition = {
  consent_state: "granted" | "denied" | "unknown";
  policy_version?: typeof LEAD_MEASUREMENT_POLICY;
  landing_path?: string | null; landing_family?: string | null;
  referrer_origin?: string | null; paid_marker_present?: boolean;
} & Partial<Record<SourceField, string | null>>;

function safeToken(value: unknown, field: SourceField): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  if (!SAFE_TOKENS[field].includes(token)) return null;
  if (field === "utm_medium" && token === "email") return token;
  if (!/^[a-z][a-z0-9_-]{0,99}$/.test(token) || /\d{8,}|(?:phone|email|address|token|password|customer|dia_chi|so_dien_thoai)/i.test(token)) return null;
  return token;
}
export function normalizeAcquisition(input: unknown, enabled: boolean): LeadAcquisition {
  if (!enabled || !input || typeof input !== "object") return { consent_state: "unknown" };
  const value = input as Record<string, unknown>;
  if (value.consent_state === "denied") return { consent_state: "denied" };
  if (value.consent_state !== "granted" || value.policy_version !== LEAD_MEASUREMENT_POLICY) return { consent_state: "unknown" };
  const rawPath = typeof value.landing_path === "string" ? value.landing_path : "";
  const path = rawPath === "/" ? "/" : rawPath.replace(/\/$/, "");
  const landing = Object.hasOwn(PUBLIC_LANDINGS, path) ? path : null;
  let referrer: string | null = null;
  if (typeof value.referrer_origin === "string" && value.referrer_origin.length <= 2048) {
    try {
      const url = new URL(value.referrer_origin);
      // Host-only origins: no raw referrer path/query, credentials, IP or opaque subdomain.
      if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.port &&
          /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(url.hostname) && !/\d{8,}/.test(url.hostname) &&
          (url.hostname.split(".").length === 2 || /^(?:www\.)?(?:google\.com(?:\.vn)?|bing\.com|search\.yahoo\.com|duckduckgo\.com|coccoc\.com|alodatxe\.com)$/.test(url.hostname))) referrer = url.origin;
    } catch { /* Invalid optional context must never block a booking. */ }
  }
  const result: LeadAcquisition = { consent_state: "granted", policy_version: LEAD_MEASUREMENT_POLICY,
    landing_path: landing, landing_family: landing ? PUBLIC_LANDINGS[landing] : null,
    referrer_origin: referrer, paid_marker_present: value.paid_marker_present === true };
  for (const field of SOURCE_FIELDS) result[field] = safeToken(value[field], field);
  return result;
}
export function acquisitionFromEntry(href: string, referrer: string): LeadAcquisition {
  try {
    const url = new URL(href);
    return normalizeAcquisition({ consent_state: "granted", policy_version: LEAD_MEASUREMENT_POLICY,
      landing_path: url.pathname, referrer_origin: referrer || url.origin,
      paid_marker_present: ["gclid", "gbraid", "wbraid", "fbclid"].some(key => url.searchParams.has(key)),
      ...Object.fromEntries(SOURCE_FIELDS.map(key => [key, url.searchParams.getAll(key).length === 1 ? url.searchParams.get(key) : null])),
    }, true);
  } catch { return { consent_state: "unknown" }; }
}
