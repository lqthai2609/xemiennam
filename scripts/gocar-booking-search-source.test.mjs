import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeFinderForm = await readFile(
  new URL("../src/components/route-finder-form.tsx", import.meta.url),
  "utf8",
);
const locationField = await readFile(new URL("../src/components/location-field.tsx", import.meta.url), "utf8");
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

  assert.match(locationField, /locationMatchesQuery\(option, value\)/);
  assert.match(routeFinderForm, /canonicalLocationKey\(pickup\)/);
  assert.match(routeFinderForm, /canonicalLocationKey\(destination\)/);
});

test("district and area aliases resolve to the canonical Ho Chi Minh route", () => {
  assert.match(locationSearch, /Array\.from\(\{ length: 12 \}/);
  for (const alias of [
    "tan binh", "tân bình", "phu nhuan", "phú nhuận", "thu duc", "thủ đức",
    "binh thanh", "bình thạnh", "binh chanh", "bình chánh", "binh tan", "bình tân",
  ]) {
    assert.ok(locationSearch.includes(`\"${alias}\"`) || locationSearch.includes(`\`${alias}\``), `missing alias: ${alias}`);
  }

  assert.match(locationSearch, /resolveLocationAlias/);
  assert.match(locationField, /Đã quy đổi về/);
  assert.match(routeFinderForm, /Hai điểm này đều thuộc nhóm giá \$\{HO_CHI_MINH_PUBLIC_LABEL\}/);
});

test("date and vehicle are optional and select the correct destination page", () => {
  assert.doesNotMatch(routeFinderForm, /Vui lòng chọn ngày đi/);
  assert.doesNotMatch(routeFinderForm, /Vui lòng chọn loại xe hoặc chọn phương án cần tư vấn/);
  assert.match(routeFinderForm, /if \(departureDate\) params\.set\("ngay_di", departureDate\)/);
  assert.match(routeFinderForm, /routeComboHref\(journey\.route, selectedVehicleSlug\)/);
  assert.match(routeFinderForm, /: routeHref\(journey\.route\)/);
  assert.doesNotMatch(routeFinderForm, /\(không bắt buộc\)/);

});

test("route vehicle combo preserves the requested pricing direction", () => {
  assert.match(comboLogic, /findComboVehiclePriceForDirection/);
  assert.match(comboLogic, /route\.pricingV2\?\.\[direction\]/);
  assert.match(comboPage, /useState<RoutePricingDirectionKey>\(initial.direction\)/);
  assert.doesNotMatch(comboPage, /window\.location\.search/);
  assert.match(comboPage, /const activeDirection: RoutePricingDirectionKey = inbound \? "inbound" : "outbound"/);
  assert.match(comboPage, /route\.pricingV2\?\.\[activeDirection\]/);
  assert.match(comboPage, /findComboVehiclePriceForDirection\(route, category\.slug, activeDirection\)/);
  assert.match(comboPage, /const from = getPublicLocationLabel\(inbound \? route\.to : route\.from\)/);
  assert.match(comboPage, /const to = getPublicLocationLabel\(inbound \? route\.from : route\.to\)/);
  assert.match(comboPage, /const displayRoute = `\$\{from\} – \$\{to\}`/);
  assert.match(comboPage, /const bookingProps = \{[^\n]*displayRoute,[^\n]*direction: activeDirection,/);
  assert.match(comboPage, /<RouteBookingActions \{\.\.\.bookingProps\}/);
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
