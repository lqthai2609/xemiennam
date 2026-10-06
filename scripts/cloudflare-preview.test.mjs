import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewWorker } from "../cloudflare/preview-guard.mjs";

const origin = "https://alodatxe-migration-spike.thaivt-thai.workers.dev";

test("ISR profile preserves the queue HEAD response and still forbids writes", async () => {
  let delegated = 0;
  const worker = createPreviewWorker({ fetch(request) {
    delegated++;
    assert.equal(request.method, "HEAD");
    assert.equal(request.headers.get("x-isr"), "1");
    return new Response(null, { headers: { "x-nextjs-cache": "REVALIDATED" } });
  } }, undefined, { cacheMode: "r2-isr" });
  const head = await worker.fetch(new Request(origin + "/tuyen-duong", {
    method: "HEAD", headers: { "x-isr": "1", "x-prerender-revalidate": "local-test" },
  }), {}, {});
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("x-nextjs-cache"), "REVALIDATED");
  assert.equal(head.headers.get("X-AloDatXe-Cache"), "r2-isr");
  assert.equal(await head.text(), "");
  for (const path of ["/api/revalidate", "/api/booking", "/__migration/health"]) {
    const blocked = await worker.fetch(new Request(origin + path, { method: "POST" }), {}, {});
    assert.equal(blocked.status, 403);
  }
  assert.equal(delegated, 1);
  const health = await worker.fetch(new Request(origin + "/__migration/health"), {}, {});
  assert.equal((await health.json()).cache, "r2-isr");
});

test("ISR webhook requires explicit opt-in and a non-placeholder secret", async () => {
  const secret = "a".repeat(48);
  let delegated = 0;
  const worker = createPreviewWorker({ fetch(request, env) {
    delegated++;
    assert.equal(request.method, "POST");
    assert.equal(new URL(request.url).pathname, "/api/revalidate");
    assert.equal(env.REVALIDATE_SECRET, secret);
    return Response.json({ revalidated: true });
  } }, undefined, { cacheMode: "r2-isr" });
  const post = (path, env) => worker.fetch(new Request(origin + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  }), env, {});

  for (const env of [
    {}, { CF_ISR_WEBHOOK_ENABLED: "true" },
    { CF_ISR_WEBHOOK_ENABLED: "true", REVALIDATE_SECRET: "THAY-SECRET-NAY" },
    { CF_ISR_WEBHOOK_ENABLED: "true", REVALIDATE_SECRET: "too-short" },
  ]) assert.equal((await post("/api/revalidate", env)).status, 403);

  const enabled = { CF_ISR_WEBHOOK_ENABLED: "true", REVALIDATE_SECRET: secret };
  for (const path of ["/api/booking", "/api/admin/session", "/%61pi%2frevalidate", "/%61pi%2frevalidate/other"]) {
    assert.equal((await post(path, enabled)).status, 403);
  }
  assert.equal((await post("/api/revalidate", enabled)).status, 200);
  assert.equal(delegated, 1);
  assert.equal((await post("/api/revalidate", { ...enabled, CF_ISR_WEBHOOK_ENABLED: "false" })).status, 403);
  const day1 = createPreviewWorker({ fetch() { throw new Error("must not delegate"); } });
  assert.equal((await day1.fetch(new Request(origin + "/api/revalidate", { method: "POST" }), enabled, {})).status, 403);
});

test("write methods and private routes never reach Next or the WordPress probe", async () => {
  let delegated = 0;
  let probed = 0;
  const worker = createPreviewWorker({ fetch() { delegated++; } }, () => { probed++; });
  const requests = [
    ["POST", "/api/booking"], ["POST", "/"], ["PUT", "/tuyen-duong"],
    ["PATCH", "/"], ["DELETE", "/"], ["OPTIONS", "/api/booking"],
    ["POST", "/__migration/wordpress"], ["GET", "/api/admin/leads"],
    ["GET", "/api/revalidate"], ["GET", "/quan-tri/lead"],
    ["GET", "/%61pi%2fadmin/leads"], ["GET", "/%2561pi%252fadmin/leads"],
    ["GET", "/%2fapi/admin/leads"], ["GET", "/api%5cadmin/leads"],
    ["GET", "/API/admin/session"], ["GET", "/%71uan-tri"],
    ["GET", "/public/%2e%2e/api/admin/leads"],
    ["GET", "/_next/image?url=https://example.com/image.jpg&w=640&q=75"],
    ["GET", "/cdn-cgi/_next_cache/build-id/index.cache"],
    ["GET", "/cdn-cgi/%5fnext_cache/build-id/index.cache"],
  ];
  for (const [method, path] of requests) {
    const response = await worker.fetch(new Request(origin + path, { method }), {}, {});
    assert.equal(response.status, 403, `${method} ${path}`);
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
  }
  assert.equal(delegated, 0);
  assert.equal(probed, 0);
});

