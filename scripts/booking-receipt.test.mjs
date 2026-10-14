import test from 'node:test';
import assert from 'node:assert/strict';
import {typescriptLoader} from './lib/load-typescript.mjs';
const get=()=>typescriptLoader()('src/lib/booking-receipt.ts');
test('thank-you receipt requires a real numeric ID, known kind/version and an unexpired timestamp',()=>{
 const {parseBookingReceipt,BOOKING_RECEIPT_TTL:ttl}=get();const now=2000000000000;const valid={version:1,leadId:42,kind:'booking',recordedAt:now};
 assert.deepEqual(parseBookingReceipt(JSON.stringify(valid),now),valid);
 for(const patch of [{leadId:0},{leadId:'42'},{leadId:1.5},{version:2},{kind:'confirmed_reservation'},{recordedAt:now+1},{recordedAt:now-ttl}])assert.equal(parseBookingReceipt(JSON.stringify({...valid,...patch}),now),null);
 for(const raw of [null,'bad','{}','x'.repeat(513)])assert.equal(parseBookingReceipt(raw,now),null);
 assert.deepEqual(parseBookingReceipt(JSON.stringify({...valid,phone:'private'}),now),valid);
});
test('success receipt stores only minimal acknowledgement, preserves the latest ID if storage is unavailable',()=>{
 const previous=globalThis.window;const storage=new Map();let blocked=false;const events=[];
 globalThis.window={sessionStorage:{setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v)},getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},dispatchEvent:event=>events.push(event.type)};
 try{
  const h=get();h.rememberBookingReceipt(42,'booking');const saved=JSON.parse(storage.get(h.BOOKING_RECEIPT_KEY));assert.deepEqual(Object.keys(saved).sort(),['kind','leadId','recordedAt','version']);
  assert.equal(h.parseBookingReceipt(h.bookingReceiptSnapshot()).leadId,42);
  blocked=true;h.rememberBookingReceipt(99,'quote');assert.equal(h.parseBookingReceipt(h.bookingReceiptSnapshot()).leadId,99);assert.equal(h.parseBookingReceipt(h.bookingReceiptSnapshot()).kind,'quote');
  h.rememberBookingReceipt(-1,'booking');assert.equal(h.parseBookingReceipt(h.bookingReceiptSnapshot()).leadId,99);assert.equal(events.length,2);
 }finally{globalThis.window=previous;}
});
