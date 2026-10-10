import { z } from "zod";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const plainText = z.string().min(1).max(80).refine((v) => v === v.trim() && !/[<>\x00-\x1f]/.test(v));
export function utcInstant(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString() === value.replace("Z", ".000Z") ? t : null;
}
const instant = z.string().refine((v) => utcInstant(v) !== null);
export const airportTimingRuleSchema = z.object({
  direction: z.enum(["outbound", "inbound"]), airport_id: id, counterpart_id: id, readiness_version: id,
  movement: z.enum(["arrival", "departure"]), flight_kind: z.enum(["domestic", "international"]),
  terminal: plainText, buffer_minutes: z.number().int().min(0).max(1440),
  travel_minutes: z.number().int().min(1).max(1440).nullable(),
  valid_from: instant, valid_until: instant,
}).strict().superRefine((r, ctx) => {
  if ((r.movement === "arrival") !== (r.travel_minutes === null)) ctx.addIssue({ code: "custom", path: ["travel_minutes"], message: "Arrival has no road duration; departure requires confirmed duration." });
  if (utcInstant(r.valid_until)! <= utcInstant(r.valid_from)!) ctx.addIssue({ code: "custom", path: ["valid_until"], message: "Invalid validity window." });
});
export const airportTimingModelSchema = z.object({
  model_version: z.literal(1), revision: id,
  approval: z.object({ status: z.enum(["draft", "confirmed", "rejected"]), source_ref: z.string().min(1).max(500).refine((s) => s === s.trim() && !/[<>\x00-\x1f]/.test(s)).nullable() }).strict(),
  rules: z.array(airportTimingRuleSchema).max(40),
}).strict().superRefine((m, ctx) => {
  if (m.approval.status === "confirmed" && (!m.approval.source_ref || !m.rules.length)) ctx.addIssue({ code: "custom", path: ["approval"], message: "Confirmation requires evidence and rules." });
  const seen = new Set<string>();
  for (const r of m.rules) {
    const key = JSON.stringify([r.direction, r.airport_id, r.movement, r.flight_kind, r.terminal]);
    if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["rules"], message: "Ambiguous duplicate scope." });
    seen.add(key);
  }
});
export type AirportTimingRule = z.infer<typeof airportTimingRuleSchema>;

/** datetime-local always means Asia/Ho_Chi_Minh, never the browser/server timezone. */
export function vietnamLocalInstant(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  if (year < 2000 || year > 2100) return null;
  const t = Date.parse(`${value}:00+07:00`);
  return Number.isFinite(t) && new Date(t + 7 * 3600000).toISOString().slice(0, 16) === value ? t : null;
}
export function normalizeFlightNumber(value: string): string | null {
  const number = value.trim().toUpperCase().replace(/ /g, "");
  // Syntax only; it does not prove that this flight exists or serves this airport.
  return /^(?:[A-Z]{2,3}|[A-Z][0-9]|[0-9][A-Z])[0-9]{1,4}[A-Z]?$/.test(number) ? number : null;
}
export const airportPickupRequestSchema = z.object({
  route_id: id, direction: z.enum(["outbound", "inbound"]),
  movement: z.enum(["arrival", "departure"]),
  flight_kind: z.enum(["domestic", "international"]).nullable(),
  terminal: plainText.nullable(), flight_number: z.string().max(40).nullable(),
  flight_at: z.string().max(16).nullable(), airport_arrival_at: z.string().max(16).nullable(),
}).strict();
export type AirportPickupRequest = z.infer<typeof airportPickupRequestSchema>;
export type FlightIssue = { field: "flight_number" | "flight_at" | "airport_arrival_at"; message: string };
export function validateFlightFields(input: Pick<AirportPickupRequest, "flight_number" | "flight_at" | "airport_arrival_at" | "movement">, now: number): FlightIssue[] {
  const issues: FlightIssue[] = [];
  if (input.flight_number && !normalizeFlightNumber(input.flight_number)) issues.push({ field: "flight_number", message: "Số hiệu chuyến bay chưa đúng định dạng, ví dụ VN123." });
  const flight = input.flight_at ? vietnamLocalInstant(input.flight_at) : null;
  const arrival = input.airport_arrival_at ? vietnamLocalInstant(input.airport_arrival_at) : null;
  if (input.flight_at && (flight === null || flight <= now)) issues.push({ field: "flight_at", message: "Ngày giờ bay phải hợp lệ và ở tương lai (giờ Việt Nam)." });
  if (input.airport_arrival_at && (input.movement !== "departure" || arrival === null || arrival <= now || (flight !== null && arrival >= flight))) issues.push({ field: "airport_arrival_at", message: "Giờ có mặt tại sân bay phải ở tương lai và trước giờ bay." });
  return issues;
}

const resultSchema = z.discriminatedUnion("status", [
  z.object({ model_version: z.literal(1), status: z.literal("needs_consultation"), reason: z.enum(["missing_information", "unverified_policy", "outside_policy", "pickup_in_past", "unavailable"]), issues: z.array(z.object({ field: z.enum(["flight_number", "flight_at", "airport_arrival_at"]), message: z.string().max(200) }).strict()).max(3) }).strict(),
  z.object({ model_version: z.literal(1), status: z.literal("suggested"), route_id: id, direction: z.enum(["outbound", "inbound"]), movement: z.enum(["arrival", "departure"]), revision: id, airport_id: id, pickup_at: instant, airport_at: instant, valid_until: instant, buffer_minutes: z.number().int().min(0).max(1440), travel_minutes: z.number().int().min(1).max(1440).nullable(), flight_verified: z.literal(false) }).strict(),
]);
export type AirportPickupResult = z.infer<typeof resultSchema>;
export function readAirportPickupResult(value: unknown): AirportPickupResult | null {
  const parsed = resultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function consultation(reason: Extract<AirportPickupResult, { status: "needs_consultation" }>["reason"], issues: FlightIssue[] = []): AirportPickupResult {
  return { model_version: 1, status: "needs_consultation", reason, issues };
}
