import assert from "node:assert/strict";
import test from "node:test";
import { typescriptLoader } from "./lib/load-typescript.mjs";
const { dispatchInstant, dispatchWallTime, dispatchMoney, dispatchEditable } = typescriptLoader()("src/lib/empty-leg-admin.ts");
test("dispatch dates use Vietnam wall time across browser timezones and midnight", () => {
  for (const tz of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
    const old = process.env.TZ; process.env.TZ = tz;
    try { assert.equal(dispatchInstant("2030-01-02T00:30"), "2030-01-01T17:30:00Z"); assert.equal(dispatchWallTime("2030-01-01T17:30:00Z"), "2030-01-02T00:30"); }
    finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
  }
  assert.equal(dispatchInstant(""), null); assert.equal(dispatchWallTime(null), "");
  assert.equal(dispatchInstant("2028-02-29T00:00"), "2028-02-28T17:00:00Z");
  for (const date of ["2030-02-29T00:00", "2030-02-30T00:00", "2030-01-01T24:00", "bad", "2030-1-1T00:00"]) assert.throws(() => dispatchInstant(date));
});
test("missing money remains null; zero, decimal, coercion and unsafe money cannot enter a dispatch payload", () => {
  assert.equal(dispatchMoney(""), null); assert.equal(dispatchMoney("700000"), 700000);
  for (const amount of ["0", "-1", "1.5", "01", "1e3", " 700000 ", "700,000", "9007199254740992"]) assert.throws(() => dispatchMoney(amount));
});
test("ended and confirmed dispatch records respect view-only permissions", () => {
  assert.equal(dispatchEditable(null, false), true);
  for (const status of ["completed", "cancelled"]) assert.equal(dispatchEditable({model:{status,approval:{status:"confirmed"}}}, true), false);
  assert.equal(dispatchEditable({model:{status:"available",approval:{status:"confirmed"}}}, false), false);
  assert.equal(dispatchEditable({model:{status:"available",approval:{status:"confirmed"}}}, true), true);
  assert.equal(dispatchEditable({model:{status:"draft",approval:{status:"draft"}}}, false), true);
});
