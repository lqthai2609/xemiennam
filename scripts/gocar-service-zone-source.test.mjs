import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const resolver = await readFile(new URL("../src/lib/api/service-zones.ts", import.meta.url), "utf8");
const booking = await readFile(new URL("../src/app/api/booking/route.ts", import.meta.url), "utf8");
const locations = await readFile(new URL("../src/lib/api/locations.ts", import.meta.url), "utf8");
const contract = await readFile(new URL("../wordpress/gocar-core/includes/class-gocar-service-area.php", import.meta.url), "utf8");

test("Day 32 taxonomy is closed and source-controlled", () => {
  for (const tier of ["center", "suburb", "outskirt"]) assert.match(contract, new RegExp(`'${tier}'`));
  for (const field of ["service_zone_id", "service_zone_tier", "service_area_status"]) {
    assert.match(contract, new RegExp(`'${field}'`));
    assert.match(locations, new RegExp(field));
  }
});

test("Day 32 never classifies from private address text", () => {
  assert.doesNotMatch(resolver, /pickupAddress|dropoffAddress|pickup_address|dropoff_address/);
  assert.match(resolver, /Exact private address text is deliberately/);
});

test("Day 32 requires verified zones and an activated policy", () => {
  assert.match(resolver, /policy_missing/);
  assert.match(resolver, /zone_unverified/);
  assert.match(resolver, /serviceAreaStatus !== "covered"/);
});

test("Day 32 fixed surcharge must be positive and separate from base price", () => {
  assert.match(resolver, /Number\.isFinite\(number\) && number > 0/);
  assert.doesNotMatch(resolver, /base_price|pricing_by_vehicle/);
  assert.match(booking, /surcharge_mode/);
  assert.match(booking, /surcharge_amount/);
});

test("Day 32 route policy and rules are REST-managed and sanitized", () => {
  for (const key of ["surcharge_policy_version", "zone_surcharge_rules_v2", "sanitize_surcharge_rules"]) {
    assert.match(contract, new RegExp(key));
  }
  assert.match(contract, /'show_in_rest'/);
  assert.match(contract, /amount <= 0/);
});

test("Day 32 persists a booking-instance audit result", () => {
  for (const key of ["pickup_service_zone_id", "dropoff_service_zone_id", "surcharge_mode", "surcharge_rule_keys"]) {
    assert.match(booking, new RegExp(`${key}:`));
    assert.match(contract, new RegExp(`'${key}'`));
  }
});
