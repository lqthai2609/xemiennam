import "server-only";
import { z } from "zod";
import { airportTimingRuleSchema, consultation, utcInstant, vietnamLocalInstant, validateFlightFields, type AirportPickupRequest, type AirportPickupResult } from "@/lib/airport-timing";
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const sourceSchema = z.object({
  model_version: z.literal(1), route_id: id, revision: id,
  rules: z.array(airportTimingRuleSchema).min(1).max(40),
}).strict();
export function suggestAirportPickup(input: AirportPickupRequest, source: unknown, now: number): AirportPickupResult {
  const issues = validateFlightFields(input, now);
  if (issues.length || !input.flight_number || !input.flight_at || !input.flight_kind || !input.terminal) return consultation("missing_information", issues);
  const parsed = sourceSchema.safeParse(source);
  if (!parsed.success || parsed.data.route_id !== input.route_id) return consultation("unverified_policy");
  const flight = vietnamLocalInstant(input.flight_at)!;
  const rules = parsed.data.rules.filter((r) => r.direction === input.direction && r.movement === input.movement && r.flight_kind === input.flight_kind && r.terminal === input.terminal && r.airport_id !== 9102 && now >= utcInstant(r.valid_from)! && now < utcInstant(r.valid_until)! && flight >= utcInstant(r.valid_from)! && flight < utcInstant(r.valid_until)!);
  if (rules.length !== 1) return consultation("outside_policy");
  const r = rules[0];
  const airportAt = input.movement === "arrival" ? flight + r.buffer_minutes * 60000 : Math.min(flight - r.buffer_minutes * 60000, input.airport_arrival_at ? vietnamLocalInstant(input.airport_arrival_at)! : Infinity);
  const pickup = airportAt - (r.travel_minutes ?? 0) * 60000;
  if (pickup <= now) return consultation("pickup_in_past");
  if (pickup < utcInstant(r.valid_from)! || airportAt >= utcInstant(r.valid_until)!) return consultation("outside_policy");
  const iso = (t: number) => new Date(Math.floor(t / 1000) * 1000).toISOString().replace(".000Z", "Z");
  return { model_version: 1, status: "suggested", route_id: input.route_id, direction: input.direction, movement: input.movement, revision: parsed.data.revision, airport_id: r.airport_id, pickup_at: iso(pickup), airport_at: iso(airportAt), buffer_minutes: r.buffer_minutes, travel_minutes: r.travel_minutes, valid_until: iso(Math.min(utcInstant(r.valid_until)!, now + 5 * 60000, pickup)), flight_verified: false };
}
