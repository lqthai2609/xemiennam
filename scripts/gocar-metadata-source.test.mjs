import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePaths = [
  "../src/app/page.tsx",
  "../src/app/tuyen-duong/page.tsx",
  "../src/app/tuyen-duong/[tinh]/page.tsx",
  "../src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx",
  "../src/app/tuyen-duong/[tinh]/[tuyen]/[loai-xe]/page.tsx",
  "../src/app/san-bay/[airportSlug]/page.tsx",
  "../src/app/loai-xe/page.tsx",
  "../src/app/loai-xe/[slug]/page.tsx",
  "../src/app/dich-vu/page.tsx",
  "../src/app/dich-vu/[slug]/page.tsx",
  "../src/app/blog/page.tsx",
  "../src/app/blog/[slug]/page.tsx",
  "../src/app/bang-gia/page.tsx",
  "../src/app/lien-he/page.tsx",
  "../src/app/diem-den/page.tsx",
  "../src/app/danh-gia/page.tsx",
  "../src/app/khuyen-mai/page.tsx",
];

const [layout, metadataHelper, ...pages] = await Promise.all([
  readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/metadata.ts", import.meta.url), "utf8"),
  ...pagePaths.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
]);

const routeDetailPage = pages[3];
const comboPage = pages[4];
const airportHubPage = pages[5];
const blogDetailPage = pages[11];

test("Day 26 root metadata defines the shared base, title template and social defaults", () => {
  assert.match(layout, /metadataBase:\s*new URL\(SITE_URL\)/);
  assert.match(layout, /template:\s*`%s \| \$\{SITE_NAME\}`/);
  assert.match(layout, /openGraph:\s*\{/);
  assert.match(layout, /twitter:\s*\{/);
});

test("shared metadata builder normalizes brand titles and emits canonical, Open Graph and Twitter metadata", () => {
  assert.match(metadataHelper, /normalizeMetadataTitle/);
  assert.match(metadataHelper, /leadingBrandPattern/);
  assert.match(metadataHelper, /trailingBrandPattern/);
  assert.match(metadataHelper, /alternates:\s*\{ canonical: path \}/);
  assert.match(metadataHelper, /openGraph:\s*\{/);
  assert.match(metadataHelper, /twitter:\s*\{/);
  assert.match(metadataHelper, /robots:\s*\{/);
});

test("shared metadata builder sanitizes legacy CMS brand before public metadata is emitted", () => {
  assert.match(metadataHelper, /LEGACY_BRAND_PATTERN\s*=\s*new RegExp/);
  assert.match(metadataHelper, /\["Xe", "Miền", "Nam"\]\.join\("\\\\s\+"\)/);
  assert.match(metadataHelper, /\["Gocar", "VN"\]\.join\("\\\\s\+"\)/);
  assert.match(metadataHelper, /sanitizeMetadataText\(title\)/);
  assert.match(metadataHelper, /sanitizeMetadataText\(description\)/);
  assert.match(metadataHelper, /description:\s*sanitizedDescription/);
});

test("all existing page metadata declarations use the shared Day 26 contract", () => {
  pagePaths.forEach((path, index) => {
    assert.match(pages[index], /buildPageMetadata\(/, `${path} must use buildPageMetadata()`);
  });
});

test("canonical paths are attached to all valid page metadata families", () => {
  const canonicalPages = pages.filter((source) => /path:\s*/.test(source));
  assert.equal(canonicalPages.length, pages.length, "every metadata page must provide a canonical path for valid pages");
});

test("Day 26 preserves Long Thanh and thin combo indexability guards", () => {
  assert.match(routeDetailPage, /resolveRouteContentReadiness\(route\)/);
  assert.match(routeDetailPage, /noIndex:\s*!readiness\.indexable/);
  assert.match(comboPage, /getComboIndexability\(route, loaiXe\)/);
  assert.match(comboPage, /noIndex:\s*!guard\.indexable/);
  assert.match(airportHubPage, /readiness\.phase === "live"/);
});

test("CMS-driven detail pages keep Rank Math as the preferred source", () => {
  assert.match(routeDetailPage, /route\.rankMathTitle/);
  assert.match(routeDetailPage, /route\.rankMathDescription/);
  assert.match(blogDetailPage, /post\.rankMathTitle/);
  assert.match(blogDetailPage, /post\.rankMathDescription/);
});
