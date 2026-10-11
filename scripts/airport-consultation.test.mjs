import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { typescriptLoader } from './lib/load-typescript.mjs';
const load = typescriptLoader();
const {buildAirportConsultationDraft: draft, airportHubConsultationJourneys: journeys} = load('src/lib/airport-consultation.ts');
const input = {passengers:'',bags:'',luggageDetails:'',nameplate:false};
const arrival = {key:'1001:inbound',label:'Sân bay thử → Thành phố thử',context:'pickup_from_airport'};
const item = () => ({route:{id:'1001',slug:'test',contentReadiness:{version:1,serviceState:'live',mappingState:'clear'},pricingV2:{inbound:{enabled:true,packages:[{mode:'contact'}]}}},routePair:{originLocationId:2,destinationLocationId:1,inbound:{enabled:true}},airport:{id:1,slug:'synthetic-airport'},counterpart:{id:2},pricingDirection:'inbound',travelDirection:'from_airport',from:'Sân bay thử',to:'Thành phố thử'});
test('unknown luggage and passengers stay unknown; zero bags stays explicit',()=>{
 assert.match(draft(arrival,input).text,/Chưa rõ, cần tư vấn/);
 assert.match(draft(arrival,{...input,bags:'0'}).text,/Hành lý: 0 kiện/);
});
test('arrival nameplate is a request; departure never carries hidden nameplate',()=>{
 assert.match(draft(arrival,{...input,nameplate:true}).text,/cần xác nhận khả năng phục vụ và chi phí/);
 const result=draft({...arrival,context:'dropoff_at_airport'},{...input,nameplate:true});
 assert.match(result.text,/Tư vấn tiễn đến sân bay/);assert.doesNotMatch(result.text,/Nhu cầu bảng tên/);
});
test('invalid counts, unsafe integers and markup cannot become draft',()=>{
 for(const passengers of ['0','-1','1.2','1e3','Infinity','9007199254740992']) assert.ok(draft(arrival,{...input,passengers}).error);
 for(const bags of ['-1','2.5','1e3','9007199254740992']) assert.ok(draft(arrival,{...input,bags}).error);
 for(const luggageDetails of ['X'.repeat(161),'x\ny','<b>']) assert.ok(draft(arrival,{...input,luggageDetails}).error);
});
test('prelaunch cannot generate live request even with filled data',()=>{
 assert.equal(draft({...arrival,prelaunch:true},{...input,passengers:'4'}).text,'');
});
test('airport hub retains exact movement and Pricing V2 direction',()=>{
 const a=item();assert.equal(journeys([a])[0].context,'pickup_from_airport');
 const b=item();b.travelDirection='to_airport';b.pricingDirection='outbound';b.routePair.outbound={enabled:true};b.route.pricingV2.outbound={enabled:true,packages:[{mode:'contact'}]};
 assert.equal(journeys([b])[0].context,'dropoff_at_airport');assert.equal(journeys([b])[0].key,'1001:outbound');
 b.travelDirection='from_airport';assert.deepEqual(journeys([b]),[]);
});
test('missing or blocked readiness does not activate hub consultation',()=>{
 for(const patch of [undefined,{version:0,serviceState:'live',mappingState:'clear'},{version:1,serviceState:'unknown',mappingState:'clear'},{version:1,serviceState:'prelaunch',mappingState:'clear'},{version:1,serviceState:'live',mappingState:'d35_10_blocked'}]){
  const a=item();a.route.contentReadiness=patch;assert.deepEqual(journeys([a]),[]);
 }
});
test('Long Thanh identifier and legacy fallback cannot activate hub consultation',()=>{
 for(const update of [a=>a.airport.id=9102,a=>a.airport.slug='san-bay-long-thanh',a=>a.route.slug='sai-gon-san-bay-long-thanh',a=>a.routePair.usesLegacyLocationFallback=true]){const a=item();update(a);assert.deepEqual(journeys([a]),[]);}
});
test('disabled pricing direction/packages cannot be upgraded to consultation',()=>{
 for(const update of [a=>a.routePair.inbound.enabled=false,a=>a.route.pricingV2.inbound.enabled=false,a=>a.route.pricingV2.inbound.packages=[{mode:'disabled'}],a=>delete a.route.pricingV2]){const a=item();update(a);assert.deepEqual(journeys([a]),[]);}
});
test('rendered CTA follows movement; Long Thanh has no request button; disabled renders nothing',()=>{
 const Component=load('src/components/route-booking-actions.tsx').RouteBookingActions;
 const props={route:'Sân bay thử → Thành phố thử',vehicleType:'7 chỗ',pricingMode:'contact',airportContext:'pickup_from_airport'};
 let html=renderToStaticMarkup(createElement(Component,props));assert.match(html,/Tư vấn đón tại sân bay/);
 html=renderToStaticMarkup(createElement(Component,{...props,airportContext:'dropoff_at_airport'}));assert.match(html,/Tư vấn tiễn đến sân bay/);
 html=renderToStaticMarkup(createElement(Component,{...props,airportName:'Sân bay Long Thành'}));assert.match(html,/chưa nhận đặt chuyến/);assert.doesNotMatch(html,/Gửi yêu cầu|Tư vấn đón tại sân bay/);
 assert.equal(renderToStaticMarkup(createElement(Component,{...props,pricingMode:'disabled'})),'');
});
