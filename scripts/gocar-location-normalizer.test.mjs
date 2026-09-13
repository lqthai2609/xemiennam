import test from "node:test";
import assert from "node:assert/strict";

import {
  locationDisposition,
  locationNeedsReview,
  normalizeLegacyLocation,
  slugifyLocation,
} from "./lib/gocar-location-normalizer.mjs";

test("normalizes Ho Chi Minh aliases", () => {
  assert.equal(normalizeLegacyLocation("TPHCM"), "TP. Hồ Chí Minh");
  assert.equal(normalizeLegacyLocation("TP. Hồ Chí Minh"), "TP. Hồ Chí Minh");
  assert.equal(slugifyLocation(normalizeLegacyLocation("TPHCM")), "tp-ho-chi-minh");
});

test("removes pricing duration and collapses safe aliases", () => {
  assert.equal(normalizeLegacyLocation("TP Vũng Tàu 1 ngày"), "Vũng Tàu");
  assert.equal(normalizeLegacyLocation("Vũng Tàu"), "Vũng Tàu");
  assert.equal(normalizeLegacyLocation("Đà Lạt (Lâm Đồng) 3N2Đ"), "Đà Lạt");
  assert.equal(normalizeLegacyLocation("Cần Thơ 2 ngày 1 đêm"), "Cần Thơ");
  assert.equal(normalizeLegacyLocation("Châu Đốc (An Giang) 1N1Đ"), "Châu Đốc");
  assert.equal(normalizeLegacyLocation("Cái Bè (Tiền Giang)"), "Cái Bè");
  assert.equal(normalizeLegacyLocation("Tiền Giang (Mỹ Tho)"), "Mỹ Tho");
  assert.equal(normalizeLegacyLocation("MỘC BÀI"), "Cửa khẩu Mộc Bài");
});

test("classifies apply review and exclude candidates", () => {
  assert.equal(locationDisposition("Vũng Tàu"), "apply");
  assert.equal(locationNeedsReview("Mộc Hóa / Kiến Tường"), true);
  assert.equal(locationDisposition("Bến Tre (TP. Bến Tre)"), "review");
  assert.equal(locationDisposition("KCN VSIP 1 & 2"), "review");
  assert.equal(locationDisposition("Tây Ninh"), "review");
  assert.equal(locationDisposition("City Tour (4 tiếng / 50 km)"), "exclude");
});
