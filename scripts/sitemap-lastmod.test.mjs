import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const helper = dataUrl(transpile(await readFile(new URL("../src/lib/sitemap-lastmod.ts", import.meta.url), "utf8")));
const { sitemapLastModified } = await import(helper);

test("WordPress local timestamps retain their actual day, independent of runtime timezone", () => {
  for (const zone of ["UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles"]) {
    const original = process.env.TZ;
    try {
      process.env.TZ = zone;
      assert.equal(sitemapLastModified("2026-10-08T07:37:17"), "2026-10-08");
      assert.equal(sitemapLastModified("2026-10-08T00:01:00"), "2026-10-08");
      assert.equal(sitemapLastModified("2026-10-08T23:59:59"), "2026-10-08");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  }
});

test("valid dates, offsets and leap days normalize without invented modification dates", () => {
  for (const input of ["2024-02-29", "2024-02-29T23:59:59.123Z", "2024-02-29T00:01:00+07:00", "2024-02-29T23:00:00-08:00"]) {
    assert.equal(sitemapLastModified(input), "2024-02-29");
  }
  assert.equal(sitemapLastModified("2000-02-29"), "2000-02-29");
  assert.equal(sitemapLastModified(new Date("2026-10-08T00:00:00Z")), "2026-10-08");
  for (const value of [undefined, null, "", "Invalid Date", "0000-00-00T00:00:00", "0000-01-01", "2026-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "2026-01-00", "2026-10-08T24:00:00", "2026-10-08T12:60:00", "2026-10-08T12:00:60", "2026-10-08T12:00:00+14:01", "08/10/2026", new Date(NaN), 0]) {
    assert.equal(sitemapLastModified(value), undefined, String(value));
  }
});

test("all sitemap families pass through normalization while URLs and readiness remain intact", async () => {
  const source = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
  const mock = dataUrl(`
    export const SITE_URL = "https://alodatxe.com";
    export const fetchRoutes = async () => [
      {slug:"live",modifiedDate:"2026-10-01T08:00:06",ready:true},
      {slug:"prelaunch",modifiedDate:"2026-10-01T08:00:06",ready:false}
    ];
    export const fetchRegionSlugs = async () => ["province", "ho-chi-minh"];
    export const fetchServices = async () => [{slug:"service",modifiedDate:"2026-02-30T00:00:00"}];
    export const fetchPosts = async () => [{slug:"post",modifiedDate:"2026-10-02T00:01:00"}];
    export const fetchDiemDenBySlug = async () => ({modifiedDate:"2026-10-08T07:37:17"});
    export const getIndexableComboVehicleSlugs = () => ["4-cho"];
    export const vehicleCategories = [];
    export const routeHref = (route) => "/route/" + route.slug;
    export const routeComboHref = (route,vehicle) => "/route/" + route.slug + "/" + vehicle;
    export const resolveRouteContentReadiness = (route) => ({sitemapEligible:route.ready});
  `);
  const code = transpile(source).replace(/"@\/[^\"]+"/g, (name) => name === '"@/lib/sitemap-lastmod"' ? JSON.stringify(helper) : JSON.stringify(mock));
  const { default: sitemap } = await import(dataUrl(code));
  const entries = await sitemap();
  const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
  assert.equal(entries.length, 14);
  assert.equal(byUrl.get("https://alodatxe.com/route/live").lastModified, "2026-10-01");
  assert.equal(byUrl.get("https://alodatxe.com/route/live/4-cho").lastModified, "2026-10-01");
  assert.equal(byUrl.get("https://alodatxe.com/tuyen-duong/province").lastModified, "2026-10-08");
  assert.equal(byUrl.get("https://alodatxe.com/blog/post").lastModified, "2026-10-02");
  assert.equal(byUrl.get("https://alodatxe.com/dich-vu/service").lastModified, undefined);
  assert.equal(byUrl.get("https://alodatxe.com/").lastModified, undefined);
  assert.equal(byUrl.has("https://alodatxe.com/route/prelaunch"), false);
  assert.equal(byUrl.has("https://alodatxe.com/tuyen-duong/ho-chi-minh"), false);
  assert.equal(byUrl.has("https://alodatxe.com/khuyen-mai"), false);
});
