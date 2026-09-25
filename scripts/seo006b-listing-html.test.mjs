import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = new URL("../.next/server/app/", import.meta.url);
const listingPages = [
  "tuyen-duong.html",
  "bang-gia.html",
  "tuyen-duong/ba-ria-vung-tau.html",
  "tuyen-duong/can-tho.html",
  "tuyen-duong/dong-nai.html",
  "tuyen-duong/ho-chi-minh.html",
  "tuyen-duong/phan-thiet.html",
];

test("commercial listings do not link to prelaunch Long Thanh routes", async () => {
  for (const page of listingPages) {
    const html = await readFile(new URL(page, app), "utf8");
    assert.doesNotMatch(html, /<a\b[^>]*href=["'][^"']*\/tuyen-duong\/[^"']*san-bay-long-thanh[^"']*["']/i, page);
  }
});

test("prelaunch route remains accessible for review without indexable markup", async () => {
  const html = await readFile(new URL("tuyen-duong/ba-ria-vung-tau/san-bay-long-thanh-vung-tau.html", app), "utf8");
  assert.match(html, /<meta\b[^>]*name=["']robots["'][^>]*noindex/i);
  assert.doesNotMatch(html, /type=["']application\/ld\+json["']/i);
});
