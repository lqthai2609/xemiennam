import test from 'node:test';
import assert from 'node:assert/strict';
import { typescriptLoader } from './lib/load-typescript.mjs';
const {readVehicleGalleries:read}=typescriptLoader()('src/lib/vehicle-gallery.ts');
const vehicle=ids=>({meta:{gallery_anh:ids}});
test('media requests deduplicate shared IDs but preserve vehicle order and repeated images',async()=>{
 const calls=[];const galleries=await read([vehicle([3,2,3]),vehicle([2,1]),vehicle([])],async path=>{calls.push(path);return [{id:1,source_url:'one'},{id:2,source_url:'two'},{id:3,source_url:'three'}]});
 assert.equal(calls.length,1);assert.match(calls[0],/include=3,2,1&/);assert.deepEqual(galleries,[['three','two','three'],['two','one'],[]]);
});
test('more than 100 IDs is split into bounded batches with exact result order',async()=>{
 const ids=Array.from({length:205},(_,i)=>i+1);const sizes=[];const [result]=await read([vehicle(ids)],async path=>{const u=new URL(path,'http://local');const values=u.searchParams.get('include').split(',').map(Number);sizes.push(values.length);assert.equal(u.searchParams.get('per_page'),String(values.length));return values.reverse().map(id=>({id,source_url:String(id)}));});assert.deepEqual(sizes,[100,100,5]);assert.deepEqual(result,ids.map(String));
});
test('empty and invalid gallery IDs do not fetch; missing media stays absent',async()=>{
 let calls=0;assert.deepEqual(await read([vehicle(undefined),vehicle([0,-1,NaN,Infinity])],async()=>{calls++;return []}),[[],[]]);assert.equal(calls,0);
 assert.deepEqual(await read([vehicle([1,2,3])],async()=>[{id:2,source_url:'two'},{id:3,source_url:''}]),[['two']]);assert.deepEqual(await read([vehicle([1])],async()=>null),[[]]);
});
test('upstream errors propagate rather than returning a successful incomplete gallery',async()=>{
 await assert.rejects(read([vehicle([1])],async()=>{throw Error('CMS failed')}),/CMS failed/);
});
test('batch adapter output equals individual mapping, including facts and metadata',async()=>{
 const raw=[{id:1,slug:'one',title:{rendered:'One'},content:{rendered:'Description'},modified:'2026-10-15',meta:{gallery_anh:[3,2,3],tien_ich:['sample']}},{id:2,slug:'two',title:{rendered:'Two'},content:{rendered:''},meta:{gallery_anh:[2,1],so_cho:7}}];let calls=0;
 const api=typescriptLoader({'./raw':{fetchRawVehicles:async()=>raw,embeddedTermName:()=>undefined},'./mock-fallback':{shouldUseMockFallback:()=>false},'@/lib/wp':{stripHtml:v=>v,wpFetch:async path=>{calls++;const ids=new URL(path,'http://local').searchParams.get('include').split(',').map(Number);return ids.reverse().map(id=>({id,source_url:String(id)}))}}})('src/lib/api/vehicles.ts');
 const before=await Promise.all(raw.map(v=>api.mapWPVehicleToVehicle(v)));assert.equal(calls,2);calls=0;const after=await api.fetchVehicles();assert.equal(calls,1);assert.deepEqual(after,before);
});
