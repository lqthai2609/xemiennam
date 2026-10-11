import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backendOrigin, checkBookingBackend, requiresBookingPreflight, runPreflight } from './booking-release-preflight.mjs';

const index = { routes: {
  '/gocar/v1/leads': { methods: ['POST'] },
  '/gocar/v1/leads/replay': { methods: ['POST'] },
} };
const contract = { contract_version: 1, intent_version: 2, snapshot_version: 1,
  replay_lookup: true, snapshot_persistence: true };
const base = 'https://backend.example/wp-json/wp/v2';
function fakeRead(data = [index, contract], options = {}) {
  const calls = [];
  return { calls, fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return { ok: options.ok ?? true, status: options.status ?? 200,
      json: async () => { if (options.malformed) throw new Error('bad'); return data[calls.length - 1]; } };
  } };
}

test('production checks even if target variables disagree; preview/CI stay available', () => {
  assert.equal(requiresBookingPreflight({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'preview' }), true);
  assert.equal(requiresBookingPreflight({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' }), true);
  assert.equal(requiresBookingPreflight({ VERCEL: '1', VERCEL_ENV: 'preview' }), false);
  assert.equal(requiresBookingPreflight({ VERCEL_ENV: 'production', CI: 'true' }), false);
  assert.equal(requiresBookingPreflight({}, true), true);
  assert.throws(() => requiresBookingPreflight({ VERCEL: '1' }), /environment_unknown/);
});
test('compatible backend is inspected with two GETs, no authentication or payload', async () => {
  const mock = fakeRead();
  assert.equal((await checkBookingBackend({ base, ...mock })).status, 'PASS');
  assert.deepEqual(mock.calls.map((c) => c.url), ['https://backend.example/wp-json/', 'https://backend.example/wp-json/gocar/v1/leads/contract']);
  for (const { init } of mock.calls) {
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    assert.equal(init.headers.Authorization, undefined); assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
  }
});
test('backend 0.11.1 shape cannot pass and never falls back to create', async () => {
  const mock = fakeRead([{ routes: { '/gocar/v1/leads': index.routes['/gocar/v1/leads'] } }]);
  await assert.rejects(checkBookingBackend({ base, ...mock }), /replay_route_missing/);
  assert.equal(mock.calls.length, 1);
});
test('wrong methods and absent lead endpoint cannot pass', async () => {
  for (const routes of [{}, { ...index.routes, '/gocar/v1/leads/replay': { methods: ['GET'] } }]) {
    await assert.rejects(checkBookingBackend({ base, ...fakeRead([{ routes }]) }), /route_missing/);
  }
});
test('missing, string, future or disabled protocol declarations are blocked', async () => {
  for (const value of [null, {}, { ...contract, intent_version: '2' }, { ...contract, snapshot_version: 2 },
    { ...contract, contract_version: 2 }, { ...contract, replay_lookup: false }, { ...contract, snapshot_persistence: false }]) {
    await assert.rejects(checkBookingBackend({ base, ...fakeRead([index, value]) }), /contract_incompatible/);
  }
});
test('HTTP, malformed JSON, timeout and redirects fail closed', async () => {
  await assert.rejects(checkBookingBackend({ base, ...fakeRead([], { ok: false, status: 404 }) }), /http_404/);
  await assert.rejects(checkBookingBackend({ base, ...fakeRead([], { malformed: true }) }), /invalid_json/);
  for (const reason of ['TimeoutError', 'redirect rejected']) {
    await assert.rejects(checkBookingBackend({ base, fetchImpl: async () => { throw new Error(reason); } }));
  }
});
test('rejects credentials and ambiguous/insecure URLs before network access', () => {
  for (const value of ['http://backend.example', 'https://user:pass@backend.example', 'https://backend.example?token=secret', 'https://backend.example/#x']) {
    assert.throws(() => backendOrigin(value), /url_invalid/);
  }
});
test('production requires its explicit backend; skipped builds perform zero requests', async () => {
  await assert.rejects(runPreflight({ env: { VERCEL: '1', VERCEL_ENV: 'production' }, ...fakeRead() }), /backend_url_missing/);
  await assert.rejects(runPreflight({ env: {}, force: true, ...fakeRead() }), /backend_url_missing/);
  const mock = fakeRead();
  assert.equal((await runPreflight({ env: { VERCEL: '1', VERCEL_ENV: 'preview' }, ...mock })).status, 'SKIPPED');
  assert.equal(mock.calls.length, 0);
});
test('npm build and explicit production build both enforce the preflight', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.scripts.build, 'node scripts/booking-release-preflight.mjs && next build');
  assert.equal(pkg.scripts['build:production'], 'node scripts/booking-release-preflight.mjs --check && next build');
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  assert.equal(vercel.buildCommand, 'npm run build');
});
