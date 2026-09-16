import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeFinderForm = await readFile(
  new URL("../src/components/route-finder-form.tsx", import.meta.url),
  "utf8",
);
const locationSearch = await readFile(
  new URL("../src/lib/location-search.ts", import.meta.url),
  "utf8",
);
const comboLogic = await readFile(
  new URL("../src/lib/combo.ts", import.meta.url),
  "utf8",
);
const comboPage = await readFile(
  new URL("../src/components/route-vehicle-combo.tsx", import.meta.url),
  "utf8",
);

test("booking search reuses canonical Ho Chi Minh aliases", () => {
  for (const alias of ["Sài Gòn", "Sai Gon", "Saigon", "HCM", "TP HCM", "TPHCM", "Hồ Chí Minh"]) {
    assert.ok(locationSearch.includes(`\"${alias}\"`), `missing alias: ${alias}`);
  }

  assert.match(routeFinderForm, /locationMatchesQuery\(option, value\)/);
  assert.match(routeFinderForm, /canonicalLocationKey\(pickup\)/);
  assert.match(routeFinderForm, /canonicalLocationKey\(destination\)/);
});

test("date and vehicle are optional and select the correct destination page", () => {
  assert.doesNotMatch(routeFinderForm, /Vui lòng chọn ngày đi/);
  assert.doesNotMatch(routeFinderForm, /Vui lòng chọn loại xe hoặc chọn phương án cần tư vấn/);
  assert.match(routeFinderForm, /if \(departureDate\) params\.set\("ngay_di", departureDate\)/);
  assert.match(routeFinderForm, /routeComboHref\(journey\.route, selectedVehicleSlug\)/);
  assert.match(routeFinderForm, /: routeHref\(journey\.route\)/);
  assert.match(routeFinderForm, /Ngày đi[\s\S]{0,120}\(không bắt buộc\)/);
  assert.match(routeFinderForm, /Loại xe[\s\S]{0,120}\(không bắt buộc\)/);
});

test("route vehicle combo preserves the requested pricing direction", () => {
  assert.match(comboLogic, /findComboVehiclePriceForDirection/);
  assert.match(comboLogic, /route\.pricingV2\?\.\[direction\]/);
  assert.match(comboPage, /requestedDirection !== "inbound"/);
  assert.match(comboPage, /direction=\{direction\}/);
  assert.match(comboPage, /displayRoute=\{displayRoute\}/);
});

test("swap control is borderless, lower, and rotates clockwise", () => {
  assert.match(routeFinderForm, /setSwapRotation\(\(current\) => current \+ 180\)/);
  assert.ok(
    (routeFinderForm.match(/top-\[calc\(50%\+15px\)\]/g) || []).length >= 2,
    "both swap controls must move down 15px",
  );
  assert.ok(
    (routeFinderForm.match(/bg-transparent text-primary/g) || []).length >= 2,
    "both swap controls must be visually borderless",
  );
  assert.doesNotMatch(routeFinderForm, /className="[^"]*rounded-full border border-border bg-card[^"]*"/);
  assert.match(routeFinderForm, /rotate\(\$\{90 \+ swapRotation\}deg\)/);
  assert.match(routeFinderForm, /rotate\(\$\{swapRotation\}deg\)/);
});
