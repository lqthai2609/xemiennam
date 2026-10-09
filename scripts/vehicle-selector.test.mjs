import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { typescriptLoader } from "./lib/load-typescript.mjs";

const { approval, ...base } = JSON.parse(readFileSync(new URL("./fixtures/vehicle-facts.json", import.meta.url))).base;
const confirmed = { ...base, vehicle_id: 2001, status: "confirmed", reviewed_at: "2020-01-01T00:00:00Z" };
const vehicle = (facts = confirmed, id = "2001") => ({ id, type: "7 chỗ", operationalFacts: { status: "confirmed", facts }, description: "UNVERIFIED", name: "UNVERIFIED MODEL", seats: "99 chỗ" });
function harness(vehicles = [vehicle()]) {
  const calls = [];
  const load = typescriptLoader({ "server-only": {}, "./vehicles": { fetchVehicles: async (options) => { calls.push(options); if (vehicles instanceof Error) throw vehicles; return vehicles; } } });
  return { calls, POST: load("src/app/api/vehicle-suggestions/route.ts").POST, display: load("src/lib/vehicle-facts-display.ts").vehicleFactsDisplay, Summary: load("src/components/vehicle-facts-summary.tsx").VehicleFactsSummary };
}
const payload = { passengers: 6, luggage: { cabin_bags: 2, checked_bags: 0, cabin_max_cm: [55, 40, 20], checked_max_cm: null, total_luggage_kg: 16 } };
const request = (input = payload) => new Request("http://localhost/api/vehicle-suggestions", { method: "POST", body: JSON.stringify(input) });

