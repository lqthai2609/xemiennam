import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/public-pricing.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { publicRouteWithoutApprovedPrices } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("unapproved fixed prices are contact only on every public route pricing surface", () => {
  const fixed = { direction: "outbound", vehicleId: "40", vehicleType: "4 chỗ", packageKey: "one_way", packageLabel: "Một chiều", mode: "fixed", price: 900000, priceLabel: "900K" };
  const contact = { ...fixed, direction: "inbound", mode: "contact", price: undefined, priceLabel: undefined };
  const disabled = { ...fixed, packageKey: "2d1n", mode: "disabled" };
  const route = {
    id: "9117", price: "900K", rankMathTitle: "Giá 900K", rankMathDescription: "Từ 900K",
    pricingByVehicle: [{ vehicleType: "4 chỗ", price: "900K", pricingMode: "fixed", numericPrice: 900000 }],
    pricingV2: {
      outbound: { key: "outbound", enabled: true, featuredPackage: "one_way", featured: fixed, packages: [fixed, disabled] },
      inbound: { key: "inbound", enabled: true, featuredPackage: "one_way", featured: contact, packages: [contact] },
    },
  };
  const publicRoute = publicRouteWithoutApprovedPrices(route);
  assert.equal(publicRoute.price, "Liên hệ báo giá");
  assert.equal(publicRoute.pricingV2.outbound.featured.mode, "contact");
  assert.equal(publicRoute.pricingV2.outbound.featured.price, undefined);
  assert.equal(publicRoute.pricingV2.outbound.packages[0].packageKey, "one_way");
  assert.equal(publicRoute.pricingV2.outbound.packages[1].mode, "disabled");
  assert.equal(publicRoute.pricingV2.inbound.packages[0].mode, "contact");
  assert.equal(publicRoute.pricingByVehicle[0].numericPrice, undefined);
  assert.equal(publicRoute.rankMathTitle, undefined);
  assert.equal(publicRoute.rankMathDescription, undefined);
  assert.equal(route.pricingV2.outbound.featured.mode, "fixed"); // Admin/history is untouched.
  assert.equal(route.pricingV2.outbound.featured.price, 900000);
});

test("mock routes and real routes share the public projection; authenticated admin retains stored values", async () => {
  const routes = await readFile(new URL("../src/lib/api/routes.ts", import.meta.url), "utf8");
  const admin = await readFile(new URL("../src/app/quan-tri/page.tsx", import.meta.url), "utf8");
  assert.match(routes, /mockRoutes\.map\(publicRouteWithoutApprovedPrices\)/);
  assert.match(routes, /routes\.map\(publicRouteWithoutApprovedPrices\)/);
  assert.match(routes, /publicRouteWithoutApprovedPrices\(mapWPRouteToRoute/);
  assert.match(admin, /if \(!auth\) return <AdminLogin \/>/);
  assert.match(admin, /fetchRoutes\(\{ adminPricing: true \}\)/);
});
