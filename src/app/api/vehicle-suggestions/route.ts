import { fetchVehicleSuggestions } from "@/lib/api/vehicle-suggestions";
import { vehicleFactsDisplay } from "@/lib/vehicle-facts-display";
import { vehicleSelectorRequestSchema } from "@/lib/vehicle-selector-request";
import type { VehicleSelectorResponse } from "@/types/vehicle-selector";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };

/** Read-only: this endpoint never creates a lead, sends a message or resolves pricing. */
export async function POST(request: Request) {
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 8192) return Response.json({ error: "invalid_request" }, { status: 400, headers });
    input = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400, headers });
  }
  const parsed = vehicleSelectorRequestSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400, headers });
  try {
    const groups = await fetchVehicleSuggestions(parsed.data);
    const response: VehicleSelectorResponse = {
      model_version: 1,
      items: [...groups.recommended, ...groups.consultation, ...groups.excluded].map(({ vehicle, fit }) => ({
        id: vehicle.id, type: vehicle.type, facts: vehicleFactsDisplay(vehicle), fit,
      })),
    };
    return Response.json(response, { headers });
  } catch {
    return Response.json({ error: "needs_consultation" }, { status: 503, headers });
  }
}
