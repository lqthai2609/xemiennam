# Day 8 hardening plan

## Booking

- Route-originated booking sends the stable WordPress Route ID when available.
- `/api/booking` prefers that ID and keeps `A – B` label matching only for backward compatibility and generic forms.
- Direction, package key and pricing mode are separate request fields.
- Until dedicated `booking_request` meta is registered in WordPress, the structured values are preserved in the operator note instead of writing unregistered meta keys.
- Airport routes use the same Route ID flow as normal routes.

## Pricing compatibility

- Pricing V2 (`route × direction × vehicle × package`) is the source of truth.
- `pricingByVehicle` remains frozen as an outbound presentation adapter only; no new business rule may depend on it.
- Existing consumers should migrate in this order: static URL generation, route finder/discovery, price page/cards, then mock/type cleanup.
- Remove `pricingByVehicle` only after V2 selectors cover those consumers and regression coverage includes fixed/contact/disabled plus outbound/inbound.

## Mock data

- `shouldUseMockFallback()` is the shared policy for route, vehicle, blog, service, promotion and testimonial consumers.
- Vercel production always disables mock fallback.
- Development/preview may use fixtures, with explicit environment override for controlled testing.

## Migration execution

- Read-only audit before migration: 87 routes, 3 existing Locations, 86 legacy Route Pairs.
- Controlled dry-run: 71 new Locations, one Vũng Tàu metadata correction, zero pricing collisions, seven ambiguous compound labels kept as `custom`.
- Two City Tour destination labels are excluded from Location creation because they describe service packages rather than geographic entities. Those two routes keep legacy Location fallback until City Tour is separated from intercity Route data; their Pricing V2 rows still migrate.
- Legacy prices copy to outbound `one_way`. Missing or non-positive legacy prices become `contact`, never numeric zero.
- Inbound starts as `contact` for the same vehicle combinations when no inbound price exists.
- Legacy `pricing_by_vehicle` is preserved as compatibility data.
- The one-time migration runner probes authenticated WordPress access before any write and is removed after execution.

## Exit gate

Day 8 is complete only after migration apply succeeds, post-migration audit is clean for the intended scope, Airport seed is present, preview smoke QA passes, temporary migration endpoints are deleted, CI is green, and the final change is deployed.

This document follows the project rule that Pricing V2 is canonical, Airport uses the shared Location/Route/Pricing engine, production cannot silently use mock data, and system quality gates belong in CI.
