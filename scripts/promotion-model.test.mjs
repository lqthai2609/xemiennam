import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const load = typescriptLoader();
const { validatePromotionModel, parsePromotionPercent, promotionWindow, readLegacyPromotionForAudit, PROMOTION_COMMERCIAL_ENABLED } = load("src/lib/api/promotion-model.ts");
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/promotion-model.json", import.meta.url)));
const reference = (overrides = {}) => () => ({ exists: true, readinessVersion: 1, activationReady: true, surchargeExists: true, ...overrides });
for (const fixture of fixtures.cases) test(`model: ${fixture.name}`, () => {
  const result = validatePromotionModel(fixture.model, reference(fixture.reference));
  assert.equal(result.valid, fixture.valid, JSON.stringify(result));
  if (!result.valid && fixture.field) assert.ok(result.errors.some(({ field }) => field.startsWith(fixture.field)), JSON.stringify(result));
  if (result.valid && !Object.hasOwn(fixture.model, "enabled")) assert.equal(result.model.enabled, false);
});
test("NaN, infinity and malformed objects are rejected without coercion", () => {
  for (const value of [NaN, Infinity, -Infinity, null, {}, []]) {
    const m = structuredClone(fixtures.base); m.discount.rate_bps = value;
    assert.equal(validatePromotionModel(m, reference()).valid, false);
  }
  for (const value of [null, [], false, {}, "promotion"]) assert.equal(validatePromotionModel(value, reference()).valid, false);
});
test("percentage parser rejects more than two decimal places, zero and 100 percent", () => {
  for (const [value, expected] of [["0.01",1],["99.99",9999],["10",1000],["1.2",120],["0",undefined],["100",undefined],["1.001",undefined],["1e1",undefined],["10%",undefined],[true,undefined],[10,undefined]]) assert.equal(parsePromotionPercent(value), expected);
});
test("the time window includes the whole end date in Vietnam independently of host timezone", () => {
  const {startAt,endExclusive} = promotionWindow(fixtures.base.window);
  assert.equal(new Date(startAt).toISOString(), "2000-02-27T17:00:00.000Z");
  assert.equal(new Date(endExclusive).toISOString(), "2000-02-29T17:00:00.000Z");
  assert.ok(endExclusive - 1 >= startAt);
  for (const patch of [{end_date:"2001-02-29"},{timezone:"UTC"},{end_date:"2000-02-01"}]) assert.throws(() => promotionWindow({...fixtures.base.window,...patch}));
});
test("legacy is audit-only even if published, in-date and positive; commerce stays off", () => {
  const legacy = readLegacyPromotionForAudit(1001, {loai_giam_gia:"phan_tram",gia_tri_giam:10,ngay_bat_dau:"2000-01-01",ngay_ket_thuc:"9999-01-01",ap_dung_route:[]});
  assert.equal(legacy.enabled,false); assert.equal(legacy.status,"unapproved"); assert.equal(legacy.model_version,0);
  assert.equal(PROMOTION_COMMERCIAL_ENABLED,false);
});
test("public list cannot promote legacy or mock fixtures through the commercial gate", async () => {
  let calls = 0;
  const stubbed = typescriptLoader({"./raw":{fetchRawPromotions:async()=>{calls++; return [{id:1001}];}},"./routes":{},"./vehicles":{},"./mock-fallback":{shouldUseMockFallback:()=>true}});
  assert.deepEqual(await stubbed("src/lib/api/promotions.ts").fetchPromotions(),[]);
  assert.equal(calls,0);
});
