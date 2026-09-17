# Technical Receipt — Day 33 Multi-stop Booking V2

Status: MERGED — deployment verification pending  
Owner: Core  
Date: 2026-09-17  
SEO handoff: SEO-003A CORE ACCEPTED

## Delivered

- Added a shared Multi-stop contract with a maximum of three intermediate stops.
- Each stop stores an address, one-based order and waiting time from 0 to 1,440 minutes.
- Added the shared add, remove, reorder and validation interface to Contact Booking, Route Quick Booking and Booking Search Journey Quote.
- Added `/api/booking` validation, WordPress REST persistence and operator notification output.
- Added WordPress defense-in-depth sanitization for `intermediate_stops_v1`.
- Upgraded Gocar Core from 0.5.0 to 0.6.0.
- Added the required v0 implementation prompt and source-controlled contract.

## Verification

- Pull request #108 was squash-merged to `main` at `d753363ade7abc870a073365d7c1b5576e6c5396`.
- GitHub CI, Location Migration Preview and Gocar Core Package workflows: PASS.

- Day 33 Multi-stop source suite: 4/4 PASS.
- Day 31 Booking V2 regression suite: 7/7 PASS.
- Day 32 service-zone/surcharge regression suite: 6/6 PASS.
- Metadata regression: 7/7 PASS.
- Indexability regression: 7/7 PASS.
- Schema/pricing regression: 6/6 PASS.
- Footer regression: 4/4 PASS.
- Blog relation regression: 6/6 PASS.
- ESLint: PASS with 6 pre-existing warnings and 0 errors.
- Next.js production build: PASS, 581 static pages generated.
- PHP CLI syntax check: unavailable in the execution environment; production package/WordPress activation remains required.
- Visual browser verification: not completed because the available browser could not access the local development origin. TypeScript, source regression and production build gates passed.

## Safety evidence

- An empty or omitted stop array preserves existing clients.
- API validation rejects more than three stops, blank addresses, addresses over 240 characters and invalid waiting values.
- Array position is authoritative; server persistence rebuilds sequential order.
- WordPress independently caps, sanitizes and reorders stored rows.
- Multi-stop does not alter Route/Direction resolution, endpoint Location IDs, Day 32 zone resolution or surcharge.
- Exact stop addresses remain private booking-instance fields and are not exposed to SEO clustering or attribution.
- No extra-stop or waiting price was added; all pricing rules remain deferred to Day 34.

## SEO-003A receipt

Core accepts Keyword Universe v0.5 as a research inventory, not an implementation request. The accepted snapshot contains 73 clusters: 8 P0, 27 P1 and 38 P2; 15 price-dependent clusters remain deferred to SEO-003B Day 34. Only four canonical targets are treated as verified. Multi-stop has no SEO page or new URL in Day 33.

Ambiguities A-01, A-03, A-04, A-05, A-07, A-09 and A-10 are inputs for Day 35. A-02 is due before Day 39. A-06 is due before Day 40. A-08 remains owned by SEO/Growth for Day 34–41.

## Pending production acceptance

1. Package and deploy Gocar Core 0.6.0.
2. Confirm WordPress activates the plugin without PHP errors.
3. Submit safe non-notifying fixtures with zero, one and three stops.
4. Verify REST read-back preserves order, addresses and waiting minutes, then remove the fixtures.
5. Run mobile real-device QA for all three booking entry points.

Until these steps pass, Day 33 is not `PRODUCTION VERIFIED`.
