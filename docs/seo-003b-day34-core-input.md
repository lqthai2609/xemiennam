# Core Input for SEO-003B Day 34 — Price × Vehicle × Modifier

Status: READY FOR SEO MAPPING  
Owner: Core → Organic Growth  
Dependency: DEP-005

## Technical truth available to SEO

- Base price owner: Pricing V2 (`route × direction × vehicle × package`).
- Base modes: `fixed`, `contact`, `disabled`; only fixed positive prices are numeric/public candidates.
- Additive service-zone result: `none`, `fixed`, `contact` from Day 32.
- Day 34 modifiers: extra stop, waiting minute, overtime hour and extra kilometre.
- Modifier policies are version-gated and inactive by default.
- A numeric estimated total exists only when base, surcharge and every applicable modifier resolve.
- Airport is a Location entity and has no separate pricing engine.
- Booking addresses, stop addresses, notes and other PII are forbidden SEO sources.

## SEO-003B requested output

Extend the 15 deferred price clusters in Keyword Universe v0.5 into a Price × Vehicle × Modifier query
map. For every row provide cluster ID, keyword/theme, intent, entity/direction, vehicle scope, package or
modifier, canonical owner recommendation, data requirement, allowed price state, URL/readiness state,
priority and cannibalization note.

SEO must decide whether each price intent belongs to a section on the existing Route/Airport Route,
a reusable price-support module, or a genuinely distinct future page. Day 34 does not authorize new URLs.

## Required guards

- Do not invent prices, rates, included allowances, thresholds or surcharges.
- Do not use price zero or clone a price across direction, route, vehicle, package or airport.
- `contact` is a state, not a numeric offer.
- `disabled` must not generate a price landing or Offer schema.
- Modifier wording may be public only when the corresponding policy/rule is approved and the conditions
  are expressible without private booking data.
- Estimated totals are booking-instance outputs, not stable SEO prices.
- Avoid separate canonical pages for every modifier unless demand and unique content are later proven.

## Core acceptance criteria

1. All 15 Day 33 price-dependent clusters are accounted for.
2. Route, Airport Route, Province Hub, Airport Hub, Guide and Price intent have one owner each.
3. Vehicle/package/modifier variants do not create mechanical thin-page recommendations.
4. Every numeric-price recommendation requires fixed positive Pricing V2 data.
5. Surcharge/modifier content carries explicit data/readiness dependencies.
6. No private address, booking note, coordinates or PII appears in the map.
7. URL gaps remain recommendations for Day 35; they are not implementation requests.
