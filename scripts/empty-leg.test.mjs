import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const { validateEmptyLegModel: validate, assessEmptyLeg: assess, createEmptyLegDraft, emptyLegDepartureAt, EMPTY_LEG_COMMERCIAL_ENABLED } = typescriptLoader()("src/lib/empty-leg.ts");
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/empty-leg.json", import.meta.url)));
const resolver = (ref = fixtures.reference) => () => structuredClone(ref);
for (const f of fixtures.cases) test(`empty-leg: ${f.name}`, () => {
  const result = validate(f.model, resolver(f.reference));
  assert.equal(result.valid, f.valid, JSON.stringify(result));
});
test("new draft has no implied route, time, price, approval or active inventory", () => {
  assert.deepEqual(createEmptyLegDraft(), fixtures.draft);
  const one = createEmptyLegDraft(); one.prices.special_price_vnd = 1;
  assert.equal(createEmptyLegDraft().prices.special_price_vnd, null);
  assert.equal(assess(fixtures.draft).state, "draft");
});
test("host timezone never changes Vietnam departure, including midnight and leap day", () => {
  for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
    const old = process.env.TZ; process.env.TZ = tz;
    try {
      assert.equal(emptyLegDepartureAt(fixtures.base.departure), Date.parse("2030-01-01T17:30:00Z"));
      assert.equal(emptyLegDepartureAt({date:"2028-02-29",time:"00:00",timezone:"Asia/Ho_Chi_Minh"}), Date.parse("2028-02-28T17:00:00Z"));
    } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
  }
});
test("validity is half open, expires by departure and never returns a sellable price or URL", () => {
  const start = Date.parse(fixtures.base.valid_from), end = Date.parse(fixtures.base.expires_at);
  for (const [now, state] of [[start-1,"not_yet_available"],[start,"eligible"],[end-1,"eligible"],[end,"expired"],[end+1,"expired"]]) {
    const out = assess(fixtures.base, resolver(), now);
    assert.deepEqual(out, { state, sellable:false, commercial_enabled:false, robots:"noindex,nofollow", sitemap:false, public_url:null });
  }
  assert.equal(EMPTY_LEG_COMMERCIAL_ENABLED,false);
  assert.equal(assess(fixtures.base,resolver(),NaN).state,"invalid");
});
test("reserved, completed, cancelled and inactive never become available just because dates are valid", () => {
  for (const status of ["reserved","completed","cancelled","inactive"]) assert.equal(assess({...fixtures.base,status},resolver(),Date.parse(fixtures.base.valid_from)).state,status);
});
test("references fail closed, changed price/readiness requires new confirmation, input stays immutable", () => {
  assert.equal(validate(fixtures.base).valid,false);
  assert.equal(validate(fixtures.base,()=>{throw new Error("offline");}).valid,false);
  const m = structuredClone(fixtures.base), before = structuredClone(m);
  assert.equal(validate(m,resolver({...fixtures.reference,normalPriceVnd:999999})).valid,false);
  assert.deepEqual(m,before);
  const out = validate(m,resolver()); out.model.prices.special_price_vnd = 1;
  assert.equal(m.prices.special_price_vnd,700000);
});
test("malformed roots, nonfinite money, forged stamps and extra PII are rejected", () => {
  for (const input of [null, false, [], {}, "legacy"]) assert.equal(validate(input).valid,false);
  for (const price of [NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,true,[],{}]) {
    const m = structuredClone(fixtures.base); m.prices.special_price_vnd = price;
    assert.equal(validate(m,resolver()).valid,false);
  }
  for (const key of ["approved_at","phone","flight_number","pickup_address","promotion_id","coupon","canonical_url"]) assert.equal(validate({...fixtures.base,[key]:"injected"},resolver()).valid,false);
});
