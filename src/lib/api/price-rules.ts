import { resolveCondition, type PriceConditionResolution } from "./price-conditions";
import type { WPRoute } from "./raw";
import type { LocationV2 } from "./locations";
import {
  getPackageV2,
  mapWPRouteToPricingPackagesV2,
  normalizePricingPackageKey,
  type PricingMode,
} from "./pricing-v2";
import { mapWPRouteToRoutePairV2, type RouteDirectionKey } from "./route-directions";
import { resolveSurchargeV2, type SurchargeResolution } from "./service-zones";

export const PRICE_MODIFIER_TYPES = ["extra_stop", "waiting_minute", "overtime_hour", "extra_km"] as const;
export type PriceModifierType = (typeof PRICE_MODIFIER_TYPES)[number];
export type PriceRuleMode = "none" | "fixed" | "contact";

export interface PriceRuleContext {
  route: WPRoute | undefined;
  direction: RouteDirectionKey;
  vehicleId: number | null;
  packageKey?: string;
  pickup: LocationV2 | undefined;
  dropoff: LocationV2 | undefined;
  quantities?: Partial<Record<PriceModifierType, number>>;
  /** Local service date/time. No timezone conversion is attempted. */
  departureDate?: string;
  departureTime?: string;
}

export interface PriceModifierResolution {
  type: PriceModifierType;
  quantity: number;
  billableUnits: number;
  mode: PriceRuleMode;
  amount?: number;
  ruleKey?: string;
  reason: "not_applicable" | "fixed" | "explicit_none" | "policy_missing" | "rule_missing" | "ambiguous_rule" | "contact_rule";
}

export interface PriceRulesResolution {
  mode: PricingMode;
  currency: "VND";
  basePrice?: number;
  surcharge: SurchargeResolution;
  modifiers: PriceModifierResolution[];
  condition: PriceConditionResolution;
  modifierAmount?: number;
  estimatedTotal?: number;
  reason: "fixed" | "base_contact" | "base_disabled" | "base_missing" | "direction_disabled" | "surcharge_contact" | "modifier_contact" | "condition_contact";
}

