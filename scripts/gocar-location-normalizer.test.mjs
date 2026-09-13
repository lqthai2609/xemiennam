import test from "node:test";
import assert from "node:assert/strict";

import {
  locationNeedsReview,
  normalizeLegacyLocation,
  slugifyLocation,
} from "./lib/gocar-location-normalizer.mjs";

test("normalizes Ho Chi Minh aliases", () => {
  assert.equal(normalizeLegacyLocation("TPHCM"), "TP. Hồ Chí Minh");
  assert.equal(normalizeLegacyLocation("TP. Hồ Chí Minh"), "TP. Hồ Chí Minh");
  assert.equal(slugifyLocation(normalizeLegacyLocation("TPHCM")), "tp-ho-chi-minh");
});

test("removes pricing package duration from a destination", () => {
  assert.equal(normalizeLegacyLocation("TP Vũng Tàu 1 ngày"), "TP. Vũng Tàu");
  assert.equal(normalizeLegacyLocation("Đà Lạt (Lâm Đồng) 3N2Đ"), "Đà Lạt (Lâm Đồng)");
  assert.equal(normalizeLegacyLocation("Cần Thơ 2 ngày 1 đêm"), "Cần Thơ");
});

test("marks composite legacy labels for manual review", () => {
  assert.equal(locationNeedsReview("TP. Vũng Tàu"), false);
  assert.equal(locationNeedsReview("Mộc Hóa / Kiến Tường"), true);
  assert.equal(locationNeedsReview("Đà Lạt (Lâm Đồng)"), true);
});
