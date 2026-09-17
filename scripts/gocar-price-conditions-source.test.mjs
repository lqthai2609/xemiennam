import assert from 'node:assert/strict';
import test from 'node:test';
import { typescriptLoader } from './lib/load-typescript.mjs';
const load = typescriptLoader();
const {resolveCondition} = load('src/lib/api/price-conditions.ts');
const {resolvePriceRulesV2} = load('src/lib/api/price-rules.ts');
// All dates, keys and amounts below are synthetic fixtures, never operational seeds.
const none = {rule_key:'fixture_none',charge_mode:'none'};
function context(rules=[none], extra={}) {
 return {route:{id:1,slug:'fixture',meta:{price_condition_policy_version:1,price_condition_timezone:'Etc/UTC',price_condition_rules_v2:rules,...extra}},direction:'outbound',vehicleId:2,departureDate:'2000-01-01',departureTime:'09:00'};
}
const evalRule = (rules, changes={}) => resolveCondition({...context(rules),...changes},'one_way');
test('absent or inactive policy and no matching rule stay contact',()=>{
 assert.equal(resolveCondition(context([], {price_condition_policy_version:0}),'one_way').reason,'policy_missing');
 assert.equal(evalRule([]).reason,'rule_missing');
 assert.equal(evalRule([{...none,package_key:'2d1n'}]).reason,'rule_missing');
 assert.equal(evalRule([none]).mode,'none');
});
test('malformed predicates never broaden a rule, including after WordPress invalid marker',()=>{
 for(const patch of [{start_date:'bad'},{start_date:'2001-02-29'},{start_time:'25:00',end_time:'06:00'},{start_time:'09:00'},{start_time:'09:00',end_time:'09:00'},{holiday_dates:['bad']},{days_of_week:[8]},{days_of_week:['bad']},{weekend_only:true},{direction:'sideways'},{vehicle_id:-2},{amount:true},{priority:1.5},{rule_key:''},{invalid:true},{start_date:'2001-02-01',end_date:'2001-01-01'}]){
  assert.equal(evalRule([{...none,...patch}]).reason,'invalid_policy',JSON.stringify(patch));
 }
 assert.equal(evalRule([null]).reason,'invalid_policy');
 assert.equal(evalRule([none,none]).reason,'invalid_policy');
});
test('positive fixed, explicit none, contact and invalid amounts',()=>{
 assert.equal(evalRule([{...none,charge_mode:'fixed',amount:7}]).amount,7);
 assert.equal(evalRule([{...none,charge_mode:'contact'}]).mode,'contact');
 for(const amount of [0,-1,NaN,Infinity,true,'',null]) assert.equal(evalRule([{...none,charge_mode:'fixed',amount}]).mode,'contact');
});
test('effective dates are inclusive; leap dates and explicit holiday dates are validated',()=>{
 const rule={...none,start_date:'2000-01-01',end_date:'2000-01-02'};
 assert.equal(evalRule([rule]).mode,'none');
 assert.equal(evalRule([rule],{departureDate:'2000-01-02'}).mode,'none');
 assert.equal(evalRule([rule],{departureDate:'2000-01-03'}).reason,'rule_missing');
 assert.equal(evalRule([rule],{departureDate:'2001-02-29'}).reason,'date_missing');
 assert.equal(evalRule([{...none,holiday_dates:['2000-02-29']}],{departureDate:'2000-02-29'}).mode,'none');
 assert.equal(evalRule([{...none,holiday_dates:['2000-02-29']}]).reason,'rule_missing');
});
test('weekend membership is configured, never assumed',()=>{
 const rule={...none,weekend_only:true,weekend_days:[5]};
 assert.equal(evalRule([rule]).reason,'rule_missing');
 assert.equal(evalRule([rule],{departureDate:'2000-01-07'}).mode,'none');
 assert.equal(evalRule([{...none,days_of_week:[6]}]).mode,'none');
});
test('time windows are half open and overnight windows use departure-local date',()=>{
 const rule={...none,start_time:'09:00',end_time:'10:00'};
 for(const [time,mode] of [['08:59','contact'],['09:00','none'],['09:59','none'],['10:00','contact']]) assert.equal(evalRule([rule],{departureTime:time}).mode,mode);
 const night={...none,start_time:'22:00',end_time:'06:00'};
 for(const [time,mode] of [['22:00','none'],['23:59','none'],['00:00','none'],['05:59','none'],['06:00','contact']]) assert.equal(evalRule([night],{departureTime:time}).mode,mode);
});
test('unknown applicable calendar or clock blocks a generic fallback',()=>{
 const timed={...none,rule_key:'timed',start_time:'09:00',end_time:'10:00'};
 assert.equal(evalRule([none,timed],{departureTime:''}).reason,'time_missing');
 assert.equal(evalRule([none,{...none,rule_key:'dated',holiday_dates:['2000-01-01']}],{departureDate:''}).reason,'date_missing');
 const c=context([timed],{price_condition_timezone:''});
 assert.equal(resolveCondition(c,'one_way').reason,'timezone_missing');
});
test('unrelated direction, vehicle, package or excluded date does not require time',()=>{
 for(const scope of [{direction:'inbound'},{vehicle_id:3},{package_key:'2d1n'},{holiday_dates:['2000-01-02']}]) {
  const rule={...none,rule_key:'other',start_time:'09:00',end_time:'10:00',...scope};
  assert.equal(evalRule([none,rule],{departureTime:''}).mode,'none');
 }
});
test('priority then scope decides; ties stay contact',()=>{
 const fixed={rule_key:'specific',charge_mode:'fixed',amount:7,package_key:'one_way'};
 assert.equal(evalRule([none,fixed]).ruleKey,'specific');
 assert.equal(evalRule([{...none,priority:2},fixed]).ruleKey,'fixture_none');
 assert.equal(evalRule([none,{...none,rule_key:'tie'}]).reason,'ambiguous_rule');
});
function pricedContext(rules) {
 const c=context(rules);
 c.packageKey='one_way';c.pickup={serviceZoneId:'fixture_a',serviceAreaStatus:'covered'};c.dropoff={serviceZoneId:'fixture_b',serviceAreaStatus:'covered'};
 Object.assign(c.route.meta,{surcharge_policy_version:1,zone_surcharge_rules_v2:[],pricing_model_version:2,pricing_packages_v2:[{direction:'outbound',vehicle_id:2,package_key:'one_way',pricing_mode:'fixed',price:100}]});
 return c;
}
test('integration: base plus resolved layers only, server estimate stays absent for contact',()=>{
 const c=pricedContext([{...none,charge_mode:'fixed',amount:7}]);
 let r=resolvePriceRulesV2(c);assert.equal(r.basePrice,100);assert.equal(r.estimatedTotal,107);
 c.route.meta.price_condition_policy_version=0;r=resolvePriceRulesV2(c);assert.equal(r.mode,'contact');assert.equal(r.estimatedTotal,undefined);assert.equal(r.basePrice,100);
 c.route.meta.pricing_packages_v2[0].pricing_mode='disabled';assert.equal(resolvePriceRulesV2(c).mode,'disabled');
});
test('integration: legacy price and other direction never supply a base',()=>{
 const c=pricedContext([none]);c.direction='inbound';assert.equal(resolvePriceRulesV2(c).estimatedTotal,undefined);
 c.direction='outbound';delete c.route.meta.pricing_model_version;delete c.route.meta.pricing_packages_v2;c.route.meta.pricing_by_vehicle=[{vehicle_id:2,gia:100}];
 assert.equal(resolvePriceRulesV2(c).reason,'base_missing');
});
test('integration: snapshot has version and timezone; total overflow returns contact',()=>{
 const c=pricedContext([{...none,charge_mode:'fixed',amount:Number.MAX_SAFE_INTEGER}]);
 const r=resolvePriceRulesV2(c);assert.equal(r.mode,'contact');assert.equal(r.estimatedTotal,undefined);assert.equal(r.condition.policyVersion,1);assert.equal(r.condition.timezone,'Etc/UTC');
});

test('integration: disabled direction cannot produce a numeric total',()=>{
 const c=pricedContext([none]);c.route.meta.outbound_enabled=false;
 const r=resolvePriceRulesV2(c);assert.equal(r.mode,'disabled');assert.equal(r.reason,'direction_disabled');assert.equal(r.estimatedTotal,undefined);
});
