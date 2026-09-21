import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { typescriptLoader } from "./lib/load-typescript.mjs";

const load = typescriptLoader();
const { resolveContentReadiness } = load("src/lib/content-readiness.ts");

const readyRecord = {
  version: 1,
  editorialState: "ready",
  serviceState: "live",
  canonicalState: "verified",
  mappingState: "clear",
  requestedIndexability: "index",
  schemaState: "offer",
};

test("SEO-005 remains rollout-inactive until version 1 and preserves the Long Thanh prelaunch guard", () => {
  assert.equal(resolveContentReadiness(undefined).policyActive, false);
  assert.equal(resolveContentReadiness(undefined).indexable, true);
  assert.equal(resolveContentReadiness(undefined, { prelaunch: true }).indexable, false);
});

test("SEO-005 allows index, sitemap and schema only when all readiness gates pass", () => {
  const decision = resolveContentReadiness(readyRecord, { hasFixedOffer: true });
  assert.equal(decision.policyActive, true);
  assert.equal(decision.indexable, true);
  assert.equal(decision.sitemapEligible, true);
  assert.equal(decision.serviceSchemaEligible, true);
  assert.equal(decision.offerSchemaEligible, true);
  assert.deepEqual(decision.reasons, ["ready"]);
});

test("D35-10, prelaunch and unverified canonical states block activation independently", () => {
  for (const [patch, reason] of [
    [{ mappingState: "d35_10_blocked" }, "d35_10_blocked"],
    [{ serviceState: "prelaunch" }, "prelaunch"],
    [{ canonicalState: "candidate" }, "canonical_not_verified"],
    [{ editorialState: "review" }, "editorial_not_ready"],
    [{ requestedIndexability: "noindex" }, "index_not_requested"],
  ]) {
    const decision = resolveContentReadiness({ ...readyRecord, ...patch }, { hasFixedOffer: true });
    assert.equal(decision.indexable, false);
    assert.ok(decision.reasons.includes(reason));
    assert.equal(decision.offerSchemaEligible, false);
  }
});

test("contact pricing may keep Service schema but never creates an Offer", () => {
  const decision = resolveContentReadiness(readyRecord, { hasFixedOffer: false });
  assert.equal(decision.indexable, true);
  assert.equal(decision.serviceSchemaEligible, true);
  assert.equal(decision.offerSchemaEligible, false);
});

test("Day 36B price explanation is shared by route pricing and the public price table", async () => {
  const [component, routePricing, priceTable] = await Promise.all([
    readFile(new URL("../src/components/price-explanation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/route-pricing-section.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/bang-gia-page-client.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(component, /Giá từ/);
  assert.match(component, /Ước tính chuyến/);
  assert.match(component, /Liên hệ báo giá/);
  assert.doesNotMatch(component, /price\s*=\s*0|giá\s+0/i);
  assert.match(routePricing, /<PriceExplanation compact \/>/);
  assert.match(priceTable, /<PriceExplanation compact \/>/);
});

test("DEP-011 replaces the public source brand while keeping the runtime hostname untouched", async () => {
  const [siteConfig, wordpressContract] = await Promise.all([
    readFile(new URL("../src/lib/site-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../wordpress/gocar-core/includes/class-gocar-content-readiness.php", import.meta.url), "utf8"),
  ]);
  assert.match(siteConfig, /SITE_NAME = "Alo Đặt Xe"/);
  assert.match(siteConfig, /https:\/\/xemiennam\.vercel\.app/);
  assert.match(wordpressContract, /content_readiness_version/);
  assert.match(wordpressContract, /d35_10_blocked/);
});

