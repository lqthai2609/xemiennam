import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { typescriptLoader } from './lib/load-typescript.mjs';
const load=typescriptLoader({'server-only':{}});const m={...load('src/lib/airport-timing.ts'),...load('src/lib/api/airport-pickup-evaluator.ts')};
const fixture=JSON.parse(readFileSync(new URL('./fixtures/airport-timing.json',import.meta.url)));
const source={model_version:1,route_id:1001,revision:3,rules:fixture.base.rules};
const now=Date.parse('2026-10-09T00:00:00Z');
const input={route_id:1001,direction:'outbound',movement:'departure',flight_kind:'domestic',terminal:'SYNTHETIC T1',flight_number:'VN 123',flight_at:'2026-10-10T01:00',airport_arrival_at:null};
for(const c of fixture.cases)test(`model parity: ${c.name}`,()=>assert.equal(m.airportTimingModelSchema.safeParse(c.model).success,c.valid));
test('departure subtracts approved buffer and route duration across midnight',()=>{
 const r=m.suggestAirportPickup(input,source,now);assert.equal(r.status,'suggested');assert.equal(r.pickup_at,'2026-10-09T14:30:00Z');assert.equal(r.airport_at,'2026-10-09T16:30:00Z');assert.equal(r.revision,3);assert.equal(r.flight_verified,false);assert.equal(r.valid_until,'2026-10-09T00:05:00Z');
});
test('real millisecond server clock yields a decodable second-precision result',()=>{const r=m.suggestAirportPickup(input,source,now+291);assert.equal(r.status,'suggested');assert.deepEqual(m.readAirportPickupResult(r),r);assert.equal(r.valid_until,'2026-10-09T00:05:00Z');});
test('arrival adds buffer; earlier requested airport presence stays earlier',()=>{
 const r=m.suggestAirportPickup({...input,movement:'arrival'},{...source,rules:[{...source.rules[0],movement:'arrival',travel_minutes:null}]},now);
 assert.equal(r.status,'suggested');assert.equal(r.pickup_at,'2026-10-09T19:30:00Z');
 const earlier=m.suggestAirportPickup({...input,airport_arrival_at:'2026-10-09T22:00'},source,now);assert.equal(earlier.airport_at,'2026-10-09T15:00:00Z');assert.equal(earlier.pickup_at,'2026-10-09T13:00:00Z');
});
test('strict date parsing rejects rollover; timezone is fixed Vietnam',()=>{
 for(const value of ['2026-02-30T11:00','2026-10-09T24:00','2026-10-09','2026-10-09T12:61','2026-10-09T12:00Z'])assert.equal(m.vietnamLocalInstant(value),null);
 assert.equal(m.vietnamLocalInstant('2024-02-29T00:00'),Date.parse('2024-02-28T17:00:00Z'));
});
test('flight syntax is normalized without claiming existence',()=>{
 for(const [n,e] of [['vn 123','VN123'],['VJ123','VJ123'],['QH1234','QH1234'],['3K123','3K123'],['ABC12','ABC12'],['123',null],['VN12345',null],['<VN123>',null],['VN\n123',null]])assert.equal(m.normalizeFlightNumber(n),e);
});
test('missing fields remain consultation and do not invent kind/terminal/number',()=>{
 for(const key of ['flight_kind','terminal','flight_number','flight_at'])assert.equal(m.suggestAirportPickup({...input,[key]:null},source,now).reason,'missing_information');
});
test('invalid and past flight times; chronology issue is named',()=>{
 for(const i of [{...input,flight_at:'2026-02-30T12:00'},{...input,flight_at:'2026-10-09T07:00'},{...input,flight_number:'123'},{...input,airport_arrival_at:'2026-10-10T01:00'}])assert.equal(m.suggestAirportPickup(i,source,now).status,'needs_consultation');
 assert.equal(m.validateFlightFields({...input,airport_arrival_at:'2026-10-10T01:00'},now)[0].field,'airport_arrival_at');
});
test('no match, wrong route/direction/airport/kind/terminal and ambiguous policy',()=>{
 for(const [i,s] of [[{...input,direction:'inbound'},source],[{...input,flight_kind:'international'},source],[{...input,terminal:'T1'},source],[input,{...source,route_id:1002}],[input,{...source,rules:[{...source.rules[0],airport_id:9102}]}],[input,{...source,rules:[...source.rules,...source.rules]}]])assert.equal(m.suggestAirportPickup(i,s,now).status,'needs_consultation');
});
test('validity is checked for server now, flight and computed pickup; no stale result',()=>{
 for(const patch of [{valid_from:'2026-10-09T00:00:01Z'},{valid_until:'2026-10-09T00:00:00Z'},{valid_until:'2026-10-09T18:00:00Z'},{valid_from:'2026-10-09T15:00:00Z'}])assert.equal(m.suggestAirportPickup(input,{...source,rules:[{...source.rules[0],...patch}]},now).status,'needs_consultation');
 assert.equal(m.suggestAirportPickup({...input,flight_at:'2026-10-09T08:00'},source,now).reason,'pickup_in_past');
});
test('legacy, unsupported or private payload is never treated as approved source',()=>{
 for(const s of [null,{}, {...source,model_version:2},{...source,approval:{status:'confirmed'}},{...source,rules:[]}])assert.equal(m.suggestAirportPickup(input,s,now).status,'needs_consultation');
});
function harness(sourceValue=source){const calls=[];const POST=typescriptLoader({'server-only':{},'@/lib/api/airport-timing':{fetchAirportTiming:async id=>{calls.push(id);if(sourceValue instanceof Error)throw sourceValue;return sourceValue;}}})('src/app/api/airport-pickup-suggestion/route.ts').POST;return {calls,POST};}
// Generate future input for the real endpoint server clock, while kernel tests use fixed time.
const future={...input,flight_at:new Date(Date.now()+7*3600000+86400000).toISOString().slice(0,16)};
const req=(body)=>new Request('http://localhost/api/airport-pickup-suggestion',{method:'POST',body:JSON.stringify(body)});
test('API rejects forged buffers/clock/sources and invalid input before reading CMS',async()=>{
 for(const i of [{...future,now:now},{...future,buffer_minutes:90},{...future,source},{...future,route_id:'1001'},{...future,flight_kind:'unknown'},null,{}]){const h=harness();assert.equal((await h.POST(req(i))).status,400);assert.equal(h.calls.length,0);}
 for(const i of [{...future,flight_number:'invalid'}, {...future,terminal:null},{...future,flight_at:'2026-02-30T00:00'}]){const h=harness();const r=await h.POST(req(i));assert.equal((await r.json()).status,'needs_consultation');assert.equal(h.calls.length,0);}
});
test('API safe projection, no-store, unavailable and withdrawn policy',async()=>{
 const h=harness();const r=await h.POST(req(future));assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);const body=await r.json();assert.equal(body.status,'suggested');assert.equal(body.flight_verified,false);assert.doesNotMatch(JSON.stringify(body),/source_ref|actor|approval|flight_number|terminal|SYNTHETIC/);assert.deepEqual(h.calls,[1001]);
 for(const s of [null,{...source,rules:[]},new Error('PRIVATE')]){const r=await harness(s).POST(req(future));assert.equal((await r.json()).status,'needs_consultation');}
});
test('fresh WP transport is read-only, timeout bounded, old backend supported',async()=>{
 const original=globalThis.fetch;const calls=[];
 try{globalThis.fetch=async(...a)=>{calls.push(a);return new Response('null',{status:404});};const api=typescriptLoader({'server-only':{}})('src/lib/api/airport-timing.ts');assert.equal(await api.fetchAirportTiming(1001),null);assert.match(calls[0][0],/\/gocar\/v1\/routes\/1001\/airport-timing$/);assert.equal(calls[0][1].cache,'no-store');assert.ok(calls[0][1].signal);assert.equal(calls[0][1].body,undefined);}finally{globalThis.fetch=original;}
});
test('client result decoder rejects malformed and unsupported response',()=>{
 const good=m.suggestAirportPickup(input,source,now);assert.deepEqual(m.readAirportPickupResult(good),good);
 for(const v of [null,{}, {...good,model_version:2},{...good,pickup_at:'nonsense'},{...good,flight_verified:true},{...good,buffer_minutes:-1}])assert.equal(m.readAirportPickupResult(v),null);
});
