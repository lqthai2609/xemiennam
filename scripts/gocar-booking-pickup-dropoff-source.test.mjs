import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bookingApi = await readFile(new URL("../src/app/api/booking/route.ts", import.meta.url), "utf8");
const bookingContract = await readFile(
  new URL("../wordpress/gocar-core/includes/class-gocar-booking-request.php", import.meta.url),
  "utf8",
);
const contactBookingForm = await readFile(
  new URL("../src/components/contact-booking-form.tsx", import.meta.url),
  "utf8",
);
const quickBookingActions = await readFile(
  new URL("../src/components/route-booking-actions.tsx", import.meta.url),
  "utf8",
);
const routeFinderForm = await readFile(
  new URL("../src/components/route-finder-form.tsx", import.meta.url),
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

test("Day 31 frontend entry points keep the 240/240/300 pickup contract", () => {
  for (const frontend of [contactBookingForm, quickBookingActions]) {
    assert.match(frontend, /pickupAddress:[\s\S]{0,180}max\(240,/i);
    assert.match(frontend, /dropoffAddress:[\s\S]{0,180}max\(240,/i);
    assert.match(frontend, /pickupNote:[\s\S]{0,160}max\(300,/i);
    assert.match(frontend, /maxLength=\{240\}/);
    assert.match(frontend, /maxLength=\{300\}/);
  }

  assert.match(routeFinderForm, /normalizedPickupAddress\.length > 240/);
  assert.match(routeFinderForm, /normalizedDropoffAddress\.length > 240/);
  assert.match(routeFinderForm, /normalizedPickupNote\.length > 300/);
  assert.ok((routeFinderForm.match(/maxLength=\{240\}/g) || []).length >= 2);
  assert.match(routeFinderForm, /maxLength=\{300\}/);
});

test("Day 31 frontend entry points preserve structured pickup payload fields", () => {
  for (const field of ["pickupAddress", "dropoffAddress", "pickupNote"]) {
    assert.match(contactBookingForm, new RegExp(field));
    assert.match(quickBookingActions, new RegExp(field + ":\\s*data\\." + field));
    assert.match(routeFinderForm, new RegExp(field + ":\\s*normalized"));
  }
});

test("airport quote form fixes the airport endpoint and validates only the editable address", () => {
  assert.match(quickBookingActions, /airportContext !== "pickup_from_airport" && !data\.pickupAddress/);
  assert.match(quickBookingActions, /airportContext !== "dropoff_at_airport" && !data\.dropoffAddress/);
  assert.match(quickBookingActions, /Đã xác định theo tuyến đã chọn/);
  assert.match(quickBookingActions, /airportContext === "pickup_from_airport"/);
  assert.match(quickBookingActions, /airportContext === "dropoff_at_airport"/);
});