test("browser API uses fresh server facts, safe projection and no-store", async () => {
  const h = harness(); const response = await h.POST(request()); const body = await response.json();
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(h.calls, [{ freshFacts: true }]);
  assert.equal(body.items[0].fit.status, "fits_confirmed_profile");
  assert.match(body.items[0].facts.passengers, /6 hành khách/);
  assert.match(body.items[0].facts.models, /Synthetic Model A/);
  assert.equal(body.items[0].facts.serviceLevel, "Tiêu chuẩn");
  assert.doesNotMatch(JSON.stringify(body), /UNVERIFIED|source_ref|actor_id|approval|journal|99 chỗ/);
});
test("unknown bags remain consultation; confirmed excess remains visible as warning", async () => {
  for (const [passengers, status, reason] of [[6, "needs_consultation", "missing_luggage"], [7, "exceeds_confirmed_capacity", "passenger_limit"]]) {
    const h = harness(); const body = await (await h.POST(request({ passengers, luggage: null }))).json();
    assert.equal(body.items[0].fit.status, status); assert.equal(body.items[0].fit.reason, reason);
  }
});
test("withdrawal between requests cannot reuse old approval", async () => {
  const records = [vehicle()]; const h = harness(records);
  assert.equal((await (await h.POST(request())).json()).items[0].fit.status, "fits_confirmed_profile");
  records[0].operationalFacts = { status: "needs_consultation", facts: null };
  const next = (await (await h.POST(request())).json()).items[0];
  assert.equal(next.fit.reason, "missing_facts"); assert.equal(next.facts.models, "Cần tư vấn");
  assert.equal(h.calls.length, 2);
});
test("old backend and copied vehicle ID cannot display approved facts", async () => {
  for (const record of [{ ...vehicle(), operationalFacts: undefined }, vehicle(confirmed, "2002")]) {
    const h = harness([record]); const item = (await (await h.POST(request())).json()).items[0];
    assert.equal(item.fit.status, "needs_consultation"); assert.deepEqual(item.facts, { passengers: "Cần tư vấn", models: "Cần tư vấn", serviceLevel: "Cần tư vấn", loadProfiles: [] });
  }
});
test("API never combines profiles or upgrades a requested service level", async () => {
  for (const input of [{ ...payload, luggage: { ...payload.luggage, checked_bags: 3, checked_max_cm: [75, 50, 30], total_luggage_kg: 60 } }, { ...payload, service_level: "premium" }]) {
    const body = await (await harness().POST(request(input))).json(); assert.equal(body.items[0].fit.status, "needs_consultation");
  }
});
test("invalid inputs are rejected before any CMS read", async () => {
  for (const input of [null, [], {}, { ...payload, passengers: "6" }, { ...payload, passengers: 0 }, { ...payload, passengers: 101 }, { ...payload, secret: "no" }, { ...payload, luggage: { ...payload.luggage, cabin_max_cm: null } }, { ...payload, luggage: { ...payload.luggage, total_luggage_kg: null } }, { ...payload, luggage: { ...payload.luggage, cabin_bags: -1 } }]) {
    const h = harness(); const response = await h.POST(request(input)); assert.equal(response.status, 400); assert.equal(h.calls.length, 0);
  }
});
test("invalid JSON and oversized requests stay private", async () => {
  for (const body of ["{", JSON.stringify({ passengers: 6, extra: "X".repeat(8192) })]) {
    const h = harness(); assert.equal((await h.POST(new Request("http://localhost", { method: "POST", body }))).status, 400); assert.equal(h.calls.length, 0);
  }
});
test("CMS error and empty fleet preserve a consultation path", async () => {
  const error = await harness(new Error("PRIVATE error")).POST(request());
  assert.equal(error.status, 503); assert.doesNotMatch(await error.text(), /PRIVATE/);
  assert.deepEqual((await (await harness([]).POST(request())).json()).items, []);
});
test("partial confirmed data keeps each missing field unknown", () => {
  const h = harness(); const facts = h.display(vehicle({ ...confirmed, passenger_capacity: null, load_profiles: [], model_examples: null, service_level: null }));
  assert.deepEqual(facts, { passengers: "Cần tư vấn", models: "Cần tư vấn", serviceLevel: "Cần tư vấn", loadProfiles: [] });
});
test("rendered loading configurations keep passenger and bag limits together", () => {
  const h = harness(); const facts = h.display(vehicle());
  assert.match(facts.loadProfiles[0], /6 hành khách.*2 kiện.*55 × 40 × 20 cm.*0 kiện.*16 kg/);
  assert.match(facts.loadProfiles[1], /3 hành khách.*3 kiện.*75 × 50 × 30 cm.*60 kg/);
  const html = renderToStaticMarkup(createElement(h.Summary, { facts }));
  assert.match(html, /Mẫu xe.*tham khảo/); assert.match(html, /Xe giao thực tế/); assert.match(html, /không mặc định theo tiêu chuẩn hãng bay/);
});
test("HTML escapes model examples; missing configurations explicitly need advice", () => {
  const h = harness(); const facts = h.display(vehicle({ ...confirmed, load_profiles: [], model_examples: ["Synthetic & Model"] }));
  const html = renderToStaticMarkup(createElement(h.Summary, { facts }));
  assert.match(html, /Synthetic &amp; Model/); assert.match(html, /Cần tư vấn/);
});
test("malformed selector responses fail closed instead of crashing React",()=>{
 const read=typescriptLoader()("src/lib/vehicle-selector-response.ts").readVehicleSelectorResponse;
 const valid={model_version:1,items:[{id:'2001',type:'7 chỗ',facts:harness().display(vehicle()),fit:{status:'needs_consultation',reason:'missing_luggage'}}]};
 assert.deepEqual(read(valid),valid);
 for(const value of [null,{},[],{...valid,model_version:2},{...valid,items:[null]},{...valid,items:[{...valid.items[0],type:7}]},{...valid,items:[{...valid.items[0],facts:{...valid.items[0].facts,passengers:{}}}]},{...valid,items:[{...valid.items[0],fit:{status:'available',reason:'missing_luggage'}}]}])assert.equal(read(value),null);
});
test("selector does not import or execute loading logic in the browser",()=>{
 const source=readFileSync(new URL('../src/components/vehicle-selector.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/assessVehicleFit|evaluateVehicleSuggestions|vehiclePassengerLabel/);
 assert.match(source,/fetch\("\/api\/vehicle-suggestions"/);
 for(const file of ['contact-booking-form.tsx','route-booking-actions.tsx']){
  const form=readFileSync(new URL(`../src/components/${file}`,import.meta.url),'utf8');
  assert.match(form,/<VehicleSelector/);assert.doesNotMatch(form,/exceeds_confirmed_capacity|fits_confirmed_profile/);
 }
});
