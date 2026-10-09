import { z } from "zod";

/** Day 42 contract only. Enabling commerce requires a later reviewed release. */
export const PROMOTION_COMMERCIAL_ENABLED = false;
export const PROMOTION_MODEL_VERSION = 1;
export const PROMOTION_TIMEZONE = "Asia/Ho_Chi_Minh";
const integer = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const text = z.string().refine((v) => v.trim().length > 0 && new TextEncoder().encode(v).length <= 500 && !/[<>]/.test(v), "Nội dung cần là văn bản thuần, tối đa 500 byte UTF-8.");
const key = z.string().regex(/^[a-z0-9_-]{1,80}$/);
const date = z.string().refine(isPromotionDate, "Ngày phải có dạng YYYY-MM-DD và tồn tại.");
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/)
  .refine((v) => isPromotionDate(v.slice(0, 10)) && Number.isFinite(Date.parse(v)) && Number(v.slice(11, 13)) < 24 && Number(v.slice(14, 16)) < 60 && Number(v.slice(17, 19)) < 60, "Thời điểm phê duyệt không hợp lệ.");
const tuple = z.strictObject({ route_id: integer, direction: z.enum(["outbound", "inbound"]), vehicle_id: integer, package_key: key });
const approval = z.strictObject({ status: z.enum(["draft", "approved", "rejected"]), owner: text, source_ref: text, approved_at: timestamp.nullable() });
const discount = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("fixed_discount"), target: z.enum(["base_price", "estimated_total"]), amount_vnd: integer }),
  z.strictObject({ kind: z.literal("percent_discount"), target: z.enum(["base_price", "estimated_total"]), rate_bps: integer.max(9999) }),
  z.strictObject({ kind: z.literal("special_price"), target: z.literal("base_price"), amount_vnd: integer }),
  z.strictObject({ kind: z.literal("benefit"), target: z.literal("none"), title: text, rule: text }),
  z.strictObject({ kind: z.literal("free_surcharge"), target: z.literal("surcharge"), rule_key: key, policy_version: integer, cap_vnd: integer.optional() }),
]);
const conditions = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("departure_date_range"), start_date: date, end_date: date }),
  z.strictObject({ kind: z.literal("departure_weekdays"), days: z.array(z.number().int().min(0).max(6)).min(1).max(7) }),
  z.strictObject({ kind: z.literal("advance_booking_minutes"), minimum: integer }),
  z.strictObject({ kind: z.literal("min_eligible_amount"), amount_vnd: integer }),
]);
const modelSchema = z.strictObject({
  model_version: z.literal(PROMOTION_MODEL_VERSION), revision: integer, enabled: z.boolean().default(false),
  approval, discount, priority: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  scopes: z.array(tuple).min(1).max(1000),
  scope_policy: z.strictObject({ route: z.enum(["selected", "all"]), direction: z.enum(["selected", "all"]), vehicle: z.enum(["selected", "all"]), package: z.enum(["selected", "all"]) }),
  activation: z.strictObject({ owner: text, source_ref: text, approved_at: timestamp, version: integer,
    tuples: z.array(tuple.extend({ readiness_version: integer })).min(1).max(1000) }).optional(),
  window: z.strictObject({ start_date: date, end_date: date, timezone: z.literal(PROMOTION_TIMEZONE) }),
  conditions: z.array(conditions).max(20),
});
export type PromotionModel = z.infer<typeof modelSchema>;
export type PromotionTuple = z.infer<typeof tuple>;
export type PromotionReference = { exists: boolean; prelaunch?: boolean; mappingBlocked?: boolean; readinessVersion?: number; activationReady?: boolean; surchargeExists?: boolean };
export type PromotionIssue = { field: string; code: string; message: string };
export type PromotionValidation = { valid: true; model: PromotionModel } | { valid: false; errors: PromotionIssue[] };

export function isPromotionDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return false;
  const parsed = new Date(`${value}T00:00:00+07:00`);
  return Number.isFinite(parsed.getTime()) && new Date(parsed.getTime() + 7 * 3600000).toISOString().slice(0, 10) === value;
}

/** Administrative percentage input: never round, coerce booleans or accept exponents. */
export function parsePromotionPercent(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{1,2}(\.\d{1,2})?$/.test(value)) return undefined;
  const [whole, fraction = ""] = value.split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return bps >= 1 && bps <= 9999 ? bps : undefined;
}

export function promotionTupleKey(scope: PromotionTuple): string {
  return `${scope.route_id}:${scope.direction}:${scope.vehicle_id}:${scope.package_key}`;
}

