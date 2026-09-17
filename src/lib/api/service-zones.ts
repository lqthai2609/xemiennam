import type { WPRoute } from "./raw";
import type { LocationV2 } from "./locations";
import type { RouteDirectionKey } from "./route-directions";

export type SurchargeMode = "none" | "fixed" | "contact";

export interface SurchargeResolution {
  mode: SurchargeMode;
  amount?: number;
  matchedRuleKeys: string[];
  reason: "fixed" | "no_surcharge" | "policy_missing" | "zone_unverified" | "contact_rule";
}

export interface SurchargeContext {
  direction: RouteDirectionKey;
  vehicleId: number | null;
  packageKey?: string;
  pickup: LocationV2 | undefined;
  dropoff: LocationV2 | undefined;
}

type Rule = NonNullable<WPRoute["meta"]["zone_surcharge_rules_v2"]>[number];

const positiveAmount = (value: unknown): number | undefined => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

const policyVersion = (value: unknown): number => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
};

function applies(rule: Rule, side: "pickup" | "dropoff", zoneId: string, context: SurchargeContext): boolean {
  const ruleSide = rule.applies_to ?? "either";
  if (rule.zone_id?.trim() !== zoneId || (ruleSide !== "either" && ruleSide !== side)) return false;
  if (rule.direction && rule.direction !== context.direction) return false;
  if (rule.vehicle_id && Number(rule.vehicle_id) !== context.vehicleId) return false;
  if (rule.package_key && rule.package_key !== context.packageKey) return false;
  return true;
}

/**
 * Resolve only from configured Location/Route data. Exact private address text is deliberately
 * absent from the input and can never become a zone or surcharge source.
 */
export function resolveSurchargeV2(route: WPRoute | undefined, context: SurchargeContext): SurchargeResolution {
  if (!route || policyVersion(route.meta.surcharge_policy_version) < 1) {
    return { mode: "contact", matchedRuleKeys: [], reason: "policy_missing" };
  }

  const endpoints = [["pickup", context.pickup], ["dropoff", context.dropoff]] as const;
  if (endpoints.some(([, location]) => !location?.serviceZoneId || location.serviceAreaStatus !== "covered")) {
    return { mode: "contact", matchedRuleKeys: [], reason: "zone_unverified" };
  }

  const rules = Array.isArray(route.meta.zone_surcharge_rules_v2) ? route.meta.zone_surcharge_rules_v2 : [];
  const matched = endpoints.flatMap(([side, location]) =>
    rules.filter((rule) => applies(rule, side, location!.serviceZoneId!, context)).map((rule, index) => ({rule, key: `${side}:${rule.zone_id}:${index}`})),
  );

  if (matched.some(({ rule }) => rule.surcharge_mode === "contact" || (rule.surcharge_mode === "fixed" && !positiveAmount(rule.amount)))) {
    return { mode: "contact", matchedRuleKeys: matched.map(({ key }) => key), reason: "contact_rule" };
  }

  const fixed = matched.map(({ rule }) => positiveAmount(rule.amount)).filter((amount): amount is number => Boolean(amount));
  if (fixed.length) {
    return { mode: "fixed", amount: fixed.reduce((sum, amount) => sum + amount, 0), matchedRuleKeys: matched.map(({ key }) => key), reason: "fixed" };
  }

  return { mode: "none", matchedRuleKeys: matched.map(({ key }) => key), reason: "no_surcharge" };
}
