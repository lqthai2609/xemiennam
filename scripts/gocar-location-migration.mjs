#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import {
  locationNeedsReview,
  normalizeLegacyLocation,
  slugifyLocation,
} from "./lib/gocar-location-normalizer.mjs";

const DEFAULT_API_BASE = "https://xemiennam.datxesaigon.com/wp-json/wp/v2";
const apiBase = process.env.WP_API_BASE_URL ?? DEFAULT_API_BASE;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const outputPath = argValue("--out");

async function fetchAll(restBase) {
  const items = [];
  let page = 1;

  while (true) {
    const url = new URL(`${apiBase.replace(/\/$/, "")}/${restBase}`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("status", "publish");
    url.searchParams.set("_fields", "id,slug,title,meta");

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`${restBase} page ${page}: HTTP ${response.status}`);
    }

    const batch = await response.json();
    items.push(...batch);

    const totalPages = Number(response.headers.get("x-wp-totalpages") ?? "1");
    if (page >= totalPages) break;
    page += 1;
  }

  return items;
}

async function main() {
  const [routes, locations] = await Promise.all([fetchAll("route"), fetchAll("location")]);
  const existingSlugs = new Set(locations.map((location) => location.slug));
  const candidates = new Map();

  for (const route of routes) {
    for (const [metaKey, role] of [["diem_di", "origin"], ["diem_den", "destination"]]) {
      const raw = route?.meta?.[metaKey];
      if (typeof raw !== "string" || !raw.trim()) continue;

      const title = normalizeLegacyLocation(raw);
      const slug = slugifyLocation(title);
      if (!title || !slug || existingSlugs.has(slug)) continue;

      if (!candidates.has(slug)) {
        candidates.set(slug, {
          title,
          slug,
          location_type: "locality",
          review_required: locationNeedsReview(title),
          route_refs: [],
          raw_values: [],
        });
      }

      const candidate = candidates.get(slug);
      candidate.route_refs.push({ route_id: route.id, route_slug: route.slug, role });
      if (!candidate.raw_values.includes(raw)) candidate.raw_values.push(raw);
    }
  }

  const list = [...candidates.values()].sort((a, b) => a.title.localeCompare(b.title, "vi"));
  const safe = list.filter((item) => !item.review_required);
  const review = list.filter((item) => item.review_required);

  const manifest = {
    generated_at: new Date().toISOString(),
    api_base: apiBase,
    mode: "read_only_preview",
    route_count: routes.length,
    existing_location_count: locations.length,
    candidate_count: list.length,
    safe_candidate_count: safe.length,
    review_candidate_count: review.length,
    candidates: list,
    notes: [
      "No WordPress data was modified.",
      "Duration/package suffixes are removed because they belong to Pricing, not Location.",
      "Slash/parentheses candidates require manual review by default.",
      "Existing Location posts are deduplicated by slug.",
      "Route origin_location_id/destination_location_id are not changed by this planner.",
    ],
  };

  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (outputPath) {
    await writeFile(outputPath, json, "utf8");
    console.error(`Wrote ${outputPath}`);
  } else {
    process.stdout.write(json);
  }
}

main().catch((error) => {
  console.error(`[gocar-location-migration] ${error.message}`);
  process.exitCode = 1;
});
