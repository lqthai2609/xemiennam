# Technical Receipt — SEO-003B Day 34 Core Acceptance

Status: CORE ACCEPTED  
Dependency: DEP-005  
Date: 2026-09-17  
Owner: Core + Organic Growth

## Accepted evidence

- All 15 price-dependent parent clusters from Keyword Universe v0.5 are present.
- Each parent has exactly eight layers: base, vehicle, package, surcharge, extra stop, waiting minute,
  overtime hour and extra kilometre; total mapping rows are 120.
- Every row contains the required intent, entity/direction, vehicle, package/modifier, canonical owner,
  data requirement, allowed state, readiness, priority and cannibalization fields.
- No operational price, surcharge, allowance or threshold is present in the deliverable.
- Price intent remains a support section/module on its Route Detail or Airport Route owner. Day 34
  creates no URL, Price page or modifier landing page.
- Long Thanh remains prelaunch and has no network-level price canonical.
- Exact tuple rules, contact/disabled guards, airport reuse and PII exclusion match the Core contract.

## Core semantic normalization

Core accepts the SEO-003B public rendering proposal with this mandatory distinction:

1. A verified positive fixed Pricing V2 value may be presented only as the exact tuple's **base price**,
   clearly labelled as such. It must not imply an all-in total when surcharge or modifiers are unresolved.
2. A numeric **estimated total** may exist only for a booking instance when the base price, surcharge and
   every actually applicable modifier resolve completely. It is not a stable SEO price or revenue.
3. Offer/schema eligibility remains dependency D34-09 and the Day 36 schema/display decision. SEO-003B
   does not authorize new Offer output.
4. The current modifier engine has `none`, `fixed` and `contact` outcomes. SEO wording `disabled` for a
   modifier is interpreted as inactive/suppressed editorial state, not a fourth runtime charge mode.

This normalization requires no change to the 120-row query inventory and prevents a conservative SEO
gate from being misread as a requirement to hide a valid base price or expose an unresolved total.

## Dependency disposition

| ID | Disposition after Core review |
| --- | --- |
| D34-01 | Carry to Day 35 inventory/URL mapping; P0 |
| D34-02 | Operations data gate; no fabricated base amount |
| D34-03 | Day 32 production carry-over; contact fallback remains |
| D34-04 | Operations data gate; modifier policies inactive by default |
| D34-05 | Carry to Day 35/38 public-safe read model |
| D34-06 | Input to SEO-004 Day 35 |
| D34-07 | Carry to Long Thanh readiness work before Day 40 |
| D34-08 | SEO/Growth evidence task Day 34–41 |
| D34-09 | Carry to Day 36 schema/display semantics |

## Acceptance result

DEP-005 Day 34 SEO mapping is **CORE ACCEPTED**. This closes the cross-project specification/review
slice only. Source deployment, operator-approved data and production verification remain open, so
Day 34 must not be marked production verified.
