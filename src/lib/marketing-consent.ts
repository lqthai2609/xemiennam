export type MarketingConsentState = "granted" | "denied" | "unknown";

const STORAGE_KEY = "alo_marketing_consent_v1";
const POLICY_VERSION = 1;
const GRANT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export function readMarketingConsent(now = Date.now()): MarketingConsentState {
  if (typeof window === "undefined") return "unknown";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return "unknown";
    const record: unknown = JSON.parse(value);
    if (!record || typeof record !== "object") return "unknown";
    const { version, state, recordedAt } = record as Record<string, unknown>;
    if (version !== POLICY_VERSION || (state !== "granted" && state !== "denied")) return "unknown";
    if (typeof recordedAt !== "number" || !Number.isFinite(recordedAt) || recordedAt > now) return "unknown";
    if (state === "granted" && now - recordedAt >= GRANT_LIFETIME_MS) return "unknown";
    return state;
  } catch {
    return "unknown";
  }
}

export function setMarketingConsent(state: "granted" | "denied", now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: POLICY_VERSION, state, recordedAt: now }));
    return true;
  } catch {
    return false;
  }
}

export function hasMarketingConsent(): boolean {
  return readMarketingConsent() === "granted";
}

export const marketingConsentStorageKey = STORAGE_KEY;

export function clearMarketingCookies(): void {
  if (typeof document === "undefined") return;
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0]?.trim();
    if (!name || !/^(_ga(?:_|$)|_gcl_|_fbp$)/.test(name)) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

export function subscribeMarketingConsent(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
