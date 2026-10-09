import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const capability = dataUrl(transpile(await readFile(new URL("../src/lib/route-package-capability.ts", import.meta.url), "utf8")));
const source = await readFile(new URL("../src/lib/route-journey-selection.ts", import.meta.url), "utf8");
const journeyModule = dataUrl(transpile(source).replace('"@/lib/route-package-capability"', JSON.stringify(capability)));
const { resolveRouteJourneySelection, routeJourneyHref } = await import(journeyModule);

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

test("airport hub links preserve each card's direction and featured package for either airport endpoint", async () => {
  const airportSource = transpile(await readFile(new URL("../src/lib/api/airport-routes.ts", import.meta.url), "utf8"));
  const fixtures = [
    { slug: "airport-first", originLocationId: 1, destinationLocationId: 2 },
    { slug: "airport-last", originLocationId: 3, destinationLocationId: 1 },
  ];
  const routes = fixtures.map((fixture) => ({
    slug: fixture.slug, regionSlug: "province",
    pricingV2: {
      outbound: { ...route.pricingV2.outbound, featured: route.pricingV2.outbound.packages.find((row) => row.packageKey === "2d1n") },
      inbound: { ...route.pricingV2.inbound, featured: route.pricingV2.inbound.packages.find((row) => row.packageKey === "3d2n") },
    },
  }));
  const pairs = fixtures.map((fixture) => ({ ...fixture, routeSlug: fixture.slug, usesLegacyLocationFallback: false, outbound: { enabled: true }, inbound: { enabled: true } }));
  const mock = dataUrl(`
    export const fetchLocationsV2 = async () => [{id:1,slug:"san-bay-tan-son-nhat",name:"Tân Sơn Nhất",type:"airport"},{id:2,slug:"city-a",name:"City A",type:"city"},{id:3,slug:"city-b",name:"City B",type:"city"}];
    export const fetchRoutePairsV2 = async () => ${JSON.stringify(pairs)};
    export const fetchRoutes = async () => ${JSON.stringify(routes)};
    export const airportDisplayName = (name) => "Sân bay " + name;
    export const airportPublicSlug = (slug) => slug.replace(/^san-bay-/, "");
    export const airportHubHref = (slug) => "/san-bay/" + airportPublicSlug(slug);
    export const routeHref = (route) => "/tuyen-duong/" + route.regionSlug + "/" + route.slug;
    export const getPublicRouteLabel = (route) => route.slug;
    export const canSuggestRelatedRoute = () => true;
  `);
  const code = airportSource.replace(/"(?:@\/[^\"]+|\.\/[^\"]+)"/g, (name) => name === '"@/lib/route-journey-selection"' ? JSON.stringify(journeyModule) : JSON.stringify(mock));
  const { fetchAirportHubBySlug } = await import(dataUrl(code));
  const hub = await fetchAirportHubBySlug("tan-son-nhat");
  assert.equal(hub.routes.length, 4);
  for (const card of hub.routes) {
    const query = Object.fromEntries(new URL(card.href, "https://alodatxe.com").searchParams);
    assert.equal(query.direction, card.pricingDirection);
    assert.equal(query.package, card.featuredPrice.packageKey);
    assert.deepEqual(resolveRouteJourneySelection(card.route, query), {
      direction: card.pricingDirection,
      journey: card.pricingDirection === "outbound" ? "twoDays" : "threeDays",
    });
    if (card.pricingDirection === "inbound") assert.equal(card.featuredPrice.mode, "contact");
    const first = card.route.slug === "airport-first";
    assert.equal(card.travelDirection, (first && card.pricingDirection === "outbound") || (!first && card.pricingDirection === "inbound") ? "from_airport" : "to_airport");
    assert.equal(new URL(card.href, "https://alodatxe.com").pathname, "/tuyen-duong/province/" + card.route.slug);
  }
});
