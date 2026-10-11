import assert from 'node:assert/strict';
import test from 'node:test';
import { typescriptLoader } from './lib/load-typescript.mjs';
const {parseEmptyLegPresentation:parse, visibleEmptyLegCards:visible, presentationTick:tick} = typescriptLoader()('src/lib/empty-leg-presentation.ts');
const card = {id:1,revision:2,origin:'TP. Hồ Chí Minh',destination:'Vũng Tàu',vehicle:'Xe 7 chỗ',direction:'outbound',package_key:'one_way',departure:{date:'2030-01-01',time:'08:00',timezone:'Asia/Ho_Chi_Minh'},valid_from:'2030-01-01T00:00:00Z',expires_at:'2030-01-01T00:00:10Z',normal_price_vnd:1000000,special_price_vnd:700000,currency:'VND',basis:'base_price'};
const payload = () => ({contract_version:1,server_now:'2030-01-01T00:00:00Z',lease_ms:15000,commercial_enabled:false,sellable:false,items:[structuredClone(card)]});
test('server projection is immutable and missing/extra operational fields fail closed',()=>{
 const p=payload(); const d=parse(p); assert.ok(d); d.items[0].special_price_vnd=1; assert.equal(p.items[0].special_price_vnd,700000);
 for(const key of ['history','source_ref','phone','promotion_id','canonical_url','assessment']) {const q=payload();q.items[0][key]='injected';assert.equal(parse(q),null);}
 for(const key of ['normal_price_vnd','special_price_vnd','expires_at','departure']) {const q=payload();delete q.items[0][key];assert.equal(parse(q),null);}
});
test('no client activation, inferred prices, duplicate cards or malformed dates',()=>{
 for(const [key,value] of [['commercial_enabled',true],['sellable',true],['lease_ms',15001],['lease_ms',0],['server_now','2030-02-30T00:00:00Z']]) {const q=payload();q[key]=value;assert.equal(parse(q),null);}
 for(const value of [null,0,-1,'700000',NaN,Infinity,Number.MAX_SAFE_INTEGER+1,1000001]) {const q=payload();q.items[0].special_price_vnd=value;assert.equal(parse(q),null);}
 const p=payload();p.items.push(structuredClone(card));assert.equal(parse(p),null);
 for(const [key,value] of [['basis','estimated_total'],['package_key','round_trip'],['origin','<script>'],['expires_at','2029-12-31T23:00:00Z']]){const q=payload();q.items[0][key]=value;assert.equal(parse(q),null);}
});
test('half-open expiry uses conservative server clock and full latency, ignores device wall clock',()=>{
 const d=parse(payload()); const started=100;
 assert.equal(visible(d,started,started).length,1);
 assert.equal(visible(d,started,started+8999).length,1);
 assert.equal(visible(d,started,started+9000).length,0);
 assert.equal(visible(d,started,started+10000).length,0);
 assert.equal(visible(d,started,started-1).length,0);
 assert.equal(visible(d,started,NaN).length,0);
 const old=Date.now;Date.now=()=>0;try{assert.equal(visible(d,started,started+9000).length,0);}finally{Date.now=old;}
 assert.equal(tick(d,started,started+8999),1);
});
test('lease expires even when trip far ahead; late response cannot revive old cards',()=>{
 const q=payload();q.items[0].expires_at='2030-01-01T00:30:00Z';const d=parse(q);
 assert.equal(visible(d,0,14999).length,1);assert.equal(visible(d,0,15000).length,0);assert.equal(visible(d,0,18000).length,0);
 const p=payload();p.items[0].valid_from='2030-01-01T00:00:05Z';const b=parse(p);assert.equal(visible(b,0,0).length,0);assert.equal(visible(b,0,4000).length,1);
});
