# Day 12 — Combo Content Model

## Goal

Give every publishable Route × Vehicle landing page a dedicated editorial content source without coupling content to Pricing V2 or extending `pricingByVehicle` business logic.

## Data contract

WordPress route meta:

```json
{
  "combo_descriptions": [
    {
      "vehicle_id": 123,
      "description": "Hand-written content for this route and vehicle."
    }
  ]
}
```

Rules:

- `vehicle_id` references an existing `vehicle` CPT post.
- `description` is plain editorial text; empty rows are omitted.
- One route must not contain duplicate rows for the same vehicle post.
- Pricing values, pricing mode, package and direction remain owned by Pricing V2.
- The content contract may exist even when the corresponding price row is disabled; rendering/indexability decides whether a page is exposed.

## Frontend mapping

1. `src/lib/api/raw.ts` reads `meta.combo_descriptions`.
2. `src/lib/api/routes.ts` resolves each `vehicle_id` through the vehicle post's canonical `vehicle_type` taxonomy.
3. The normalized route exposes `comboDescriptions` independently from `pricingV2` and `pricingByVehicle`.
4. `src/lib/combo.ts` prefers the normalized CMS description.
5. Legacy `VehiclePrice.comboDescription` remains only for static/mock compatibility.
6. If CMS content is missing, the current safe fallback still renders so production does not break. Missing editorial content does not count as unique SEO content; Day 14 owns noindex/thin-content policy.

## Editorial uniqueness rule

A combo description must contain information that is materially useful for that exact Route × Vehicle combination. Good signals include:

- why the vehicle size/type fits the expected passenger group;
- luggage/capacity considerations that are genuinely relevant;
- pickup/dropoff or trip context specific to the route;
- practical use cases such as family, business group, airport transfer or group travel when applicable;
- route-specific comfort or scheduling considerations that are supported by actual service data.

Do not:

- copy one paragraph across many combo pages and only replace names;
- invent travel time, distance, airport terminal, luggage limits or operational facts;
- hard-code price values into editorial text;
- derive content automatically from Pricing V2 fields and treat it as unique copy;
- reintroduce the old visible brand name.

## Missing-field behavior

`combo_descriptions` is optional during rollout. When the field is absent, empty or contains invalid vehicle references:

- route fetching must not fail;
- Pricing V2 remains unchanged;
- combo page rendering falls back to current safe copy;
- no synthetic CMS row is created;
- the fallback must not be used as evidence that the page has unique content.

## Acceptance criteria

- [ ] Gocar Core v0.2.0 loads without PHP fatal errors.
- [ ] Route edit screen shows the Route × Vehicle content meta box.
- [ ] Saving one description persists a valid `vehicle_id` + `description` row.
- [ ] REST route response exposes `meta.combo_descriptions`.
- [ ] Next.js route mapper resolves the row to canonical `vehicleType`.
- [ ] Combo page uses CMS content when present.
- [ ] Route without the field still renders through fallback.
- [ ] No Pricing V2 behavior changes.
- [ ] No new business logic depends on `pricingByVehicle`.
- [ ] Lint, location migration regression and production build pass before merge.

## Production dependency

The WordPress deployment/verification step depends on access to the connected CMS. Source completion alone is not sufficient to mark Day 12 complete; REST and editor behavior must be verified after deploying Gocar Core v0.2.0.
