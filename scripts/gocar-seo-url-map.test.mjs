import assert from 'node:assert/strict';
import test from 'node:test';
import { typescriptLoader } from './lib/load-typescript.mjs';
const load=typescriptLoader();
const directions=load('src/lib/api/route-directions.ts');
const {routeHref}=load('src/types/route.ts');
const {getPackageV2,mapWPRouteToPricingPackagesV2}=load('src/lib/api/pricing-v2.ts');
const {isPrelaunchAirportRoute}=load('src/lib/airport-readiness.ts');
const pair=(extra={})=>directions.mapWPRouteToRoutePairV2({id:1,slug:'fixture-pair',meta:{route_model_version:2,origin_location_id:10,destination_location_id:20,outbound_enabled:true,inbound_enabled:true,...extra}});
const route={id:'1',slug:'fixture-pair',regionSlug:'fixture-province',pricingV2:{outbound:{enabled:true,packages:[]},inbound:{enabled:true,packages:[]}}};
test('two enabled directions swap canonical endpoints but share route URL',()=>{
 const p=pair();assert.equal(p.outbound.originLocationId,p.inbound.destinationLocationId);assert.equal(p.inbound.originLocationId,p.outbound.destinationLocationId);assert.equal(p.outbound.enabled,true);assert.equal(p.inbound.enabled,true);
 assert.equal(routeHref({...route,direction:'inbound'}),routeHref({...route,direction:'outbound'}));
});
test('outbound-only pair never invents inbound activation',()=>{
 const p=pair({inbound_enabled:false});assert.equal(p.inbound.enabled,false);assert.equal(p.outbound.enabled,true);
});
test('missing endpoints are marked legacy fallback',()=>{assert.equal(pair({origin_location_id:0}).usesLegacyLocationFallback,true);});
test('unresolved inbound package remains contact without borrowing outbound pricing',()=>{
 const raw={id:1,slug:'fixture-pair',meta:{pricing_model_version:2,pricing_packages_v2:[{direction:'outbound',vehicle_id:2,package_key:'one_way',pricing_mode:'contact'}]}};
 const p=getPackageV2(mapWPRouteToPricingPackagesV2(raw),{routeId:'1',routeSlug:raw.slug,direction:'inbound',vehicleId:'2',packageKey:'one_way'});
 assert.ok(!p || p.mode==='contact');assert.equal(routeHref(route),'/tuyen-duong/fixture-province/fixture-pair');
});
for(const airportAtOrigin of [true,false]) test(`airport at ${airportAtOrigin?'origin':'destination'} maps travel direction through endpoint IDs`,async()=>{
 const airport={id:airportAtOrigin?10:20,slug:'san-bay-fixture',type:'airport',name:'Fixture airport'};
 const locality={id:airportAtOrigin?20:10,slug:'fixture-locality',type:'locality',name:'Fixture locality'};
 const run=typescriptLoader({'./locations':{fetchLocationsV2:async()=>[airport,locality]},'./route-directions':{...directions,fetchRoutePairsV2:async()=>[pair()]},'./routes':{fetchRoutes:async()=>[route]}});
 const hub=await run('src/lib/api/airport-routes.ts').fetchAirportHubBySlug('fixture');
 assert.equal(hub.fromAirport[0].pricingDirection,airportAtOrigin?'outbound':'inbound');
 assert.equal(hub.toAirport[0].pricingDirection,airportAtOrigin?'inbound':'outbound');
 assert.equal(hub.fromAirport[0].href,hub.toAirport[0].href);
});
test('airport resolver suppresses legacy pairs even if inbound flag exists',async()=>{
 const run=typescriptLoader({'./locations':{fetchLocationsV2:async()=>[{id:10,slug:'san-bay-fixture',type:'airport',name:'Fixture'}]},'./route-directions':{...directions,fetchRoutePairsV2:async()=>[pair({destination_location_id:0})]},'./routes':{fetchRoutes:async()=>[route]}});
 assert.equal((await run('src/lib/api/airport-routes.ts').fetchAirportHubBySlug('fixture')).routes.length,0);
});
test('Long Thanh remains prelaunch at either route endpoint',()=>{
 assert.equal(isPrelaunchAirportRoute({originLocation:{slug:'san-bay-long-thanh'}}),true);
 assert.equal(isPrelaunchAirportRoute({destinationLocation:{slug:'san-bay-long-thanh'}}),true);
});
