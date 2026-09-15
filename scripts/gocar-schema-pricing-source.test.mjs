import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  schema,
  routeDetailPage,
  airportHubPage,
  comboPage,
  provincePage,
  servicePage,
  vehiclePage,
  airportHubComponent,
] = await Promise.all([
  readFile(new URL("../src/lib/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/san-bay/[airportSlug]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/tuyen-duong/[tinh]/[tuyen]/[loai-xe]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/tuyen-duong/[tinh]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/dich-vu/[slug]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/loai-xe/[slug]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/airport-hub-page.tsx", import.meta.url), "utf8"),
]);

test("Day 28 AggregateOffer candidates only accept positive finite fixed prices", () => {
  assert.match(schema, /candidate\.mode === "fixed"/);
  assert.match(schema, /typeof candidate\.price === "number"/);
  assert.match(schema, /Number\.isFinite\(candidate\.price\)/);
  assert.match(schema, /candidate\.price > 0/);
});

test("Service schema derives AggregateOffer bounds and count from validated offers", () => {
  assert.match(schema, /validOffers = offers\?\.offers\.filter/);
  assert.match(schema, /Number\.isFinite\(offer\.price\) && offer\.price > 0/);
  assert.match(schema, /lowPrice: Math\.min\(\.\.\.validPrices\)/);
  assert.match(schema, /highPrice: Math\.max\(\.\.\.validPrices\)/);
  assert.match(schema, /offerCount: validOffers\.length/);
});

test("all priced Service schema page families use the fixed-price helper", () => {
  assert.match(routeDetailPage, /buildFixedServiceOffers\(/);
  assert.match(routeDetailPage, /mode: item\.mode/);
  assert.match(airportHubPage, /buildFixedServiceOffers\(/);
  assert.match(airportHubPage, /mode: pkg\.mode/);
  assert.match(comboPage, /buildFixedServiceOffers\(/);
  assert.match(comboPage, /mode: vp\.pricingMode/);
  assert.match(comboPage, /offers: serviceOffers/);
  assert.doesNotMatch(comboPage, /const fixedPrice =/);
});

test("contact pricing is never serialized as a zero-price schema offer", () => {
  const pricedSources = [schema, routeDetailPage, airportHubPage, comboPage].join("\n");
  assert.doesNotMatch(pricedSources, /mode\s*===\s*["']contact["'][\s\S]{0,180}price\s*:\s*0/);
  assert.doesNotMatch(pricedSources, /mode\s*===\s*["']contact["'][\s\S]{0,180}\?\?\s*0/);
});

test("BreadcrumbList schema is present across the main commercial page families", () => {
  for (const source of [routeDetailPage, airportHubPage, comboPage, provincePage, servicePage, vehiclePage]) {
    assert.match(source, /buildBreadcrumbListSchema\(/);
    assert.match(source, /<JsonLd data=\{breadcrumbSchema\} \/>/);
  }
  assert.match(schema, /"@type": "BreadcrumbList"/);
  assert.match(schema, /position: index \+ 1/);
  assert.match(schema, /item: absoluteUrl\(item\.url\)/);
});

test("FAQ schema remains semantic markup only where FAQ content exists", () => {
  assert.match(schema, /"@type": "FAQPage"/);
  assert.match(schema, /"@type": "Question"/);
  assert.match(schema, /"@type": "Answer"/);
  assert.match(provincePage, /hub && hub\.faqItems\.length > 0/);
  assert.match(airportHubComponent, /buildFaqPageSchema\(faqs\)/);
});
