import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { typescriptLoader } from './lib/load-typescript.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/promotion-snapshot.json',import.meta.url)));
const modelFixture=JSON.parse(readFileSync(new URL('./fixtures/promotion-model.json',import.meta.url))).base;
const prior=process.env.ALO_COUPONS_ENABLED;process.env.ALO_COUPONS_ENABLED='true';
test.after(()=>{if(prior===undefined)delete process.env.ALO_COUPONS_ENABLED;else process.env.ALO_COUPONS_ENABLED=prior});
const tuple={route_id:1001,direction:'outbound',vehicle_id:2001,package_key:'one_way'};
const route={id:1001,status:'publish',meta:{pricing_model_version:2,origin_location_id:11,destination_location_id:12,outbound_enabled:true,content_readiness_version:1,content_service_state:'live',content_mapping_state:'clear',pricing_packages_v2:[{...tuple,pricing_mode:'fixed',price:1200000}]}};
const context={route,direction:'outbound',vehicleId:2001,packageKey:'one_way',departureDate:'2026-10-20',departureTime:'08:00',pickup:{id:11},dropoff:{id:12},quantities:{extra_stop:0,waiting_minute:0}};
const pricing={mode:'fixed',reason:'resolved',currency:'VND',basePrice:1200000,estimatedTotal:1250000,modifierAmount:0,modifiers:[],condition:{mode:'none',reason:'explicit_none'},surcharge:{mode:'fixed',amount:50000,reason:'resolved',matchedRuleKeys:[],components:[]}};
const base={pricing,promotion:{version:1,tuple,promotionStatus:'none',reason:'disabled',evaluationTime:new Date().toISOString()}};
const model=()=>({...structuredClone(modelFixture),revision:1,enabled:true,approval:{status:'approved',owner:'synthetic',source_ref:'synthetic',approved_at:'2000-01-01T00:00:00Z'},activation:{owner:'synthetic',source_ref:'synthetic',approved_at:'2000-01-01T00:00:00Z',version:1,tuples:[{...tuple,readiness_version:1}]},window:{start_date:'2000-01-01',end_date:'2099-12-31',timezone:'Asia/Ho_Chi_Minh'},discount:{kind:'fixed_discount',target:'base_price',amount_vnd:100000},conditions:[{kind:'min_eligible_amount',amount_vnd:500000}]});
function evaluator({m=model(),cap=null,lookup,ref}={}) {
 const calls=[];
 const load=typescriptLoader({'server-only':{},'@/lib/wp':{WP_API_BASE:'http://localhost/wp/v2'},'./wp-auth':{wpAuthedFetch:async(path,init)=>{calls.push({path,...init});return lookup||{ok:true,data:{id:7,code:'SYNTHETIC10',model:m,cap_vnd:cap}}}},'./raw':{fetchRawVehicles:async()=>[{id:2001,status:'publish'}]},'./promotion-reference':{promotionReferenceFromSnapshot:()=>()=>ref||{exists:true,readinessVersion:1,activationReady:true,prelaunch:false,mappingBlocked:false}}});
 return {...load('src/lib/api/coupon.ts'),calls};
}
test('fixed coupon uses existing evaluator, preserves surcharge and never writes',async()=>{
 const h=evaluator();const a=await h.applyCoupon('synthetic10',base,context);
 assert.deepEqual(a.quote,{code:'SYNTHETIC10',quoteKey:a.quote.quoteKey,basePrice:1200000,before:1250000,discount:100000,after:1150000});
 assert.equal(a.evaluation.pricing.surcharge.amount,50000);assert.equal(h.calls.length,1);assert.match(h.calls[0].path,/lookup$/);
 const b=await h.applyCoupon('SYNTHETIC10',base,context);assert.equal(a.quote.quoteKey,b.quote.quoteKey);
});
test('percentage cap and integer rounding do not discount surcharge',async()=>{
 const m=model();m.discount={kind:'percent_discount',target:'base_price',rate_bps:1000};
 const a=await evaluator({m,cap:90000}).applyCoupon('SYNTHETIC10',base,context);assert.equal(a.quote.discount,90000);assert.equal(a.quote.after,1160000);
});
test('quote changes with price, revision, tuple or trip time; not evaluator clock',async()=>{
 const h=evaluator();const a=await h.applyCoupon('SYNTHETIC10',base,context);
 const time=await h.applyCoupon('SYNTHETIC10',base,{...context,departureTime:'09:00'});assert.notEqual(a.quote.quoteKey,time.quote.quoteKey);
 const m=model();m.revision=2;const b=await evaluator({m}).applyCoupon('SYNTHETIC10',base,context);assert.notEqual(a.quote.quoteKey,b.quote.quoteKey);
 const changed={...base,pricing:{...pricing,basePrice:1300000,estimatedTotal:1350000}};assert.notEqual(a.quote.quoteKey,(await h.applyCoupon('SYNTHETIC10',changed,context)).quote.quoteKey);
});
for(const [name,patch] of [['expired',{window:{start_date:'2000-01-01',end_date:'2000-01-02',timezone:'Asia/Ho_Chi_Minh'}}],['paused',{enabled:false}],['minimum',{conditions:[{kind:'min_eligible_amount',amount_vnd:2000000}]}],['trip date',{conditions:[{kind:'departure_date_range',start_date:'2090-01-01',end_date:'2090-01-02'}]}]])test(`reject ${name}`,async()=>{
 await assert.rejects(()=>evaluator({m:{...model(),...patch}}).applyCoupon('SYNTHETIC10',base,context));
});
for(const ref of [{exists:false},{exists:true,activationReady:true,readinessVersion:1,prelaunch:true},{exists:true,activationReady:true,readinessVersion:1,mappingBlocked:true}])test(`reference gate ${JSON.stringify(ref)}`,async()=>{await assert.rejects(()=>evaluator({ref}).applyCoupon('SYNTHETIC10',base,context));});
test('contact and already discounted prices cannot be stacked',async()=>{
 const h=evaluator();await assert.rejects(()=>h.applyCoupon('SYNTHETIC10',{...base,pricing:{...pricing,mode:'contact'}},context));
 await assert.rejects(()=>h.applyCoupon('SYNTHETIC10',{...base,promotion:{...base.promotion,promotionStatus:'applied'}},context));
});
test('backend missing/exhausted/offline cannot become a successful coupon',async()=>{
 for(const status of [404,409,503,0])await assert.rejects(()=>evaluator({lookup:{ok:false,status,message:'synthetic error'}}).applyCoupon('SYNTHETIC10',base,context));
});

