import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const engine = readFileSync(new URL("../src/lib/api/price-rules.ts", import.meta.url), "utf8");
const booking = readFileSync(new URL("../src/app/api/booking/route.ts", import.meta.url), "utf8");
const raw = readFileSync(new URL("../src/lib/api/raw.ts", import.meta.url), "utf8");
const wordpress = readFileSync(new URL("../wordpress/gocar-core/includes/class-gocar-price-rules.php", import.meta.url), "utf8");

test("Day 34 keeps Pricing V2 as base and adds four explicit modifier types", () => {
  assert.match(engine, /mapWPRouteToPricingPackagesV2/);
  for (const type of ["extra_stop", "waiting_minute", "overtime_hour", "extra_km"]) {
    assert.match(engine, new RegExp(type));
    assert.match(raw, new RegExp(type));
    assert.match(wordpress, new RegExp(type));
  }
  assert.doesNotMatch(engine, /pricingByVehicle/);
});

test("Day 34 never creates a numeric total unless all applicable rules resolve", () => {
  assert.match(engine, /reason: "policy_missing"/);
  assert.match(engine, /reason: "rule_missing"/);
  assert.match(engine, /reason: "ambiguous_rule"/);
  assert.match(engine, /surcharge\.mode === "contact"/);
  assert.match(engine, /modifiers\.some\(\(item\) => item\.mode === "contact"\)/);
  assert.match(engine, /base\.price \+ surchargeAmount \+ modifierAmount/);
});

test("Day 34 booking derives stop quantities server-side and persists an audit snapshot", () => {
  assert.match(booking, /extra_stop: data\.intermediateStops\.length/);
  assert.match(booking, /waiting_minute: data\.intermediateStops\.reduce/);
  assert.match(booking, /pricing_resolution_mode/);
  assert.match(booking, /price_modifier_resolution_v1/);
  assert.match(booking, /estimated_total/);
  assert.doesNotMatch(booking, /data\.estimatedTotal|data\.basePrice|data\.surchargeAmount/);
});

test("WordPress keeps modifier policy inactive by default and rejects invalid fixed rates", () => {
  assert.match(wordpress, /price_modifier_policy_version/);
  assert.match(wordpress, /'default' => 0/);
  assert.match(wordpress, /'fixed' === \$mode && \$amount <= 0/);
  assert.match(wordpress, /\$mode = 'contact'/);
});
