import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

async function htmlFiles(directory) {
  const items = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(items.map(async (item) => {
    const path = `${directory}/${item.name}`;
    return item.isDirectory() ? htmlFiles(path) : item.name.endsWith(".html") ? [path] : [];
  }));
  return nested.flat();
}

test("built route and vehicle pages emit only positive numeric structured Offers", async () => {
  const app = new URL("../.next/server/app", import.meta.url).pathname;
  const files = [...await htmlFiles(`${app}/tuyen-duong`), ...await htmlFiles(`${app}/loai-xe`)];
  assert.ok(files.length > 0, "production build must generate representative public pages");
  for (const file of files) {
    const html = await readFile(file, "utf8");
    for (const [, json] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)) {
      const visit = (node) => {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== "object") return;
        if (node["@type"] === "Offer") {
          assert.ok(Number.isFinite(Number(node.price)) && Number(node.price) > 0, `Invalid Offer in ${file}`);
          assert.equal(node.priceCurrency, "VND", file);
        }
        for (const value of Object.values(node)) visit(value);
      };
      visit(JSON.parse(json));
    }
  }
});

test("built Long Thanh commercial Route pages omit all JSON-LD while prelaunch", async () => {
  const files = (await htmlFiles(new URL("../.next/server/app/tuyen-duong", import.meta.url).pathname))
    .filter((file) => file.includes("san-bay-long-thanh"));
  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.doesNotMatch(html, /type="application\/ld\+json"/, `Prelaunch structured data in ${file}`);
  }
});

function extractTag(html, tag, attribute, value) {
  return [...html.matchAll(new RegExp("<" + tag + "\\b[^>]*>", "gi"))]
    .map((match) => match[0])
    .find((item) => new RegExp("\\b" + attribute + "=['\\\"]" + value + "['\\\"]", "i").test(item));
}

function attributeValue(tag, key) {
  return tag?.match(new RegExp("\\b" + key + "=['\\\"]([^'\\\"]*)['\\\"]", "i"))?.[1] ?? null;
}

test("SEO-006A representative built Route HTML has explicit AC15 evidence", async () => {
  const files = await htmlFiles(new URL("../.next/server/app/tuyen-duong", import.meta.url).pathname);
  const cases = [
    { id: 9190, slug: "san-bay-long-thanh-vung-tau", kind: "prelaunch" },
    { id: 9117, slug: "san-bay-tan-son-nhat-vung-tau", kind: "comparison" },
    { id: 9055, slug: "tp-hcm-tp-vung-tau-2-ngay-1-dem", kind: "d35_10_observation" },
  ];
  for (const route of cases) {
    const file = files.find((item) => item.endsWith("/" + route.slug + ".html"));
    if (!file && route.kind === "d35_10_observation") {
      console.log(JSON.stringify({ routeId: route.id, result: "NOT_BUILT", verification: "PENDING" }));
      continue;
    }
    assert.ok(file, "Missing representative built Route " + route.id);
    const html = await readFile(file, "utf8");
    const jsonLdCount = [...html.matchAll(/<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>/gi)].length;
    const robots = attributeValue(extractTag(html, "meta", "name", "robots"), "content");
    const canonical = attributeValue(extractTag(html, "link", "rel", "canonical"), "href");
    const observed = { routeId: route.id, routePath: file.split("/app/")[1]?.replace(/\.html$/, "") ?? route.slug, jsonLdCount, robots, canonical };
    console.log("SEO006A_AC15 " + JSON.stringify(observed));
    assert.ok(canonical?.endsWith("/" + route.slug), "Missing/changed canonical path for " + route.id);
    // PR #129/#130 authorize valid fixed CMS tuples; contact and prelaunch still omit Offers.
    if (route.kind === "prelaunch") {
      assert.equal(jsonLdCount, 0, "Prelaunch Route must have zero JSON-LD");
      assert.match(robots ?? "", /noindex/i, "Prelaunch Route must be noindex");
    }
    // D35-10 remains OPEN/P0: the observed HTML is evidence, never automatic acceptance.
  }
});