test("public pages and assets retain their content, carry noindex, and allow bodyless HEAD", async () => {
  const env = { ASSETS: {} };
  const ctx = {};
  let delegated = 0;
  const worker = createPreviewWorker({ fetch(request, forwardedEnv, forwardedCtx) {
    delegated++;
    assert.equal(forwardedEnv, env);
    assert.equal(forwardedCtx, ctx);
    return new Response(request.url.endsWith(".webp") ? "image bytes" : "real content", {
      headers: { "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" },
    });
  } });
  for (const method of ["GET", "HEAD"]) {
    for (const path of ["/", "/tuyen-duong", "/logo.webp"]) {
      const response = await worker.fetch(new Request(origin + path, { method }), env, ctx);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
      assert.equal(response.headers.get("X-AloDatXe-Preview"), "readonly-20261006");
      assert.equal(response.headers.get("X-AloDatXe-Cache"), "build-snapshot");
      assert.match(response.headers.get("Server-Timing"), /preview;dur=\d+\.\d/);
      const body = await response.text();
      assert.equal(body, method === "HEAD" ? "" : path.endsWith(".webp") ? "image bytes" : "real content");
    }
  }
  assert.equal(delegated, 6);
});

test("robots disallows all crawling and health works without Next/backend", async () => {
  const worker = createPreviewWorker({ fetch() { throw new Error("must not delegate"); } });
  const robots = await worker.fetch(new Request(origin + "/robots.txt"), {}, {});
  assert.equal(await robots.text(), "User-agent: *\nDisallow: /\n");
  const health = await worker.fetch(new Request(origin + "/__migration/health"), {}, {});
  assert.deepEqual(await health.json(), {
    mode: "read-only", guard: "readonly-20261006", cache: "build-snapshot",
  });
});

test("only successful cookie-free versioned assets can be reused privately by the browser", async () => {
  for (const method of ["GET", "HEAD"]) {
    for (const [path, status, cookie, expected] of [
      ["/_next/static/chunks/abc123.js", 200, false, "private, max-age=31536000, immutable"],
      ["/_next/static/media/abc123.woff2", 200, false, "private, max-age=31536000, immutable"],
      ["/_next/static/chunks/missing.js", 404, false, "private, no-store"],
      ["/_next/static/chunks/session.js", 200, true, "private, no-store"],
      ["/images/logo.webp", 200, false, "private, no-store"],
    ]) {
      const worker = createPreviewWorker({ fetch() {
        return new Response("asset bytes", {
          status, headers: cookie ? { "Set-Cookie": "example=1" } : {},
        });
      } });
      const response = await worker.fetch(new Request(origin + path, { method }), {}, {});
      assert.equal(response.headers.get("Cache-Control"), expected, path);
      assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
      if (method === "HEAD") assert.equal(await response.text(), "");
    }
  }
});

test("WordPress probe ignores user destinations, sends no credentials, and returns no source data", async () => {
  const worker = createPreviewWorker({}, async (url, options) => {
    assert.equal(url, "https://xemiennam.datxesaigon.com/wp-json/wp/v2/route?per_page=1&_fields=id");
    assert.equal(options.method, "GET");
    assert.deepEqual(options.headers, { Accept: "application/json" });
    return Response.json([{ id: 12345, shouldNotBeReturned: "source-data" }]);
  });
  const response = await worker.fetch(new Request(origin + "/__migration/wordpress?url=https://example.com"), {}, {});
  assert.deepEqual(await response.json(), { wordpress_reachable: true, http_status: 200, public_routes_received: 1 });
});

test("backend failures and malformed paths return noindex and do not expose error details", async () => {
  const worker = createPreviewWorker({ fetch() { throw new Error("sensitive backend detail"); } },
    () => { throw new Error("sensitive backend detail"); });
  for (const path of ["/", "/__migration/wordpress", "/%zz"]) {
    const response = await worker.fetch(new Request(origin + path), {}, {});
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
    assert.doesNotMatch(await response.text(), /sensitive/);
  }
});
