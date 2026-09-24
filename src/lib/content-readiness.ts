import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";
import type { Route } from "@/types/route";

export type EditorialReadinessState = "missing" | "draft" | "review" | "ready";
export type ServiceReadinessState = "unknown" | "prelaunch" | "live" | "paused";
export type CanonicalReadinessState = "missing" | "candidate" | "verified";
export type MappingReadinessState = "clear" | "d35_10_blocked";
export type RequestedIndexabilityState = "noindex" | "index";
export type SchemaReadinessState = "none" | "service" | "offer";

export type ContentReadinessRecord = {
  version: number;
  editorialState: EditorialReadinessState;
  serviceState: ServiceReadinessState;
  canonicalState: CanonicalReadinessState;
  mappingState: MappingReadinessState;
  requestedIndexability: RequestedIndexabilityState;
  schemaState: SchemaReadinessState;
  reasonCode?: string;
  sourceRef?: string;
};

export type ContentReadinessDecision = {
  policyActive: boolean;
  indexable: boolean;
  sitemapEligible: boolean;
  serviceSchemaEligible: boolean;
  offerSchemaEligible: boolean;
  reasons: string[];
};

export function resolveContentReadiness(
  record: ContentReadinessRecord | undefined,
  options: { prelaunch?: boolean; hasFixedOffer?: boolean } = {},
): ContentReadinessDecision {
  const prelaunch = options.prelaunch === true;

  if (!record || !Number.isInteger(record.version) || record.version < 1) {
    return {
      policyActive: false,
      indexable: !prelaunch,
      sitemapEligible: !prelaunch,
      serviceSchemaEligible: !prelaunch,
      offerSchemaEligible: !prelaunch && options.hasFixedOffer === true,
      reasons: [prelaunch ? "prelaunch" : "policy_inactive"],
    };
  }

  const reasons: string[] = [];
  if (prelaunch || record.serviceState === "prelaunch") reasons.push("prelaunch");
  if (record.serviceState !== "live") reasons.push("service_not_live");
  if (record.editorialState !== "ready") reasons.push("editorial_not_ready");
  if (record.canonicalState !== "verified") reasons.push("canonical_not_verified");
  if (record.mappingState === "d35_10_blocked") reasons.push("d35_10_blocked");
  if (record.requestedIndexability !== "index") reasons.push("index_not_requested");

  const indexable = reasons.length === 0;
  const serviceSchemaEligible = indexable && (record.schemaState === "service" || record.schemaState === "offer");
  const offerSchemaEligible =
    serviceSchemaEligible && record.schemaState === "offer" && options.hasFixedOffer === true;

  return {
    policyActive: true,
    indexable,
    sitemapEligible: indexable,
    serviceSchemaEligible,
    offerSchemaEligible,
    reasons: indexable ? ["ready"] : Array.from(new Set(reasons)),
  };
}

function routeHasFixedOffer(route: Route): boolean {
  if (!route.pricingV2) return false;
  return [route.pricingV2.outbound, route.pricingV2.inbound].some(
    (direction) =>
      direction.enabled &&
      direction.packages.some(
        (item) => item.mode === "fixed" && typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0,
      ),
  );
}

export function resolveRouteContentReadiness(route: Route): ContentReadinessDecision {
  return resolveContentReadiness(route.contentReadiness, {
    prelaunch: isPrelaunchAirportRoute(route),
    hasFixedOffer: routeHasFixedOffer(route),
  });
}


/** SEO-005: prelaunch and D35-10 block every JSON-LD type on commercial Route pages. */
export function routeStructuredDataAllowed(route: Route, decision: ContentReadinessDecision = resolveRouteContentReadiness(route)): boolean {
  return !isPrelaunchAirportRoute(route)
    && route.contentReadiness?.serviceState !== "prelaunch"
    && route.contentReadiness?.mappingState !== "d35_10_blocked"
    && !decision.reasons.includes("prelaunch")
    && !decision.reasons.includes("d35_10_blocked");
}
