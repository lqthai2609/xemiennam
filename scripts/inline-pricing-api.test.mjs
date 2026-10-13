/** Runs the real Next session/proxy against synthetic WordPress transport only. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const children = [];
let logs = "";
function child(args, env={}) {
  const processChild = spawn(process.execPath,args,{env:{...process.env,...env},stdio:["ignore","pipe","pipe"]});
  processChild.stdout.on("data",data=>{logs+=data;}); processChild.stderr.on("data",data=>{logs+=data;});
  children.push(processChild); return processChild;
}
const origin="http://localhost:4388";
const cookie=role=>`alo_admin_session=synthetic-${role}; alo_admin_csrf=synthetic-csrf`;
try {
  child(["scripts/inline-pricing-fixture-server.mjs"]);
  child(["node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port","4388"],{WP_API_BASE_URL:"http://127.0.0.1:4399/wp/v2",GOCAR_ENABLE_MOCK_FALLBACK:"false",VERCEL_ENV:"preview"});
  for(let i=0;i<60;i++) { if(logs.includes("Ready in") && logs.includes("SYNTHETIC inline-pricing transport ready"))break; await new Promise(resolve=>setTimeout(resolve,500)); if(i===59) throw new Error(logs); }
  const page=await fetch(`${origin}/bang-gia`);
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/pricing-table/); assert.match(html,/synthetic-route/);
  assert.doesNotMatch(html,/aria-label="Sửa giá/);
  assert.match(html,/Liên hệ báo giá/);
  const endpoint=`${origin}/api/admin/routes/1001/pricing`;
  for(const [role,status] of [[null,401],["guest",401],["editor",403]]) {
    const headers=role?{Cookie:cookie(role)}:{};
    const response=await fetch(endpoint,{headers}); assert.equal(response.status,status);
    assert.match(response.headers.get("cache-control"),/no-store/);
    const mutation=await fetch(endpoint,{method:"POST",headers:{...headers,Origin:origin,"X-Gocar-Csrf":"synthetic-csrf","Content-Type":"application/json"},body:"{}"});
    assert.equal(mutation.status,status);
  }
  const session=await fetch(`${origin}/api/admin/session`,{headers:{Cookie:cookie("admin")}});
  assert.equal(session.status,200); assert.equal((await session.json()).session.canEditPricing,true);
  assert.match(session.headers.get("cache-control"),/no-store/);
  const current=await (await fetch(endpoint,{headers:{Cookie:cookie("admin")}})).json();
  const body=JSON.stringify({vehicleId:2001,pricingDirection:"outbound",packageKey:"one_way",priceMode:"fixed",priceAmount:1234000,baseVersion:current.backendVersion,reason:"SYNTHETIC API test"});
  for(const headers of [{Origin:origin},{Origin:"https://invalid.example","X-Gocar-Csrf":"synthetic-csrf"}]) {
    const denied=await fetch(endpoint,{method:"POST",headers:{Cookie:cookie("admin"),"Content-Type":"application/json",...headers},body}); assert.equal(denied.status,403);
  }
  const saved=await fetch(endpoint,{method:"POST",headers:{Cookie:cookie("admin"),Origin:origin,"X-Gocar-Csrf":"synthetic-csrf","Content-Type":"application/json"},body});
  assert.equal(saved.status,200);
  const after=await (await fetch(endpoint,{headers:{Cookie:cookie("admin")}})).json();
  assert.equal(after.pricingRows.find(row=>row.vehicleId==="2001" && row.direction==="outbound" && row.packageKey==="one_way").price,1234000);
  assert.deepEqual(after.pricingRows.filter(row=>!(row.vehicleId==="2001" && row.direction==="outbound" && row.packageKey==="one_way")),current.pricingRows.filter(row=>!(row.vehicleId==="2001" && row.direction==="outbound" && row.packageKey==="one_way")));
  const refreshed=await (await fetch(`${origin}/bang-gia`)).text(); assert.match(refreshed,/1\.234K/);
  const fixture=await (await fetch("http://127.0.0.1:4399/fixture/status")).json();assert.equal(fixture.writes.length,1);
  const demoPage=await fetch(`${origin}/quan-tri/xem-thu-gia`);assert.equal(demoPage.status,200);
  assert.match(await demoPage.text(),/GIÁ GIẢ ĐỊNH/);
  const demoGuest=await (await fetch(`${origin}/api/preview/pricing/session?viewer=guest`)).json();assert.equal(demoGuest.authenticated,false);
  const demoAdmin=await (await fetch(`${origin}/api/preview/pricing/session?viewer=admin`)).json();assert.equal(demoAdmin.session.canEditPricing,true);
  const demoEndpoint=`${origin}/api/preview/pricing/routes/1001/pricing`;
  const demoCurrent=await (await fetch(demoEndpoint)).json();
  const demoBody=JSON.stringify({vehicleId:2001,pricingDirection:"inbound",packageKey:"3d2n",priceMode:"fixed",priceAmount:3210000,baseVersion:demoCurrent.backendVersion});
  const demoSaved=await fetch(demoEndpoint,{method:"POST",headers:{Origin:origin,"X-Gocar-Csrf":"synthetic-preview-only","Content-Type":"application/json"},body:demoBody});assert.equal(demoSaved.status,200);
  const demoCookie=demoSaved.headers.get("set-cookie").split(";")[0];
  const demoAfter=await (await fetch(demoEndpoint,{headers:{Cookie:demoCookie}})).json();
  assert.equal(demoAfter.pricingRows.find(row=>row.vehicleId==="2001"&&row.direction==="inbound"&&row.packageKey==="3d2n").price,3210000);
  assert.deepEqual(demoAfter.pricingRows.filter(row=>!(row.vehicleId==="2001"&&row.direction==="inbound"&&row.packageKey==="3d2n")),demoCurrent.pricingRows.filter(row=>!(row.vehicleId==="2001"&&row.direction==="inbound"&&row.packageKey==="3d2n")));
  assert.equal((await (await fetch("http://127.0.0.1:4399/fixture/status")).json()).writes.length,1,"preview demo never writes WordPress transport");
  console.log("PASS: preview demo saves only synthetic cookie data, exact inbound/3d2n row, separate guest/admin simulation; no WordPress writes.");
  console.log("PASS: real Next API/session, anonymous/editor denied, no-store, CSRF/origin denied, exact tuple saved, fresh public table, guest markup unchanged. Synthetic transport only; not browser or WordPress/MySQL evidence.");
} catch(error) { console.error(error);console.error(logs.slice(-8000));process.exitCode=1; }
finally { for(const processChild of children)processChild.kill(); }
