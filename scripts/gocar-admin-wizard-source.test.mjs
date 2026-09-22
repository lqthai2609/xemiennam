import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../src/app/quan-tri/page.tsx", import.meta.url), "utf8");
const wizard = await readFile(new URL("../src/app/quan-tri/route-pricing-admin-wizard.tsx", import.meta.url), "utf8");
const sessionRoute = await readFile(new URL("../src/app/api/admin/session/route.ts", import.meta.url), "utf8");
const proxyRoute = await readFile(new URL("../src/app/api/admin/[...path]/route.ts", import.meta.url), "utf8");
const adminApi = await readFile(new URL("../wordpress/gocar-core/includes/class-gocar-admin-api.php", import.meta.url), "utf8");

test("admin wizard stays noindex and feature-gated", () => {
  assert.match(page, /robots:\s*\{ index: false/);
  assert.match(page, /GOCAR_ADMIN_WIZARD_ENABLED/);
  assert.match(page, /VERCEL_ENV === "preview"/);
  assert.match(page, /getAdminSession/);
});

test("browser mutations use the authenticated same-origin proxy", () => {
  assert.match(wizard, /\/api\/admin\//);
  assert.match(wizard, /X-Gocar-Csrf/);
  assert.doesNotMatch(wizard, /wp-json|WP_JWT|Authorization:\s*`Bearer/);
  assert.match(sessionRoute, /httpOnly/);
  assert.match(sessionRoute, /sameSite:\s*"strict"/);
  assert.match(proxyRoute, /isSameOriginMutation/);
  assert.match(proxyRoute, /ALLOWED_PATHS/);
});

test("workflow includes server draft, approval, audit and rollback", () => {
  assert.match(wizard, /Lưu và gửi duyệt/);
  assert.match(wizard, /Duyệt và áp dụng/);
  assert.match(wizard, /deleteServerDraft/);
  assert.match(wizard, /method: "DELETE"/);
  assert.match(wizard, /Xác nhận xóa/);
  assert.match(wizard, /Lịch sử và rollback/);
  assert.match(adminApi, /\/admin\/drafts/);
  assert.match(adminApi, /create_audit/);
  assert.match(adminApi, /rollback_conflict/);
  assert.match(adminApi, /post_status'\s*=>\s*'draft'/);
});

test("production guardrails are enforced in backend source", () => {
  assert.match(adminApi, /D35_10_ENDPOINT_PAIRS/);
  assert.match(adminApi, /PRELAUNCH_LOCATION_IDS/);
  assert.match(adminApi, /price=0/);
  assert.match(adminApi, /Route Pair đã tồn tại/);
  assert.match(wizard, /Long Thành đang PRELAUNCH/);
  assert.match(wizard, /không sao chép sang chiều còn lại/);
});

test("wizard follows Day 36B brand and public location display", () => {
  assert.match(page, /getPublicLocationLabel/);
  assert.match(page, /long thanh/);
  assert.match(wizard, /ALO ĐẶT XE/);
  assert.doesNotMatch(wizard, /Gocar VN/);
});
