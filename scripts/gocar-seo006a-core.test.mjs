import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadHelper(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

const { availablePackages, packageMatches, findVehiclePackage } = await loadHelper("../src/lib/route-package-capability.ts");
const { readCreatedLead } = await loadHelper("../src/lib/lead-response.ts");
const row = (packageKey, packageLabel, mode = "contact") => ({ vehicleType: "Xe 4 chỗ", packageKey, packageLabel, mode });

test("package tabs only reflect enabled, non-disabled tuples for the active direction", () => {
  const outbound = [row("one_way", "Một chiều"), row("round_trip", "Khứ hồi", "disabled"), row("3d2n", "3 ngày 2 đêm")];
  assert.deepEqual(availablePackages(outbound), ["oneWay", "threeDays"]);
  assert.deepEqual(availablePackages([row("2d1n", "2 ngày 1 đêm")]), ["twoDays"]);
  assert.deepEqual(availablePackages([row("round_trip", "Khứ hồi", "disabled")]), []);
  assert.equal(packageMatches(outbound[2], "twoDays"), false);
  assert.equal(packageMatches(outbound[2], "threeDays"), true);
  assert.equal(packageMatches(row("default", "Gói mặc định"), "oneWay"), true);
  assert.equal(findVehiclePackage([{ ...row("one_way", "Một chiều"), vehicleType: "4 chỗ" }], "Xe 4 chỗ", "oneWay")?.vehicleType, "4 chỗ");
});

test("lead display requires the server lead_id even after HTTP 200", async () => {
  const result = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  assert.deepEqual(await readCreatedLead(result({ ok: true, leadId: 9055 })), { leadId: 9055, replayed: false });
  assert.deepEqual(await readCreatedLead(result({ ok: true, leadId: 9055, replayed: true })), { leadId: 9055, replayed: true });
  await assert.rejects(readCreatedLead(result({ ok: true, leadId: "9055" })), /mã yêu cầu hợp lệ/);
  await assert.rejects(readCreatedLead(result({ ok: true, leadId: 0 })), /mã yêu cầu hợp lệ/);
  await assert.rejects(readCreatedLead(result({ ok: true })), /mã yêu cầu hợp lệ/);
  await assert.rejects(readCreatedLead(result({ ok: false, error: "invalid" }, 422)), /invalid/);
});
