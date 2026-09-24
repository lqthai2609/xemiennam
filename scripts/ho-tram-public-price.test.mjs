import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/public-pricing.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { publicRouteWithoutApprovedPrices } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

const packageRow = (direction, vehicleId, packageKey, price) => ({
  direction, vehicleId, vehicleType: vehicleId === "63" ? "4 chỗ" : "7 chỗ",
  packageKey, packageLabel: packageKey, mode: "fixed", price, priceLabel: `${price / 1000}K`,
});
const oneWay = packageRow("outbound", "63", "one_way", 850_000);
const roundTrip = packageRow("outbound", "63", "round_trip_day", 1_300_000);
const reverse = packageRow("inbound", "63", "one_way", 850_000);
const otherVehicle = packageRow("outbound", "37", "one_way", 850_000);

function makeRoute(id = "9056", price = 850_000) {
  const approvedCandidate = { ...oneWay, price };
  return {
    id, price: "850K", rankMathTitle: "Giá 850K", rankMathDescription: "850K",
    pricingByVehicle: [{ vehicleType: "4 chỗ", packageKey: "one_way", price: "850K", pricingMode: "fixed", numericPrice: price }],
    pricingV2: {
      outbound: { key: "outbound", enabled: true, packages: [approvedCandidate, roundTrip, otherVehicle], featured: approvedCandidate },
      inbound: { key: "inbound", enabled: true, packages: [reverse], featured: reverse },
    },
  };
}

test("only the owner's exact outbound one-way 4-seat price is public", () => {
  const stored = makeRoute();
  const publicRoute = publicRouteWithoutApprovedPrices(stored);
  assert.equal(publicRoute.pricingV2.outbound.packages[0].price, 850_000);
  assert.equal(publicRoute.pricingV2.outbound.packages[0].mode, "fixed");
  assert.equal(publicRoute.price, "850K");
  assert.equal(publicRoute.pricingByVehicle[0].numericPrice, 850_000);
  for (const row of [publicRoute.pricingV2.outbound.packages[1], publicRoute.pricingV2.outbound.packages[2], publicRoute.pricingV2.inbound.packages[0]]) {
    assert.equal(row.mode, "contact");
    assert.equal(row.price, undefined);
  }
  assert.equal(publicRoute.rankMathTitle, undefined);
  assert.equal(stored.pricingV2.outbound.packages[1].price, 1_300_000);
});

test("different amount or route fails closed while admin data stays intact", () => {
  for (const route of [makeRoute("9056", 860_000), makeRoute("9999")]) {
    const publicRoute = publicRouteWithoutApprovedPrices(route);
    assert.equal(publicRoute.price, "Liên hệ báo giá");
    assert.equal(publicRoute.pricingV2.outbound.packages[0].mode, "contact");
    assert.equal(publicRoute.pricingV2.outbound.packages[0].price, undefined);
    assert.equal(route.pricingV2.outbound.packages[0].mode, "fixed");
  }
});
