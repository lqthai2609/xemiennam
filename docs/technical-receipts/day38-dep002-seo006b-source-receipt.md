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

## Required gates before release

1. Approve privacy/retention and consent capture; implement first/lead touch and approved versioned landing cluster mapping without storing PII. Test 30-day organic→direct and paid→organic fixtures.
2. Run the isolated WordPress integration matrix in `day38-wordpress-isolated-integration-plan.md`; resolve pending idempotency reservations with a bounded reconciliation policy.
3. Obtain Operations fact ledger and verify SEO-004/005 inventory, Route 9117/9190 and a real version ≥1 `d35_10_blocked` record including rendered robots/schema/sitemap.
4. Plan backend-first deployment, smoke, rollback and explicit release authorization. Do not merge PR #128 merely because source/CI/build pass.
