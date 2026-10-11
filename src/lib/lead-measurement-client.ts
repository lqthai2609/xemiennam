"use client";
import { acquisitionFromEntry, type LeadAcquisition } from "./lead-measurement";

let entry: LeadAcquisition | null = null;
let capturedAt = 0;
let consent: LeadAcquisition["consent_state"] = "unknown";
const recent = new Map<string, number>();
/** Only sanitized entry metadata in tab memory; never a visitor identifier. */
export function rememberMeasurementEntry(href: string, referrer: string) {
  if (entry === null) { entry = acquisitionFromEntry(href, referrer); capturedAt = Date.now(); }
}
export function setMeasurementConsent(allowed: boolean) {
  consent = allowed ? "granted" : "denied";
  if (!allowed) { entry = null; recent.clear(); }
}
export function currentLeadAcquisition(): LeadAcquisition {
  if (consent !== "granted" || !entry) return { consent_state: consent };
  if (Date.now() - capturedAt > 30 * 60 * 1000) { entry = null; return { consent_state: "unknown" }; }
  return { ...entry };
}
export function trackFirstPartyContact(channel: "phone" | "zalo", now = Date.now()) {
  const acquisition = currentLeadAcquisition();
  if (acquisition.consent_state !== "granted" || !acquisition.landing_path) return;
  const key = `${channel}:${acquisition.landing_path}`;
  if (now - (recent.get(key) ?? -Infinity) < 5000) return;
  recent.set(key, now);
  // Failure cannot prevent the Call/Zalo action. The random event ID only de-duplicates this click.
  void fetch("/api/measurement/contact", { method: "POST", keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: crypto.randomUUID(), event_name: "contact_click", channel, acquisition }),
  }).catch(() => undefined);
}
