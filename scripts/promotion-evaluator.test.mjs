import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const load = typescriptLoader({ "server-only": {} });
const { evaluatePromotionRules, safePromotionPricing } = load("src/lib/api/promotion-evaluator.ts");
const { resolvePriceRulesWithPromotion } = load("src/lib/api/promotion-pricing.ts");
const { promotionReferenceFromSnapshot } = load("src/lib/api/promotion-reference.ts");
const { resolveSurchargeV2 } = load("src/lib/api/service-zones.ts");
const fixture = JSON.parse(readFileSync(new URL("./fixtures/promotion-model.json", import.meta.url)));
const tuple = fixture.base.scopes[0];
const now = Date.parse("2000-02-28T12:00:00+07:00");
const reference = (overrides = {}) => () => ({ exists: true, readinessVersion: 1, activationReady: true, surchargeExists: true, ...overrides });
function record(discount = {kind:"percent_discount",target:"base_price",rate_bps:1000}, patch = {}, id = 3001) {
  return { promotion_id:id, model:{ ...structuredClone(fixture.base), enabled:true, approval:{status:"approved",owner:"synthetic-owner",source_ref:"synthetic-source",approved_at:"2000-01-01T00:00:00Z"}, activation:structuredClone(fixture.activation), discount, ...patch } };
}
function price(base = 800000, surcharge = 100000) {
  return { mode:"fixed",currency:"VND",basePrice:base,estimatedTotal:base+surcharge,modifierAmount:0,
    surcharge:surcharge ? {mode:"fixed",amount:surcharge,matchedRuleKeys:["pickup:zone:0"],components:[{ruleKey:"airport",policyVersion:1,applicationKey:"pickup:zone:0",mode:"fixed",amount:surcharge}],reason:"fixed"} : {mode:"none",matchedRuleKeys:[],reason:"no_surcharge"},
    modifiers:[],condition:{mode:"none",reason:"explicit_none"},reason:"fixed" };
}
function evaluate(records = [record()], pricing = price(), context = {}, clock = now, ref = reference()) {
  return evaluatePromotionRules(pricing,{tuple,...context},{records,reference:ref},clock);
}
for (const [name,discount,amount,total,layer,before,after] of [
  ["percent base",{kind:"percent_discount",target:"base_price",rate_bps:1000},80000,820000,"base_price",800000,720000],
  ["percent total",{kind:"percent_discount",target:"estimated_total",rate_bps:1000},90000,810000,"estimated_total",900000,810000],
  ["fixed base",{kind:"fixed_discount",target:"base_price",amount_vnd:80000},80000,820000,"base_price",800000,720000],
  ["special base",{kind:"special_price",target:"base_price",amount_vnd:750000},50000,850000,"base_price",800000,750000],
  ["free exact surcharge",{kind:"free_surcharge",target:"surcharge",rule_key:"airport",policy_version:1},100000,800000,"surcharge",100000,0],
  ["capped surcharge",{kind:"free_surcharge",target:"surcharge",rule_key:"airport",policy_version:1,cap_vnd:40000},40000,860000,"surcharge",100000,60000],
]) test(name,()=>{
  const pricing=price(),copy=structuredClone(pricing); const result=evaluate([record(discount)],pricing).promotion;
  assert.equal(result.reason,"applied"); assert.equal(result.discountAmount,amount);assert.equal(result.promotionalEstimatedTotal,total);
  assert.equal(result.priceLayer,layer);assert.equal(result.comparisonBefore,before);assert.equal(result.comparisonAfter,after);
  assert.deepEqual(pricing,copy);assert.equal(result.basePrice,800000);assert.equal(result.estimatedTotalBeforePromotion,900000);
});
test("benefit carries no artificial price discount or stacking",()=>{
  const benefit=record({kind:"benefit",target:"none",title:"Quyền lợi tổng hợp",rule:"Điều kiện đã duyệt"});
  const result=evaluate([benefit]).promotion;
  assert.equal(result.promotionStatus,"benefit");assert.equal(result.discountAmount,0);assert.equal(result.promotionalEstimatedTotal,900000);
  assert.equal(result.comparisonBefore,undefined);assert.equal(result.priceLayer,undefined);assert.ok(result.publicBenefit);
  assert.equal(evaluate([benefit,record(undefined,{},3002)]).promotion.reason,"ambiguous_promotion");
});
for (const mode of ["contact","disabled"]) test(`${mode} never acquires a numeric promotion`,()=>{
  const result=evaluate([record()],{...price(),mode}).promotion;
  assert.equal(result.pricingMode,mode);assert.equal(result.promotionalEstimatedTotal,undefined);assert.equal(result.discountAmount,undefined);
  assert.equal(result.estimatedTotalBeforePromotion,undefined);assert.equal(result.promotion_id,undefined);
});
for (const [name,patch,ref,expected] of [
  ["draft",{enabled:false,approval:{status:"draft",owner:"owner",source_ref:"source",approved_at:null}}, {},"unapproved"],
  ["paused",{enabled:false},{},"disabled"],
  ["empty scopes",{scopes:[]},{},"invalid_config"],
  ["unknown condition",{conditions:[{kind:"coupon",code:"unknown"}]},{},"invalid_config"],
  ["removed ID",{}, {exists:false},"reference_missing"],
  ["Long Thanh",{}, {prelaunch:true},"prelaunch_blocked"],
  ["blocked mapping",{}, {mappingBlocked:true},"mapping_blocked"],
  ["readiness changed",{}, {readinessVersion:2},"mapping_blocked"],
  ["readiness missing",{}, {readinessVersion:undefined},"mapping_blocked"],
  ["direction unavailable",{}, {activationReady:false},"mapping_blocked"],
  ["future approval",{approval:{status:"approved",owner:"owner",source_ref:"source",approved_at:"2000-03-01T00:00:00Z"}},{},"unapproved"],
]) test(name,()=>{
  const result=evaluate([record(undefined,patch)],price(),{},now,reference(ref)).promotion;
  assert.equal(result.reason,expected);assert.equal(result.estimatedTotalBeforePromotion,900000);assert.equal(result.promotionalEstimatedTotal,undefined);
});
for (const patch of [{direction:"inbound"},{route_id:1002},{vehicle_id:2002},{package_key:"round_trip_day"}]) test(`exact tuple ${JSON.stringify(patch)}`,()=>{
  assert.equal(evaluate([record()],price(),{tuple:{...tuple,...patch}}).promotion.reason,"scope_mismatch");
});
for (const clock of [Date.parse("2000-02-27T17:00:00Z")-1,Date.parse("2000-02-27T17:00:00Z"),Date.parse("2000-02-29T17:00:00Z")-1,Date.parse("2000-02-29T17:00:00Z")]) test(`window ${clock}`,()=>{
  const result=evaluate([record()],price(),{},clock).promotion;
  const expected=clock<Date.parse("2000-02-27T17:00:00Z")?"scheduled":clock>=Date.parse("2000-02-29T17:00:00Z")?"expired":"applied";
  assert.equal(result.reason,expected);assert.equal(result.nextBoundaryAt,expected==="expired"?undefined:expected==="scheduled"?"2000-02-27T17:00:00.000Z":"2000-02-29T17:00:00.000Z");
});
for (const [condition,context,expected] of [
  [{kind:"departure_date_range",start_date:"2000-02-29",end_date:"2000-03-01"},{departureDate:"2000-02-29"},"applied"],
  [{kind:"departure_date_range",start_date:"2000-02-29",end_date:"2000-03-01"},{departureDate:"2000-02-28"},"scope_mismatch"],
  [{kind:"departure_weekdays",days:[1]},{departureDate:"2000-02-28"},"applied"],
  [{kind:"departure_weekdays",days:[0]},{departureDate:"2000-02-28"},"scope_mismatch"],
  [{kind:"departure_weekdays",days:[1]},{departureDate:"2001-02-29"},"context_missing"],
  [{kind:"departure_weekdays",days:[1]}, {},"context_missing"],
  [{kind:"advance_booking_minutes",minimum:60},{departureDate:"2000-02-28",departureTime:"13:00"},"applied"],
  [{kind:"advance_booking_minutes",minimum:60},{departureDate:"2000-02-28",departureTime:"12:59"},"scope_mismatch"],
  [{kind:"advance_booking_minutes",minimum:60},{departureDate:"2000-02-28"},"context_missing"],
  [{kind:"advance_booking_minutes",minimum:60},{departureDate:"2000-02-28",departureTime:"25:00"},"context_missing"],
  [{kind:"min_eligible_amount",amount_vnd:800000},{},"applied"],
  [{kind:"min_eligible_amount",amount_vnd:800001},{},"scope_mismatch"],
]) test(`predicate ${JSON.stringify(condition)} ${JSON.stringify(context)}`,()=>assert.equal(evaluate([record(undefined,{conditions:[condition]})],price(),context).promotion.reason,expected));
test("all predicates must pass; request date is independent from trip date",()=>{
  const r=record(undefined,{conditions:[{kind:"departure_weekdays",days:[1]},{kind:"min_eligible_amount",amount_vnd:800001}]});
  assert.equal(evaluate([r],price(),{departureDate:"2000-02-28"}).promotion.reason,"scope_mismatch");
  assert.equal(evaluate([record()],price(),{departureDate:"2050-01-01"}).promotion.reason,"applied");
  assert.equal(evaluate([record()],price(),{departureDate:"2000-02-28"},Date.parse("2000-03-01T00:00:00+07:00")).promotion.reason,"expired");
});
for (const discount of [
  {kind:"fixed_discount",target:"base_price",amount_vnd:800000},
  {kind:"fixed_discount",target:"base_price",amount_vnd:800001},
  {kind:"fixed_discount",target:"estimated_total",amount_vnd:900000},
  {kind:"special_price",target:"base_price",amount_vnd:800000},
  {kind:"special_price",target:"base_price",amount_vnd:900000},
  {kind:"percent_discount",target:"base_price",rate_bps:10000},
]) test(`invalid reduction ${JSON.stringify(discount)}`,()=>{
  const result=evaluate([record(discount)]).promotion;assert.equal(result.reason,"invalid_config");assert.equal(result.discountAmount,undefined);assert.equal(result.estimatedTotalBeforePromotion,900000);
});
test("BigInt exact floor at 1 and 9999 bps, large product and one VND edge",()=>{
  for(const [base,bps,expected] of [[10001,1,1],[10001,9999,9999],[Number.MAX_SAFE_INTEGER,9999,9006298534815516]]){
    const result=evaluate([record({kind:"percent_discount",target:"base_price",rate_bps:bps})],price(base,0)).promotion;
    assert.equal(result.discountAmount,expected);assert.ok(Number.isSafeInteger(result.promotionalEstimatedTotal));assert.ok(result.promotionalEstimatedTotal>0);
  }
  assert.equal(evaluate([record({kind:"percent_discount",target:"base_price",rate_bps:1})],price(1,0)).promotion.reason,"invalid_config");
});
test("many boundary amounts never produce a zero, unsafe or larger-than-before final",()=>{
  for(const base of [1,2,99,100,9999,10000,10001,999999,Number.MAX_SAFE_INTEGER])for(const bps of [1,10,100,1000,9999]){
    const result=evaluate([record({kind:"percent_discount",target:"base_price",rate_bps:bps})],price(base,0)).promotion;
    if(result.reason==="applied"){
      assert.ok(Number.isSafeInteger(result.discountAmount)&&result.discountAmount>0&&result.discountAmount<base);
      assert.ok(result.promotionalEstimatedTotal>0&&result.promotionalEstimatedTotal<base);
      assert.equal(result.discountAmount+result.promotionalEstimatedTotal,base);
    }else assert.equal(result.reason,"invalid_config");
  }
});
test("priority then explicit scope specificity; no order, ID, best-discount or benefit stacking",()=>{
  const broad=record(undefined,{priority:10,scope_policy:{route:"all",direction:"all",vehicle:"all",package:"all"}},3001);
  const narrow=record({kind:"fixed_discount",target:"base_price",amount_vnd:1},{priority:10},3002);
  for(const records of [[broad,narrow],[narrow,broad]]){const r=evaluate(records).promotion;assert.equal(r.promotion_id,3002);assert.equal(r.discountAmount,1);}
  broad.model.priority=11;assert.equal(evaluate([narrow,broad]).promotion.promotion_id,3001);
  const tie=record(undefined,{},3003);
  for(const records of [[record(),tie],[tie,record()]]){const r=evaluate(records).promotion;assert.equal(r.reason,"ambiguous_promotion");assert.equal(r.promotion_id,undefined);assert.equal(r.discountAmount,undefined);assert.equal(r.promotionalEstimatedTotal,undefined);}
  assert.equal(evaluate([narrow,{...narrow}]).promotion.reason,"invalid_config");
});
test("invalid higher-priority discount excluded before selecting a valid candidate",()=>{
  const invalid=record({kind:"fixed_discount",target:"base_price",amount_vnd:800000},{priority:99},3002);
  assert.equal(evaluate([invalid,record()]).promotion.promotion_id,3001);
});
test("free surcharge rejects missing key, changed version, duplicate applications, none and unresolved component",()=>{
  const r=record({kind:"free_surcharge",target:"surcharge",rule_key:"airport",policy_version:1});
  for(const patch of [{ruleKey:"other"},{policyVersion:2},{mode:"none"},{amount:0},{amount:1.5}]){
    const p=price();Object.assign(p.surcharge.components[0],patch);assert.equal(evaluate([r],p).promotion.reason,"reference_missing");
  }
  const p=price();p.surcharge.components=[{...p.surcharge.components[0],amount:50000},{...p.surcharge.components[0],applicationKey:"dropoff:zone:0",amount:50000}];
  assert.equal(evaluate([r],p).promotion.reason,"reference_missing");
  delete p.surcharge.components;assert.equal(evaluate([r],p).promotion.reason,"reference_missing");
  p.surcharge.mode="contact";assert.equal(evaluate([r],p).promotion.reason,"pricing_contact");
});
test("pricing errors cannot be repaired with a promotion",()=>{
  for(const value of [0,-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]){
    assert.equal(evaluate([record()],{...price(),basePrice:value}).promotion.pricingMode,"contact");
    assert.equal(evaluate([record()],{...price(),estimatedTotal:value}).promotion.promotionalEstimatedTotal,undefined);
  }
  const p=price();p.modifiers=[{mode:"contact"}];assert.equal(safePromotionPricing(p).mode,"contact");
  p.modifiers=[];p.condition={mode:"contact"};assert.equal(safePromotionPricing(p).mode,"contact");
  p.condition={mode:"none"};p.estimatedTotal=900001;assert.equal(safePromotionPricing(p).mode,"contact");
});
test("output is safe for a public projection; private diagnostics remain separate",()=>{
  const result=evaluate().promotion;
  const json=JSON.stringify(result);assert.doesNotMatch(json,/source_ref|owner|activation|synthetic-owner|synthetic-source|diagnostics/);
  assert.equal(result.tuple.direction,"outbound");assert.equal(result.priceUnit,"one_way");assert.equal(result.priceCurrency,"VND");
});
function route(){return {id:1001,status:"publish",slug:"synthetic",title:{rendered:"Synthetic"},meta:{origin_location_id:4001,destination_location_id:4002,outbound_enabled:true,inbound_enabled:true,content_readiness_version:1,content_mapping_state:"clear",content_service_state:"live",pricing_model_version:2,pricing_packages_v2:[{direction:"outbound",vehicle_id:2001,package_key:"one_way",pricing_mode:"fixed",price:800000}],surcharge_policy_version:1,zone_surcharge_rules_v2:[{rule_key:"airport",zone_id:"airport",applies_to:"pickup",surcharge_mode:"fixed",amount:100000}],price_condition_policy_version:1,price_condition_rules_v2:[{rule_key:"none",charge_mode:"none"}]}};}
const vehicle={id:2001,status:"publish"};
test("current CMS gates reject Long Thanh even with live claim, missing direction/version and blocked mapping",()=>{
  for(const [patch,reason] of [[{destination_location_id:9102},"prelaunch_blocked"],[{content_service_state:"prelaunch"},"prelaunch_blocked"],[{content_mapping_state:"d35_10_blocked"},"mapping_blocked"],[{content_readiness_version:2},"mapping_blocked"],[{content_readiness_version:undefined},"mapping_blocked"],[{outbound_enabled:undefined},"mapping_blocked"]]){
    const r=route();Object.assign(r.meta,patch);assert.equal(evaluate([record()],price(),{},now,promotionReferenceFromSnapshot([r],[vehicle])).promotion.reason,reason);
  }
  const r=route();r.status="draft";assert.equal(evaluate([record()],price(),{},now,promotionReferenceFromSnapshot([r],[vehicle])).promotion.reason,"reference_missing");
});
test("resolved surcharge preserves approved key/version; legacy/no-charge rows never manufacture a waiver",()=>{
  const r=route();r.meta.zone_surcharge_rules_v2.push({rule_key:"none",zone_id:"other",surcharge_mode:"none",amount:999999});
  const result=resolveSurchargeV2(r,{direction:"outbound",vehicleId:2001,packageKey:"one_way",pickup:{serviceZoneId:"airport",serviceAreaStatus:"covered"},dropoff:{serviceZoneId:"other",serviceAreaStatus:"covered"}});
  assert.equal(result.amount,100000);assert.equal(result.components[0].ruleKey,"airport");assert.equal(result.components[0].policyVersion,1);assert.equal(result.components[1].amount,0);
  delete r.meta.zone_surcharge_rules_v2[0].rule_key;
  assert.equal(resolveSurchargeV2(r,{direction:"outbound",vehicleId:2001,packageKey:"one_way",pickup:{serviceZoneId:"airport",serviceAreaStatus:"covered"},dropoff:{serviceZoneId:"other",serviceAreaStatus:"covered"}}).components[0].ruleKey,undefined);
});
test("production entry point computes Pricing V2 and cannot be enabled by client, environment or source loader",async()=>{
  let calls=0;const r=route();const copy=structuredClone(r);
  const input={route:r,direction:"outbound",vehicleId:2001,packageKey:"one_way",pickup:{serviceZoneId:"airport",serviceAreaStatus:"covered"},dropoff:{serviceZoneId:"other",serviceAreaStatus:"covered"},commercialEnabled:true,discountAmount:900000,promotionalEstimatedTotal:0,evaluationTime:now};
  process.env.PROMOTION_COMMERCIAL_ENABLED="true";
  try{const result=await resolvePriceRulesWithPromotion(input,async()=>{calls++;return {records:[record()],routes:[r],vehicles:[vehicle]};});assert.equal(calls,0);assert.equal(result.pricing.estimatedTotal,900000);assert.equal(result.promotion.reason,"disabled");assert.equal(result.promotion.discountAmount,undefined);assert.deepEqual(r,copy);assert.ok(Date.parse(result.promotion.evaluationTime)>now);}
  finally{delete process.env.PROMOTION_COMMERCIAL_ENABLED;}
});
for(const mode of ["fixed","contact","disabled"]) test(`booking server integration preserves ${mode} and rejects client price assertions`,async()=>{
  const r=route();r.meta.pricing_packages_v2[0].pricing_mode=mode;
  let received,notifications=0;
  const bookingLoad=typescriptLoader({"server-only":{},"next/server":{NextResponse:{json:(data,options)=>({data,options})}},
    "@/lib/api/raw":{fetchRawRoutes:async()=>[r],fetchRawVehicles:async()=>[vehicle],embeddedTermName:()=>"Synthetic vehicle"},
    "@/lib/api/locations":{fetchLocationsV2:async()=>[{id:4001,name:"Synthetic origin",serviceZoneId:"airport",serviceAreaStatus:"covered"},{id:4002,name:"Synthetic destination",serviceZoneId:"other",serviceAreaStatus:"covered"}],locationById:(rows)=>new Map(rows.map(row=>[row.id,row]))},
    "@/lib/api/wp-auth":{wpAuthedFetch:async(path,init)=>{assert.equal(path,"/gocar/v1/leads");received=init.body;return {ok:true,data:{id:7001,lead_id:7001,replayed:true}};}},
    "@/lib/booking-notification":{sendBookingNotification:async()=>{notifications++;return {sent:true};}},
  });
  const {POST}=bookingLoad("src/app/api/booking/route.ts");
  const response=await POST(new Request("http://localhost/api/booking",{method:"POST",headers:{"content-type":"application/json","x-lead-idempotency-key":"synthetic-replay"},body:JSON.stringify({fullName:"Synthetic fixture",phone:"0900000000",route:"Synthetic",routeId:"1001",vehicleType:"Synthetic vehicle",direction:"outbound",packageKey:"one_way",estimatedTotal:1,discountAmount:900000,promotionalEstimatedTotal:0,commercialEnabled:true})}));
  assert.equal(response.data.ok,true);assert.equal(notifications,0);assert.equal(received.booking.meta.pricing_resolution_mode,mode);
  assert.equal(received.booking.meta.estimated_total,mode==="fixed"?900000:undefined);
  assert.equal(received.booking.meta.base_price_snapshot,mode==="fixed"?800000:undefined);
  assert.equal(received.booking.meta.discountAmount,undefined);assert.equal(received.booking.meta.promotionalEstimatedTotal,undefined);
  assert.deepEqual(received.acquisition,{consent_state:"unknown"});
});
test("strict snapshot tuple cannot be inferred from a missing direction, vehicle or package",()=>{
  for(const patch of [{direction:undefined},{vehicle_id:2001.5},{package_key:undefined}]){
    const r=route();Object.assign(r.meta.pricing_packages_v2[0],patch);
    assert.equal(promotionReferenceFromSnapshot([r],[vehicle])(tuple,record().model).exists,false);
  }
});
