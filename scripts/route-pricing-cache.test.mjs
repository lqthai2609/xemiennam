import test from "node:test";
import assert from "node:assert/strict";
import { typescriptLoader } from "./lib/load-typescript.mjs";

const calls = [];
const load = typescriptLoader({
  "next/cache": {
    revalidateTag: (...args) => calls.push(["tag", ...args]),
    revalidatePath: (...args) => calls.push(["path", ...args]),
  },
  "next/server": { NextResponse: { json: Response.json } },
  "@/lib/admin-session": {
    ADMIN_SESSION_COOKIE: "session", ADMIN_CSRF_COOKIE: "csrf",
    adminApiUrl: path => `https://wordpress.invalid/admin/${path}`,
    fetchAdminSession: async token => token === "admin" ? { canEditPricing: true } : null,
    isSameOriginMutation: request => request.headers.get("origin") === new URL(request.url).origin,
  },
});
const wp = load("src/lib/wp.ts");
const { revalidateRoutePricing } = load("src/lib/route-pricing-cache.ts");
const admin = load("src/app/api/admin/[...path]/route.ts");

test("route detail keys are independent, lists share one tag, and other CMS tags stay unchanged", () => {
  const first = wp.wpCacheTags("/route?slug=first&_embed=1");
  const second = wp.wpCacheTags("/route?_embed=1&slug=second");
  assert.ok(first.includes(wp.wpRouteSlugCacheTag("first")));
  assert.ok(!first.includes(wp.WP_ROUTE_LIST_CACHE_TAG));
  assert.ok(!second.includes(wp.wpRouteSlugCacheTag("first")));
  assert.ok(wp.wpCacheTags("/route?per_page=100&page=2").includes(wp.WP_ROUTE_LIST_CACHE_TAG));
  for (const query of ["slug=first,second", "slug=first&slug=second", "slug="]) {
    assert.ok(wp.wpCacheTags(`/route?${query}`).includes(wp.WP_ROUTE_LIST_CACHE_TAG));
  }
  assert.ok(wp.wpCacheTags("/route?slug=a%252Fb").includes(wp.wpRouteSlugCacheTag("a%2Fb")));
  assert.deepEqual(wp.wpCacheTags("/vehicle?per_page=100"), [wp.WP_CACHE_TAG, "alo-wp-v2:vehicle"]);
  assert.deepEqual(wp.wpCacheTags("/posts?slug=first"), [wp.WP_CACHE_TAG, "alo-wp-v2:posts"]);
  assert.ok(wp.wpRouteSlugCacheTag("x".repeat(200)).length <= 256);
  assert.equal(wp.wpRouteSlugCacheTag("x".repeat(201)), wp.WP_ROUTE_CACHE_TAG);
});

test("successful save expires only the price-bearing list and the server-resolved route detail", async t => {
  calls.length = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `${wp.WP_API_BASE}/route/41?_fields=id,slug`);
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ id: 41, slug: "synthetic-route" });
  });
  await revalidateRoutePricing("41");
  assert.deepEqual(calls, [
    ["tag", wp.WP_ROUTE_LIST_CACHE_TAG, { expire: 0 }],
    ["tag", wp.wpRouteSlugCacheTag("synthetic-route"), { expire: 0 }],
  ]);
});

test("lookup faults preserve a successful save and fall back to route data only", async t => {
  for (const reply of [new Error("timeout"), new Response("error", { status: 503 }),
    Response.json({ id: 42, slug: "other-route" }), Response.json({ id: 41, slug: "" }),
    Response.json({ id: 41, slug: "x".repeat(201) }), Response.json(null), Response.json([]),
    new Response("not JSON", { status: 200 })]) {
    calls.length = 0;
    t.mock.method(globalThis, "fetch", async () => { if (reply instanceof Error) throw reply; return reply; });
    await revalidateRoutePricing("41");
    assert.deepEqual(calls, [
      ["tag", wp.WP_ROUTE_LIST_CACHE_TAG, { expire: 0 }],
      ["tag", wp.WP_ROUTE_CACHE_TAG, { expire: 0 }],
    ]);
  }
  t.mock.method(globalThis, "fetch", async () => { assert.fail("invalid IDs cannot select an upstream URL"); });
  for (const id of ["../posts", "0", "9007199254740992"]) {
    calls.length = 0;
    await revalidateRoutePricing(id);
    assert.equal(calls.at(-1)[1], wp.WP_ROUTE_CACHE_TAG);
  }
});

