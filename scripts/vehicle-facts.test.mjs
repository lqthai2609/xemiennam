import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const load = typescriptLoader({"server-only":{}});
const {readVehicleFacts,assessVehicleFit,vehiclePassengerLabel} = load("src/lib/vehicle-facts.ts");
const {evaluateVehicleSuggestions} = load("src/lib/api/vehicle-suggestions.ts");
const fixture = JSON.parse(readFileSync(new URL("./fixtures/vehicle-facts.json",import.meta.url)));
const project = (m = fixture.base) => { const {approval,...facts}=structuredClone(m); return {...facts,vehicle_id:2001,status:approval.status,reviewed_at:"2020-01-01T00:00:00Z"}; };
const facts = () => readVehicleFacts(project(),2001);
const bags = (patch = {}) => ({cabin_bags:2,checked_bags:0,cabin_max_cm:[55,40,20],checked_max_cm:null,total_luggage_kg:16,...patch});
const request = (patch = {}) => ({passengers:6,luggage:bags(),...patch});
for (const c of fixture.cases.filter((c)=> !/approval|evidence|draft/.test(c.name))) test(`public vehicle facts: ${c.name}`,()=>{
  assert.equal(readVehicleFacts(project(c.model),2001).status,c.valid?"confirmed":"needs_consultation");
});
test("legacy, absent, draft, copied ID and future review never confirm",()=>{
 for (const value of [undefined,null,{},[],{so_cho:7,capacity:"6",model_examples:["Vios"]},project({...fixture.base,approval:{status:"draft"}})]) assert.equal(readVehicleFacts(value,2001).status,"needs_consultation");
 assert.equal(readVehicleFacts(project(),2002).status,"needs_consultation");
 for (const reviewed_at of ["9999-01-01T00:00:00Z","2020-02-30T00:00:00Z","2020-01-01",null])assert.equal(readVehicleFacts({...project(),reviewed_at},2001).status,"needs_consultation");
});
test("safe numeric and unexpected fields are rejected without coercion",()=>{
 for(const n of [NaN,Infinity,-Infinity,true,"6",{},[],6.5])assert.equal(readVehicleFacts({...project(),passenger_capacity:n},2001).status,"needs_consultation");
 assert.equal(readVehicleFacts({...project(),approval:{status:"confirmed"}},2001).status,"needs_consultation");
});
test("fits exactly and below one confirmed joint envelope",()=>{
 assert.equal(assessVehicleFit(facts(),request()).status,"fits_confirmed_profile");
 assert.equal(assessVehicleFit(facts(),request({passengers:2,luggage:bags({checked_bags:2,checked_max_cm:[70,45,25],total_luggage_kg:50})})).status,"fits_confirmed_profile");
});
test("cannot mix passenger and luggage maxima across profiles",()=>{
 const r=assessVehicleFit(facts(),request({passengers:6,luggage:bags({checked_bags:3,checked_max_cm:[75,50,30],total_luggage_kg:60})}));
 assert.equal(r.status,"needs_consultation");assert.equal(r.reason,"unconfirmed_load");
});
test("confirmed passenger excess is excluded; missing capacity remains consultation",()=>{
 assert.equal(assessVehicleFit(facts(),request({passengers:7})).status,"exceeds_confirmed_capacity");
 const m=project();m.passenger_capacity=null;m.load_profiles=[];
 assert.equal(assessVehicleFit(readVehicleFacts(m,2001),request()).status,"needs_consultation");
});
test("unknown luggage never means zero; explicit zero needs approved envelope",()=>{
 for(const luggage of [null,undefined,{}, {cabin_bags:0,checked_bags:0}])assert.equal(assessVehicleFit(facts(),request({luggage})).status,"needs_consultation");
 assert.equal(assessVehicleFit(facts(),request({luggage:bags({cabin_bags:0,cabin_max_cm:null,total_luggage_kg:null})})).status,"fits_confirmed_profile");
 const m=project();m.load_profiles=[];
 assert.equal(assessVehicleFit(readVehicleFacts(m,2001),request({luggage:bags({cabin_bags:0,cabin_max_cm:null,total_luggage_kg:null})})).status,"needs_consultation");
});
test("size, count and aggregate weight limits cannot be exceeded",()=>{
 for (const patch of [{cabin_bags:3},{cabin_max_cm:[56,40,20]},{cabin_max_cm:[55,41,20]},{cabin_max_cm:[55,40,21]},{total_luggage_kg:17}])assert.equal(assessVehicleFit(facts(),request({luggage:bags(patch)})).status,"needs_consultation");
});
test("invalid request and service level cannot upgrade a vehicle",()=>{
 for(const r of [null,{},[],request({passengers:0}),request({passengers:"6"}),request({passengers:NaN}),request({service_level:"luxury"}),{...request(),extra:true}])assert.equal(assessVehicleFit(facts(),r).status,"needs_consultation");
 assert.equal(assessVehicleFit(facts(),request({service_level:"premium"})).reason,"service_level");
 const f=facts();f.facts.load_profiles[0].cabin_bags="2";
 assert.equal(assessVehicleFit(f,request()).reason,"missing_facts");
});
test("suggestions never promote legacy/model/seat labels or another vehicle's facts",()=>{
 const legacy={id:"100",type:"45 chỗ",capacity:"40",name:"Large premium van",seats:"45 chỗ",operationalFacts:undefined};
 const good={...legacy,id:"2001",operationalFacts:facts()};
 const result=evaluateVehicleSuggestions([legacy,good,{...good,id:"3001"}],request());
 assert.deepEqual(result.recommended.map(({vehicle})=>vehicle.id),["2001"]);
 assert.deepEqual(result.consultation.map(({vehicle})=>vehicle.id),["100","3001"]);
 assert.equal(evaluateVehicleSuggestions([good],request({passengers:7})).excluded.length,1);
 assert.equal(vehiclePassengerLabel(legacy.operationalFacts),"Cần tư vấn");
 assert.match(vehiclePassengerLabel(good.operationalFacts),/không gồm tài xế/);
});
test("WP adapter ignores legacy facts and mock facts; list/detail share safe mapping",async()=>{
 let raw=[], calls=[];
 const wp={id:2001,slug:"synthetic",title:{rendered:"Synthetic"},content:{rendered:""},meta:{so_cho:7}};
 const api=typescriptLoader({"./raw":{fetchRawVehicles:async(revalidate)=>{calls.push(revalidate);return raw;},fetchRawVehicleBySlug:async()=>wp,embeddedTermName:()=>undefined},"@/lib/wp":{stripHtml:v=>v,wpFetch:async()=>[]},"./mock-fallback":{shouldUseMockFallback:()=>true}})("src/lib/api/vehicles.ts");
 let mapped=await api.mapWPVehicleToVehicle(wp);assert.equal(mapped.capacity,"Cần tư vấn");assert.equal(mapped.type,"Cần tư vấn");assert.equal(mapped.operationalFacts.status,"needs_consultation");
 mapped=await api.mapWPVehicleToVehicle({...wp,gocar_vehicle_facts:project()});assert.equal(mapped.operationalFacts.status,"confirmed");assert.equal(mapped.capacity,"Cần tư vấn");
 assert.equal((await api.fetchVehicleBySlug("synthetic")).operationalFacts.status,"needs_consultation");
 const mocks=await api.fetchVehicles();assert.ok(mocks.length);assert.ok(mocks.every(v=>v.operationalFacts.status==="needs_consultation"&&v.capacity==="Cần tư vấn"));
 raw=[wp];await api.fetchVehicles({freshFacts:true});assert.equal(calls.at(-1),0);
});
test("suggestion server adapter always requests current facts",async()=>{
 let options;
 const api=typescriptLoader({"server-only":{},"./vehicles":{fetchVehicles:async(o)=>{options=o;return [];}}})("src/lib/api/vehicle-suggestions.ts");
 assert.deepEqual(await api.fetchVehicleSuggestions(request()),{recommended:[],consultation:[],excluded:[]});
 assert.deepEqual(options,{freshFacts:true});
});
