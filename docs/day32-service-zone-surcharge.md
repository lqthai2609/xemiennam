# Day 32 — Service Zone and Surcharge Contract

Status: CODE COMPLETE — production data/deployment pending  
Owner: Gocar VN — Core  
Base: `main@d352b84fc1712f643c5cea900c70ec252eed1035`

## 1. Boundary

- Route/Direction V2 remains the journey source of truth.
- Location V2 owns service-area classification.
- Pricing V2 remains the base-price source of truth.
- Route V2 owns the additive zone-surcharge policy.
- Booking V2 stores the resolved result for that booking instance.
- Exact pickup/dropoff addresses and notes never classify a zone and never feed SEO.

## 2. Location contract

| Field | Values | Meaning |
| --- | --- | --- |
| `service_zone_id` | managed slug | Stable operational zone identity |
| `service_zone_tier` | `center`, `suburb`, `outskirt` | Closed reporting taxonomy |
| `service_area_status` | `covered`, `contact`, `outside` | Whether automated evaluation is allowed |

Blank, unknown or malformed values are unverified. They must not be interpreted as covered.

## 3. Route surcharge contract

`surcharge_policy_version >= 1` explicitly activates a route policy. Until then, resolution is
`contact`. Rules are stored in `zone_surcharge_rules_v2` and may scope by:

- zone and pickup/dropoff/either side;
- direction;
- vehicle ID;
- package key.

Supported modes are `none`, `fixed` and `contact`. A fixed rule requires `amount > 0`; otherwise
it is sanitized/resolved as `contact`. Multiple matching fixed rules are additive. The amount is
never merged into the Pricing V2 base price and is never exposed as revenue.

## 4. Booking result

The API resolves only from canonical Route and Location records and persists:

- `pickup_service_zone_id`;
- `dropoff_service_zone_id`;
- `surcharge_mode`;
- `surcharge_amount` only when the result is fixed and positive;
- `surcharge_rule_keys` for audit traceability.

Booking capture remains available when evaluation returns `contact`; an operator can quote later.

## 5. Fallback matrix

| Condition | Result |
| --- | --- |
| Policy version missing/inactive | `contact` |
| Location missing zone | `contact` |
| Status is `contact`, `outside` or unverified | `contact` |
| Matching rule requests contact | `contact` |
| Fixed rule has missing/zero/negative amount | `contact` |
| Active policy, verified covered zones, no matching surcharge | `none` |
| All matched fixed rules valid | `fixed`, positive sum |

## 6. Rollout gate

Code completion does not authorize fabricated operational data. Before enabling version 1 for any
route, an operator must approve the Location zone catalog and every surcharge rule. Production
verification requires Gocar Core 0.5.0 deployment plus representative REST read-back and a safe
booking smoke test.
