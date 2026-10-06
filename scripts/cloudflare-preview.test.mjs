import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewWorker } from "../cloudflare/preview-guard.mjs";

const origin = "https://alodatxe-migration-spike.thaivt-thai.workers.dev";

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
  assert.deepEqual(await health.json(), { mode: "read-only", guard: "readonly-20261006" });
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
