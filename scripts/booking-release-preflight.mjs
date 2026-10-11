import { pathToFileURL } from 'node:url';

export function requiresBookingPreflight(env, force = false) {
  if (force) return true;
  if (env.VERCEL !== '1') return false; // Local/CI builds do not publish.
  if (env.VERCEL_ENV === 'production' || env.VERCEL_TARGET_ENV === 'production') return true;
  if (env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development') return false;
  throw new Error('deployment_environment_unknown');
}

export function backendOrigin(base) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('backend_url_invalid');
  }
  return url.origin; // Same origin binding as src/lib/api/wp-auth.ts.
}

export function validateBookingRoutes(index) {
  for (const path of ['/gocar/v1/leads', '/gocar/v1/leads/replay']) {
    const route = index?.routes?.[path];
    if (!Array.isArray(route?.methods) || !route.methods.includes('POST')) {
      throw new Error(path.endsWith('/replay') ? 'replay_route_missing' : 'lead_route_missing');
    }
  }
}

export function validateBookingContract(contract) {
  if (contract?.contract_version !== 1 || contract.intent_version !== 2 ||
      contract.snapshot_version !== 1 || contract.replay_lookup !== true ||
      contract.snapshot_persistence !== true) throw new Error('booking_contract_incompatible');
}

export async function checkBookingBackend({ base, fetchImpl = fetch }) {
  const origin = backendOrigin(base);
  const read = async (path) => {
    const response = await fetchImpl(`${origin}/wp-json${path}`, {
      method: 'GET', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`backend_read_http_${response.status}`);
    try { return await response.json(); }
    catch { throw new Error('backend_read_invalid_json'); }
  };
  validateBookingRoutes(await read('/'));
  validateBookingContract(await read('/gocar/v1/leads/contract'));
  return { status: 'PASS', scope: 'booking_capability_only', origin };
}

export async function runPreflight({ env = process.env, force = false, fetchImpl = fetch } = {}) {
  if (!requiresBookingPreflight(env, force)) return { status: 'SKIPPED', scope: 'non_production_build' };
  if (!env.WP_API_BASE_URL) throw new Error('production_backend_url_missing');
  return checkBookingBackend({ base: env.WP_API_BASE_URL, fetchImpl });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== '--check')) throw new Error('unsupported_argument');
    console.log(JSON.stringify(await runPreflight({ force: process.argv.includes('--check') })));
  } catch (error) {
    // Do not print upstream response bodies, configuration values or credentials.
    const reason = error instanceof Error && /^[a-z_0-9]+$/.test(error.message)
      ? error.message : 'backend_read_failed';
    console.error(JSON.stringify({ status: 'BLOCKED', scope: 'booking_capability_only', reason }));
    process.exitCode = 1;
  }
}