function bookingHarness({replay=false,key='a'.repeat(64),error}={}) {
 const calls=[];const applied=structuredClone(fixtures.applied);const plain=structuredClone(fixtures.fixed);
 const receipt={coupon_id:7,code:'SYNTHETIC10',revision:1,quote_key:key};
 class CouponError extends Error {constructor(message,status=409){super(message);this.status=status}}
 const load=typescriptLoader({'server-only':{},'next/server':{NextResponse:Response},'@/lib/api/booking-context':{resolveRouteContext:async()=>({routeId:1001,route:{id:1001},originLocationId:11,destinationLocationId:12,validLocationIds:new Set([11,12]),locationsById:new Map()}),resolveVehicleId:async()=>2001,resolveBookingLocationId:(_id,fallback)=>fallback},'@/lib/api/promotion-pricing':{resolvePriceRulesWithPromotion:async()=>({pricing,promotion:base.promotion})},'@/lib/api/promotion-snapshot':{bookingIntentHash:()=> 'b'.repeat(64),buildPromotionSnapshot:()=>applied,persistedBookingResponse:r=>({ok:true,leadId:r.lead_id,promotionSnapshot:r.promotion_snapshot,couponReceipt:r.coupon_receipt})},'@/lib/api/coupon':{CouponError,applyCoupon:async()=>{calls.push('apply');if(error)throw new CouponError(error);return{evaluation:base,receipt,quote:{quoteKey:key}}}},'@/lib/api/wp-auth':{wpAuthedFetch:async(path,init)=>{calls.push({path,body:init.body});if(path.endsWith('replay'))return{ok:true,data:replay?{found:true,id:42,lead_id:42,promotion_snapshot:plain,coupon_receipt:receipt}:{found:false}};return{ok:true,data:{id:42,lead_id:42,promotion_snapshot:init.body.promotion_snapshot,coupon_receipt:init.body.coupon_receipt}}}}});
 const request=body=>new Request('http://localhost/api/booking',{method:'POST',headers:{'content-type':'application/json','x-lead-idempotency-key':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},body:JSON.stringify({fullName:'SYNTHETIC',phone:'0900000000',route:'SYNTHETIC',routeId:'1001',vehicleType:'SYNTHETIC',direction:'outbound',packageKey:'one_way',promotionCode:'SYNTHETIC10',...body})});
 return{calls,POST:load('src/app/api/booking/route.ts').POST,request};
}
test('booking sends coupon receipt only after customer accepted the current quote',async()=>{
 const h=bookingHarness();const r=await h.POST(h.request({couponQuoteKey:'a'.repeat(64)}));assert.equal(r.status,200);const body=await r.json();assert.equal(body.couponReceipt.code,'SYNTHETIC10');assert.equal(h.calls.filter(c=>c.path?.endsWith('/leads')).length,1);
});
for(const quote of [undefined,'b'.repeat(64)])test(`missing/stale acceptance ${quote?.slice(0,1)}`,async()=>{const h=bookingHarness();const r=await h.POST(h.request({couponQuoteKey:quote}));assert.equal(r.status,409);assert.equal(h.calls.filter(c=>c.path?.endsWith('/leads')).length,0)});
test('expired/exhausted code fails before writing a lead',async()=>{const h=bookingHarness({error:'Mã đã hết lượt'});const r=await h.POST(h.request({couponQuoteKey:'a'.repeat(64)}));assert.equal(r.status,409);assert.equal(h.calls.length,2)});
test('retry returns persisted coupon even after feature is switched off',async()=>{const h=bookingHarness({replay:true,error:'disabled'});const r=await h.POST(h.request({couponQuoteKey:'a'.repeat(64)}));assert.equal(r.status,200);assert.equal(h.calls.length,1);assert.equal((await r.json()).couponReceipt.code,'SYNTHETIC10')});
