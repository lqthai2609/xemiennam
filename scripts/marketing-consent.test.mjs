import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/marketing-consent.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { readMarketingConsent, setMarketingConsent, hasMarketingConsent, marketingConsentStorageKey } =
  await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("marketing consent is unknown by default, explicit, and expires after 30 days", () => {
  const originalWindow = globalThis.window;
  const originalNow = Date.now;
  const data = new Map();
  try {
    globalThis.window = { localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    } };
    Date.now = () => 1_000_000_000_000;
    assert.equal(readMarketingConsent(), "unknown");
    assert.equal(hasMarketingConsent(), false);
    assert.equal(setMarketingConsent("granted"), true);
    assert.equal(readMarketingConsent(), "granted");
    assert.equal(hasMarketingConsent(), true);
    Date.now = () => 1_000_000_000_000 + 30 * 24 * 60 * 60 * 1000;
    assert.equal(readMarketingConsent(), "unknown");
    assert.equal(hasMarketingConsent(), false);
    assert.equal(setMarketingConsent("denied"), true);
    assert.equal(readMarketingConsent(), "denied");
    data.set(marketingConsentStorageKey, "not-json");
    assert.equal(readMarketingConsent(), "unknown");
  } finally {
    globalThis.window = originalWindow;
    Date.now = originalNow;
  }
});
