import { NextRequest, NextResponse } from "next/server";

import { wpAuthedFetch } from "@/lib/api/wp-auth";

type WPRouteRef = {
  id: number;
  slug: string;
  title?: { rendered?: string };
};

export const dynamic = "force-dynamic";

const TOKEN = "day8-airport-dedupe-20260913";
const CANONICAL_SLUG = "san-bay-long-thanh-vung-tau";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production" || request.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const lookup = await wpAuthedFetch<WPRouteRef[]>(
    "/route?per_page=100&search=Long%20Th%C3%A0nh&context=edit&_fields=id,slug,title",
    { method: "GET" },
  );
  if (!lookup.ok) {
    return NextResponse.json({ ok: false, error: "lookup_failed", message: lookup.message }, { status: 503 });
  }

  const candidates = lookup.data
    .filter((route) => route.slug === CANONICAL_SLUG || route.slug.startsWith(`${CANONICAL_SLUG}-`))
    .sort((a, b) => {
      if (a.slug === CANONICAL_SLUG) return -1;
      if (b.slug === CANONICAL_SLUG) return 1;
      return a.id - b.id;
    });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: false, error: "canonical_airport_route_missing" }, { status: 409 });
  }

  const keep = candidates[0];
  const duplicates = candidates.slice(1);
  const deleted: Array<{ id: number; slug: string }> = [];
  const errors: string[] = [];

  for (const route of duplicates) {
    const result = await wpAuthedFetch(`/route/${route.id}?force=true`, { method: "DELETE" });
    if (result.ok) deleted.push({ id: route.id, slug: route.slug });
    else errors.push(`${route.id}:${route.slug}: ${result.message}`);
  }

  const verify = await wpAuthedFetch<WPRouteRef[]>(
    "/route?per_page=100&search=Long%20Th%C3%A0nh&context=edit&_fields=id,slug,title",
    { method: "GET" },
  );
  const remaining = verify.ok
    ? verify.data.filter((route) => route.slug === CANONICAL_SLUG || route.slug.startsWith(`${CANONICAL_SLUG}-`))
    : [];

  const ok = errors.length === 0 && verify.ok && remaining.length === 1 && remaining[0]?.slug === CANONICAL_SLUG;
  return NextResponse.json({ ok, kept: keep, deleted, remaining, errors }, { status: ok ? 200 : 500 });
}
