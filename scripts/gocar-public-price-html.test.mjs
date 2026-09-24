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

test("built route and vehicle pages never emit a structured price Offer before approval", async () => {
  const app = new URL("../.next/server/app", import.meta.url).pathname;
  const files = [...await htmlFiles(`${app}/tuyen-duong`), ...await htmlFiles(`${app}/loai-xe`)];
  assert.ok(files.length > 0, "production build must generate representative public pages");
  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.doesNotMatch(html, /"@type":"(?:AggregateOffer|Offer)"/, `Unapproved Offer in ${file}`);
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
