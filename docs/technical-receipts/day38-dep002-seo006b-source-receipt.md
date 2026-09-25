# Alo Đặt Xe — Day 38 source receipt (DEP-002 / PAID-002 / SEO-006B)

Date: 2026-09-24. Status: **SOURCE PARTIAL; WORDPRESS INTEGRATION PENDING; SEO VERIFY PENDING; PRODUCTION NOT AUTHORIZED**.

## Rebaseline

- On inspection, PR #128 remained draft/open/unmerged at `4ca0bc91401376e26c45a58470826ef993d6ade4`; `main` had advanced to `5b6ed3fcb1cd1545eefafcee1d853e34997f8454`. The Day 37 handoff head `7f31bfe` and main `dad9700` are historical.
- Main includes merged PR #129 and #130. The business owner requested public display of all valid fixed CMS tuples. The merged branch therefore uses `publicRouteWithCmsPricing`: fixed finite positive prices for their own route × direction × vehicle × package only; contact/disabled/invalid remain contact. Day 37 blanket contact fallback no longer describes current main. No CMS price was edited here.
- PR #128 must remain draft until the WordPress plugin is deployed and verified before the frontend. This source receipt cannot authorize merge or production.

## Implemented in the existing lead source of truth

- WordPress `booking_request.ID` remains `lead_id`. `_gocar_lead_context_v1` is unchanged for legacy readers; `_gocar_lead_attribution_v1` is written once on backend creation, blocked from legacy metadata overwrite, and exposed to the authorized lead-read endpoint.
- Versioned channel `channel_v1`, search host allowlist `search_v1`, model identifier `first_eligible_organic_30d_v1`, consent state, explicit unknown/unmapped statuses, and initial/lead/attributed touch snapshots are present. In this slice, initial and lead touch are the same observed request: earlier visits are **not captured**. Organic UTM alone cannot claim Organic; eligible Organic requires an allowlisted search referrer and `consent_state=granted`. Paid UTM remains separate. Raw referrer path/query, click identifiers, ad entities, private booking fields and PII are excluded.
- Live booking handler currently marks consent `unknown`, preserves only same-origin public page path and allowlisted UTM, and never reconstructs an external referring search visit. Consequently live Organic attribution and 30-day cross-visit selection are **not implemented**. SEO must treat such leads as unknown until privacy policy, explicit consent, versioned landing capture and first-party propagation are approved. No invented Organic leads or historical backfill.
- A successful HTTP status with absent/invalid/mismatched `lead_id` now returns an error, never a frontend lead confirmation. An ambiguous WordPress creation response keeps its idempotency reservation for manual reconciliation to avoid duplicate insertion on retry; a definite REST error releases the key. TTL/automated reconciliation is still open.
- Contact click, form open, booking start and submit attempt remain intent. No qualified lead, confirmed booking, completed trip or recognized revenue is inferred from lead stage, quote or price. Booking/Finance propagation and SEO landing cluster mapping remain open.

## SEO-006B and Operations boundary

- The shared readiness guard now excludes prelaunch/blocked routes from homepage featured links, related Route × Vehicle, vehicle-category links and service suggestions. Homepage copy no longer asserts that chosen routes are the most booked.
- Local generated homepage HTML contains six route cards and no Long Thành href in that card section. This does not certify all links, Route 9117/9190 runtime, sitemap, schema or real version ≥1 D35-10 instance. Version 0 remains insufficient evidence. No URL, canonical, redirect or sitemap configuration was changed.
- Operations fact ledger remains outstanding for vehicle/capacity, package/direction, pickup/dropoff, stops/wait, payment and FAQ. Unverified public claims elsewhere remain a review task. PR #129/#130 are the authority for already published CMS prices; new data entry is not a release receipt.

## Verification and limits

- Local: `npm run typecheck` passed; `npm run lint` 0 errors and six inherited warnings; Day 36B readiness, lead retry, SEO-006A and public CMS pricing Node fixtures passed; production build completed 520/520 static pages. WordPress REST intermittently returned 502 while generating pages, so local HTML is not a complete live inventory.
- PHP 8.1 behavior tests now cover organic/referral privacy normalization, UTM spoof, replay, malformed response and definite failure. PHP CLI is unavailable in the local workspace; Gocar Core Package CI must validate syntax/behavior. No isolated WordPress POST was performed; no test booking was sent to production.
- Joint Day 37, SEO-006A VERIFY and Day 38 remain OPEN. DEP-011 BLOCKER/P0, D35-10 OPEN/P0, Long Thành and KU-068–KU-072 PRELAUNCH; Paid Growth PRELAUNCH with Budget/Campaign/Production Ads INACTIVE. Production migration INACTIVE.

## Preview follow-up — 2026-09-25

