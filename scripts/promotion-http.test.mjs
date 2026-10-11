import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.HTML_AUDIT_BASE_URL;
test("Day 44 promotion HTML is request-rendered, no-store and empty with commerce disabled", {skip: !base}, async()=>{
 const response=await fetch(`${base}/khuyen-mai`,{signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200);assert.match(response.headers.get("cache-control")??"",/no-store/);
 const html=await response.text();assert.match(html,/Hiện chưa có/);assert.match(html,/noindex/);
 assert.doesNotMatch(html,/<del|class="promo-card|"@type":"Offer"|Liên hệ nhận ưu đãi/);
});
