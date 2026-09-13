import { NextRequest, NextResponse } from "next/server";

import { wpAuthedFetch } from "@/lib/api/wp-auth";
import { WP_API_BASE } from "@/lib/wp";

export const dynamic = "force-dynamic";

const REPAIR_TOKEN = "day8-airport-dedupe-20260913";
const CANONICAL_SLUG = "san-bay-long-thanh-vung-tau";

type PricingRow = { pricing_mode?: string; price?: number | string };
type WPRoute = {
  id: number;
  slug: string;
  meta?: {
    route_model_version?: number | string;
    origin_location_id?: number | string;
    destination_location_id?: number | string;
    pricing_model_version?: number | string;
    pricing_packages_v2?: PricingRow[];
  };
};

async function fetchRoutesNoStore(): Promise<WPRoute[]> {
  const response = await fetch(`${WP_API_BASE}/route?per_page=100`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`route inventory HTTP ${response.status}`);
  return (await response.json()) as WPRoute[];
}

function positive(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isHealthy(route: WPRoute | undefined): boolean {
  if (!route) return false;
  const meta = route.meta ?? {};
  const rows = Array.isArray(meta.pricing_packages_v2) ? meta.pricing_packages_v2 : [];
  return (
    positive(meta.route_model_version) >= 2 &&
    positive(meta.origin_location_id) > 0 &&
    positive(meta.destination_location_id) > 0 &&
    positive(meta.pricing_model_version) >= 2 &&
    rows.length > 0
  );
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ ok: false, error: "production_only" }, { status: 404 });
  }
  if (request.nextUrl.searchParams.get("token") !== REPAIR_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  try {
    const routes = await fetchRoutesNoStore();
    const canonical = routes.find((route) => route.slug === CANONICAL_SLUG);
    const suffixDuplicates = routes.filter(
      (route) => route.slug !== CANONICAL_SLUG && route.slug.startsWith(`${CANONICAL_SLUG}-`),
    );
    const healthyDuplicates = suffixDuplicates.filter(isHealthy);

    if (!isHealthy(canonical) && healthyDuplicates.length !== 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_single_healthy_route_to_preserve",
          canonical: canonical ?? null,
          suffixDuplicates,
          healthyDuplicateIds: healthyDuplicates.map((route) => route.id),
        },
        { status: 409 },
      );
    }

    const authProbe = await wpAuthedFetch<{ id: number }>("/users/me?context=edit", { method: "GET" });
    if (!authProbe.ok) {
      return NextResponse.json({ ok: false, error: "wordpress_auth_unavailable", message: authProbe.message }, { status: 503 });
    }

    const deleted: number[] = [];
    const renamed: number[] = [];
    const errors: Array<{ id: number; slug: string; message: string }> = [];

    if (isHealthy(canonical) && canonical) {
      for (const duplicate of suffixDuplicates) {
        const result = await wpAuthedFetch(`/route/${duplicate.id}?force=true`, { method: "DELETE" });
        if (result.ok) deleted.push(duplicate.id);
        else errors.push({ id: duplicate.id, slug: duplicate.slug, message: result.message });
      }
    } else {
      const healthy = healthyDuplicates[0];
      if (canonical) {
        const deleteCanonical = await wpAuthedFetch(`/route/${canonical.id}?force=true`, { method: "DELETE" });
        if (deleteCanonical.ok) deleted.push(canonical.id);
        else errors.push({ id: canonical.id, slug: canonical.slug, message: deleteCanonical.message });
      }

      if (errors.length === 0 && healthy) {
        const renameHealthy = await wpAuthedFetch(`/route/${healthy.id}`, {
          method: "PUT",
          body: { slug: CANONICAL_SLUG },
        });
        if (renameHealthy.ok) renamed.push(healthy.id);
        else errors.push({ id: healthy.id, slug: healthy.slug, message: renameHealthy.message });
      }

      if (errors.length === 0 && healthy) {
        for (const duplicate of suffixDuplicates) {
          if (duplicate.id === healthy.id) continue;
          const result = await wpAuthedFetch(`/route/${duplicate.id}?force=true`, { method: "DELETE" });
          if (result.ok) deleted.push(duplicate.id);
          else errors.push({ id: duplicate.id, slug: duplicate.slug, message: result.message });
        }
      }
    }

    const after = await fetchRoutesNoStore();
    const remaining = after
      .filter((route) => route.slug === CANONICAL_SLUG || route.slug.startsWith(`${CANONICAL_SLUG}-`))
      .map((route) => ({ id: route.id, slug: route.slug, healthy: isHealthy(route) }));

    return NextResponse.json({
      ok:
        errors.length === 0 &&
        remaining.length === 1 &&
        remaining[0]?.slug === CANONICAL_SLUG &&
        remaining[0]?.healthy === true,
      before: {
        canonical: canonical ? { id: canonical.id, slug: canonical.slug, healthy: isHealthy(canonical) } : null,
        suffixDuplicates: suffixDuplicates.map((route) => ({ id: route.id, slug: route.slug, healthy: isHealthy(route) })),
      },
      deleted,
      renamed,
      errors,
      remaining,
    }, { status: errors.length ? 500 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
