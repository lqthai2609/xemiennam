import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { typescriptLoader } from "./lib/load-typescript.mjs";
import { scanLocationVariants } from "./gocar-location-display-audit.mjs";

const load = typescriptLoader();
const {
  HO_CHI_MINH_CANONICAL_NAME,
  getPublicLocationLabel,
  getPublicRouteLabel,
} = load("src/lib/public-location-label.ts");

test("public formatter maps every Ho Chi Minh alias to Sài Gòn", () => {
  for (const alias of [
    "TP.HCM",
    "TP HCM",
    "TP. HCM",
    "TP Hồ Chí Minh",
    "TP. Hồ Chí Minh",
    "Hồ Chí Minh",
    "ho-chi-minh",
    "tp-hcm",
  ]) {
    assert.equal(getPublicLocationLabel(alias), "Sài Gòn", alias);
  }
  assert.equal(getPublicLocationLabel({ name: "TP. Hồ Chí Minh", slug: "tp-hcm" }), "Sài Gòn");
  assert.equal(getPublicLocationLabel("Vũng Tàu"), "Vũng Tàu");
  assert.equal(getPublicRouteLabel({ from: "TP. Hồ Chí Minh", to: "Vũng Tàu" }), "Sài Gòn → Vũng Tàu");
});

test("canonical data and URL identity remain unchanged", async () => {
  const [routes, routeType] = await Promise.all([
    readFile(new URL("../src/data/routes.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/types/route.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(HO_CHI_MINH_CANONICAL_NAME, "TP. Hồ Chí Minh");
  assert.match(routes, /from: "TP\. Hồ Chí Minh"/);
  assert.match(routeType, /route\.slug/);
  assert.doesNotMatch(routeType, /replace\([^\n]*tp-hcm/i);
});

test("public source contains no unformatted Ho Chi Minh display variant", async () => {
  const report = await scanLocationVariants();
  assert.equal(report.summary.PUBLIC_DISPLAY, 0, JSON.stringify(report.occurrences.filter((item) => item.classification === "PUBLIC_DISPLAY"), null, 2));
  assert.equal(report.summary.REVIEW_REQUIRED, 0, JSON.stringify(report.occurrences.filter((item) => item.classification === "REVIEW_REQUIRED"), null, 2));
  assert.ok(report.summary.TECHNICAL_KEEP > 0);
});

test("public route surfaces use the shared formatter instead of direct canonical labels", async () => {
  const files = [
    "../src/components/route-results.tsx",
    "../src/components/route-detail.tsx",
    "../src/components/route-pricing-section.tsx",
    "../src/components/bang-gia-page-client.tsx",
    "../src/components/diem-den-detail.tsx",
    "../src/components/home-dynamic-sections.tsx",
    "../src/components/routes-page-client.tsx",
    "../src/components/route-vehicle-combo.tsx",
    "../src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx",
    "../src/app/tuyen-duong/[tinh]/[tuyen]/[loai-xe]/page.tsx",
  ];
  const sources = await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  for (const [index, source] of sources.entries()) {
    assert.match(source, /public-location-label/, files[index]);
    assert.doesNotMatch(source, />\s*\{route\.(?:from|to|region)(?:\.toUpperCase\(\))?\}\s*</, files[index]);
    assert.doesNotMatch(source, /(?:eyebrow|title|description|name):?[^\n]*\$\{route\.region(?:\.toUpperCase\(\))?\}/, files[index]);
  }
});
