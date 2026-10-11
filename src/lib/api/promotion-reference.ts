import "server-only";
import type { WPRoute, WPVehicle } from "./raw";
import type { PromotionModel, PromotionReference, PromotionTuple } from "./promotion-model";
import { mapWPRouteToRoutePairV2 } from "./route-directions";

const version = (input: unknown): number | undefined => {
  const value = typeof input === "string" && /^\d+$/.test(input) ? Number(input) : input;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
};
/** Build current gates from CMS snapshots, never from client readiness or promotion scope claims. */
export function promotionReferenceFromSnapshot(routes: WPRoute[], vehicles: WPVehicle[]) {
  return (tuple: PromotionTuple, model: PromotionModel): PromotionReference => {
    const route = routes.find((item) => item.id === tuple.route_id);
    const vehicle = vehicles.find((item) => item.id === tuple.vehicle_id);
    if (!route || !vehicle || route.status !== "publish" || vehicle.status !== "publish") return { exists: false };
    const pair = mapWPRouteToRoutePairV2(route);
    const pricing = route.meta as WPRoute["meta"] & { pricing_packages_v2?: { direction?: unknown; vehicle_id?: unknown; package_key?: unknown }[] };
    const rows = (Array.isArray(pricing.pricing_packages_v2) ? pricing.pricing_packages_v2 : []).filter((item) => item.direction === tuple.direction
      && version(item.vehicle_id) === tuple.vehicle_id && item.package_key === tuple.package_key);
    const rawMeta = route.meta as WPRoute["meta"] & { outbound_enabled?: unknown; inbound_enabled?: unknown };
    const directionEnabled = [true, 1, "1"].includes(rawMeta[`${tuple.direction}_enabled`] as boolean | number | string);
    const ref: PromotionReference = {
      exists: rows.length === 1, readinessVersion: version(route.meta.content_readiness_version),
      prelaunch: route.meta.content_service_state === "prelaunch" || [pair.originLocationId, pair.destinationLocationId].includes(9102),
      mappingBlocked: route.meta.content_mapping_state !== "clear",
      activationReady: Boolean(version(route.meta.content_readiness_version)) && route.meta.content_service_state === "live" && directionEnabled,
    };
    if (model.discount.kind === "free_surcharge") {
      const discount = model.discount;
      const matches = (route.meta.zone_surcharge_rules_v2 ?? []).filter((rule) => rule.rule_key === discount.rule_key
        && (!rule.direction || rule.direction === tuple.direction) && (!rule.vehicle_id || Number(rule.vehicle_id) === tuple.vehicle_id)
        && (!rule.package_key || rule.package_key === tuple.package_key));
      ref.surchargeExists = version(route.meta.surcharge_policy_version) === discount.policy_version && matches.length === 1
        && matches[0].surcharge_mode === "fixed" && Boolean(version(matches[0].amount));
    }
    return ref;
  };
}
