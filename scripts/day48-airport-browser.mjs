import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.env.DAY48_EVIDENCE_DIR||'../evidence';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const base=process.env.DAY48_UI_BASE||'http://127.0.0.1:4188';
const evidence=[];
const time=new Date(Date.now()+7*3600000+2*86400000).toISOString().slice(0,16);
async function fixture(mode){const r=await fetch('http://127.0.0.1:4199/fixture-control',{method:'POST',body:JSON.stringify({mode})});assert.equal(r.status,200);}
async function check(panel){await panel.getByRole('button',{name:'Kiểm tra giờ đón gợi ý',exact:true}).click();}
async function fill(panel,arrival=false){await panel.getByLabel('Số hiệu chuyến bay',{exact:true}).fill('VN123');await panel.getByLabel(arrival?'Giờ hạ cánh dự kiến':'Giờ bay dự kiến',{exact:true}).fill(time);await panel.getByLabel('Nhà ga',{exact:true}).fill('SYNTHETIC T1');await panel.getByLabel('Loại chuyến bay theo vé',{exact:true}).selectOption('domestic');}
async function expectSuggestion(panel){await check(panel);await panel.getByText('Giờ đón gợi ý:',{exact:false}).waitFor({timeout:30000});}
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await fixture('confirmed');const page=await browser.newPage({viewport:{width,height}});const errors=[];let bookingCalls=0;
  page.on('pageerror',e=>errors.push(String(e)));await page.route('**/api/booking',route=>{bookingCalls++;return route.fulfill({status:503,contentType:'application/json',body:'{}'});});
  const url=`${base}/tuyen-duong/synthetic-province/synthetic-airport-route?direction=outbound&package=one_way`;
  await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  await page.getByRole('button',{name:/Gửi yêu cầu/}).first().click();
  let panel=page.getByRole('dialog');await panel.waitFor();await check(panel);await panel.getByText('Cần tư vấn: bổ sung',{exact:false}).waitFor();assert.equal(await panel.locator('.airport-pickup-result').count(),0);
  await fill(panel);await expectSuggestion(panel);await panel.locator('.airport-pickup-advice').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/day48-${name}-departure.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
  await panel.getByLabel('Nhà ga',{exact:true}).fill('other');assert.equal(await panel.locator('.airport-pickup-result').count(),0,'edit clears advice');await panel.getByLabel('Nhà ga',{exact:true}).fill('SYNTHETIC T1');assert.equal(await panel.locator('.airport-pickup-result').count(),0,'restore does not restore old advice');
  await expectSuggestion(panel);await fixture('withdrawn');await check(panel);await panel.getByText('chưa có cấu hình giờ đón',{exact:false}).waitFor();assert.equal(await panel.locator('.airport-pickup-result').count(),0);
  await fixture('revised');const revisedReply=page.waitForResponse(r=>r.url().endsWith('/api/airport-pickup-suggestion'));await expectSuggestion(panel);assert.equal((await (await revisedReply).json()).revision,4);
  await fixture('delayed');await check(panel);await panel.getByLabel('Số hiệu chuyến bay',{exact:true}).fill('VN124');await page.waitForTimeout(1600);assert.equal(await panel.locator('.airport-pickup-result').count(),0,'late response discarded');
  await fixture('legacy');await check(panel);await panel.getByText('chưa có cấu hình giờ đón',{exact:false}).waitFor();
  await fixture('error');await check(panel);await panel.getByText('chưa kiểm tra được giờ đón',{exact:false}).waitFor();
  await fixture('timeout');await check(panel);await panel.getByText('chưa kiểm tra được giờ đón',{exact:false}).waitFor({timeout:12000});
  await fixture('confirmed');await panel.getByLabel('Số hiệu chuyến bay',{exact:true}).fill('123');await check(panel);await panel.getByText('Số hiệu chuyến bay chưa đúng định dạng',{exact:false}).waitFor();
  await panel.getByLabel('Số hiệu chuyến bay',{exact:true}).fill('VN123');await panel.getByLabel('Giờ cần có mặt tại sân bay',{exact:true}).fill(time);await check(panel);await panel.getByText('phải ở tương lai và trước giờ bay',{exact:false}).waitFor();
  await panel.getByLabel('Giờ cần có mặt tại sân bay',{exact:true}).fill('');await expectSuggestion(panel);
  // Expired response must not be rendered; synthetic API interception does no backend writes.
  await page.route('**/api/airport-pickup-suggestion',async route=>{const response=await route.fetch();const body=await response.json();body.valid_until='2020-01-01T00:00:00Z';await route.fulfill({response,json:body});});
  await check(panel);await panel.getByText('chưa kiểm tra được giờ đón',{exact:false}).waitFor();assert.equal(await panel.locator('.airport-pickup-result').count(),0);await page.unroute('**/api/airport-pickup-suggestion');
  await page.route('**/api/airport-pickup-suggestion',async route=>{const response=await route.fetch();const body=await response.json();body.valid_until=new Date(Date.now()+2000).toISOString().replace(/\.\d{3}Z$/,'Z');await route.fulfill({response,json:body});});await expectSuggestion(panel);await panel.getByText('Gợi ý đã hết thời gian kiểm tra.',{exact:false}).waitFor({timeout:5000});assert.equal(await panel.locator('.airport-pickup-result').count(),0);await page.unroute('**/api/airport-pickup-suggestion');
  await panel.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:/Gửi yêu cầu/}).first().click();panel=page.getByRole('dialog');assert.equal(await panel.locator('.airport-pickup-result').count(),0,'close/reopen resets');
  await panel.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.goto(url.replace('direction=outbound','direction=inbound'),{waitUntil:'networkidle'});await page.getByRole('button',{name:/Gửi yêu cầu/}).first().click();panel=page.getByRole('dialog');await fill(panel,true);await expectSuggestion(panel);
  await panel.getByText('Thời gian chờ sau hạ cánh:',{exact:false}).waitFor();await panel.locator('.airport-pickup-advice').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/day48-${name}-arrival.png`});
  assert.equal(await panel.getByRole('button',{name:'Gửi yêu cầu báo giá',exact:true}).isEnabled(),true);assert.equal(bookingCalls,0,'no booking requests');assert.equal(errors.length,0,errors.join('\n'));
  evidence.push({viewport:name,width,height,checks:'arrival/departure, missing data, revision, withdrawal, input restore, late response, timeout, old backend, API error, invalid flight, chronology, expired response, close/reopen, no booking',pageErrors:errors,bookingCalls});await page.close();
 }
 await writeFile(`${output}/day48-browser-acceptance.json`,JSON.stringify({notice:'Synthetic local-only data; not production/SEO acceptance.',checks:evidence},null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();await fixture('confirmed');}
