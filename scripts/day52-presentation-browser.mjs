import { createRequire } from 'node:module';import assert from 'node:assert/strict';import {writeFile}from'node:fs/promises';
const require=createRequire(import.meta.url);const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const origin='http://localhost:4388',records=[];const control=async(mode,duration)=>fetch('http://127.0.0.1:4399/fixture-control',{method:'POST',body:JSON.stringify({mode,duration})});
try{
 for(const[name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  await control('normal',60000);const context=await browser.newContext({viewport:{width,height},timezoneId:'America/Los_Angeles'});
  await context.addCookies([{name:'alo_admin_session',value:'synthetic-publisher',url:origin},{name:'alo_admin_csrf',value:'synthetic-csrf',url:origin}]);
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',async r=>{const u=new URL(r.request().url());requests.push({path:u.pathname,method:r.request().method()});if(!['localhost','127.0.0.1'].includes(u.hostname))return r.abort();return r.continue();});
  await page.goto(`${origin}/quan-tri/chieu-trong/xem-truoc`,{waitUntil:'networkidle'});
  const card=page.getByRole('article',{name:'Chuyến 5001'});await card.waitFor();
  assert.match(await page.locator('h2').textContent(),/Sài Gòn → Vũng Tàu/);
  assert.match(await card.textContent(),/700.000 đồng/);assert.match(await card.textContent(),/1.000.000 đồng/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex.*nofollow/);
  assert.equal(await page.locator('link[rel="canonical"]').count(),0);assert.equal(await page.locator('script[type="application/ld+json"]').count(),0);
  assert.equal(await page.locator('.floating-action').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const r=await context.request.get(`${origin}/api/admin/empty-legs/presentation`);assert.match(r.headers()['cache-control'],/no-store/);assert.match(r.headers()['x-robots-tag'],/noindex/);
  const p=await context.request.post(`${origin}/api/admin/empty-legs/presentation`);assert.equal(p.status(),405);
  await page.screenshot({path:`../evidence/day52-${name}.png`,fullPage:true});
  // Offline immediately removes stale prices; online fetches an authoritative replacement.
  await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await card.waitFor({state:'detached'});
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));await card.waitFor();
  await control('withdrawn');await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await card.waitFor({state:'detached'});await page.getByRole('status').filter({hasText:'Chưa có chuyến'}).waitFor();
  await control('normal',6000);await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await card.waitFor();await card.waitFor({state:'detached',timeout:7500});
  await control('error');await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await page.getByRole('status').filter({hasText:'Dữ liệu cũ đã được ẩn'}).waitFor();assert.equal(await card.count(),0);
  assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.method!=='GET').length,0);
  records.push({name,width,height,overflow:false,errors,readOnly:true,expiryAutoHide:true,offlineHide:true,withdrawalHide:true,noCanonical:true,noOffer:true,deviceTimezone:'America/Los_Angeles'});await context.close();
 }
 const anonymous=await browser.newContext();const denied=await anonymous.request.get(`${origin}/api/admin/empty-legs/presentation`);assert.equal(denied.status(),401);assert.match(denied.headers()['cache-control'],/no-store/);
 const data=await(await fetch('http://127.0.0.1:4399/fixture-control')).json();assert.deepEqual(data.writes,[]);
 await writeFile('../evidence/browser-results.json',JSON.stringify({isolated:true,cmsRuntimeVerified:false,records,anonymousDenied:true,noBackendWrites:true},null,2));console.log('PASS Day52 browser desktop/mobile, expiry, withdrawal, offline/error, auth/read-only/noindex/no-store; fixtures only.');
}finally{await browser.close();}