test("cache consumers get the new selected price immediately while unrelated detail and CMS entries survive", async t => {
  const cache = new Map();
  const network = [];
  let amount = 1000000;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("/route/41?_fields=id,slug")) return Response.json({ id: 41, slug: "first" });
    if (cache.has(url)) return Response.json(cache.get(url).data);
    network.push(url);
    const data = url.includes("slug=second") ? [{ id: 42, price: 900000 }]
      : url.includes("/route") ? [{ id: 41, price: amount }]
      : [{ id: 2001, name: "SYNTHETIC unchanged CMS resource" }];
    cache.set(url, { tags: options.next.tags, data });
    return Response.json(data);
  });
  const paths = ["/route?slug=first&_embed=1", "/route?slug=second&_embed=1", "/route?per_page=100&_embed=1", "/vehicle", "/posts"];
  for (const path of paths) await wp.wpFetch(path);
  amount = 1234000;
  calls.length = 0;
  await revalidateRoutePricing("41");
  for (const [, tag] of calls) for (const [key, entry] of cache) if (entry.tags.includes(tag)) cache.delete(key);
  const before = network.length;
  assert.equal((await wp.wpFetch(paths[0]))[0].price, amount);
  assert.equal((await wp.wpFetch(paths[2]))[0].price, amount);
  for (const path of [paths[1], paths[3], paths[4]]) await wp.wpFetch(path);
  assert.equal(network.length - before, 2, "only the changed detail and route list are fetched again");
});

function request(method, { token = "admin", csrf = "fixture-csrf", origin = "https://example.test" } = {}) {
  const req = new Request("https://example.test/api/admin/routes/41/pricing", {
    method, headers: { origin, "x-gocar-csrf": csrf },
    ...(method === "POST" ? { body: JSON.stringify({ priceAmount: 1234000 }) } : {}),
  });
  req.cookies = { get: name => ({ value: name === "session" ? token : "fixture-csrf" }) };
  return req;
}
const context = { params: Promise.resolve({ path: ["routes", "41", "pricing"] }) };

test("the real admin proxy uses scoped invalidation after accepted POST, and keeps private headers", async t => {
  calls.length = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.includes("/admin/")) {
      assert.equal(options.method, "POST");
      assert.equal(options.cache, "no-store");
      return Response.json({ routeId: 41, auditId: 5 });
    }
    return Response.json({ id: 41, slug: "first" });
  });
  const response = await admin.POST(request("POST"), context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.deepEqual(await response.json(), { routeId: 41, auditId: 5 });
  assert.deepEqual(calls.map(call => call[1]), [wp.WP_ROUTE_LIST_CACHE_TAG, wp.wpRouteSlugCacheTag("first")]);
});

test("reads, denied requests and backend conflicts never expire price caches", async t => {
  for (const [method, settings, upstreamStatus, expectedStatus] of [
    ["GET", {}, 200, 200], ["POST", {}, 409, 409], ["POST", {}, 500, 500],
    ["POST", { token: "guest" }, 200, 401], ["POST", { csrf: "wrong" }, 200, 403],
    ["POST", { origin: "https://other.invalid" }, 200, 403],
  ]) {
    calls.length = 0;
    t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: upstreamStatus }));
    const response = await admin[method](request(method, settings), context);
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(calls, []);
  }
});

test("structural admin operations retain their existing broad consistency scope", async t => {
  calls.length = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json({ routeId: 41 }));
  await admin.POST(request("POST"), { params: Promise.resolve({ path: ["routes", "41", "archive"] }) });
  assert.deepEqual(calls, [["tag", wp.WP_CACHE_TAG, { expire: 0 }], ["path", "/", "layout"]]);
});

test("only route cache identities migrate, and the time-based fallback remains 300 seconds", async t => {
  const versions = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    versions.push(options.headers["X-Alo-Dat-Xe-Cache-Version"]);
    assert.equal(options.next.revalidate, 300);
    return Response.json([]);
  });
  await wp.wpFetch("/route?slug=first");
  await wp.wpFetch("/vehicle");
  assert.deepEqual(versions, ["3", "2"]);
});
