import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const load = typescriptLoader({"server-only":{}});
const { evaluatePromotionRules, promotionWithoutApplication } = load("src/lib/api/promotion-evaluator.ts");
const { buildPromotionSnapshot, bookingIntentHash, persistedBookingResponse } = load("src/lib/api/promotion-snapshot.ts");
const fixture = JSON.parse(readFileSync(new URL("./fixtures/promotion-model.json",import.meta.url)));
const tuple=fixture.base.scopes[0];
const now=Date.parse("2000-02-28T05:00:00Z");
const price={mode:"fixed",reason:"fixed",currency:"VND",basePrice:800000,estimatedTotal:900000,modifierAmount:0,
  surcharge:{mode:"fixed",amount:100000,reason:"fixed",matchedRuleKeys:["pickup:zone:0"],components:[{ruleKey:"airport",policyVersion:1,applicationKey:"pickup:zone:0",mode:"fixed",amount:100000}]},
  modifiers:[],condition:{mode:"none",reason:"explicit_none"}};
const record={promotion_id:3001,model:{...structuredClone(fixture.base),enabled:true,approval:{status:"approved",owner:"synthetic-owner",source_ref:"synthetic-source",approved_at:"2000-01-01T00:00:00Z"},activation:fixture.activation,discount:{kind:"percent_discount",target:"base_price",rate_bps:1000}}};
const source={records:[record],reference:()=>({exists:true,readinessVersion:1,activationReady:true,surchargeExists:true})};
const context={tuple};
const ruleContext={route:{meta:{surcharge_policy_version:1,price_modifier_policy_version:1,price_condition_policy_version:1}}};
const fixed=buildPromotionSnapshot(promotionWithoutApplication(price,context,now,"disabled"),ruleContext);
const applied=buildPromotionSnapshot(evaluatePromotionRules(price,context,source,now),ruleContext);
const fixtures={fixed,applied};
for(const mode of ["contact","disabled"]) fixtures[mode]=buildPromotionSnapshot(promotionWithoutApplication({...price,mode,reason:mode==="contact"?"base_contact":"base_disabled"},context,now,"disabled"),ruleContext);
fixtures.benefit=buildPromotionSnapshot(evaluatePromotionRules(price,context,{...source,records:[{...record,model:{...record.model,discount:{kind:"benefit",target:"none",title:"Quyền lợi tổng hợp",rule:"Điều kiện tổng hợp"}}}]},now),ruleContext);
fixtures.free_surcharge=buildPromotionSnapshot(evaluatePromotionRules(price,context,{...source,records:[{...record,model:{...record.model,discount:{kind:"free_surcharge",target:"surcharge",rule_key:"airport",policy_version:1}}}]},now),ruleContext);
// Cross-runtime fixture generated from the actual server builder, never production/CMS.
test("cross-runtime fixtures match current server builder",()=>assert.deepEqual(JSON.parse(readFileSync(new URL("./fixtures/promotion-snapshot.json",import.meta.url))),fixtures));
test("snapshot versions and promotion identity preserve pre/post amounts",()=>{
 assert.equal(applied.snapshot_version,1);assert.equal(applied.pricing_version,2);assert.equal(applied.promotion.promotion_id,3001);assert.equal(applied.promotion.revision,record.model.revision);
 assert.equal(applied.promotion.type,"percent_discount");assert.equal(applied.promotion.target,"base_price");assert.equal(applied.pricing.estimated_total,900000);assert.equal(applied.promotion.promotional_estimated_total,820000);assert.equal(applied.estimate_only,true);
});
test("snapshot preserves money when source objects and campaigns change",()=>{
 const before=structuredClone(applied);const newPrice={...price,basePrice:1000000,estimatedTotal:1100000};
 const changed=buildPromotionSnapshot(evaluatePromotionRules(newPrice,context,{...source,records:[]},now+86400000),ruleContext);
 assert.deepEqual(applied,before);assert.notDeepEqual(applied,changed);assert.equal(changed.promotion.status,"none");
});
for(const mode of ["contact","disabled"]) test(`${mode} never gets a numeric final total`,()=>{
 assert.equal(fixtures[mode].pricing.mode,mode);assert.equal(fixtures[mode].pricing.estimated_total,null);assert.equal(fixtures[mode].promotion.promotional_estimated_total,null);assert.equal(fixtures[mode].promotion.promotion_id,null);
});
test("detached snapshot excludes booking PII, acquisition and diagnostic campaigns",()=>{
 const result=evaluatePromotionRules(price,context,source,now);const snapshot=buildPromotionSnapshot(result,{...ruleContext,pickup:{address:"private"},phone:"private",departureDate:"2000-02-28"});
 result.promotion.validity.start_date="2099-01-01";result.pricing.surcharge.matchedRuleKeys.push("changed");
 assert.equal(snapshot.promotion.window.start_date,fixture.base.window.start_date);assert.deepEqual(snapshot.pricing.surcharge.rule_keys,["pickup:zone:0"]);
 assert.doesNotMatch(JSON.stringify(snapshot),/private|diagnostics|phone|acquisition|departureDate/);
});
test("stable identity canonicalizes objects but preserves trip changes and array order",()=>{
 assert.equal(bookingIntentHash({phone:"synthetic",routeId:"1"}),bookingIntentHash({routeId:"1",phone:"synthetic"}));
 assert.notEqual(bookingIntentHash({direction:"outbound"}),bookingIntentHash({direction:"inbound"}));
 assert.notEqual(bookingIntentHash({stops:[1,2]}),bookingIntentHash({stops:[2,1]}));
});
test("reply uses persisted snapshot and suppresses notifications on replay",()=>{
 const saved={id:42,lead_id:42,replayed:true,promotion_snapshot:applied};const reply=persistedBookingResponse(saved,true);
 assert.deepEqual(reply.promotionSnapshot,applied);assert.equal(reply.notificationSent,false);assert.equal(reply.replayed,true);
 assert.equal(persistedBookingResponse({id:43,lead_id:43,replayed:true}).promotionSnapshot,null);
 assert.throws(()=>persistedBookingResponse({...saved,id:44}));
});
