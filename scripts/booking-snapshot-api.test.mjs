import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const snapshots=JSON.parse(readFileSync(new URL("./fixtures/promotion-snapshot.json",import.meta.url)));
function harness({replay,create,lookupError=false,invalidLookup=false}={}) {
 const calls={cms:0,pricing:0,notifications:0,backend:[]};
 const load=typescriptLoader({"server-only":{},"next/server":{NextResponse:Response},
  "@/lib/api/raw":{fetchRawRoutes:async()=>{calls.cms++;return[]},fetchRawVehicles:async()=>{calls.cms++;return[]},embeddedTermName:()=>""},
  "@/lib/api/locations":{fetchLocationsV2:async()=>[],locationById:()=>new Map()},
  "@/lib/api/promotion-pricing":{resolvePriceRulesWithPromotion:async()=>{calls.pricing++;return{pricing:{mode:"contact",reason:"base_missing",currency:"VND",surcharge:{mode:"contact",reason:"policy_missing",matchedRuleKeys:[]},modifiers:[],condition:{mode:"none",reason:"explicit_none"}},promotion:{version:1,promotionStatus:"none",reason:"disabled",evaluationTime:"2000-02-28T05:00:00.000Z"}}}},
  "@/lib/api/wp-auth":{wpAuthedFetch:async(path,init)=>{
   calls.backend.push({path,body:init.body});
   if(path.endsWith("/replay"))return lookupError?{ok:false,status:404,message:"Backend snapshot unavailable"}:{ok:true,data:invalidLookup?{}:replay?{found:true,...replay}:{found:false}};
   return {ok:true,data:create??{id:42,lead_id:42,replayed:false,promotion_snapshot:init.body.promotion_snapshot}};
  }},
  "@/lib/booking-notification":{sendBookingNotification:async()=>{calls.notifications++;return{sent:true}}},
 });
 return {calls,POST:load("src/app/api/booking/route.ts").POST};
}
const payload={fullName:"Synthetic request",phone:"0900000000",route:"Tuyến khác",vehicleType:"Synthetic vehicle",note:"synthetic"};
const request=(patch={},key="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")=>new Request("http://localhost/api/booking",{method:"POST",headers:{"content-type":"application/json","x-lead-idempotency-key":key},body:JSON.stringify({...payload,...patch})});
test("persisted applied result replays before CMS pricing or notification",async()=>{
 const h=harness({replay:{id:42,lead_id:42,replayed:true,promotion_snapshot:snapshots.applied}});const r=await h.POST(request());const b=await r.json();
 assert.equal(r.status,200);assert.deepEqual(b.promotionSnapshot,snapshots.applied);assert.equal(b.notificationSent,false);assert.equal(h.calls.cms,0);assert.equal(h.calls.pricing,0);assert.equal(h.calls.notifications,0);assert.equal(h.calls.backend.length,1);
});
for(const mode of ["fixed","contact","disabled"])test(`replay ${mode} retains saved mode even when fresh resolver differs`,async()=>{
 const h=harness({replay:{id:42,lead_id:42,replayed:true,promotion_snapshot:snapshots[mode]}});const b=await(await h.POST(request())).json();assert.equal(b.promotionSnapshot.pricing.mode,mode);assert.equal(h.calls.pricing,0);
});
test("new request persists server estimate and ignores asserted client price/hash/flag",async()=>{
 const h=harness();const b=await(await h.POST(request({estimated_total:1,promotion_snapshot:snapshots.applied,intent_hash:"client",commercial_enabled:true}))).json();
 assert.equal(b.promotionSnapshot.promotion.reason,"disabled");assert.equal(b.promotionSnapshot.promotion.promotion_id,null);assert.equal(b.promotionSnapshot.pricing.estimated_total,null);assert.equal(h.calls.notifications,1);
 const sent=h.calls.backend[1].body;assert.equal(sent.intent_version,2);assert.notEqual(sent.intent_hash,"client");assert.equal(sent.booking.meta.estimated_total,undefined);assert.equal(sent.promotion_snapshot.snapshot_version,1);
});
test("race winner returned by create is authoritative and has no second notification",async()=>{
 const h=harness({create:{id:99,lead_id:99,replayed:true,promotion_snapshot:snapshots.applied}});const b=await(await h.POST(request())).json();assert.deepEqual(b.promotionSnapshot,snapshots.applied);assert.equal(b.leadId,99);assert.equal(h.calls.notifications,0);
});
for(const options of [{lookupError:true},{invalidLookup:true}])test(`backend lookup failure stops pricing and creation ${JSON.stringify(options)}`,async()=>{
 const h=harness(options);const r=await h.POST(request());assert.ok(r.status>=400);assert.equal(h.calls.cms,0);assert.equal(h.calls.pricing,0);assert.equal(h.calls.backend.length,1);assert.equal(h.calls.notifications,0);
});
test("malformed receipt or absent snapshot cannot acknowledge success/send notification",async()=>{
 for(const create of [{id:1,lead_id:2,replayed:false,promotion_snapshot:snapshots.fixed},{id:1,lead_id:1,replayed:false}]){
  const h=harness({create});const r=await h.POST(request());assert.equal(r.status,502);assert.equal(h.calls.notifications,0);
 }
});
test("stable intent hash survives price changes; changing actual input changes hash",async()=>{
 const a=harness(),b=harness(),c=harness();await a.POST(request());await b.POST(request({estimated_total:123}));await c.POST(request({note:"changed"}));
 assert.equal(a.calls.backend[0].body.intent_hash,b.calls.backend[0].body.intent_hash);assert.notEqual(a.calls.backend[0].body.intent_hash,c.calls.backend[0].body.intent_hash);
});
test("invalid UUID is rejected without backend or resolver work",async()=>{const h=harness();assert.equal((await h.POST(request({},"invalid"))).status,400);assert.equal(h.calls.backend.length,0)});
