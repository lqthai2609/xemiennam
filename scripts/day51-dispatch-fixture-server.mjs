/** Local UI transport double only; not WordPress, MySQL or Operations evidence. */
import http from "node:http";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync(new URL("./fixtures/empty-leg.json", import.meta.url)));
const records = new Map(), receipts = new Map(), writes = [];
let counter = 5000, mode = "normal", failOnce = false;
const send = (res, data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  let body = ""; for await (const chunk of req) body += chunk;
  if (path === "/fixture-control") { if (body) { const p = JSON.parse(body); mode = p.mode; failOnce = false; } return send(res, { mode, writes, records: [...records.values()] }); }
  if (path === "/wp-json/gocar/v1/admin/session") return send(res, { id: 7, name: "SYNTHETIC", contract: 1, canPublish: req.headers.authorization === "Bearer synthetic-publisher" });
  const base = "/wp-json/gocar/v1/admin/empty-legs";
  if (path.startsWith(base)) {
    if (!req.headers.authorization?.startsWith("Bearer synthetic-")) return send(res, { message: "Không có quyền." }, 403);
    if (path.endsWith("options")) return send(res, { options: [{ key: "1001:inbound:2001", label: "SYNTHETIC thành phố đến SYNTHETIC điểm đến · xe 7 chỗ", scope: fixture.base.scope, reference: fixture.reference }] });
    const id = Number(path.slice(base.length + 1)) || 0;
    if (req.method === "GET") return id ? send(res, records.get(id) ?? { message: "Không tìm thấy." }, records.has(id) ? 200 : 404) : send(res, { items: [...records.values()], limit: 50 });
    if (req.method !== "POST") return send(res, {}, 405);
    const p = JSON.parse(body); writes.push({ path, body: p });
    if (mode === "conflict") return send(res, { code: "revision_conflict", message: "Chuyến đã được người khác sửa. Tải lại trước khi lưu." }, 409);
    if (receipts.has(p.operation_key)) return send(res, receipts.get(p.operation_key));
    const old = records.get(id), publisher = req.headers.authorization === "Bearer synthetic-publisher";
    if (p.action === "confirm" && !publisher) return send(res, { message: "Không có quyền xác nhận." }, 403);
    if (p.expected_revision !== (old?.model.revision ?? 0)) return send(res, { code: "revision_conflict", message: "Chuyến đã thay đổi." }, 409);
    const model = { ...p.model, revision: (old?.model.revision ?? 0) + 1 };
    const confirmation = p.action === "confirm" ? { actor: 7, at: "2026-10-09T11:30:00Z", revision: model.revision, source_ref: model.approval.source_ref } : null;
    const entry = { actor: 7, at: "2026-10-09T11:30:00Z", action: p.action, reason: p.reason, before: old?.model ?? null, after: model, confirmation };
    const data = { id: id || ++counter, model, confirmation, history: [...(old?.history ?? []), entry], assessment: { state: model.status === "available" ? "eligible" : model.status, sellable: false, commercial_enabled: false } };
    records.set(data.id, data); receipts.set(p.operation_key, data);
    // Deliberately save before returning an error, to exercise uncertain-result retry.
    if (mode === "saved-error" && !failOnce) { failOnce = true; return send(res, { code: "write_failed", message: "Chưa biết kết quả lưu." }, 503); }
    return send(res, data);
  }
  if (req.method !== "GET") return send(res, { message: "No other writes allowed" }, 405);
  return send(res, []);
}).listen(4299, "127.0.0.1", () => console.log("SYNTHETIC dispatch fixture ready; no real CMS, booking or email."));
