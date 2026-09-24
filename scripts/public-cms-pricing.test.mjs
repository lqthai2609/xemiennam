import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/public-pricing.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { publicRouteWithCmsPricing } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

const packageRow = (direction, vehicleId, packageKey, mode, price) => ({
  direction, vehicleId, vehicleType: vehicleId === "63" ? "4 chỗ" : "7 chỗ",
  packageKey, packageLabel: packageKey, mode, price, priceLabel: price ? `${price / 1000}K` : undefined,
});

function makeRoute(id = "9056") {
  const oneWay = packageRow("outbound", "63", "one_way", "fixed", 850_000);
  const roundTrip = packageRow("outbound", "63", "round_trip_day", "fixed", 1_300_000);
  const otherVehicle = packageRow("outbound", "37", "one_way", "fixed", 990_000);
  const reverse = packageRow("inbound", "63", "one_way", "contact");
  return {
    id, price: "850K", rankMathTitle: "Old price", rankMathDescription: "Old price",
    pricingByVehicle: [
      { vehicleType: "4 chỗ", packageKey: "one_way", price: "850K", pricingMode: "fixed", numericPrice: 850_000 },
      { vehicleType: "7 chỗ", packageKey: "one_way", price: "990K", pricingMode: "fixed", numericPrice: 990_000 },
    ],
    pricingV2: {
      outbound: { key: "outbound", enabled: true, packages: [oneWay, roundTrip, otherVehicle], featured: oneWay },
      inbound: { key: "inbound", enabled: true, packages: [reverse], featured: reverse },
    },
  };
}

test("every valid CMS fixed tuple is visible on its own route, vehicle, direction and package", () => {
  for (const id of ["9056", "9117"]) {
    const stored = makeRoute(id);
    const publicRoute = publicRouteWithCmsPricing(stored);
    assert.deepEqual(publicRoute.pricingV2.outbound.packages.map((row) => row.price), [850_000, 1_300_000, 990_000]);
    assert.equal(publicRoute.price, "850K");
    assert.deepEqual(publicRoute.pricingByVehicle.map((row) => row.numericPrice), [850_000, 990_000]);
    assert.equal(publicRoute.pricingV2.inbound.packages[0].mode, "contact");
    assert.equal(publicRoute.pricingV2.inbound.packages[0].price, undefined);
    assert.equal(publicRoute.rankMathTitle, undefined);
    assert.equal(stored.rankMathTitle, "Old price");
  }
});

test("zero, negative, missing and non-finite fixed amounts never publish", () => {
  for (const amount of [0, -1, undefined, Number.NaN, Infinity]) {
    const route = makeRoute();
    route.pricingV2.outbound.packages[0].price = amount;
    route.pricingV2.outbound.featured.price = amount;
    const publicRoute = publicRouteWithCmsPricing(route);
    assert.equal(publicRoute.price, "Liên hệ báo giá");
    assert.equal(publicRoute.pricingV2.outbound.packages[0].mode, "contact");
    assert.equal(publicRoute.pricingByVehicle[0].numericPrice, undefined);
  }
});

test("contact, disabled and disabled direction do not expose stored numeric values", () => {
  const route = makeRoute();
  route.pricingV2.outbound.packages[0].mode = "contact";
  route.pricingV2.outbound.featured.mode = "contact";
  route.pricingV2.outbound.packages[1].mode = "disabled";
  route.pricingV2.inbound.packages[0].price = 700_000;
  route.pricingV2.inbound.enabled = false;
  const publicRoute = publicRouteWithCmsPricing(route);
  assert.equal(publicRoute.price, "Liên hệ báo giá");
  assert.equal(publicRoute.pricingV2.outbound.packages[0].price, undefined);
  assert.equal(publicRoute.pricingV2.outbound.packages[1].mode, "disabled");
  assert.equal(publicRoute.pricingV2.outbound.packages[1].price, undefined);
  assert.deepEqual(publicRoute.pricingV2.inbound.packages, []);
  assert.equal(publicRoute.pricingByVehicle[0].numericPrice, undefined);
});
