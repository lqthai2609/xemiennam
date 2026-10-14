import { revalidateTag } from "next/cache";
import { WP_API_BASE, WP_ROUTE_CACHE_TAG, WP_ROUTE_LIST_CACHE_TAG, wpRouteSlugCacheTag } from "@/lib/wp";

/**
 * Called only after WordPress accepts a price mutation. Lists hold route prices,
 * so every consumer of those lists must refresh too; unrelated CMS data survives.
 * The existing plugin returns an ID, not a public slug. Resolve the slug using a
 * bounded, uncached read, never cached catalogue data or client-supplied paths.
 */
export async function revalidateRoutePricing(routeId: string): Promise<void> {
  revalidateTag(WP_ROUTE_LIST_CACHE_TAG, { expire: 0 });
  try {
    if (!/^[1-9]\d*$/.test(routeId) || !Number.isSafeInteger(Number(routeId))) throw new Error("invalid_route_id");
    const response = await fetch(`${WP_API_BASE}/route/${routeId}?_fields=id,slug`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("route_lookup_failed");
    const route: unknown = await response.json();
    if (!route || typeof route !== "object" || Array.isArray(route)) throw new Error("invalid_route_lookup");
    const { id, slug } = route as { id?: unknown; slug?: unknown };
    if (id !== Number(routeId) || typeof slug !== "string" || !slug.trim() || slug.length > 200) throw new Error("invalid_route_lookup");
    revalidateTag(wpRouteSlugCacheTag(slug), { expire: 0 });
  } catch {
    // A successful save must not become a failed response just because the
    // public slug lookup failed. Expire route data only, with no site-wide purge.
    revalidateTag(WP_ROUTE_CACHE_TAG, { expire: 0 });
  }
}
