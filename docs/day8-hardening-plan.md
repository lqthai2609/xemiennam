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
