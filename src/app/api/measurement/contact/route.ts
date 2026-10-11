import { NextResponse } from "next/server";
import { z } from "zod";
import { LEAD_MEASUREMENT_POLICY, normalizeAcquisition } from "@/lib/lead-measurement";
import { wpAuthedFetch } from "@/lib/api/wp-auth";

const eventSchema = z.object({ event_id: z.string().uuid(), event_name: z.literal("contact_click"),
  channel: z.enum(["phone", "zalo"]), acquisition: z.unknown() });
export async function POST(request: Request) {
  if (process.env.LEAD_MEASUREMENT_POLICY !== LEAD_MEASUREMENT_POLICY) return new NextResponse(null, { status: 204 });
  // Cross-site submissions never create an intent record. No raw header is persisted.
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  let body: unknown;
  try { const text = await request.text(); if (text.length > 4096) return NextResponse.json({ ok: false }, { status: 413 }); body = JSON.parse(text); }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const acquisition = normalizeAcquisition(parsed.data.acquisition, true);
  if (acquisition.consent_state !== "granted" || !acquisition.landing_path) return new NextResponse(null, { status: 204 });
  const result = await wpAuthedFetch<{ accepted: boolean }>("/gocar/v1/measurement/contact", {
    method: "POST", body: { ...parsed.data, acquisition },
  });
  // No lead ID, submitted form, pricing or email side effects on the intent path.
  return new NextResponse(null, { status: result.ok && result.data?.accepted === true ? 204 : 503 });
}