type ModifierRule = NonNullable<WPRoute["meta"]["price_modifier_rules_v2"]>[number];
function nonNegative(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function positive(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function policyVersion(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 0;
}

function normalizedQuantity(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function matches(rule: ModifierRule, type: PriceModifierType, context: PriceRuleContext): boolean {
  if (rule.modifier_type !== type) return false;
  if (rule.direction && rule.direction !== context.direction) return false;
  if (rule.vehicle_id && Number(rule.vehicle_id) !== context.vehicleId) return false;
  if (rule.package_key && normalizePricingPackageKey(rule.package_key) !== normalizePricingPackageKey(context.packageKey)) return false;
  return true;
}

function specificity(rule: ModifierRule): number {
  return Number(Boolean(rule.direction)) + Number(Boolean(rule.vehicle_id)) + Number(Boolean(rule.package_key));
}

function resolveModifier(
  type: PriceModifierType,
  quantity: number,
  context: PriceRuleContext,
): PriceModifierResolution {
  if (quantity <= 0) return { type, quantity: 0, billableUnits: 0, mode: "none", reason: "not_applicable" };
  if (!context.route || policyVersion(context.route.meta.price_modifier_policy_version) < 1) {
    return { type, quantity, billableUnits: quantity, mode: "contact", reason: "policy_missing" };
  }

  const candidates = (context.route.meta.price_modifier_rules_v2 ?? []).filter((rule) => matches(rule, type, context));
  if (!candidates.length) return { type, quantity, billableUnits: quantity, mode: "contact", reason: "rule_missing" };

  const topScore = Math.max(...candidates.map(specificity));
  const selected = candidates.filter((rule) => specificity(rule) === topScore);
  if (selected.length !== 1) return { type, quantity, billableUnits: quantity, mode: "contact", reason: "ambiguous_rule" };

  const rule = selected[0];
  const included = nonNegative(rule.included_units) ?? 0;
  const increment = positive(rule.increment_units) ?? 1;
  const billableUnits = Math.ceil(Math.max(0, quantity - included) / increment);
  const ruleKey = rule.rule_key?.trim() || undefined;

  if (billableUnits === 0 || rule.charge_mode === "none") {
    return { type, quantity, billableUnits, mode: "none", ruleKey, reason: "explicit_none" };
  }
  if (rule.charge_mode !== "fixed") {
    return { type, quantity, billableUnits, mode: "contact", ruleKey, reason: "contact_rule" };
  }

  const amountPerUnit = positive(rule.amount_per_unit);
  if (!amountPerUnit) return { type, quantity, billableUnits, mode: "contact", ruleKey, reason: "contact_rule" };
  return { type, quantity, billableUnits, mode: "fixed", amount: billableUnits * amountPerUnit, ruleKey, reason: "fixed" };
}

/**
 * Day 34 authoritative resolver. It never reads private address text and never invents a rate.
 * A numeric total exists only when the Pricing V2 base and every applicable additive rule are resolved.
 */
export function resolvePriceRulesV2(context: PriceRuleContext): PriceRulesResolution {
  const currency = "VND" as const;
  const requestedPackageKey = context.packageKey?.trim();
  const packageKey = requestedPackageKey ? normalizePricingPackageKey(requestedPackageKey) : undefined;
  const base = context.route && context.vehicleId && packageKey
    ? getPackageV2(mapWPRouteToPricingPackagesV2(context.route).filter((row) => row.source === "v2"), {
        routeId: String(context.route.id),
        routeSlug: context.route.slug,
        direction: context.direction,
        vehicleId: String(context.vehicleId),
        packageKey,
      })
    : undefined;

  const surcharge = resolveSurchargeV2(context.route, {
    direction: context.direction,
    vehicleId: context.vehicleId,
    packageKey,
    pickup: context.pickup,
    dropoff: context.dropoff,
  });

  const modifiers = PRICE_MODIFIER_TYPES.map((type) =>
    resolveModifier(type, normalizedQuantity(context.quantities?.[type]), { ...context, packageKey }),
  );
  const condition = resolveCondition(context, packageKey);

  if (context.route && !mapWPRouteToRoutePairV2(context.route)[context.direction].enabled) {
    return { mode: "disabled", currency, surcharge, modifiers, condition, reason: "direction_disabled" };
  }
  if (!base) return { mode: "contact", currency, surcharge, modifiers, condition, reason: "base_missing" };
  if (base.mode === "disabled") return { mode: "disabled", currency, surcharge, modifiers, condition, reason: "base_disabled" };
  if (base.mode !== "fixed" || !base.price) return { mode: "contact", currency, surcharge, modifiers, condition, reason: "base_contact" };
  if (surcharge.mode === "contact") return { mode: "contact", currency, basePrice: base.price, surcharge, modifiers, condition, reason: "surcharge_contact" };
  if (modifiers.some((item) => item.mode === "contact")) {
    return { mode: "contact", currency, basePrice: base.price, surcharge, modifiers, condition, reason: "modifier_contact" };
  }
  if (condition.mode === "contact") return { mode: "contact", currency, basePrice: base.price, surcharge, modifiers, condition, reason: "condition_contact" };

  const modifierAmount = modifiers.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const surchargeAmount = surcharge.mode === "fixed" ? surcharge.amount ?? 0 : 0;
  const conditionAmount = condition.mode === "fixed" ? condition.amount ?? 0 : 0;
  if (!Number.isFinite(base.price + surchargeAmount + modifierAmount + conditionAmount) || base.price + surchargeAmount + modifierAmount + conditionAmount > Number.MAX_SAFE_INTEGER) {
    return { mode: "contact", currency, basePrice: base.price, surcharge, modifiers, condition, reason: "condition_contact" };
  }
  return {
    mode: "fixed",
    currency,
    basePrice: base.price,
    surcharge,
    modifiers,
    condition,
    modifierAmount,
    estimatedTotal: base.price + surchargeAmount + modifierAmount + conditionAmount,
    reason: "fixed",
  };
}
