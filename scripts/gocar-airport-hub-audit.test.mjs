import test from "node:test";
import assert from "node:assert/strict";

import {
  auditDay20Targets,
  normalizeLabel,
  parseAirportHubHtml,
} from "./lib/gocar-airport-hub-audit.mjs";

const fixture = `
<section>
  <div id="from-airport" class="airport-direction-block">
    <article class="airport-route-card">
      <div><strong>Sân bay Tân Sơn Nhất</strong><strong>Vũng Tàu</strong></div>
      <div><span>Giá từ</span><strong>1.500K</strong><a href="/tuyen-duong/ba-ria-vung-tau/san-bay-tan-son-nhat-vung-tau">Xem tuyến</a></div>
    </article>
    <article class="airport-route-card">
      <div><strong>Sân bay Tân Sơn Nhất</strong><strong>Biên Hòa</strong></div>
      <div><span>Báo giá</span><strong>Liên hệ để nhận báo giá</strong><a href="/tuyen-duong/dong-nai/tan-son-nhat-bien-hoa">Xem tuyến</a></div>
    </article>
  </div>
  <div id="to-airport" class="airport-direction-block">
    <article class="airport-route-card">
      <div><strong>Vũng Tàu</strong><strong>Sân bay Tân Sơn Nhất</strong></div>
      <div><span>Giá từ</span><strong>1.400K</strong><a href="/tuyen-duong/ba-ria-vung-tau/san-bay-tan-son-nhat-vung-tau">Xem tuyến</a></div>
    </article>
  </div>
</section>`;

test("normalizes Vietnamese labels for deterministic matching", () => {
  assert.equal(normalizeLabel("Biên Hòa"), "bien hoa");
  assert.equal(normalizeLabel("TÂY NINH"), "tay ninh");
});

test("parses airport route cards by direction and price mode", () => {
  const parsed = parseAirportHubHtml(fixture);

  assert.equal(parsed.fromAirport.length, 2);
  assert.equal(parsed.toAirport.length, 1);
  assert.equal(parsed.fromAirport[0].destination, "Vũng Tàu");
  assert.equal(parsed.fromAirport[0].priceMode, "fixed");
  assert.equal(parsed.fromAirport[1].priceMode, "contact");
  assert.equal(parsed.toAirport[0].origin, "Vũng Tàu");
});

test("requires both directions for each Day 20 target", () => {
  const audit = auditDay20Targets(fixture, ["Vũng Tàu", "Biên Hòa"]);

  assert.equal(audit[0].ready, true);
  assert.equal(audit[1].directionsReady, false);
  assert.equal(audit[1].pricingReady, true);
  assert.equal(audit[1].ready, false);
});
