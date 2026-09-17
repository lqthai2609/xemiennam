import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bookingApi = await readFile(new URL("../src/app/api/booking/route.ts", import.meta.url), "utf8");
const bookingContract = await readFile(
  new URL("../wordpress/gocar-core/includes/class-gocar-booking-request.php", import.meta.url),
  "utf8",
);
const sharedContract = await readFile(new URL("../src/lib/booking-stops.ts", import.meta.url), "utf8");
const sharedFields = await readFile(new URL("../src/components/multi-stop-fields.tsx", import.meta.url), "utf8");
const contactForm = await readFile(new URL("../src/components/contact-booking-form.tsx", import.meta.url), "utf8");
const quickBooking = await readFile(new URL("../src/components/route-booking-actions.tsx", import.meta.url), "utf8");
const journeyQuote = await readFile(new URL("../src/components/route-finder-form.tsx", import.meta.url), "utf8");

test("Day 33 caps intermediate stops and waiting time on both server contracts", () => {
  assert.match(sharedContract, /MAX_INTERMEDIATE_STOPS = 3/);
  assert.match(sharedContract, /MAX_WAITING_MINUTES = 1_440/);
  assert.match(bookingContract, /MAX_INTERMEDIATE_STOPS = 3/);
  assert.match(bookingContract, /MAX_WAITING_MINUTES = 1440/);
});

test("Day 33 API persists ordered booking-instance stops", () => {
  assert.match(bookingApi, /intermediateStops: intermediateStopsInputSchema/);
  assert.match(bookingApi, /intermediate_stops_v1:/);
  assert.match(bookingApi, /order: index \+ 1/);
  assert.match(bookingApi, /waiting_minutes: stop\.waitingMinutes/);
  assert.match(bookingContract, /sanitize_intermediate_stops/);
  assert.match(bookingContract, /count\( \$sanitized \) \+ 1/);
});

test("Day 33 exposes one shared Multi-stop control across all booking entry points", () => {
  assert.match(sharedFields, /Thêm điểm dừng/);
  assert.match(sharedFields, /moveStop/);
  for (const frontend of [contactForm, quickBooking, journeyQuote]) {
    assert.match(frontend, /MultiStopFields/);
    assert.match(frontend, /intermediateStops/);
  }
});

test("Day 33 does not couple Multi-stop to Pricing V2 or surcharge resolution", () => {
  assert.doesNotMatch(sharedContract, /price|surcharge|zone/i);
  assert.doesNotMatch(sharedFields, /price|surcharge|zone/i);
  const sanitizer = bookingContract.slice(bookingContract.indexOf("sanitize_intermediate_stops"));
  assert.doesNotMatch(sanitizer, /surcharge|service_zone|pricing_v2/i);
});
