import test from "node:test";
import assert from "node:assert/strict";

const { typescriptLoader } = await import("./lib/load-typescript.mjs");
const { wpFetch, wpCacheTags, REVALIDATE_SECONDS } = typescriptLoader()("src/lib/wp.ts");

function stubFetch(t, responses) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (...args) => {
    calls.push(args);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    assert.ok(response, "Unexpected extra WordPress request");
    return response;
  });
  return calls;
}

test("successful empty collections remain valid data", async (t) => {
  const calls = stubFetch(t, [Response.json([])]);
  assert.deepEqual(await wpFetch("/route"), []);
  assert.equal(calls.length, 1);
});

test("transient 500 retries once and returns real CMS data with ISR intact", async (t) => {
  const calls = stubFetch(t, [new Response("", { status: 500 }), Response.json([{ id: 41 }])]);
  assert.deepEqual(await wpFetch("/route", 3600), [{ id: 41 }]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0][1].next, { revalidate: 3600, tags: ["alo-wp-v2", "alo-wp-v2:route"] });
  assert.deepEqual(calls[1][1].next, { revalidate: 3600, tags: ["alo-wp-v2", "alo-wp-v2:route"] });
  assert.notDeepEqual(calls[0][1].headers, calls[1][1].headers);
});

test("persistent 500 throws instead of publishing an empty collection", async (t) => {
  const calls = stubFetch(t, [new Response("", { status: 500 }), new Response("", { status: 500 })]);
  await assert.rejects(wpFetch("/route"), /HTTP 500/);
  assert.equal(calls.length, 2);
});

test("network failures retry and never masquerade as missing data", async (t) => {
  stubFetch(t, [new TypeError("fetch failed"), new TypeError("fetch failed")]);
  await assert.rejects(wpFetch("/posts"), /không kết nối được WordPress/);
});

test("a recovered network request returns CMS data", async (t) => {
  stubFetch(t, [new TypeError("fetch failed"), Response.json([{ id: 70 }])]);
  assert.deepEqual(await wpFetch("/vehicle"), [{ id: 70 }]);
});

test("rate limits retry once", async (t) => {
  stubFetch(t, [new Response("", { status: 429 }), Response.json([{ id: 9118 }])]);
  assert.deepEqual(await wpFetch("/location"), [{ id: 9118 }]);
});

test("authentication failures throw immediately instead of blanking pages", async (t) => {
  const calls = stubFetch(t, [new Response("", { status: 401 })]);
  await assert.rejects(wpFetch("/route"), /HTTP 401/);
  assert.equal(calls.length, 1);
});

test("a genuine missing resource still returns null without retrying", async (t) => {
  const calls = stubFetch(t, [new Response("", { status: 404 })]);
  assert.equal(await wpFetch("/media/99999"), null);
  assert.equal(calls.length, 1);
});

test("malformed success responses throw instead of becoming empty data", async (t) => {
  stubFetch(t, [new Response("<html>upstream failure</html>", { status: 200 })]);
  await assert.rejects(wpFetch("/route"), /không phải JSON hợp lệ/);
});

 test("resource tags join list, detail and pagination without query-dependent tags", () => {
  assert.deepEqual(wpCacheTags("/route?per_page=100"), wpCacheTags("/route/41"));
  assert.deepEqual(wpCacheTags("/location?page=2"), ["alo-wp-v2", "alo-wp-v2:location"]);
  assert.equal(REVALIDATE_SECONDS, 300);
});
