import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const footer = await readFile(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8");

test("Day 29 footer rejects blank and hash-only destinations", () => {
  assert.match(footer, /const normalizedHref = href\.trim\(\);/);
  assert.match(footer, /normalizedHref\.length > 0 && normalizedHref !== "#"/);
});

test("Day 29 footer sanitizes link groups and removes groups with no valid links", () => {
  assert.match(footer, /links: group\.links\.filter\(\(link\) => isRenderableFooterHref\(link\.href\)\)/);
  assert.match(footer, /\.filter\(\(group\) => group\.links\.length > 0\)/);
  assert.match(footer, /const safeLinkGroups = sanitizeFooterLinkGroups\(linkGroups\);/);
  assert.match(footer, /safeLinkGroups\.map\(\(group\) =>/);
});

test("Day 29 footer hides the social section when no valid social destination exists", () => {
  assert.match(footer, /const safeSocialLinks = socialLinks\.filter\(\(social\) => isRenderableFooterHref\(social\.href\)\);/);
  assert.match(footer, /safeSocialLinks\.length > 0 \?/);
  assert.match(footer, /safeSocialLinks\.map\(\(social\) =>/);
});

test("default social links never invent placeholder destinations", () => {
  assert.match(footer, /export const defaultSocialLinks: SocialLink\[\] = \[\];/);
  assert.doesNotMatch(footer, /defaultSocialLinks[\s\S]{0,180}href:\s*["']#["']/);
});
