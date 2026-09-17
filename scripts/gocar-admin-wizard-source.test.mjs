import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../src/app/quan-tri/page.tsx", import.meta.url), "utf8");
const wizard = await readFile(new URL("../src/app/quan-tri/route-pricing-admin-wizard.tsx", import.meta.url), "utf8");

test("admin wizard is noindex and gated outside preview", () => {
  assert.match(page, /robots:\s*\{ index: false/);
  assert.match(page, /GOCAR_ADMIN_WIZARD_ENABLED/);
  assert.match(page, /VERCEL_ENV === "preview"/);
});

test("first slice is local draft only", () => {
  assert.match(wizard, /window\.localStorage\.setItem/);
  assert.doesNotMatch(wizard, /fetch\s*\(/);
  assert.doesNotMatch(wizard, /axios|XMLHttpRequest/);
});

test("pricing guardrails remain visible in source", () => {
  assert.match(wizard, /Không cho phép price=0/);
  assert.match(wizard, /không tự sao chép/i);
  assert.match(wizard, /Không ghi vào production/);
});