- Vercel Preview `dpl_7haYfjfxUubjBTdRMEbqw6XXyzhY` was READY for `66cd835` on `day37-lead-lifecycle`; production remained on `main` at `5b6ed3f`. Route 9190 rendered `noindex, follow` with no JSON-LD. No custom domain was assigned.
- Route 9117's “giá từ 1.500K” is supported by the existing CMS tuple: outbound, vehicle `40` (Limousine), `one_way`, fixed `1,500,000` VND. The other five vehicle cards were contact, so the earlier apparent title/card mismatch was a false alarm. No CMS price was edited.
- A full scan of generated commercial listing HTML found Long Thành prelaunch links in `/tuyen-duong`, `/bang-gia` and five province listings. The source now excludes prelaunch and readiness-blocked routes from those lists and from province airport connection counts. The prelaunch guard also recognizes the existing route slug if a separate Location API read fails. Route detail remains directly available for information with `noindex`; no canonical or sitemap configuration changed.
- Until explicit consent capture and retention policy are approved, the booking handler sends `consent_state=unknown` without same-origin URL or UTM. WordPress ignores marketing fields and leaves attributed touch null for unknown/denied consent. This is a conservative source guard, not implementation of cross-visit attribution.
- Read-only CMS review: Route 9117 and 9190 both have `content_readiness_version=0`; a query for actual `d35_10_blocked` records returned none. No authentic version ≥1 blocked instance is available to close D35-10. The connected WordPress site is production; no synthetic POST was sent. An isolated WordPress environment is still required.
- The existing Long Thành airport hub was indexable and emitted Breadcrumb/FAQ JSON-LD despite PRELAUNCH. The source now sets `noindex` and suppresses hub JSON-LD while prelaunch. The currently generated sitemap still includes `/san-bay/long-thanh`; the prior scope explicitly forbids changing sitemap, so this contradictory entry remains an SEO release blocker pending separate authorization and review.

## SEO and Paid responses — 2026-09-25

- Organic Growth accepted source/Preview evidence as received, but classified SEO-006B inventory as PARTIAL, SEO-006A and DEP-002 SEO VERIFY as PENDING. Paid Growth accepted the lead identity, immutable acquisition snapshot, channel distinctions and intent/funnel semantics at source level; PAID-002 remains PARTIAL PASS / BLOCKED FOR CLOSURE. Neither response authorizes merge, production or advertising.
- CMS read-only `/wp/v2/route` inventory returned 83 Route records: 78 ordinary routes and five Long Thành airport routes (IDs 9190, 9203–9206). Every returned `content_readiness_version` was 0 and no mapping was `d35_10_blocked`; version 0 preserves legacy index behavior for other routes but cannot prove the versioned D35-10 block. No CMS data was changed.
- Hydrated DOM on Preview `3a5e561` showed zero Long Thành Route links on homepage, `/tuyen-duong` (78 Route links), `/bang-gia` (926 Route or combo links), Bà Rịa–Vũng Tàu (11), Cần Thơ (2), Đồng Nai (13), and Phan Thiết (3). `/tuyen-duong/ho-chi-minh` was a noindex 404, not a live province listing. The prelaunch hub still linked to five route pairs for informational discovery. This is a bounded sample and not Organic Growth's independent verification.
- Route 9117 had a single canonical across directions. Outbound one-way showed only Limousine 1.500K; inbound one-way showed six contact cards. Service schema on the canonical pair contained three exact fixed offers: outbound Limousine one-way 1.500.000, outbound 4-seat same-day round trip 1.500.000 and inbound Limousine same-day round trip 1.400.000 VND. Organic Growth should review title/aggregate minimum context before approving copy; there is no evidence that the outbound one-way price is wrong.
- A further PRELAUNCH gap was found: Route 9190 linked to six noindex combo pages, and the 4-seat combo offered a booking form despite its preparation status. This source follow-up makes PRELAUNCH route cards and combos contact-only and suppresses the booking form, price claims and unverified benefit claims on combos. Route and combo remain noindex with no schema. This does not change their URL, canonical or sitemap.
- The generated sitemap source continues to include `/san-bay/long-thanh` even while the hub is noindex, as a separate airport-hub entry. Do not alter it without the SEO decision and owner authority specified in the Organic Growth response. Operations fact ledger, consent policy/retention, isolated WordPress staging, downstream internal-key facts and an authentic version ≥1 blocked CMS record remain outstanding.

## Required gates before release

1. Approve privacy/retention and consent capture; implement first/lead touch and approved versioned landing cluster mapping without storing PII. Test 30-day organic→direct and paid→organic fixtures.
2. Run the isolated WordPress integration matrix in `day38-wordpress-isolated-integration-plan.md`; resolve pending idempotency reservations with a bounded reconciliation policy.
3. Obtain Operations fact ledger and verify SEO-004/005 inventory, Route 9117/9190 and a real version ≥1 `d35_10_blocked` record including rendered robots/schema/sitemap.
4. Plan backend-first deployment, smoke, rollback and explicit release authorization. Do not merge PR #128 merely because source/CI/build pass.
