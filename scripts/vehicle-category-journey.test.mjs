import test from "node:test";
import assert from "node:assert/strict";
import { typescriptLoader } from "./lib/load-typescript.mjs";

const load = typescriptLoader();
const { vehicleJourneyRows, vehicleJourneyChoices, vehicleJourneyPrice, projectVehicleJourneyRoutes } = load("src/lib/vehicle-category-journey.ts");
const { buildVehicleCategoryRoutePrices } = load("src/lib/vehicle-category-pricing.ts");
const { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_CONTACT_PHONE, SITE_CONTACT_PHONE_TEL } = load("src/lib/site-config.ts");
const row = (direction, vehicleType, packageKey, mode = "fixed", price = 1000000) => ({
  direction, vehicleType, vehicleId: vehicleType === "4 chỗ" ? "2001" : vehicleType === "7 chỗ" ? "2002" : "2003",
  packageKey, packageLabel: packageKey === "one_way" ? "Một chiều" : packageKey === "round_trip_day" ? "Khứ hồi trong ngày" : "3 ngày 2 đêm",
  mode, price, priceLabel: "SYNTHETIC",
});
const route = {
  id: "1001", slug: "fixture-route", from: "TP. Hồ Chí Minh", to: "Vũng Tàu", regionSlug: "fixture-province",
  time: "", distance: "", price: "Giá từ nguồn", vehicleTypes: ["4 chỗ", "7 chỗ", "16 chỗ"], seatCount: [],
  pricingByVehicle: [], comboDescriptions: [], pickupPoints: [], dropoffPoints: [], mapEmbedSrc: "", departures: [],
  notes: ["SYNTHETIC điều kiện của tuyến"], summary: "SYNTHETIC nội dung không cần cho bộ chọn giá",
  contentReadiness: { version: 1, editorialState: "ready", serviceState: "live", canonicalState: "verified", mappingState: "clear", requestedIndexability: "index", schemaState: "offer" },
  pricingV2: {
    outbound: { key: "outbound", enabled: true, featuredPackage: "one_way", packages: [row("outbound","4 chỗ","one_way"),row("outbound","7 chỗ","one_way","fixed",2000000),row("outbound","7 chỗ","round_trip_day","contact"),row("outbound","16 chỗ","one_way","disabled")] },
    inbound: { key: "inbound", enabled: true, featuredPackage: "3d2n", packages: [row("inbound","4 chỗ","one_way","contact"),row("inbound","7 chỗ","3d2n","fixed",3100000)] },
  },
};

test("hotline, call URI and direct-contact fallback share the new verified phone", () => {
  assert.equal(SITE_HOTLINE.replace(/\D/g,""), "0559633457");
  assert.equal(SITE_HOTLINE_TEL, "+84559633457");
  assert.equal(SITE_CONTACT_PHONE, SITE_HOTLINE.replace(/\D/g,""));
  assert.equal(SITE_CONTACT_PHONE_TEL, SITE_HOTLINE_TEL);
});
test("each category sees its own served directions and actual package keys, without switching vehicles", () => {
  assert.deepEqual(vehicleJourneyRows(route,"outbound","7 chỗ").map(x=>x.packageKey),["one_way","round_trip_day"]);
  assert.deepEqual(vehicleJourneyRows(route,"inbound","7 chỗ").map(x=>x.packageKey),["3d2n"]);
  assert.equal(vehicleJourneyRows(route,"outbound","16 chỗ").length,0);
  assert.equal(vehicleJourneyChoices([route],"30 chỗ").length,0);
  assert.deepEqual(vehicleJourneyChoices([route],"7 chỗ").map(x=>x.direction),["outbound","inbound"]);
  assert.equal(vehicleJourneyChoices([{...route,pricingV2:{...route.pricingV2,inbound:{...route.pricingV2.inbound,enabled:false}}}],"7 chỗ").length,1);
});
test("prelaunch and blocked mappings never become served choices", () => {
  for(const field of [{serviceState:"prelaunch"},{mappingState:"d35_10_blocked"},{canonicalState:"missing"}]){
    assert.deepEqual(vehicleJourneyChoices([{...route,contentReadiness:{...route.contentReadiness,...field}}],"7 chỗ"),[]);
  }
});
test("contact, invalid and unavailable amounts cannot appear as a zero fixed price", () => {
  assert.equal(vehicleJourneyPrice(undefined),"disabled");
  assert.equal(vehicleJourneyPrice(row("outbound","4 chỗ","one_way","disabled")),"disabled");
  assert.equal(vehicleJourneyPrice(row("outbound","4 chỗ","one_way","contact")),"contact");
  for(const amount of [0,-1,NaN,Infinity,undefined]) assert.equal(vehicleJourneyPrice({...row("outbound","4 chỗ","one_way"),price:amount}),"contact");
  assert.equal(vehicleJourneyPrice(row("outbound","4 chỗ","one_way")),"fixed");
});
test("every representative route link preserves vehicle, direction and the displayed package", () => {
  for(const [type,slug] of [["4 chỗ","4-cho"],["7 chỗ","7-cho"]]){
    const prices=buildVehicleCategoryRoutePrices([route],type,slug);
    assert.equal(prices.length,2);
    for(const price of prices){
      const url=new URL(price.href,"https://example.test");
      assert.ok(url.pathname.endsWith("/"+slug));
      assert.equal(url.searchParams.get("direction"),price.direction);
      assert.equal(url.searchParams.get("package"),price.packageKey);
      const source=vehicleJourneyRows(route,price.direction,type).find(x=>x.packageKey===price.packageKey);
      assert.ok(source); assert.equal(source.vehicleId,price.vehicleId);
      assert.equal(source.packageLabel,price.packageLabel);
      if(source.mode==="contact") assert.match(price.price,/Liên hệ/);
      else assert.equal(price.price,load("src/lib/wp.ts").formatPriceShort(source.price));
    }
  }
});
test("client projection keeps current category prices and route conditions without mutating the source", () => {
  const before=structuredClone(route);
  const projected=projectVehicleJourneyRoutes([route],"7 chỗ");
  assert.equal(projected.length,1); assert.deepEqual(route,before);
  assert.equal(projected[0].summary,"");
  assert.deepEqual(projected[0].notes,route.notes);
  for(const direction of ["outbound","inbound"]){
    assert.deepEqual(projected[0].pricingV2[direction].packages,vehicleJourneyRows(route,direction,"7 chỗ"));
    assert.ok(projected[0].pricingV2[direction].packages.every(x=>x.vehicleType==="7 chỗ"));
  }
  assert.equal(vehicleJourneyChoices(projected,"7 chỗ").length,2);
});
