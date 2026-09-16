# DEP-001 — Day 31 SEO Verification Receipt

Date: 2026-09-16  
Scope: SEO Day 31 only  
Core baseline: PR #103, merge commit `2e72823eb1c9203c9c9461f4a5c1ec3212e7e997`  
Production checked: `https://xemiennam.vercel.app`  
SEO acceptance: **PASS**  
DEP-001 overall: **IN PROGRESS** for Day 31–36  
DEP-001 Day 31 slice: **CLOSED after SEO VERIFY PASS**

## 1. Purpose

This receipt closes only the SEO verification slice of DEP-001 for Day 31. It verifies the SEO ↔ Core contract boundary after Core completed Booking V2 exact pickup/dropoff persistence.

This receipt does **not** close DEP-001 as a whole. The dependency continues through Day 31–36 for the broader Content Readiness API/field work.

No Day 32 service-zone or surcharge semantics are introduced here.

## 2. Source of truth verified

SEO consumes canonical journey/entity/pricing data from Core-owned models and does not infer canonical entities from booking-instance text.

Canonical sources for SEO Day 31:

- Route Pair / Direction V2: canonical journey, direction and route context.
- Location V2: canonical place/entity referenced by route endpoints.
- Pricing V2: canonical direction-aware pricing state and package data.

Booking V2 exact pickup/dropoff remains trip-instance data. Rendered UI text is not a source of truth and was not scraped to reconstruct fields or entity semantics.

## 3. Fields and semantics SEO may consume

SEO may consume Core-owned public/canonical fields only when they originate from Route Pair / Direction V2, Location V2 or Pricing V2 and pass the applicable readiness policy.

### Route Pair / Direction V2

Representative consumable semantics:

- route ID and route slug;
- origin/destination endpoint references;
- direction / pricing direction;
- route-level public presentation fields already attached to the canonical route;
- verified route attributes such as distance/duration only when present in the canonical route data;
- route-level public pickup/dropoff guidance such as CMS `diem_don` / `diem_tra` normalized as `pickupPoints` / `dropoffPoints`, provided these remain curated route-level public information.

### Location V2

Representative consumable semantics:

- canonical Location ID;
- name;
- slug;
- type;
- canonical route endpoint relation;
- airport/locality identity when that identity is defined by Location V2.

A Location ID found inside a booking request is not, by itself, an SEO page-generation instruction. SEO resolves entities from the canonical Route/Location graph rather than mining booking records.

### Pricing V2

Representative consumable semantics:

- pricing direction;
- enabled/disabled state;
- featured package where defined;
- vehicle/package key and labels;
- pricing mode (`fixed`, `contact`, `disabled`) according to Core semantics;
- fixed price only when Pricing V2 supplies a valid fixed price;
- contact text/state when Pricing V2 is contact-mode.

SEO must not hard-code substitute prices, clone a price across directions, or derive a price from exact pickup/dropoff text.

## 4. Booking/private fields forbidden for SEO

The following Booking V2 fields are not SEO content sources:

| Field | SEO status | Reason |
|---|---|---|
| `pickup_location_id` | Booking-instance only for SEO purposes | Reference persisted with a specific booking; SEO entity truth still comes from canonical Route/Location data. |
| `dropoff_location_id` | Booking-instance only for SEO purposes | Same boundary as pickup side. |
| `pickup_address` | **FORBIDDEN** | Exact private trip-instance pickup/meeting-point data. |
| `dropoff_address` | **FORBIDDEN** | Exact private trip-instance dropoff data. |
| `pickup_note` | **FORBIDDEN** | Private operational note for finding passenger/pickup point. |
| `note` / `ghi_chu` | Booking operational data; not an SEO source | General booking note must not be promoted into public/entity semantics. |

`pickup_address`, `dropoff_address` and `pickup_note` must never be consumed for:

- SEO page generation;
- landing-page generation;
- metadata;
- schema / JSON-LD;
- internal-link entity derivation;
- indexability/readiness decisions;
- public content;
- programmatic SEO.

## 5. Semantic collision guard

The normalized public route fields `pickupPoints` / `dropoffPoints` are not equivalent to Booking V2 `pickup_address` / `dropoff_address`.

- `pickupPoints` / `dropoffPoints`: route-level, public, curated CMS/service guidance attached to the canonical route.
- `pickup_address` / `dropoff_address`: exact address/meeting point entered for one booking instance.

No implementation may populate the public route fields from booking-instance exact addresses or use the same field semantics interchangeably.

## 6. Code-path verification

Verified against main at Core baseline commit `2e72823eb1c9203c9c9461f4a5c1ec3212e7e997`:

- `src/app/tuyen-duong/[tinh]/[tuyen]/page.tsx`
  - metadata is built from route presentation/canonical route data;
  - Service schema uses canonical route endpoints and Pricing V2 offers;
  - no exact Booking V2 address/note fields are referenced.
- `src/types/route.ts`
  - route model exposes canonical endpoint refs, Pricing V2 and route-level public pickup/dropoff guidance;
  - no Booking V2 exact address/note fields are part of the public Route type.
- `src/lib/api/routes.ts`
  - normalized route is built from Route Pair V2 + Location V2 endpoint refs + Pricing V2;
  - public `pickupPoints` / `dropoffPoints` map route CMS fields, not booking-instance fields.
- `src/app/san-bay/[airportSlug]/page.tsx`
  - airport metadata uses canonical airport/location identity;
  - Service schema derives `areaServed` from route counterpart entities and offers from Pricing V2;
  - no exact Booking V2 address/note fields are referenced.