/** Exact tuples are always the upper bound, even when an axis is explicitly all. */
export function validatePromotionModel(input: unknown, reference: (tuple: PromotionTuple, model: PromotionModel) => PromotionReference): PromotionValidation {
  const parsed = modelSchema.safeParse(input);
  if (!parsed.success) return { valid: false, errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), code: "invalid_config", message: issue.message })) };
  const model = parsed.data;
  const errors: PromotionIssue[] = [];
  const error = (field: string, code: string, message: string) => errors.push({ field, code, message });
  if (model.window.end_date < model.window.start_date || model.window.end_date === "9999-12-31") error("window.end_date", "invalid_config", "Ngày kết thúc phải từ ngày bắt đầu và có thể tính ngày kế tiếp.");
  if (model.approval.status === "approved" && !model.approval.approved_at) error("approval.approved_at", "unapproved", "Thiếu thời điểm phê duyệt.");
  if (model.approval.status !== "approved" && model.approval.approved_at !== null) error("approval.approved_at", "unapproved", "Bản chưa duyệt không có thời điểm phê duyệt.");
  if (model.enabled && model.approval.status !== "approved") error("enabled", "unapproved", "Chỉ bật chương trình đã duyệt.");
  if ((model.enabled || Object.values(model.scope_policy).includes("all")) && !model.activation) error("activation", "mapping_blocked", "Phải có danh sách tổ hợp được phép, người duyệt và phiên bản.");
  const seen = new Set<string>();
  const whitelist = new Map<string, number>();
  for (const [i, item] of (model.activation?.tuples ?? []).entries()) {
    const k = promotionTupleKey(item);
    if (whitelist.has(k)) error(`activation.tuples.${i}`, "invalid_config", "Tổ hợp lặp.");
    whitelist.set(k, item.readiness_version);
  }
  for (const [i, scope] of model.scopes.entries()) {
    const k = promotionTupleKey(scope);
    if (seen.has(k)) error(`scopes.${i}`, "invalid_config", "Tổ hợp lặp.");
    seen.add(k);
    const ref = reference(scope, model);
    if (!ref.exists) error(`scopes.${i}`, "reference_missing", "Tuyến, chiều, xe hoặc gói không tồn tại trong Pricing V2.");
    if (model.discount.kind === "free_surcharge" && !ref.surchargeExists) error(`scopes.${i}`, "reference_missing", "Không tìm thấy đúng phụ phí và phiên bản đã định giá.");
    if (model.activation && (!whitelist.has(k) || whitelist.get(k) !== ref.readinessVersion || !ref.activationReady || ref.mappingBlocked || ref.prelaunch)) error(`activation.tuples.${i}`, ref.prelaunch ? "prelaunch_blocked" : "mapping_blocked", "Tổ hợp chưa được phép áp dụng hoặc phiên bản đã đổi.");
  }
  for (const k of whitelist.keys()) if (!seen.has(k)) error("activation.tuples", "invalid_config", "Danh sách cho phép không được thêm tổ hợp ngoài phạm vi.");
  for (const [i, condition] of model.conditions.entries()) {
    if (condition.kind === "departure_date_range" && condition.end_date < condition.start_date) error(`conditions.${i}.end_date`, "invalid_config", "Ngày kết thúc trước ngày bắt đầu.");
    if (condition.kind === "departure_weekdays" && new Set(condition.days).size !== condition.days.length) error(`conditions.${i}.days`, "invalid_config", "Ngày trong tuần bị lặp.");
  }
  return errors.length ? { valid: false, errors } : { valid: true, model };
}

/** Reception dates, not trip dates. End is exclusive at the following local midnight. */
export function promotionWindow(window: PromotionModel["window"]): { startAt: number; endExclusive: number } {
  if (window.timezone !== PROMOTION_TIMEZONE || !isPromotionDate(window.start_date) || !isPromotionDate(window.end_date) || window.end_date < window.start_date || window.end_date === "9999-12-31") throw new Error("invalid_promotion_window");
  return { startAt: Date.parse(`${window.start_date}T00:00:00+07:00`), endExclusive: Date.parse(`${window.end_date}T00:00:00+07:00`) + 86400000 };
}

/** No legacy migration or approval inference from post publish/date/discount labels. */
export function readLegacyPromotionForAudit(promotionId: number, meta: Record<string, unknown>) {
  return { promotion_id: promotionId, model_version: 0, enabled: false as const, status: "unapproved" as const,
    legacy: Object.fromEntries(["loai_giam_gia", "gia_tri_giam", "ngay_bat_dau", "ngay_ket_thuc", "ap_dung_route", "ap_dung_vehicle"].map((key) => [key, meta[key]])) };
}
