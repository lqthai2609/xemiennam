import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const buildRoot = path.resolve(new URL("../.next/server/app", import.meta.url).pathname);
const FORBIDDEN_DISPLAY_PATTERN = /TP\.HCM|TP HCM|TP\. HCM|TP Hồ Chí Minh|TP\. Hồ Chí Minh|Hồ Chí Minh/iu;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.name.endsWith(".html")) files.push(target);
  }
  return files;
}

function decodeHtml(value) {
  return value
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;|&#38;/g, "&")
    .replace(/&lt;|&#60;/g, "<")
    .replace(/&gt;|&#62;/g, ">");
}

const TECHNICAL_JSON_LD_KEYS = new Set([
  "@id",
  "url",
  "image",
  "logo",
  "sameAs",
  "addressLocality",
  "addressRegion",
  "areaServed",
]);

function inspectJsonLdValue(file, value, pathParts = [], findings = []) {
  if (typeof value === "string") {
    if (pathParts.some((part) => TECHNICAL_JSON_LD_KEYS.has(part))) return findings;
    const match = value.match(FORBIDDEN_DISPLAY_PATTERN);
    if (match) findings.push({ file, surface: `json-ld:${pathParts.join(".")}`, match: match[0] });
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectJsonLdValue(file, item, [...pathParts, String(index)], findings));
    return findings;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => inspectJsonLdValue(file, item, [...pathParts, key], findings));
  }
  return findings;
}

function inspectHtml(file, html) {
  const findings = [];
  for (const script of html.matchAll(/<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/giu)) {
    const raw = decodeHtml(script[1]);
    try {
      inspectJsonLdValue(file, JSON.parse(raw), [], findings);
    } catch {
      findings.push({ file, surface: "json-ld:invalid", match: "invalid JSON-LD" });
    }
  }
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ");
  const visibleText = decodeHtml(withoutScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const visibleMatch = visibleText.match(FORBIDDEN_DISPLAY_PATTERN);
  if (visibleMatch) findings.push({ file, surface: "visible_text", match: visibleMatch[0] });

  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "");
  const titleMatch = title.match(FORBIDDEN_DISPLAY_PATTERN);
  if (titleMatch) findings.push({ file, surface: "title", match: titleMatch[0] });

  for (const meta of html.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = meta[0];
    const content = decodeHtml(tag.match(/\bcontent=(?:"([^"]*)"|'([^']*)')/iu)?.[1] ?? tag.match(/\bcontent=(?:"([^"]*)"|'([^']*)')/iu)?.[2] ?? "");
    const property = tag.match(/\b(?:name|property)=(?:"([^"]*)"|'([^']*)')/iu)?.[1] ?? tag.match(/\b(?:name|property)=(?:"([^"]*)"|'([^']*)')/iu)?.[2] ?? "";
    if (/url|image/i.test(property)) continue;
    const match = content.match(FORBIDDEN_DISPLAY_PATTERN);
    if (match) findings.push({ file, surface: `meta:${property || "unknown"}`, match: match[0] });
  }
  return findings;
}

test("built public HTML uses Sài Gòn in visible text and metadata", async () => {
  const files = await walk(buildRoot);
  assert.ok(files.length > 0, "No generated HTML found; run npm run build first.");
  const findings = [];
  for (const file of files) findings.push(...inspectHtml(path.relative(buildRoot, file), await readFile(file, "utf8")));
  assert.deepEqual(findings, []);
});

test("representative public outputs were generated", async () => {
  const files = (await walk(buildRoot)).map((file) => path.relative(buildRoot, file).replaceAll(path.sep, "/"));
  for (const expected of ["tuyen-duong.html", "bang-gia.html"]) {
    assert.ok(files.includes(expected), `Missing ${expected}`);
  }
  assert.ok(files.some((file) => /^tuyen-duong\/[^/]+\.html$/.test(file)), "Missing destination output");
  assert.ok(files.some((file) => /^tuyen-duong\/[^/]+\/[^/]+\.html$/.test(file)), "Missing route detail output");
});
