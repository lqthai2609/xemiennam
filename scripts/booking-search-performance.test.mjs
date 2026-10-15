import test from 'node:test';
import assert from 'node:assert/strict';
import { typescriptLoader } from './lib/load-typescript.mjs';
const load=typescriptLoader();
const {projectBookingSearchRoutes:project,buildBookingJourneyIndex:build,findBookingJourney:find}=load('src/lib/booking-search-routes.ts');
const {routeHref,routeComboHref}=load('src/types/route.ts');
const route=(id,patch={})=>({id,slug:'test-'+id,regionSlug:'test-region',from:'TP. Hồ Chí Minh',to:'Vũng Tàu',vehicleTypes:['Xe 4 chỗ'],pricingByVehicle:[{vehicleType:'Xe 4 chỗ',price:'sample'}],summary:'CMS editorial text',featuredImage:'/sample.webp',mapEmbedSrc:'https://example.com/map',notes:['sample note'],...patch});
const direction=(enabled,packages=[{vehicleType:'Xe 4 chỗ',mode:'fixed'}])=>({enabled,packages,featuredPackage:'one_way'});
test('search projection drops unused editorial and price fields without mutating source',()=>{
 const source=route('1',{originLocation:{id:1,type:'airport',name:'test'},pricingV2:{outbound:direction(true,[{vehicleType:'Xe 4 chỗ',mode:'contact',price:123,packageKey:'one_way'}]),inbound:direction(false,[{vehicleType:'Xe 7 chỗ',mode:'disabled'}])}});
 const before=JSON.stringify(source);const [view]=project([source]);
 assert.equal(JSON.stringify(source),before);assert.equal(view.originLocation.type,'airport');
 for(const field of ['summary','featuredImage','notes','mapEmbedSrc','price','contentReadiness'])assert.equal(field in view,false);
 assert.deepEqual(view.pricingV2.outbound,{enabled:true,packages:[{vehicleType:'Xe 4 chỗ',mode:'contact'}]});assert.deepEqual(view.pricingV2.inbound,{enabled:false,packages:[{vehicleType:'Xe 7 chỗ',mode:'disabled'}]});
 assert.equal(routeHref(view),routeHref(source));assert.equal(routeComboHref(view,'4-cho'),routeComboHref(source,'4-cho'));
});
test('projection preserves legacy vehicle choices and does not enable a reverse direction',()=>{
 const [view]=project([route('1')]);assert.equal(view.pricingV2,undefined);assert.deepEqual(view.pricingByVehicle,[{vehicleType:'Xe 4 chỗ'}]);assert.equal(find(build([view]),'Sài Gòn','Vũng Tàu').direction,'outbound');assert.equal(find(build([view]),'Vũng Tàu','Sài Gòn'),undefined);
});
test('indexed journeys preserve exact direction, aliases, route IDs and precedence',()=>{
 const routes=project([route('first',{pricingV2:{outbound:direction(false),inbound:direction(true)}}),route('second',{pricingV2:{outbound:direction(true),inbound:direction(true)}})]);const index=build(routes);
 for(const alias of ['Sài Gòn','HCM','TPHCM','Hồ Chí Minh','Thủ Đức']){assert.equal(find(index,alias,'Vũng Tàu').route.id,'second');assert.equal(find(index,'Vũng Tàu',alias).route.id,'first');assert.equal(find(index,'Vũng Tàu',alias).direction,'inbound');}
 assert.equal(find(index,'Sài Gòn','Thủ Đức'),undefined);assert.equal(find(index,'','Vũng Tàu'),undefined);assert.equal(find(index,'Sài Gòn','Chưa có tuyến'),undefined);
});
test('index remains local to its route list; changed inputs do not reuse an old lookup',()=>{
 const a=build(project([route('a')]));const b=build(project([route('b',{to:'Cần Thơ'})]));assert.equal(find(a,'HCM','Vũng Tàu').route.id,'a');assert.equal(find(b,'HCM','Vũng Tàu'),undefined);assert.equal(find(b,'HCM','Cần Thơ').route.id,'b');
});
test('repeated package rows retain first vehicle/mode order without inventing availability',()=>{
 const rows=[{vehicleType:'Xe 4 chỗ',mode:'fixed'},{vehicleType:'Xe 7 chỗ',mode:'disabled'},{vehicleType:'Xe 4 chỗ',mode:'fixed'},{vehicleType:'Xe 4 chỗ',mode:'contact'},{vehicleType:'Xe 7 chỗ',mode:'disabled'}];const source=route('1',{pricingV2:{outbound:direction(true,rows),inbound:direction(false,rows)}});const [view]=project([source]);assert.deepEqual(view.pricingV2.outbound.packages,[rows[0],rows[1],rows[3]]);assert.equal(view.pricingV2.inbound.enabled,false);assert.equal(source.pricingV2.outbound.packages.length,5);
});
