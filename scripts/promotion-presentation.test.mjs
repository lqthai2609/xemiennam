import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const load = typescriptLoader({ "server-only": {}, "next/server": { connection: async () => {} } });
const { evaluatePromotionRules } = load("src/lib/api/promotion-evaluator.ts");
const { buildPromotionPriceView } = load("src/lib/api/promotion-presentation.ts");
const { buildFixedServiceOffers, buildServiceSchema } = load("src/lib/schema.ts");
const { PromotionPrice } = load("src/components/promotion-price.tsx");
const { ExpiringJsonLd } = load("src/components/expiring-json-ld.tsx");
const { promotionLeaseActive, watchPromotionExpiry } = load("src/lib/promotion-expiry.ts");
const fixture = JSON.parse(readFileSync(new URL("./fixtures/promotion-model.json", import.meta.url)));
const tuple = fixture.base.scopes[0];
const now = Date.parse("2000-02-28T12:00:00+07:00");
const price = { mode: "fixed", currency: "VND", basePrice: 800000, estimatedTotal: 900000, modifierAmount: 0,
  surcharge: { mode: "fixed", amount: 100000, matchedRuleKeys: [], reason: "fixed", components: [{ruleKey:"airport", policyVersion:1, applicationKey:"pickup:airport", mode:"fixed", amount:100000}] },
  modifiers: [], condition: {mode:"none", reason:"explicit_none"}, reason:"fixed" };
const context = (patch = {}) => ({tuple, purpose:"base_catalog", mode:"fixed", amount:800000, offerEligible:true, ...patch});
const record = (discount, patch = {}, id = 3001) => ({promotion_id:id, model:{...structuredClone(fixture.base), enabled:true,
  approval:{status:"approved",owner:"private-owner",source_ref:"private-reference",approved_at:"2000-01-01T00:00:00Z"}, activation:structuredClone(fixture.activation),
  discount:discount ?? {kind:"percent_discount",target:"base_price",rate_bps:1000}, ...patch}});
const evaluate = (records=[record()], pricing=price, clock=now, ctx={tuple}) => evaluatePromotionRules(pricing,ctx,{records,reference:()=>({exists:true,readinessVersion:1,activationReady:true,surchargeExists:true})},clock).promotion;
const view = (discount, patch={}) => buildPromotionPriceView(evaluate([record(discount)]),context(patch),now);
const candidate = (v, patch={}) => ({name:"Synthetic route · outbound · vehicle · one-way",mode:"fixed",price:800000,tuple,promotionView:v,...patch});
const offers = (v, patch={}, clock=now) => buildFixedServiceOffers([candidate(v,patch)],clock);
const markup = (v) => renderToStaticMarkup(React.createElement(PromotionPrice,{view:v}));

