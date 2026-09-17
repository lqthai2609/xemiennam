# Day 34 — Price Rules Engine on Pricing V2

Status: IMPLEMENTED — production data/deployment pending  
Owner: Core  
Date: 2026-09-17

## Boundary

Pricing V2 remains the only base-price source of truth at `route × direction × vehicle × package`.
The Day 32 zone surcharge remains a separate additive policy. Day 34 adds version-gated rules for
`extra_stop`, `waiting_minute`, `overtime_hour` and `extra_km`; it does not add any operational rate.

Airport routes use the same Location, Route, Direction and Pricing V2 engine. Private address text,
notes and coordinates never select a rule. Multi-stop quantities are derived server-side from the
validated booking rows.

## Route policy contract

`price_modifier_policy_version >= 1` activates `price_modifier_rules_v2`. Each rule has:

- stable `rule_key`;
- one modifier type;
- optional direction, vehicle ID and package key scope;
- `charge_mode`: `none`, `fixed` or `contact`;
- for fixed rules only: positive `amount_per_unit`;
- non-negative `included_units` and positive `increment_units`;
- optional contact text.

The most specific applicable rule wins. If two rules have equal highest specificity, resolution is
`contact`; the engine never guesses. Missing policy, missing applicable rule and an invalid fixed
amount also resolve to `contact`. A `none` result must be explicit unless the measured quantity is zero.

## Calculation contract

For a fixed modifier:

`billable_units = ceil(max(0, quantity - included_units) / increment_units)`

`modifier_amount = billable_units × amount_per_unit`

`estimated_total` exists only when:

1. the exact Pricing V2 base row is fixed and positive;
2. surcharge resolves to `none` or a positive fixed amount;
3. every applicable modifier resolves to `none` or a positive fixed amount.

Then:

`estimated_total = base_price + surcharge_amount + sum(modifier_amount)`

This is an estimated booking snapshot, not quoted price, recognized revenue or a public SEO value.
Contact and disabled states never become zero.

## Booking snapshot

Booking V2 persists the resolution mode/reason, base-price snapshot when valid, modifier rows,
modifier total when positive and estimated total only when fully resolved. The client cannot submit
base price, surcharge amount, modifier amount or total as authoritative input.

## Production gate

No route policy may be activated until an operator approves every rule and its scope. Gocar Core
0.7.0 must be deployed, REST read-back verified and representative fixed/contact/ambiguous cases
tested. Until then, applicable modifiers remain `contact`.
