import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const results=[];
try{for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.route('**/api/booking',r=>r.abort());await page.route('https://www.google.com/maps/**',r=>r.abort());
 for(const path of ['/tuyen-duong/ba-ria-vung-tau/synthetic-route','/tuyen-duong/ba-ria-vung-tau/synthetic-route/7-cho']){
  const res=await page.goto(`http://127.0.0.1:4188${path}`,{waitUntil:'networkidle'});assert.equal(res.status(),200);
  const selector=page.locator('.vehicle-selector').first();await selector.getByLabel('Số hành khách (không gồm tài xế)',{exact:true}).fill('7');await selector.getByRole('button',{name:'Kiểm tra xe',exact:true}).click();await selector.getByText('Xe quá nhỏ: số khách vượt sức chứa đã xác nhận',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${path}: overflow`);
  const trigger=page.getByRole('button',{name:/Gửi yêu cầu|Yêu cầu báo giá/}).first();await trigger.click();const modal=page.getByRole('dialog');await modal.waitFor();const inside=modal.locator('.vehicle-selector');await inside.getByLabel('Số hành khách (không gồm tài xế)',{exact:true}).fill('7');await inside.getByRole('button',{name:'Kiểm tra xe',exact:true}).click();await inside.getByText('Xe quá nhỏ: số khách vượt sức chứa đã xác nhận',{exact:true}).waitFor();
  assert.equal(await inside.locator('.is-exceeds_confirmed_capacity button').count(),0);assert.equal(await modal.evaluate(el=>el.scrollWidth>el.clientWidth),false,'modal overflow');
  await inside.locator('.is-exceeds_confirmed_capacity').scrollIntoViewIfNeeded();await page.screenshot({path:`../evidence/${name}-${path.endsWith('7-cho')?'combo':'route'}-dialog.png`});await modal.getByRole('button',{name:'Đóng',exact:true}).click();await modal.waitFor({state:'hidden'});results.push({viewport:name,path,checks:'server warning in page + dialog; no horizontal overflow; dialog closes',pageErrors:errors});
 }
 assert.equal(errors.length,0);await page.close();
}await writeFile('../evidence/context-acceptance.json',JSON.stringify({notice:'SYNTHETIC localhost only. No booking writes or SEO acceptance.',checks:results},null,2));console.log(JSON.stringify(results,null,2));}finally{await browser.close();}
