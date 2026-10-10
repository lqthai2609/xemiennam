/** Local synthetic browser acceptance. Start fixture server + Next dev first. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.DAY47_UI_BASE || 'http://127.0.0.1:4188';
const output=process.env.DAY47_EVIDENCE_DIR || '../evidence';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const evidence=[];
async function fixture(mode){const res=await fetch('http://127.0.0.1:4199/fixture-control',{method:'POST',body:JSON.stringify({mode})});assert.equal(res.status,200);}
async function waitText(locator,text){await locator.getByText(text,{exact:false}).first().waitFor({timeout:30000});}
async function check(selector){await selector.getByRole('button',{name:'Kiểm tra xe',exact:true}).click();await selector.locator('.vehicle-selector-result').first().waitFor({timeout:30000});}
async function fits(selector){await selector.getByLabel('Số hành khách (không gồm tài xế)',{exact:true}).fill('6');await selector.getByLabel('Hành lý',{exact:true}).selectOption('details');await selector.getByLabel('Số kiện nhóm xách tay',{exact:true}).fill('2');await selector.getByLabel('Số kiện nhóm ký gửi',{exact:true}).fill('0');await selector.getByLabel('Dài nhóm xách tay (cm)',{exact:true}).fill('55');await selector.getByLabel('Rộng nhóm xách tay (cm)',{exact:true}).fill('40');await selector.getByLabel('Cao nhóm xách tay (cm)',{exact:true}).fill('20');await selector.getByLabel('Tổng khối lượng hành lý (kg)',{exact:true}).fill('16');await check(selector);await waitText(selector,'Phù hợp cấu hình đã xác nhận');}
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await fixture('confirmed');const page=await browser.newPage({viewport:{width,height}});const errors=[];let bookingCalls=0;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/booking',route=>{bookingCalls++;return route.fulfill({status:503,contentType:'application/json',body:'{"error":"SYNTHETIC interception; no writes"}'});});
  await page.goto(`${base}/loai-xe`,{waitUntil:'networkidle',timeout:60000});
  const selector=page.locator('.vehicle-selector').first();await fits(selector);
  const response=await page.request.post(`${base}/api/vehicle-suggestions`,{data:{passengers:6,luggage:null}});assert.equal(response.status(),200);assert.match(response.headers()['cache-control'],/no-store/);
  await selector.locator('summary').first().click();await selector.locator(".vehicle-selector-result").first().scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${name}-confirmed.png`,fullPage:false});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal page overflow');
  const invalidStatic=await page.locator('.vehicle-index-featured').innerText();assert.doesNotMatch(invalidStatic,/1\s*[–-]\s*3 người|3\s*[–-]\s*6 người|7\s*[–-]\s*14 người/);
  await selector.getByLabel('Số hành khách (không gồm tài xế)',{exact:true}).fill('7');assert.equal(await selector.locator('.vehicle-selector-result').count(),0,'changed input clears fit');await check(selector);await waitText(selector,'Xe quá nhỏ: số khách vượt sức chứa đã xác nhận');
  assert.equal(await selector.locator('.is-exceeds_confirmed_capacity button').count(),0,'no positive selection for excluded vehicle');await selector.locator(".is-exceeds_confirmed_capacity").scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${name}-too-small.png`,fullPage:false});
  await selector.getByLabel('Số hành khách (không gồm tài xế)',{exact:true}).fill('6');await selector.getByLabel('Hành lý',{exact:true}).selectOption('unknown');await check(selector);await waitText(selector,'Chưa biết đầy đủ lượng hành lý');assert.equal(await selector.locator('.is-fits_confirmed_profile').count(),0);
  await fixture('withdrawn');await check(selector);assert.equal(await selector.getByText('Synthetic Model A',{exact:true}).count(),0);await waitText(selector,'Chưa đủ thông tin xe đã xác nhận');
  await fixture('confirmed');await fits(selector);await fixture('delayed');await selector.getByRole('button',{name:'Kiểm tra xe',exact:true}).click();await selector.getByLabel('Số hành khách (không gồm tài xế)',{exact:true}).fill('8');await page.waitForTimeout(1400);assert.equal(await selector.locator('.vehicle-selector-result').count(),0,'late reply cannot restore fit');
  await fixture('error');await selector.getByRole('button',{name:'Kiểm tra xe',exact:true}).click();await waitText(selector,'Chưa kiểm tra được thông tin xe');assert.equal(await selector.locator('.vehicle-selector-result').count(),0);
  await fixture('confirmed');await page.goto(`${base}/loai-xe/7-cho`,{waitUntil:'networkidle'});const typeSelector=page.locator('.vehicle-selector').first();await fits(typeSelector);assert.equal(await typeSelector.locator('.vehicle-selector-result').count(),1,'category filters individual records');
  await page.goto(`${base}/lien-he`,{waitUntil:'networkidle'});const form=page.locator('form.contact-form');await form.getByLabel('Loại xe',{exact:false}).selectOption('7 chỗ');const contactSelector=form.locator('.vehicle-selector');await fits(contactSelector);await form.getByLabel('Loại xe',{exact:false}).selectOption('4 chỗ');await form.getByLabel('Loại xe',{exact:false}).selectOption('7 chỗ');assert.equal(await contactSelector.locator('.vehicle-selector-result').count(),0,'restoring type does not restore prior result');
  assert.equal(await form.getByRole('button',{name:'Gửi yêu cầu đặt xe',exact:true}).isEnabled(),true,'missing facts do not disable consultation');
  await form.getByLabel('Họ tên',{exact:false}).fill('SYNTHETIC local-only');await form.getByLabel('Số điện thoại',{exact:false}).fill('0900000000');
  await form.locator('.contact-journey-locations input').nth(0).fill('SYNTHETIC pickup');await form.locator('.contact-journey-locations input').nth(1).fill('SYNTHETIC destination');
  await form.getByLabel('Điểm đón cụ thể',{exact:false}).fill('SYNTHETIC address');await form.getByLabel('Điểm trả cụ thể',{exact:false}).fill('SYNTHETIC address');
  await form.getByRole('button',{name:'Gửi yêu cầu đặt xe',exact:true}).click();await page.waitForTimeout(500);assert.equal(bookingCalls,1,'consultation reaches intercepted local request');
  assert.equal(errors.length,0,errors.join('\n'));evidence.push({viewport:name,width,height,checks:'confirmed, excess, unknown luggage, withdrawal, late response, API error, category filter, type restoration, consultation remains open',pageErrors:errors,booking:'one browser-intercepted request; no backend write'});await page.close();
 }
 await writeFile(`${output}/browser-acceptance.json`,JSON.stringify({notice:'Synthetic local fixtures only. No production or SEO acceptance.',checks:evidence},null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();await fixture('confirmed');}
