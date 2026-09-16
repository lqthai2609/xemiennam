import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bookingApi = await readFile(new URL("../src/app/api/booking/route.ts", import.meta.url), "utf8");
const bookingContract = await readFile(
  new URL("../wordpress/gocar-core/includes/class-gocar-booking-request.php", import.meta.url),
  "utf8",
);

test("Day 31 booking API accepts structured pickup/dropoff fields", () => {
  for (const field of [
    "pickupLocationId",
    "dropoffLocationId",
    "pickupAddress",
    "dropoffAddress",
    "pickupNote",
  ]) {
    assert.match(bookingApi, new RegExp(`${field}:`));
  }
});

test("Day 31 booking API persists structured pickup/dropoff meta", () => {
  for (const metaKey of [
    "pickup_location_id",
    "dropoff_location_id",
    "pickup_address",
    "dropoff_address",
    "pickup_note",
  ]) {
    assert.match(bookingApi, new RegExp(`${metaKey}:`));
  }
});

test("Day 31 derives Location V2 endpoints from canonical Route + direction", () => {
  assert.match(bookingApi, /mapWPRouteToRoutePairV2/);
  assert.match(bookingApi, /direction === "inbound"/);
  assert.match(bookingApi, /resolveBookingLocationId/);
  assert.match(bookingApi, /validLocationIds/);
});

test("Gocar Core exposes and sanitizes the Day 31 booking meta contract", () => {
  for (const metaKey of [
    "pickup_location_id",
    "dropoff_location_id",
    "pickup_address",
    "dropoff_address",
    "pickup_note",
  ]) {
    assert.match(bookingContract, new RegExp(`'${metaKey}'`));
  }
  assert.match(bookingContract, /'show_in_rest'\s*=>\s*true/);
  assert.match(bookingContract, /sanitize_text_field/);
  assert.match(bookingContract, /sanitize_textarea_field/);
  assert.match(bookingContract, /absint/);
});

test("Day 31 does not introduce Zone or surcharge business logic", () => {
  assert.doesNotMatch(bookingApi, /center|suburb|outskirt|surcharge/i);
  assert.doesNotMatch(bookingContract, /center|suburb|outskirt|surcharge/i);
});
