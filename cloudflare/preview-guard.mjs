// Access controls who can reach the Worker. This guard prevents writes even
// from an authorized tester and is not a substitute for Cloudflare Access.
const NOINDEX = "noindex, nofollow, noarchive";
const PUBLIC_WP_PROBE =
  "https://xemiennam.datxesaigon.com/wp-json/wp/v2/route?per_page=1&_fields=id";

function previewResponse(response, request, startedAt, cacheMode) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", NOINDEX);
  // Only versioned JS/CSS/fonts may be reused in the signed-in browser.
  // HTML, public files without build hashes, errors and cookie responses stay no-store.
  const immutableAsset = response.ok && !headers.has("Set-Cookie") &&
    new URL(request.url).pathname.startsWith("/_next/static/");
  headers.set("Cache-Control", immutableAsset
    ? "private, max-age=31536000, immutable"
    : "private, no-store");
  headers.set("X-AloDatXe-Preview", "readonly-20261006");
  headers.set("X-AloDatXe-Cache", cacheMode);
  // Measures time until handler response headers, not full stream/image transfer.
  headers.append("Server-Timing", `preview;dur=${(performance.now() - startedAt).toFixed(1)}`);
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data, status = 200) {
  return Response.json(data, { status });
}

function normalizedPath(url) {
  let path = new URL(url).pathname;
  // Normalize encoded separators and names before deciding whether to delegate.
  for (let i = 0; i < 2; i++) {
    const decoded = decodeURIComponent(path);
    if (decoded === path) break;
    path = decoded;
  }
  return new URL(path.replace(/\\/g, "/").replace(/\/{2,}/g, "/"), "https://preview.invalid")
    .pathname
    .toLowerCase();
}

export function createPreviewWorker(handler, probeFetch = globalThis.fetch, options = {}) {
  // This label describes the configured adapter, not a measured cache hit.
  const cacheMode = options.cacheMode === "r2-isr" ? "r2-isr" : "build-snapshot";
  return {
    async fetch(request, env, ctx) {
      const startedAt = performance.now();
      const method = request.method.toUpperCase();
      let response;
      try {
        const path = normalizedPath(request.url);
        // The ISR webhook is opt-in and remains behind Cloudflare Access.
        // Never open another API route or any write method on a public page.
        const webhookReady = cacheMode === "r2-isr" &&
          env?.CF_ISR_WEBHOOK_ENABLED === "true" &&
          typeof env.REVALIDATE_SECRET === "string" &&
          env.REVALIDATE_SECRET.length >= 32 &&
          env.REVALIDATE_SECRET !== "THAY-SECRET-NAY";
        if (method === "POST" && path === "/api/revalidate" &&
            new URL(request.url).pathname === "/api/revalidate" && webhookReady) {
          response = await handler.fetch(request, env, ctx);
        } else if (method !== "GET" && method !== "HEAD") {
          response = json({ error: "Bản thử nghiệm chỉ cho phép xem dữ liệu." }, 403);
        } else if (
          path === "/api" || path.startsWith("/api/") ||
          path === "/quan-tri" || path.startsWith("/quan-tri/") ||
          path === "/_next/image" || path.startsWith("/cdn-cgi/image/") ||
          path === "/cdn-cgi/_next_cache" || path.startsWith("/cdn-cgi/_next_cache/")
        ) {
          response = json({ error: "Chức năng này được tắt trong bản thử nghiệm." }, 403);
        } else if (path === "/robots.txt") {
          response = new Response("User-agent: *\nDisallow: /\n", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } else if (path === "/__migration/health") {
          response = json({ mode: "read-only", guard: "readonly-20261006", cache: cacheMode });
        } else if (path === "/__migration/wordpress") {
          // Fixed public URL, GET only, no credentials, no booking/customer data.
          const upstream = await probeFetch(PUBLIC_WP_PROBE, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(10000),
          });
          const rows = upstream.ok ? await upstream.json() : null;
          const reachable = upstream.ok && Array.isArray(rows);
          response = json({
            wordpress_reachable: reachable,
            http_status: upstream.status,
            public_routes_received: reachable ? rows.length : 0,
          }, reachable ? 200 : 502);
        } else {
          response = await handler.fetch(request, env, ctx);
        }
      } catch {
        // Do not expose backend responses, credentials, or request bodies.
        response = json({ error: "Không thể tải dữ liệu trên bản thử nghiệm." }, 502);
      }
      return previewResponse(response, request, startedAt, cacheMode);
    },
  };
}