for(const [label,discount,after] of [
  ["percent base",{kind:"percent_discount",target:"base_price",rate_bps:1000},720000],
  ["special base",{kind:"special_price",target:"base_price",amount_vnd:750000},750000],
  ["fixed base",{kind:"fixed_discount",target:"base_price",amount_vnd:80000},720000],
]) test(`${label}: identical UI and Offer at the base layer`,()=>{
  const v=view(discount);assert.equal(v.amount,after);assert.equal(v.claim.before,800000);assert.equal(v.claim.after,after);
  assert.match(markup(v),/Giá cơ bản/);assert.match(markup(v),/<del/);assert.match(markup(v),/800\.000 đồng/);
  assert.equal(offers(v).lowPrice,after);assert.equal(offers(v).offers[0].unitText,tuple.package_key);
  const s=buildServiceSchema({name:"test",description:"test",url:"/test",offers:offers(v)});
  assert.equal(s.offers.offers[0].price,after);assert.equal(s.offers.offers[0].validThrough,"2000-02-29T16:59:59.999Z");
  assert.equal(s.offers.offers[0].priceSpecification.price,after);
});
for(const patch of [{route_id:1002},{direction:"inbound"},{vehicle_id:2002},{package_key:"round_trip_day"}]) test(`tuple mismatch ${JSON.stringify(patch)} cannot carry a claim`,()=>{
  const v=buildPromotionPriceView(evaluate(),context({tuple:{...tuple,...patch}}),now);
  assert.equal(v.claim,undefined);assert.equal(v.amount,800000);assert.equal(v.state,"scope_mismatch");
  assert.equal(offers(view(),{tuple:{...tuple,...patch}}).lowPrice,800000);
});
for(const discount of [{kind:"percent_discount",target:"estimated_total",rate_bps:1000},{kind:"free_surcharge",target:"surcharge",rule_key:"airport",policy_version:1}]) test(`${discount.target} never replaces a catalog base or public price floor`,()=>{
  const v=view(discount);assert.equal(v.amount,800000);assert.equal(v.claim,undefined);assert.equal(v.state,"context_missing");assert.equal(offers(v).lowPrice,800000);
});
for(const [label,discount,layer,before,after,total] of [
  ["total",{kind:"percent_discount",target:"estimated_total",rate_bps:1000},"estimated_total",900000,810000,810000],
  ["base",{kind:"percent_discount",target:"base_price",rate_bps:1000},"base_price",800000,720000,820000],
  ["surcharge",{kind:"free_surcharge",target:"surcharge",rule_key:"airport",policy_version:1},"surcharge",100000,0,800000],
]) test(`private trip ${label}: compare only that layer, never publish Offer`,()=>{
  const v=view(discount,{purpose:"trip_estimate",amount:900000});assert.equal(v.claim.layer,layer);assert.equal(v.claim.before,before);assert.equal(v.claim.after,after);assert.equal(v.amount,total);assert.equal(v.offerEligible,false);
  assert.equal(offers(v).lowPrice,800000);assert.match(markup(v),/<del/);assert.doesNotMatch(markup(v),/private-owner|private-reference/);
});
test("benefit keeps price, has no fake strike-through and no discounted Offer",()=>{
  const v=view({kind:"benefit",target:"none",title:"Quyền lợi đã duyệt",rule:"Điều kiện tổng hợp"});
  assert.equal(v.amount,800000);assert.equal(v.claim.discountAmount,0);assert.equal(offers(v).lowPrice,800000);assert.match(markup(v),/Quyền lợi đã duyệt/);assert.doesNotMatch(markup(v),/<del/);
});
for(const mode of ["contact","disabled"]) test(`${mode}: no amount, comparison or Offer`,()=>{
  const result=evaluate([record()],{...price,mode});const v=buildPromotionPriceView(result,context({mode,amount:undefined}),now);
  assert.equal(v.amount,undefined);assert.equal(v.claim,undefined);assert.equal(buildFixedServiceOffers([candidate(v,{mode,price:undefined})]),undefined);
  assert.match(markup(v),mode==="contact"?/Liên hệ báo giá/:/Chưa nhận đặt chuyến/);assert.doesNotMatch(markup(v),/đồng|<del/);
});
for(const [state,clock,text] of [["scheduled",Date.parse("2000-02-27T17:00:00Z")-1,"Chương trình chưa bắt đầu"],["expired",Date.parse("2000-02-29T17:00:00Z"),"Chương trình đã kết thúc"]]) test(state,()=>{
 const v=buildPromotionPriceView(evaluate([record()],price,clock),context(),clock);assert.equal(v.state,state);assert.equal(v.claim,undefined);assert.match(markup(v),new RegExp(text));assert.equal(offers(v,{},clock).lowPrice,800000);
});
test("ambiguity preserves base and exposes no competing campaign",()=>{
 const v=buildPromotionPriceView(evaluate([record(),record(undefined,{},3002)]),context(),now);assert.equal(v.state,"ambiguous_promotion");assert.equal(v.claim,undefined);assert.match(markup(v),/cần được xác nhận/);assert.equal(offers(v).lowPrice,800000);
});
test("server UI/schema cannot retain a result after the lease or end boundary",()=>{
 const projection=evaluate();const v=buildPromotionPriceView(projection,context(),now);const expiry=Date.parse(v.claim.expiresAt);
 assert.equal(expiry,now+60000);assert.equal(offers(v,{},expiry-1).lowPrice,720000);assert.equal(offers(v,{},expiry).lowPrice,800000);
 assert.equal(buildPromotionPriceView(projection,context(),expiry).claim,undefined);
 const last=Date.parse("2000-02-29T17:00:00Z")-10;const lastView=buildPromotionPriceView(evaluate([record()],price,last),context(),last);
 assert.equal(Date.parse(lastView.claim.expiresAt),last+10);assert.equal(promotionLeaseActive(lastView.claim.expiresAt,last+10),false);
});
test("nearest competing program boundary expires UI and schema before reselection",()=>{
 const records=[record(),record(undefined,{window:{...fixture.base.window,start_date:"2000-02-29",end_date:"2000-03-01"},priority:100},3002)];
 const clock=Date.parse("2000-02-28T16:59:59Z");const v=buildPromotionPriceView(evaluate(records,price,clock),context(),clock);
 assert.equal(v.claim.expiresAt,"2000-02-28T17:00:00.000Z");
});
for(const patch of [{priceCurrency:"USD"},{priceUnit:"round_trip_day"},{basePrice:700000},{comparisonBefore:900000},{comparisonAfter:0},{promotionalEstimatedTotal:0},{discountAmount:1},{validity:{timezone:"UTC",start_date:"2000-02-28",end_date:"2000-02-29"}},{nextBoundaryAt:"bad"},{evaluationTime:"bad"}]) test(`malformed projection ${JSON.stringify(patch)}`,()=>{
 const v=buildPromotionPriceView({...evaluate(),...patch},context(),now);assert.equal(v.claim,undefined);assert.equal(v.amount,800000);assert.equal(offers(v).lowPrice,800000);
});
test("private fields and diagnostics never enter the public projection",()=>{
 const p={...evaluate(),owner:"SECRET_OWNER",source_ref:"SECRET_SOURCE",activation:{token:"SECRET_TOKEN"},diagnostics:[{secret:"SECRET_DIAGNOSTIC"}]};
 assert.doesNotMatch(JSON.stringify(buildPromotionPriceView(p,context(),now)),/SECRET|activation|diagnostics/);
});
test("expiry subscriber clears claim at the exact boundary, rechecks resumed pages and cleans up",()=>{
 let clock=now, callback, resumed, timerCount=0, cancelled=0, notifyCount=0, unlistened=0;
 const stop=watchPromotionExpiry(new Date(now+10).toISOString(),()=>notifyCount++,{now:()=>clock,setTimer:(fn,ms)=>{callback=fn;timerCount++;assert.equal(ms,10);return timerCount},clearTimer:()=>cancelled++,listen:fn=>{resumed=fn;return ()=>unlistened++}});
 clock=now+10;callback();assert.equal(timerCount,1);assert.equal(promotionLeaseActive(new Date(now+10).toISOString(),clock),false);
 resumed();stop();assert.equal(unlistened,1);assert.ok(cancelled>=4);assert.ok(notifyCount>=3);
});
test("malformed expiry cannot retain a claim",()=>{assert.equal(promotionLeaseActive("bad",now),false);assert.equal(promotionLeaseActive(undefined,now),false)});
test("JSON-LD renders server-built price and escapes script termination",()=>{
 const data={"@type":"Offer",price:720000,name:"</script><script>unsafe</script>"};
 const html=renderToStaticMarkup(React.createElement(ExpiringJsonLd,{data,fallback:{"@type":"Service"},expiresAt:view().claim.expiresAt}));
 assert.match(html,/720000/);assert.doesNotMatch(html,/<script>unsafe/);assert.match(html,/\\u003c/);
});
test("gate off: public list and decoration do not read private sources",async()=>{
 let called=0;
 const stub=typescriptLoader({"server-only":{},"next/server":{connection:async()=>called++},"./routes":{fetchRoutes:async()=>{called++;return []}}});
 assert.deepEqual(await stub("src/lib/api/promotions.ts").fetchPromotions(),[]);
 const route={id:"1001",pricingV2:{}};assert.equal(await load("src/lib/api/route-promotions.ts").withRoutePromotionViews(route,{},new Map(),async()=>{called++;throw Error()}),route);assert.equal(called,0);
});
test("enabled adapter uses shared server output for each exact row and request-time rendering",async()=>{
 const model=load("src/lib/api/promotion-model.ts");let connectionCalls=0,sourceCalls=0;
 const stub=typescriptLoader({"server-only":{},"next/server":{connection:async()=>connectionCalls++},"./promotion-model":{...model,PROMOTION_COMMERCIAL_ENABLED:true},"./promotion-pricing":{resolvePriceRulesWithPromotion:async ctx=>{
   sourceCalls++;assert.equal(ctx.vehicleId,tuple.vehicle_id);assert.equal(ctx.direction,tuple.direction);assert.equal(ctx.packageKey,tuple.package_key);return {promotion:{...evaluate([],price,Date.now()),reason:"none"}};
 }}});
 const route={id:String(tuple.route_id),from:"A",to:"B",pricingByVehicle:[],pricingV2:{outbound:{key:"outbound",enabled:true,packages:[{direction:"outbound",vehicleId:String(tuple.vehicle_id),vehicleType:"Xe 4 chỗ",packageKey:tuple.package_key,mode:"fixed",price:800000}]},inbound:{key:"inbound",enabled:false,packages:[]}}};
 const output=await stub("src/lib/api/route-promotions.ts").withRoutePromotionViews(route,{id:tuple.route_id},new Map());
 assert.equal(connectionCalls,1);assert.equal(sourceCalls,1);assert.deepEqual(output.pricingV2.outbound.packages[0].promotionView.tuple,tuple);assert.equal(output.pricingV2.outbound.packages[0].price,800000);assert.equal(route.pricingV2.outbound.packages[0].promotionView,undefined);
});
test("commercial path fetches fresh CMS context; normal mode retains ISR",async()=>{
 const flag=load("src/lib/api/promotion-model.ts");let options;
 const original=globalThis.fetch;globalThis.fetch=async(_,opts)=>{options=opts;return Response.json([])};
 try {const wp=typescriptLoader({"./api/promotion-model":{...flag,PROMOTION_COMMERCIAL_ENABLED:true}})("src/lib/wp.ts");await wp.wpFetch("/route");assert.equal(options.cache,"no-store");assert.equal(options.next,undefined)}finally{globalThis.fetch=original}
});
test("a retired browser result cannot revive after a backwards clock change",()=>{
 const { promotionLeaseSnapshot }=load("src/lib/promotion-expiry.ts");let clock=now;const snapshot=promotionLeaseSnapshot(new Date(now+1).toISOString(),()=>clock);
 assert.equal(snapshot(),true);clock=now+1;assert.equal(snapshot(),false);clock=now-1000;assert.equal(snapshot(),false);
});
test("promotion edits invalidate the route, combo and listing consumers immediately",async()=>{
 const calls=[];const stub=typescriptLoader({"next/cache":{revalidatePath:(...a)=>calls.push(["path",...a]),revalidateTag:(...a)=>calls.push(["tag",...a])},"next/server":{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}}});
 const previous=process.env.REVALIDATE_SECRET;process.env.REVALIDATE_SECRET="synthetic-day44-secret";
 try {const response=await stub("src/app/api/revalidate/route.ts").POST(new Request("http://localhost/api/revalidate",{method:"POST",body:JSON.stringify({secret:process.env.REVALIDATE_SECRET,post_type:"promotion"})}));assert.equal(response.status,200);assert.ok(calls.some(a=>a[0]==="tag"&&a[2].expire===0));
 for(const path of ["/khuyen-mai","/tuyen-duong/[tinh]/[tuyen]","/tuyen-duong/[tinh]/[tuyen]/[loai-xe]","/bang-gia"]){assert.ok(calls.some(a=>a[0]==="path"&&a[1]===path))}
 }finally{if(previous===undefined)delete process.env.REVALIDATE_SECRET;else process.env.REVALIDATE_SECRET=previous}
});
test("a booking-specific predicate cannot become a public catalog claim or Offer",()=>{
 const projection=evaluate([record(undefined,{conditions:[{kind:"departure_weekdays",days:[1]}]})],price,now,{tuple,departureDate:"2000-02-28"});
 assert.equal(projection.reason,"applied");assert.equal(projection.requiresTripContext,true);
 const publicView=buildPromotionPriceView(projection,context(),now);assert.equal(publicView.claim,undefined);assert.equal(publicView.state,"context_missing");assert.equal(offers(publicView).lowPrice,800000);
 const trip=buildPromotionPriceView(projection,context({purpose:"trip_estimate",amount:900000}),now);assert.ok(trip.claim);assert.equal(trip.offerEligible,false);
});
