import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { typescriptLoader } from './lib/load-typescript.mjs';
globalThis.crypto ??= webcrypto;
const load = typescriptLoader();
const { normalizeAcquisition, acquisitionFromEntry, LEAD_MEASUREMENT_POLICY: policy } = load('src/lib/lead-measurement.ts');
const landing = '/tuyen-duong/ba-ria-vung-tau/tp-hcm-vung-tau';
const granted = { consent_state: 'granted', policy_version: policy, landing_path: landing, utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'sg_vt_launch_v1' };
test('disabled, unknown, denied and wrong policy never disclose source context', () => {
  for (const [input, enabled, state] of [[granted, false, 'unknown'], [{...granted, consent_state:'unknown'},true,'unknown'], [{...granted, consent_state:'denied'},true,'denied'], [{...granted, policy_version:'other'},true,'unknown']]) {
    assert.deepEqual(normalizeAcquisition(input, enabled), {consent_state:state});
  }
});
test('entry URL is stripped to an approved path and safe campaign fields; no raw query, click ID or referrer query', () => {
  const result = acquisitionFromEntry(`https://alodatxe.com${landing}?utm_source=Google&utm_medium=cpc&utm_campaign=sg_vt_launch_v1&gclid=secret&email=person@example.com#phone`, 'https://www.google.com/search?q=person@example.com');
  assert.equal(result.landing_path,landing); assert.equal(result.utm_source,'google'); assert.equal(result.referrer_origin,'https://www.google.com'); assert.equal(result.paid_marker_present,true);
  assert.doesNotMatch(JSON.stringify(result), /secret|person|@|search\?|#phone/);
});
test('PII, invalid tokens, repeated campaign parameters and arbitrary private/public-looking paths are dropped', () => {
  const result=normalizeAcquisition({...granted,utm_campaign:'person@example.com',utm_source:'0901234567',utm_medium:'paid social',landing_path:'/tuyen-duong/private-customer-name',referrer_origin:'https://user:secret@example.com/path'},true);
  assert.equal(result.utm_campaign,null); assert.equal(result.utm_source,null); assert.equal(result.utm_medium,null);assert.equal(result.landing_path,null);assert.equal(result.referrer_origin,null);
  assert.equal(acquisitionFromEntry('https://alodatxe.com/?utm_source=google&utm_source=bing','').utm_source,null);
  assert.equal(normalizeAcquisition({...granted,utm_campaign:'nguyen_van_a',referrer_origin:'https://nguyen.example.com'},true).utm_campaign,null);
  assert.equal(normalizeAcquisition({...granted,referrer_origin:'https://nguyen.example.com'},true).referrer_origin,null);
});
test('entry metadata expires in tab memory after 30 minutes without a network call',()=>{
  const client=typescriptLoader()('src/lib/lead-measurement-client.ts');
  const previous=Date.now;let clock=1000;Date.now=()=>clock;
  try {
    client.rememberMeasurementEntry('https://alodatxe.com/?utm_source=google&utm_medium=cpc','');client.setMeasurementConsent(true);
    assert.equal(client.currentLeadAcquisition().utm_source,'google');clock+=30*60*1000+1;
    assert.deepEqual(client.currentLeadAcquisition(),{consent_state:'unknown'});
  } finally {Date.now=previous;}
});
test('first tab entry survives internal navigation; opt-out clears it; no identifier or network before consent', async () => {
  const client=typescriptLoader()('src/lib/lead-measurement-client.ts');
  let calls=0; const previous=globalThis.fetch; globalThis.fetch=async()=>{calls++;return new Response(null,{status:204})};
  try {
    client.rememberMeasurementEntry(`https://alodatxe.com${landing}?utm_source=google&utm_medium=cpc`,'https://www.google.com/search');
    client.rememberMeasurementEntry('https://alodatxe.com/lien-he','https://alodatxe.com/');
    assert.deepEqual(client.currentLeadAcquisition(),{consent_state:'unknown'});
    client.trackFirstPartyContact('phone');assert.equal(calls,0);
    client.setMeasurementConsent(true);assert.equal(client.currentLeadAcquisition().landing_path,landing);
    client.setMeasurementConsent(false);assert.deepEqual(client.currentLeadAcquisition(),{consent_state:'denied'});
    client.trackFirstPartyContact('phone');assert.equal(calls,0);
  } finally {globalThis.fetch=previous;}
});
test('contact intent de-duplicates for 5 seconds, carries no booking/PII and tolerates a failed request', async () => {
  const client=typescriptLoader()('src/lib/lead-measurement-client.ts');
  client.rememberMeasurementEntry('https://alodatxe.com/?utm_source=google&utm_medium=cpc','');client.setMeasurementConsent(true);
  const bodies=[];const previous=globalThis.fetch;globalThis.fetch=async(path,init)=>{assert.equal(path,'/api/measurement/contact');bodies.push(JSON.parse(init.body));throw new Error('offline')};
  try {
    client.trackFirstPartyContact('phone',1000);client.trackFirstPartyContact('phone',1001);client.trackFirstPartyContact('zalo',1002);client.trackFirstPartyContact('phone',6000);
    await Promise.resolve();assert.equal(bodies.length,3);assert.equal(bodies[0].event_name,'contact_click');assert.equal(bodies[0].lead_id,undefined);assert.notEqual(bodies[0].event_id,bodies[2].event_id);
  } finally {globalThis.fetch=previous;}
});
test('same booking retry keeps its UUID when consent/source changes and never trusts a forged payload acquisition',async()=>{
  const local=typescriptLoader(),client=local('src/lib/lead-measurement-client.ts'),booking=local('src/lib/booking-submit.ts');
  const calls=[];const previous=globalThis.fetch;globalThis.fetch=async(_url,init)=>{calls.push({key:init.headers['x-lead-idempotency-key'],body:JSON.parse(init.body)});return new Response(null,{status:502})};
  const init={method:'POST',body:JSON.stringify({routeId:'41',phone:'0300000000',acquisition:granted})};
  try {
    await booking.fetchBookingWithIdempotency('/api/booking',init);
    client.rememberMeasurementEntry('https://alodatxe.com/?utm_source=google&utm_medium=cpc','');client.setMeasurementConsent(true);
    await booking.fetchBookingWithIdempotency('/api/booking',init);client.setMeasurementConsent(false);await booking.fetchBookingWithIdempotency('/api/booking',init);
    assert.equal(calls[0].key,calls[1].key);assert.equal(calls[1].key,calls[2].key);assert.deepEqual(calls[0].body.acquisition,{consent_state:'unknown'});assert.deepEqual(calls[2].body.acquisition,{consent_state:'denied'});
  } finally {globalThis.fetch=previous;}
});
test('contact gateway is consented, same-origin, bounded, and can only write intent records', async()=>{
  const previous=process.env.LEAD_MEASUREMENT_POLICY;const calls=[];
  const {POST}=typescriptLoader({'next/server':{NextResponse:Response},'@/lib/api/wp-auth':{wpAuthedFetch:async(path,init)=>{calls.push({path,body:init.body});return{ok:true,data:{accepted:true}}}}})('src/app/api/measurement/contact/route.ts');
  const request=(body,origin='https://alodatxe.com')=>new Request('https://alodatxe.com/api/measurement/contact',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
  const body={event_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',event_name:'contact_click',channel:'phone',acquisition:granted,lead_id:999,phone:'0300000000'};
  try {
    delete process.env.LEAD_MEASUREMENT_POLICY;assert.equal((await POST(request(body))).status,204);assert.equal(calls.length,0);
    process.env.LEAD_MEASUREMENT_POLICY=policy;
    assert.equal((await POST(request(body,'https://other.example'))).status,403);assert.equal(calls.length,0);
    assert.equal((await POST(request({...body,acquisition:{consent_state:'denied'}}))).status,204);
    assert.equal((await POST(request({...body,event_name:'lead_created'}))).status,400);
    assert.equal((await POST(request({...body,extra:'x'.repeat(5000)}))).status,413);
    assert.equal((await POST(request(body))).status,204);assert.equal(calls.length,1);assert.equal(calls[0].path,'/gocar/v1/measurement/contact');assert.equal(calls[0].body.phone,undefined);assert.equal(calls[0].body.lead_id,undefined);
  } finally {if(previous===undefined)delete process.env.LEAD_MEASUREMENT_POLICY;else process.env.LEAD_MEASUREMENT_POLICY=previous;}
});
