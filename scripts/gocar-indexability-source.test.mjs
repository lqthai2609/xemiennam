import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [nextConfig, robots, sitemap, metadataHelper, routeDetailPage, comboPage, airportHubPage] =
  await Promise.all([
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/metadata.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/tuyen-duong/[tinh]/[tuyen]/[loai-xe]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/san-bay/[airportSlug]/page.tsx", import.meta.url), "utf8"),
  ]);

test("Day 27 redirects prefixed airport aliases to the canonical public slug", () => {
  assert.match(
    nextConfig,
    /source:\s*"\/san-bay\/san-bay-:airportSlug"[\s\S]*destination:\s*"\/san-bay\/:airportSlug"[\s\S]*permanent:\s*true/,
  );
});

test("robots keeps the frontend crawlable and advertises the canonical sitemap", () => {
  assert.match(robots, /userAgent:\s*"\*"/);
  assert.match(robots, /allow:\s*"\/"/);
  assert.match(robots, /sitemap:\s*`\$\{SITE_URL\}\/sitemap\.xml`/);
});

test("sitemap uses the canonical site URL and canonical short airport URLs", () => {
  assert.match(sitemap, /url:\s*`\$\{SITE_URL\}\/san-bay\/\$\{airportSlug\}`/);
  assert.match(sitemap, /location\.slug\.replace\(\/\^san-bay-\//);
});

test("sitemap and metadata share the same Long Thanh and thin-combo indexability guards", () => {
  assert.match(sitemap, /routes\.filter\(\(route\) => !isPrelaunchAirportRoute\(route\)\)/);
  assert.match(sitemap, /getIndexableComboVehicleSlugs\(route\)/);
  assert.match(routeDetailPage, /isPrelaunchAirportRoute\(route\)/);
  assert.match(routeDetailPage, /noIndex:\s*true/);
  assert.match(comboPage, /getComboIndexability\(route, loaiXe\)/);
  assert.match(comboPage, /noIndex:\s*!guard\.indexable/);
});

test("canonical and robots metadata are emitted by the shared metadata contract", () => {
  assert.match(metadataHelper, /alternates:\s*\{ canonical: path \}/);
  assert.match(metadataHelper, /robots:\s*\{/);
  assert.match(metadataHelper, /index:\s*!noIndex/);
  assert.match(metadataHelper, /follow:\s*!noFollow/);
});

test("dynamic sitemap entries use real modified timestamps instead of synthetic freshness", () => {
  assert.match(sitemap, /lastModified:\s*hub\?\.modifiedDate/);
  assert.match(sitemap, /lastModified:\s*route\.modifiedDate/);
  assert.match(sitemap, /lastModified:\s*service\.modifiedDate/);
  assert.match(sitemap, /lastModified:\s*post\.modifiedDate/);
});

test("Airport Hub prelaunch state does not emit live Service schema", () => {
  assert.match(airportHubPage, /readiness\.phase === "live"/);
});
