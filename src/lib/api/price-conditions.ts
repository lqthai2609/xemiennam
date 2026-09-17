import { z } from "zod";
import type { WPRoute } from "./raw";
import type { RouteDirectionKey } from "./route-directions";
import { normalizePricingPackageKey } from "./pricing-v2";

export function validLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const numeric = (schema: z.ZodNumber) => z.preprocess(
  (value) => typeof value === "string" && /^\d+(\.\d+)?$/.test(value) ? Number(value) : value,
  schema,
);
const optionalDate = z.union([z.literal(""), z.string().refine(validLocalDate)]).optional();
const optionalTime = z.union([z.literal(""), z.string().regex(timePattern)]).optional();
const days = z.array(numeric(z.number().int().min(0).max(6))).max(7).optional();

// Never discard an invalid predicate: invalid configuration invalidates the whole policy.
const ruleSchema = z.object({
  rule_key: z.string().regex(/^[a-z0-9_-]+$/).max(80),
  priority: numeric(z.number().int().nonnegative().safe()).optional(),
  direction: z.enum(["", "outbound", "inbound"]).optional(),
  vehicle_id: numeric(z.number().int().nonnegative().safe()).optional(),
  package_key: z.string().regex(/^[a-z0-9_-]*$/).max(80).optional(),
  days_of_week: days,
  weekend_only: z.boolean().optional(),
  weekend_days: days,
  holiday_dates: z.array(z.string().refine(validLocalDate)).optional(),
  start_date: optionalDate,
  end_date: optionalDate,
  start_time: optionalTime,
  end_time: optionalTime,
  charge_mode: z.enum(["none", "fixed", "contact"]),
  amount: numeric(z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER)).optional(),
  contact_text: z.string().max(300).optional(),
}).strict().superRefine((rule, ctx) => {
  if (rule.charge_mode === "fixed" && !(rule.amount && rule.amount > 0)) ctx.addIssue({ code: "custom", message: "Positive fixed amount required" });
  if (rule.start_date && rule.end_date && rule.start_date > rule.end_date) ctx.addIssue({ code: "custom", message: "Reversed dates" });
  if (Boolean(rule.start_time) !== Boolean(rule.end_time) || (rule.start_time && rule.start_time === rule.end_time)) ctx.addIssue({ code: "custom", message: "Distinct time boundaries required" });
  if (rule.weekend_only && !rule.weekend_days?.length) ctx.addIssue({ code: "custom", message: "Approved weekend days required" });
});

type Rule = z.infer<typeof ruleSchema>;
type Context = {
  route: WPRoute | undefined;
  direction: RouteDirectionKey;
  vehicleId: number | null;
  departureDate?: string;
  departureTime?: string;
};
export interface PriceConditionResolution {
  mode: "none" | "fixed" | "contact";
  amount?: number;
  ruleKey?: string;
  policyVersion?: number;
  timezone?: string;
  reason: "fixed" | "explicit_none" | "policy_missing" | "invalid_policy" | "rule_missing" | "ambiguous_rule" | "contact_rule" | "date_missing" | "time_missing" | "timezone_missing";
}

function requiresDate(rule: Rule): boolean {
  return Boolean(rule.days_of_week?.length || rule.weekend_only || rule.holiday_dates?.length || rule.start_date || rule.end_date);
}
function requiresTime(rule: Rule): boolean { return Boolean(rule.start_time || rule.end_time); }
function score(rule: Rule): number {
  return Number(Boolean(rule.direction)) + Number(Boolean(rule.vehicle_id)) + Number(Boolean(rule.package_key))
    + Number(requiresDate(rule)) + Number(requiresTime(rule));
}
function validTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}

/** Service-local date/time; only Operations config defines timezone, weekends and holidays. */
export function resolveCondition(context: Context, packageKey: string | undefined): PriceConditionResolution {
  const meta = context.route?.meta;
  const version = meta?.price_condition_policy_version;
  if ((typeof version !== "number" && typeof version !== "string") || !/^\d+$/.test(String(version)) || !Number.isSafeInteger(Number(version)) || Number(version) < 1) {
    return { mode: "contact", reason: "policy_missing" };
  }
  const trace = { policyVersion: Number(version) };
  const parsed = z.array(ruleSchema).safeParse(meta?.price_condition_rules_v2);
  if (!parsed.success || new Set(parsed.data.map((r) => r.rule_key)).size !== parsed.data.length) {
    return { ...trace, mode: "contact", reason: "invalid_policy" };
  }
  const rules = parsed.data.filter((rule) =>
    (!rule.direction || rule.direction === context.direction) &&
    (!rule.vehicle_id || rule.vehicle_id === context.vehicleId) &&
    (!rule.package_key || normalizePricingPackageKey(rule.package_key) === packageKey),
  );
  if (!rules.length) return { ...trace, mode: "contact", reason: "rule_missing" };
  const timezone = meta?.price_condition_timezone;
  if (rules.some((r) => requiresDate(r) || requiresTime(r)) && !validTimezone(timezone)) {
    return { ...trace, mode: "contact", reason: "timezone_missing" };
  }
  const audit = { ...trace, ...(validTimezone(timezone) ? { timezone } : {}) };
  if (rules.some(requiresDate) && (!context.departureDate || !validLocalDate(context.departureDate))) {
    return { ...audit, mode: "contact", reason: "date_missing" };
  }
  // Date predicates eliminate non-applicable time windows before requiring a clock time.
  const dateMatched = rules.filter((rule) => {
    if (!requiresDate(rule)) return true;
    const date = context.departureDate!;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return (!rule.days_of_week?.length || rule.days_of_week.includes(weekday)) &&
      (!rule.weekend_only || rule.weekend_days!.includes(weekday)) &&
      (!rule.holiday_dates?.length || rule.holiday_dates.includes(date)) &&
      (!rule.start_date || date >= rule.start_date) && (!rule.end_date || date <= rule.end_date);
  });
  if (dateMatched.some(requiresTime) && (!context.departureTime || !timePattern.test(context.departureTime))) {
    return { ...audit, mode: "contact", reason: "time_missing" };
  }
  const candidates = dateMatched.filter((rule) => {
    if (!requiresTime(rule)) return true;
    const time = context.departureTime!;
    return rule.start_time! < rule.end_time!
      ? time >= rule.start_time! && time < rule.end_time!
      : time >= rule.start_time! || time < rule.end_time!;
  });
  if (!candidates.length) return { ...audit, mode: "contact", reason: "rule_missing" };
  const priority = Math.max(...candidates.map((r) => r.priority ?? 0));
  const prioritized = candidates.filter((r) => (r.priority ?? 0) === priority);
  const specificity = Math.max(...prioritized.map(score));
  const selected = prioritized.filter((r) => score(r) === specificity);
  if (selected.length !== 1) return { ...audit, mode: "contact", reason: "ambiguous_rule" };
  const rule = selected[0];
  if (rule.charge_mode === "none") return { ...audit, mode: "none", ruleKey: rule.rule_key, reason: "explicit_none" };
  if (rule.charge_mode !== "fixed") return { ...audit, mode: "contact", ruleKey: rule.rule_key, reason: "contact_rule" };
  return { ...audit, mode: "fixed", amount: rule.amount!, ruleKey: rule.rule_key, reason: "fixed" };
}
