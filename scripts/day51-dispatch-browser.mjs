import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
// next start constructs its local Request origin with localhost.
const origin = "http://localhost:4288", evidence = [];
const control = async (mode) => { const r = await fetch("http://127.0.0.1:4299/fixture-control", { method: "POST", body: JSON.stringify({ mode }) }); return r.json(); };
try {
  for (const [viewport, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
    await control("normal");
    const context = await browser.newContext({ viewport: { width, height }, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
    await context.addCookies([{ name: "alo_admin_session", value: "synthetic-publisher", url: origin }, { name: "alo_admin_csrf", value: "synthetic-csrf", url: origin }]);
    const page = await context.newPage(), errors = []; let forbiddenWrites = 0;
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("response", async (r) => { if (r.url().includes("/api/admin/") && r.status() >= 400) console.log("HTTP", r.status(), r.url(), await r.text()); });
    await page.route("**/*", async (r) => {
      const u = new URL(r.request().url());
      if (!["127.0.0.1", "localhost"].includes(u.hostname)) return r.abort();
      if (r.request().method() !== "GET" && !u.pathname.startsWith("/api/admin/empty-legs")) { forbiddenWrites++; return r.abort(); }
      return r.continue();
    });
    await page.goto(`${origin}/quan-tri/chieu-trong`, { waitUntil: "networkidle", timeout: 60000 });
    const create = page.getByRole("button", { name: "Tạo chuyến mới", exact: true }); await create.waitFor();
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex.*nofollow/);
    assert.equal(await page.locator(".floating-action").count(), 0, "customer contact buttons do not cover dispatch controls");
    await create.click();
    await page.getByRole("button", { name: "Lưu chưa xác nhận", exact: true }).click(); await page.getByRole("alert").filter({ hasText: "Nhập lý do" }).waitFor();
    await page.getByLabel("Lý do thay đổi", { exact: false }).fill("SYNTHETIC draft for UI test");
    await page.getByRole("button", { name: "Lưu chưa xác nhận", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Đã lưu chuyến" }).waitFor();
    await page.getByLabel("Tuyến, chiều và loại xe", { exact: false }).selectOption("1001:inbound:2001");
    await page.getByLabel("Ngày khởi hành tại Việt Nam", { exact: true }).fill("2030-01-02");
    await page.getByLabel("Giờ khởi hành tại Việt Nam", { exact: true }).fill("00:30");
    await page.getByLabel("Giá riêng được Vận hành duyệt", { exact: false }).fill("700000");
    await page.getByLabel("Bắt đầu áp dụng", { exact: false }).fill("2030-01-01T00:00");
    await page.getByLabel("Hết hạn", { exact: false }).fill("2030-01-02T00:00");
    await page.getByLabel("Mã nguồn xác nhận", { exact: false }).fill("SYNTHETIC-OPERATIONS-REF");
    await page.getByLabel("Trạng thái nội bộ", { exact: false }).selectOption("available");
    await page.getByLabel("Lý do thay đổi", { exact: false }).fill("SYNTHETIC confirmation transport test");
    await page.getByRole("button", { name: "Xác nhận Vận hành và lưu", exact: true }).click(); await page.getByRole("status").filter({ hasText: "phiên bản 2" }).waitFor();
    assert.match(await page.getByText("Người xác nhận #7", { exact: false }).textContent(), /phiên bản 2/);
    await page.screenshot({ path: `../evidence/day51-${viewport}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no overflow");
    await page.getByLabel("Trạng thái nội bộ", { exact: false }).selectOption("inactive");
    await page.getByLabel("Lý do thay đổi", { exact: false }).fill("SYNTHETIC uncertain save");
    await control("saved-error"); await page.getByRole("button", { name: "Lưu chưa xác nhận", exact: true }).click();
    const retry = page.getByRole("button", { name: "Thử lại cùng thao tác", exact: true }); await retry.waitFor();
    assert.equal(await page.getByLabel("Lý do thay đổi", { exact: false }).isDisabled(), true);
    await retry.click(); await page.getByRole("status").filter({ hasText: "phiên bản 3" }).waitFor();
    await page.getByLabel("Lý do thay đổi", { exact: false }).fill("SYNTHETIC conflict test");
    await control("conflict"); await page.getByRole("button", { name: "Lưu chưa xác nhận", exact: true }).click();
    const reload = page.getByRole("button", { name: "Tải phiên bản mới", exact: true }); await reload.waitFor();
    assert.equal(await page.getByLabel("Lý do thay đổi", { exact: false }).isDisabled(), true);
    await control("normal"); await reload.click(); await page.waitForFunction(() => !document.querySelector("textarea").disabled);
    const noCsrf = await context.request.post(`${origin}/api/admin/empty-legs`, { headers: { Origin: origin }, data: {} }); assert.equal(noCsrf.status(), 403);
    const foreign = await context.request.post(`${origin}/api/admin/empty-legs`, { headers: { Origin: "https://foreign.invalid", "x-gocar-csrf": "synthetic-csrf" }, data: {} }); assert.equal(foreign.status(), 403);
    const del = await context.request.delete(`${origin}/api/admin/empty-legs/1`); assert.equal(del.status(), 405);
    const list = await context.request.get(`${origin}/api/admin/empty-legs`); assert.equal(list.status(), 200); assert.match(list.headers()["cache-control"], /no-store/);
    const denied = await context.request.get(`${origin}/api/admin/empty-legs/1/activate`); assert.equal(denied.status(), 404);
    const data = await (await fetch("http://127.0.0.1:4299/fixture-control")).json();
    const lastWrites = data.writes.slice(-5); const failed = lastWrites.find((w) => w.body.reason === "SYNTHETIC uncertain save");
    const repeated = lastWrites.filter((w) => w.body.operation_key === failed.body.operation_key); assert.equal(repeated.length, 2); assert.deepEqual(repeated[0], repeated[1]);
    assert.equal(data.writes.findLast((w) => w.body.action === "confirm").body.model.expires_at, "2030-01-01T17:00:00Z");
    assert.deepEqual(errors, []); assert.equal(forbiddenWrites, 0);
    evidence.push({ viewport, width, height, overflow: false, errors, forbiddenWrites, privateRobots: true, draftSave: true, serverStampDisplay: true, vietnamTime: true, sameOperationRetry: true, conflictReload: true, csrf: true, restrictedMethods: true, noStore: true });
    await context.close();
  }
  const editor = await browser.newContext(); await editor.addCookies([{ name: "alo_admin_session", value: "synthetic-editor", url: origin }, { name: "alo_admin_csrf", value: "synthetic-csrf", url: origin }]);
  const page = await editor.newPage(); await page.goto(`${origin}/quan-tri/chieu-trong`, { waitUntil: "networkidle" });
  assert.equal(await page.getByRole("button", { name: "Xác nhận Vận hành và lưu", exact: true }).count(), 0);
  const anonymous = await browser.newContext(); const r = await anonymous.request.get(`${origin}/api/admin/empty-legs`); assert.equal(r.status(), 401);
  await writeFile("../evidence/browser-results.json", JSON.stringify({ isolated: true, cmsRuntimeVerified: false, evidence, editorConfirmationHidden: true, anonymousApiDenied: true }, null, 2));
  console.log("PASS: desktop/mobile dispatch UI, proxy auth/CSRF/private cache, draft/confirmation transport, retry and conflict; isolated fixtures only.");
} finally { await browser.close(); }
