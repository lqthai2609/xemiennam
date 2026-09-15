import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [blogApi, blogType, plugin, blogDetailPage, airportHubPage, airportHubComponent] = await Promise.all([
  readFile(new URL("../src/lib/api/blog.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/types/blog.ts", import.meta.url), "utf8"),
  readFile(new URL("../wordpress/gocar-core/includes/class-gocar-blog-relations.php", import.meta.url), "utf8"),
  readFile(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/san-bay/[airportSlug]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/airport-hub-page.tsx", import.meta.url), "utf8"),
]);

test("blog model exposes structured Province, Vehicle and Airport relations", () => {
  assert.match(blogType, /provinceSlugs:\s*string\[\]/);
  assert.match(blogType, /vehicleTypeSlugs:\s*string\[\]/);
  assert.match(blogType, /airportLocationIds:\s*number\[\]/);
});

test("blog API maps WordPress structured relations and exposes airport query", () => {
  assert.match(blogApi, /embeddedTerms\(wp\._embedded,\s*"province"\)/);
  assert.match(blogApi, /embeddedTerms\(wp\._embedded,\s*"vehicle_type"\)/);
  assert.match(blogApi, /related_airport_location_ids/);
  assert.match(blogApi, /fetchPostsByAirportLocationId/);
});

test("semantic related-post ranking does not inspect free text", () => {
  const scorerMatch = blogApi.match(/export function blogSemanticRelationScore[\s\S]*?\n}\n/);
  assert.ok(scorerMatch, "blogSemanticRelationScore must exist");
  const scorer = scorerMatch[0];
  assert.doesNotMatch(scorer, /\.title|\.excerpt|\.contentHtml/);
  assert.match(scorer, /airportLocationIds/);
  assert.match(scorer, /provinceSlugs/);
  assert.match(scorer, /vehicleTypeSlugs/);
});

test("Day 25 Blog Detail uses semantic related posts and structured hub links", () => {
  assert.match(blogDetailPage, /fetchRelatedPosts\(slug,\s*3\)/);
  assert.doesNotMatch(blogDetailPage, /routes\.slice\(0,\s*3\)/);
  assert.match(blogDetailPage, /airportHubHref\(airport\.slug\)/);
  assert.match(blogDetailPage, /`\/tuyen-duong\/\$\{provinceSlug\}`/);
  assert.match(blogDetailPage, /decodeHtmlEntities\(rawLabel\)/);
  assert.match(blogDetailPage, /`\/loai-xe\/\$\{vehicleSlug\}`/);
  assert.match(blogDetailPage, /<BlogCard post=\{related\}/);
});

test("Day 25 Airport Hub queries related posts by Location V2 ID and renders them only when present", () => {
  assert.match(airportHubPage, /fetchPostsByAirportLocationId\(hub\.airport\.id,\s*3\)/);
  assert.match(airportHubPage, /<AirportHubPage data=\{hub\} relatedPosts=\{relatedPosts\}/);
  assert.match(airportHubComponent, /relatedPosts\.length > 0/);
  assert.match(airportHubComponent, /<BlogCard post=\{post\}/);
});

test("Gocar Core airport relation validates Location V2 airport entities", () => {
  assert.match(plugin, /related_airport_location_ids/);
  assert.match(plugin, /register_taxonomy_for_object_type\(\s*\$taxonomy,\s*'post'\s*\)/);
  assert.match(plugin, /'location'\s*!==\s*get_post_type/);
  assert.match(plugin, /'airport'\s*!==\s*\$location_type/);
});
