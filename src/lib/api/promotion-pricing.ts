import "server-only";
import { PROMOTION_COMMERCIAL_ENABLED } from "./promotion-model";
import { resolvePriceRulesV2, type PriceRuleContext } from "./price-rules";
import { evaluatePromotionRules, promotionWithoutApplication, type PromotionEvaluationContext, type PromotionRecord } from "./promotion-evaluator";
import type { WPRoute, WPVehicle } from "./raw";
import { promotionReferenceFromSnapshot } from "./promotion-reference";
import { normalizePricingPackageKey } from "./pricing-v2";

/** Shared server entry point, after Pricing V2. No request flag, time or client money is accepted. */
export async function resolvePriceRulesWithPromotion(context: PriceRuleContext, loadSource?: () => Promise<{ records: PromotionRecord[]; routes: WPRoute[]; vehicles: WPVehicle[] }>) {
  const pricing = resolvePriceRulesV2(context);
  const promotionContext: PromotionEvaluationContext = {
    ...(context.route && context.vehicleId && context.packageKey ? { tuple: {
      route_id: context.route.id, direction: context.direction, vehicle_id: context.vehicleId,
      package_key: normalizePricingPackageKey(context.packageKey),
    } } : {}),
    departureDate: context.departureDate, departureTime: context.departureTime,
  };
  if (!PROMOTION_COMMERCIAL_ENABLED) return promotionWithoutApplication(pricing, promotionContext, Date.now(), "disabled");
  if (!loadSource) return promotionWithoutApplication(pricing, promotionContext, Date.now(), "none");
  try {
    // Loader must obtain private models and current references without a stale cache.
    const source = await loadSource();
    return evaluatePromotionRules(pricing, promotionContext, { records: source.records, reference: promotionReferenceFromSnapshot(source.routes, source.vehicles) }, Date.now());
  } catch {
    return promotionWithoutApplication(pricing, promotionContext, Date.now(), "invalid_config");
  }
}
