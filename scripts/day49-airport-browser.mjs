import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output='../evidence';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const evidence=[];
try{
 for(const [viewport,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];let bookingCalls=0;let writes=0;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;if(r.request().url().endsWith('/api/booking'))bookingCalls++;return r.abort();});
  await page.route('https://www.google.com/maps/**',r=>r.abort());
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedDraft=text;}}});});
  for(const [direction,context] of [['inbound','đón tại'],['outbound','tiễn đến']]){
   for(const suffix of ['', '/7-cho']){
    await page.goto(`http://127.0.0.1:4188/tuyen-duong/synthetic-province/synthetic-airport-route${suffix}?direction=${direction}&package=one_way`,{waitUntil:'networkidle',timeout:60000});
    const trigger=page.getByRole('button',{name:`Tư vấn ${context} sân bay`,exact:true}).first();await trigger.click();const panel=page.getByRole('dialog');await panel.waitFor();
    assert.match(await panel.getByLabel('Nội dung tư vấn').inputValue(),/Chưa rõ, cần tư vấn/);
    assert.equal(await panel.getByRole('checkbox').count(),direction==='inbound'?1:0);
    await panel.getByLabel('Số khách',{exact:true}).fill('0');assert.equal(await panel.getByRole('button',{name:'Sao chép nội dung tư vấn'}).isDisabled(),true);
    await panel.getByLabel('Số khách',{exact:true}).fill('4');await panel.getByLabel('Số kiện hành lý',{exact:true}).fill('0');
    if(direction==='inbound')await panel.getByRole('checkbox').check();
    await panel.getByRole('button',{name:'Sao chép nội dung tư vấn'}).click();await panel.getByText('Đã sao chép.',{exact:false}).waitFor();
    assert.match(await page.evaluate(()=>window.__copiedDraft),/Hành lý: 0 kiện/);
    const link=panel.getByRole('link',{name:'Mở Zalo tư vấn'});assert.match(await link.getAttribute('href'),/^https:\/\/zalo.me\/[^?]+$/);
    await panel.getByLabel('Số khách',{exact:true}).fill('5');assert.equal(await panel.getByText('Đã sao chép.',{exact:false}).count(),0);
    await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}});});
    await panel.getByRole('button',{name:'Sao chép nội dung tư vấn'}).click();await panel.getByText('Chưa sao chép được.',{exact:false}).waitFor();
    assert.equal(await panel.getByRole('link',{name:'Gọi tư vấn'}).count(),1);
    assert.equal(await panel.evaluate(el=>el.scrollWidth>el.clientWidth),false,'modal overflow');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow');
    // Keyboard focus stays in the modal, then returns to its trigger.
    await panel.getByRole('button',{name:'Đóng tư vấn sân bay'}).focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await panel.getByRole('link',{name:'Gọi tư vấn'}).evaluate(el=>el===document.activeElement),true);
    await panel.getByLabel('Số khách',{exact:true}).scrollIntoViewIfNeeded();
    if(!suffix)await page.screenshot({path:`${output}/day49-${viewport}-${direction}.png`});
    await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    await trigger.click();assert.equal(await page.getByRole('dialog').getByLabel('Số khách',{exact:true}).inputValue(),'');await page.keyboard.press('Escape');
    await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedDraft=text;}}});});
   }
  }
  await page.goto('http://127.0.0.1:4188/san-bay/synthetic-airport',{waitUntil:'networkidle'});
  for(const name of ['Tư vấn đón tại sân bay','Tư vấn tiễn đến sân bay']){
   await page.getByRole('button',{name,exact:true}).click();const panel=page.getByRole('dialog');await panel.waitFor();
   assert.equal(await panel.getByLabel('Hành trình',{exact:true}).locator('option').count(),1);assert.equal(await panel.getByRole('heading',{name,exact:true}).count(),1);await page.keyboard.press('Escape');
  }
  await page.goto('http://127.0.0.1:4188/san-bay/long-thanh',{waitUntil:'networkidle'});
  assert.equal(await page.getByRole('button',{name:/Tư vấn (đón|tiễn)/}).count(),0);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, follow');
  assert.equal(bookingCalls,0);assert.equal(writes,0);assert.deepEqual(errors,[]);
  evidence.push({viewport,width,height,checks:'both movements, route/combo/hub, unknown/zero bags, validation, copy success/failure, edit/reset, keyboard, overflow, Long Thanh noindex',bookingCalls,writes,pageErrors:errors});await page.close();
 }
 await writeFile(`${output}/day49-browser-acceptance.json`,JSON.stringify({notice:'Synthetic localhost only; no business facts or production/SEO acceptance.',checks:evidence},null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();}
