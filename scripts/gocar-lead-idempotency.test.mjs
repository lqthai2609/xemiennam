import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fetchBookingWithIdempotency } from "../src/lib/booking-submit.ts";

test("failed submission retains its UUID; a different payload gets a new UUID", async () => {
  const originalFetch = globalThis.fetch;
  const keys = [];
  try {
    globalThis.fetch = async (_path, init) => {
      keys.push(init.headers["x-lead-idempotency-key"]);
      return new Response("", { status: keys.length === 3 ? 200 : 502 });
    };
    const booking = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: "0900000000" }) };
    await fetchBookingWithIdempotency("/api/booking", booking);
    await fetchBookingWithIdempotency("/api/booking", booking);
    await fetchBookingWithIdempotency("/api/booking", { ...booking, body: JSON.stringify({ phone: "0911111111" }) });
    assert.equal(keys[0], keys[1]);
    assert.notEqual(keys[1], keys[2]);
    assert.match(keys[0], /^[a-f0-9-]{36}$/);
  } finally { globalThis.fetch = originalFetch; }
});

test("analytics events omit private URL queries and free-text route labels", async () => {
  const analytics = await readFile(new URL("../src/lib/analytics.ts", import.meta.url), "utf8");
  assert.match(analytics, /const pagePath = window\.location\.pathname;/);
  assert.doesNotMatch(analytics, /content_name:\s*data\.route|content_category:\s*data\.vehicleType/);
});
