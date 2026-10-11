import { suggestAirportPickup } from "@/lib/api/airport-pickup-evaluator";
import { fetchAirportTiming } from "@/lib/api/airport-timing";
import { airportPickupRequestSchema, consultation, validateFlightFields } from "@/lib/airport-timing";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
/** Read-only advice: no flight tracking, pricing, lead, notifications or booking changes. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: "invalid_request" }, { status: 400, headers });
    body = JSON.parse(text);
  } catch { return Response.json({ error: "invalid_request" }, { status: 400, headers }); }
  const input = airportPickupRequestSchema.safeParse(body);
  if (!input.success) return Response.json({ error: "invalid_request" }, { status: 400, headers });
  const issues = validateFlightFields(input.data, Date.now());
  if (issues.length || !input.data.flight_number || !input.data.flight_at || !input.data.flight_kind || !input.data.terminal) return Response.json(consultation("missing_information", issues), { headers });
  try {
    const source = await fetchAirportTiming(input.data.route_id);
    return Response.json(suggestAirportPickup(input.data, source, Date.now()), { headers });
  } catch { return Response.json(consultation("unavailable"), { status: 503, headers }); }
}
