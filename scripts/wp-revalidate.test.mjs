import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/app/api/revalidate/route.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace('import { revalidatePath, revalidateTag } from "next/cache";', 'const { revalidatePath, revalidateTag } = globalThis.__wpRevalidateMocks;')
  .replace('import { NextResponse } from "next/server";', 'const NextResponse = { json: Response.json };')
  .replace('import { WP_CACHE_TAG } from "@/lib/wp";', 'const WP_CACHE_TAG = "alo-wp-v2";');
const calls = [];
globalThis.__wpRevalidateMocks = {
  revalidateTag: (...args) => calls.push(["tag", ...args]),
  revalidatePath: (...args) => calls.push(["path", ...args]),
};
const { POST, GET } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const secret = "test-only-private-key-for-webhook-fixture";
async function send(t, body, key = secret) {
  const previous = process.env.REVALIDATE_SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.REVALIDATE_SECRET;
    else process.env.REVALIDATE_SECRET = previous;
  });
  process.env.REVALIDATE_SECRET = key;
  calls.length = 0;
  return POST(new Request("https://example.test/api/revalidate", { method: "POST", body: JSON.stringify(body) }));
}
test("wrong secrets, null bodies and array bodies never invalidate", async t => {
  for (const payload of [null, [], { secret: "wrong", post_type: "route" }]) {
    const response = await send(t, payload);
    assert.equal(response.status, 401); assert.deepEqual(calls, []);
  }
});
test("public placeholder secret is refused even if configured", async t => {
  assert.equal((await send(t, { secret: "THAY-SECRET-NAY", post_type: "route" }, "THAY-SECRET-NAY")).status, 503);
  assert.deepEqual(calls, []);
});
test("unknown and prototype names cannot trigger arbitrary cache actions", async t => {
  for (const post_type of ["__proto__", "constructor", "booking_request", 123]) {
    assert.equal((await send(t, { secret, post_type })).status, 400); assert.deepEqual(calls, []);
  }
});
test("route save expires shared prices immediately and covers hubs, combos, airport and sitemap", async t => {
  assert.equal((await send(t, { secret, post_type: "route", slug: "../../quan-tri" })).status, 200);
  assert.ok(calls.some(c => c[0] === "tag" && c[1] === "alo-wp-v2:route" && c[2].expire === 0));
  for (const path of ["/tuyen-duong/[tinh]", "/tuyen-duong/[tinh]/[tuyen]", "/tuyen-duong/[tinh]/[tuyen]/[loai-xe]", "/san-bay/[airportSlug]"]) {
    assert.ok(calls.some(c => c[0] === "path" && c[1] === path && c[2] === "page"));
  }
  assert.ok(calls.some(c => c[1] === "/sitemap.xml"));
  assert.ok(!calls.some(c => String(c[1]).includes("quan-tri")));
});
test("location and embedded taxonomy edits invalidate their consumers", async t => {
  await send(t, { secret, post_type: "location" });
  assert.ok(calls.some(c => c[0] === "tag" && c[1] === "alo-wp-v2:location"));
  await send(t, { secret, post_type: "taxonomy" });
  assert.ok(calls.some(c => c[0] === "tag" && c[1] === "alo-wp-v2"));
});
test("invalid JSON returns 400 and GET remains read-only", async () => {
  calls.length = 0;
  const bad = await POST(new Request("https://example.test/api/revalidate", { method: "POST", body: "not JSON" }));
  assert.equal(bad.status, 400);
  const health = await GET(); assert.equal((await health.json()).version, 2);
  assert.deepEqual(calls, []);
});
