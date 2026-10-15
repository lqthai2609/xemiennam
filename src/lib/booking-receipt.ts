"use client";

export const BOOKING_RECEIPT_KEY = "alo-booking-receipt-v1";
export const BOOKING_RECEIPT_TTL = 30 * 60 * 1000;
const RECEIPT_EVENT = "alo-booking-receipt";
let memoryReceipt = "";
export type BookingReceipt = { version: 1; leadId: number; kind: "booking" | "quote"; recordedAt: number };

export function parseBookingReceipt(raw: string | null, now = Date.now()): BookingReceipt | null {
  if (!raw || raw.length > 512) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Number.isSafeInteger(value.leadId) || value.leadId <= 0 ||
      !["booking", "quote"].includes(value.kind) || !Number.isSafeInteger(value.recordedAt) ||
      value.recordedAt > now || now - value.recordedAt >= BOOKING_RECEIPT_TTL) return null;
    return { version: 1, leadId: value.leadId, kind: value.kind, recordedAt: value.recordedAt };
  } catch { return null; }
}

/** Called only after readCreatedLead confirms a persisted ID; never retain form PII. */
export function rememberBookingReceipt(leadId: number, kind: BookingReceipt["kind"]) {
  if (!Number.isSafeInteger(leadId) || leadId <= 0 || !["booking", "quote"].includes(kind)) return;
  memoryReceipt = JSON.stringify({ version: 1, leadId, kind, recordedAt: Date.now() });
  try { window.sessionStorage.setItem(BOOKING_RECEIPT_KEY, memoryReceipt); } catch { /* The same-tab memory fallback still allows navigation. */ }
  window.dispatchEvent(new Event(RECEIPT_EVENT));
}

function rawReceipt(): string {
  if (memoryReceipt) return memoryReceipt;
  try { return window.sessionStorage.getItem(BOOKING_RECEIPT_KEY) ?? ""; } catch { return ""; }
}
export function bookingReceiptSnapshot(): string {
  const raw = rawReceipt();
  return parseBookingReceipt(raw) ? raw : "";
}
export function subscribeBookingReceipt(listener: () => void) {
  const notify = () => {
    if (!parseBookingReceipt(rawReceipt())) {
      memoryReceipt = "";
      try { window.sessionStorage.removeItem(BOOKING_RECEIPT_KEY); } catch { /* No receipt is displayed. */ }
    }
    listener();
  };
  window.addEventListener(RECEIPT_EVENT, notify);
  window.addEventListener("pageshow", notify);
  const receipt = parseBookingReceipt(rawReceipt());
  const timer = receipt ? window.setTimeout(notify, Math.max(1, receipt.recordedAt + BOOKING_RECEIPT_TTL - Date.now() + 1)) : undefined;
  return () => { window.removeEventListener(RECEIPT_EVENT, notify); window.removeEventListener("pageshow", notify); if (timer !== undefined) window.clearTimeout(timer); };
}
