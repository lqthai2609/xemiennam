import "server-only";
import { WP_API_BASE } from "@/lib/wp";

/** WordPress alone resolves current route/location readiness and approved policy. No mocks. */
export async function fetchAirportTiming(routeId: number): Promise<unknown> {
  const root = WP_API_BASE.replace(/\/wp\/v2\/?$/, "/gocar/v1");
  const response = await fetch(`${root}/routes/${routeId}/airport-timing`, {
    cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return null; // Old backend has no timing contract.
  if (!response.ok) throw new Error("Airport timing unavailable");
  return response.json();
}
