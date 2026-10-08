import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const capability = dataUrl(transpile(await readFile(new URL("../src/lib/route-package-capability.ts", import.meta.url), "utf8")));
const source = await readFile(new URL("../src/lib/route-journey-selection.ts", import.meta.url), "utf8");
const { resolveRouteJourneySelection, routeJourneyHref } = await import(dataUrl(transpile(source).replace('"@/lib/route-package-capability"', JSON.stringify(capability))));

const keys = ["one_way", "round_trip_day", "2d1n", "3d2n"];
const route = {
  pricingV2: Object.fromEntries(["outbound", "inbound"].map((direction) => [direction, {
    enabled: true,
    packages: ["4 chỗ", "7 chỗ", "16 chỗ"].flatMap((vehicleType) => keys.map((packageKey) => ({
      direction, vehicleType, packageKey, packageLabel: packageKey,
      mode: direction === "inbound" || packageKey === "3d2n" ? "contact" : "fixed",
      price: direction === "outbound" && packageKey !== "3d2n" ? 790000 : undefined,
    }))),
  }])),
};

test("route-to-vehicle navigation preserves both directions and every package for 4/7/16 seats", () => {
  for (const direction of ["outbound", "inbound"]) for (const vehicleType of ["4 chỗ", "7 chỗ", "16 chỗ"]) {
    keys.forEach((packageKey, index) => {
      const href = routeJourneyHref("/tuyen-duong/province/route/vehicle", direction, packageKey);
      const query = Object.fromEntries(new URL(href, "https://alodatxe.com").searchParams);
      assert.deepEqual(resolveRouteJourneySelection(route, query, vehicleType), {
        direction, journey: ["oneWay", "roundTrip", "twoDays", "threeDays"][index],
      });
      const row = route.pricingV2[direction].packages.find((x) => x.vehicleType === vehicleType && x.packageKey === packageKey);
      if (direction === "inbound") assert.equal(row.mode, "contact");
    });
  }
});

test("invalid/repeated query and disabled package never select a hidden tuple", () => {
  assert.deepEqual(resolveRouteJourneySelection(route, {direction:["inbound","outbound"], package:["3d2n"]}), {direction:"outbound",journey:"oneWay"});
  const disabled = structuredClone(route);
  disabled.pricingV2.inbound.enabled = false;
  assert.equal(resolveRouteJourneySelection(disabled, {direction:"inbound"}).direction,"outbound");
  disabled.pricingV2.outbound.packages.forEach((r)=>{if(r.packageKey==="3d2n")r.mode="disabled";});
  assert.equal(resolveRouteJourneySelection(disabled,{package:"3d2n"}).journey,"oneWay");
  assert.equal(resolveRouteJourneySelection(route,{trip_type:"round_trip"}).journey,"roundTrip");
});

test("initial direction/package come from server query before rendering, canonical paths stay query-free", async () => {
  for (const file of ["../src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx","../src/app/tuyen-duong/[tinh]/[tuyen]/[loai-xe]/page.tsx"]) {
    const page = await readFile(new URL(file,import.meta.url),"utf8");
    assert.match(page,/resolveRouteJourneySelection\(route, await searchParams/);
    assert.match(page,/initialSelection=\{selection\}/);
    assert.doesNotMatch(page,/path: routeJourneyHref/);
  }
});
