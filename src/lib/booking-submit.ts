"use client";
import { currentLeadAcquisition } from "./lead-measurement-client";

// Retain a UUID for the same form payload across HTTP retries in this tab.
// Only a SHA-256 digest is retained in memory; names, phone and addresses are not stored here.
const pending = new Map<string, string>();

export async function fetchBookingWithIdempotency(input: string, init: RequestInit): Promise<Response> {
  const payload = typeof init.body === "string" ? init.body : "";
  const body = JSON.parse(payload) as Record<string, unknown>;
  delete body.acquisition;
  const stablePayload = JSON.stringify(body);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stablePayload))))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  let key = pending.get(digest);
  if (!key) {
    key = crypto.randomUUID();
    if (pending.size >= 20) pending.delete(pending.keys().next().value!);
    pending.set(digest, key);
  }
  const response = await fetch(input, { ...init, body: JSON.stringify({ ...body, acquisition: currentLeadAcquisition() }), headers: { ...init.headers, "x-lead-idempotency-key": key } });
  if (response.ok) {
    const result = await response.clone().json().catch(() => null);
    if (result?.ok === true && Number.isSafeInteger(result.leadId) && result.leadId > 0) pending.delete(digest);
  }
  return response;
}
