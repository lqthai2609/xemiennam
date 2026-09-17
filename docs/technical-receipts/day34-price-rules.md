# Technical Receipt — Day 34 Price Rules Engine

Status: CODE COMPLETE — SEO-003B CORE ACCEPTED; production verification pending  
Owner: Core  
Date: 2026-09-17

## Pre-flight

- Day 32 service-zone/surcharge code is merged; approved production zone/rule data and deployment
  verification remain open. The Day 34 engine preserves its `contact` fallback.
- Day 33 Multi-stop is merged; plugin deployment, REST read-back and mobile QA remain open. Day 34
  derives stop count and waiting minutes only from the validated server payload.
- SEO-003A is Core accepted: 73 clusters, including 15 price-dependent clusters deferred to SEO-003B.
- DEP-002 remains accepted for Day 38/40/55–56 and is not implemented early.

These items are carry-over/pre-flight work, not architecture blockers for source implementation.

## Delivered

- Added a server-side Price Rules Engine on top of the exact Pricing V2 base row.
- Reused the Day 32 surcharge resolver instead of duplicating zone logic.
- Added version-gated modifier rules for extra stop, waiting minute, overtime hour and extra kilometre.
- Added direction/vehicle/package scoping and deterministic most-specific rule selection.
- Added contact fallback for inactive policy, missing rule, duplicate highest-specificity rules and
  invalid fixed amounts.
- Derived stop and waiting quantities server-side; no private address text participates in resolution.
- Persisted Booking V2 audit snapshots and upgraded Gocar Core to 0.7.0.
- Added the Core input/acceptance contract for SEO-003B Price × Vehicle × Modifier.
- Accepted SEO-003B v1.0: 15 parent clusters and 120 Price × Vehicle × Modifier rows, with no new
  URL, invented operational value or modifier landing page.

## Verification

- Day 34 source suite: 4/4 PASS.
- Day 32 service-zone suite: 6/6 PASS.
- Day 33 Multi-stop suite: 4/4 PASS.
- Day 31 Booking V2 suite: 8/8 PASS.
- Schema/pricing regression: 6/6 PASS.
- ESLint: PASS with 5 pre-existing warnings and 0 errors.
- Next.js production build: PASS, 581 static pages generated.
- PHP CLI syntax check: unavailable locally; the package workflow remains the required PHP gate.

## Safety evidence

- No operational rate, price, surcharge, allowance or threshold was added.
- Pricing V2 remains the base-price source of truth; `pricingByVehicle` is not used by the engine.
- Missing package/base, contact base, contact surcharge or unresolved modifier blocks numeric total.
- Disabled base remains disabled.
- Estimated total is not quote or revenue and is not exposed as an SEO price.
- Airport continues to use the shared Location/Route/Direction/Pricing engine.
- Exact pickup/dropoff/stop addresses, notes and PII are absent from rule selection.

## Pending

1. Package and deploy Gocar Core 0.7.0.
2. Enter only operator-approved modifier policies and rules.
3. Verify REST read-back and safe fixed/contact/ambiguous booking fixtures, then remove fixtures.
4. Complete inherited Day 32–33 production checks.
5. Carry D34-01 through D34-09 to their assigned Day 35–41 owners and gates.

Day 34 is not production verified. The source/specification slice is accepted; production gates remain
recorded carry-over work.