- repository search for `pickup_note` and `pickup_location_id`
  - occurrences are confined to Booking V2 documentation, booking API/persistence and regression coverage;
  - no SEO metadata/schema/page-generation consumer was found.

## 7. Representative production surfaces

Production baseline: Vercel target `production`, state `READY`, Core merge commit `2e72823eb1c9203c9c9461f4a5c1ec3212e7e997`.

| Surface group | Representative URL | HTTP / indexability | Canonical | Schema | Private-field boundary | Result |
|---|---|---|---|---|---|---|
| Route Detail | `https://xemiennam.vercel.app/tuyen-duong/ba-ria-vung-tau/tp-hcm-vung-tau` | 200; no `noindex`; present in sitemap | self-canonical | Breadcrumb + Service; offers from Pricing V2 | no `pickup_address`, `dropoff_address`, `pickup_note` in SEO output | **PASS** |
| Airport Route Detail | `https://xemiennam.vercel.app/tuyen-duong/ba-ria-vung-tau/san-bay-tan-son-nhat-vung-tau` | 200; no `noindex`; present in sitemap | self-canonical | Breadcrumb + Service using route/location/pricing context | no private exact pickup/dropoff fields used | **PASS** |
| Province / Route Hub | `https://xemiennam.vercel.app/tuyen-duong/ba-ria-vung-tau` | 200; no `noindex`; present in sitemap | self-canonical | Breadcrumb + Service + FAQ | hub content/links remain route/location/pricing based | **PASS** |
| Airport Hub | `https://xemiennam.vercel.app/san-bay/tan-son-nhat` | 200; no `noindex`; present in sitemap | self-canonical | Breadcrumb + Service + FAQ; areaServed from route counterpart locations; fixed offers from Pricing V2 | no private exact pickup/dropoff fields used | **PASS** |

Global crawl check:

- `https://xemiennam.vercel.app/robots.txt` returns 200;
- `User-Agent: *` → `Allow: /`;
- sitemap points to `https://xemiennam.vercel.app/sitemap.xml`.

## 8. Deterministic indexability result

**PASS.** For the representative Day 31 SEO surfaces above:

- the URLs resolve deterministically;
- the canonical is deterministic and self-referential;
- indexability is not inferred from rendered prose or booking data;
- sitemap exposure is consistent with the checked indexable surfaces;
- metadata/schema are constructed from canonical route/location/pricing structures rather than exact booking addresses.

## 9. Schema result

**PASS.** Representative JSON-LD reflects public/canonical entities and pricing data:

- Route Detail: route endpoints + Pricing V2 offers;
- Airport Hub: canonical airport Location entity + route counterpart locations + Pricing V2 fixed offers;
- Province Hub: public route/province/service information;
- no private booking address/note field was found in representative schema output.

## 10. Canonical result

**PASS.** Every representative URL checked above emits a self-canonical matching the public URL. No canonical was derived from booking-instance addresses or notes.

## 11. DEP-001 lifecycle

Contract lifecycle reference:

`PROPOSED → SPEC READY → CORE ACCEPTED → IN PROGRESS → IMPLEMENTED → SEO VERIFY → CLOSED`

Day 31 slice result:

`PROPOSED → CORE ACCEPTED → IMPLEMENTED → SEO VERIFY (PASS) → CLOSED`

Overall dependency result:

- **DEP-001 overall: IN PROGRESS (Day 31–36)**.
- Only the **Day 31 slice is CLOSED**.
- Future Content Readiness field/API work remains governed by DEP-001 and must be verified in its own Day acceptance.

## 12. Remaining gaps / carry-over

No Day 31 SEO blocker remains after this verification.

Carry-over under DEP-001 overall:

- broader Content Readiness API/field verification scheduled across Day 31–36;
- later SEO readiness rules must continue to consume canonical Core fields rather than rendered UI text.

Explicitly out of scope for this receipt and deferred to Core Day 32:

- `center` / `suburb` / `outskirt` semantics;
- `service_zone` / `zone_id`;
- surcharge / `extra_fee` or equivalent pricing additions.

If SEO needs any of those capabilities, it must create a new/continued technical handoff to Core rather than add parallel semantics.

## 13. Acceptance checklist

| Acceptance | Result |
|---|---|
| SEO verifies Contract v1.1 ownership/source-of-truth boundary | **PASS** |
| No private Booking V2 exact address/note field leaks into representative SEO/public surfaces | **PASS** |
| Representative canonical/indexability/schema boundary is deterministic | **PASS** |
| SEO content remains based on Route + Location + Pricing readiness | **PASS** |
| SEO-side technical receipt is source-controlled | **PASS** (this document) |
| DEP-001 Day 31 slice has explicit lifecycle/status | **PASS — CLOSED after SEO VERIFY PASS** |
| DEP-001 overall remains open for Day 31–36 | **PASS — IN PROGRESS** |
| Day 32 zone/surcharge architecture is not introduced | **PASS** |

## 14. Evidence references

- Core implementation PR: `#103`.
- Core merge commit: `2e72823eb1c9203c9c9461f4a5c1ec3212e7e997`.
- Core field inventory: `docs/day31-booking-v2.md`.
- Core technical receipt: `docs/technical-receipts/dep-001-day31-booking-v2.md`.
- SEO verification receipt: `docs/technical-receipts/dep-001-day31-seo-verify.md`.
- Production representative URLs listed in Section 7.

## 15. Final SEO Day 31 decision

**SEO Day 31: COMPLETE.**

This decision closes the SEO verification work for Day 31 and the DEP-001 Day 31 slice only. It does not close DEP-001 overall and does not authorize any Day 32 zone/surcharge design.