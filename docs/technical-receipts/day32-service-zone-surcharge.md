# Technical Receipt — Day 32 Service Zone and Surcharge

Status: CODE COMPLETE — deployment verification pending  
Owner: Core  
Date: 2026-09-17  
Dependency: Core Day 32; DEP-002 accepted for later implementation

## Delivered

- Added the closed `center/suburb/outskirt` Location taxonomy and explicit coverage status.
- Added a version-gated Route surcharge policy with side/direction/vehicle/package scoping.
- Added a server resolver that never reads private address text.
- Added Booking persistence for resolved zone IDs, mode, positive amount and rule trace.
- Added CI regression coverage and upgraded Gocar Core from 0.4.0 to 0.5.0.
- Accepted DEP-002 KPI/attribution semantics for Day 38/40/55–56; no early attribution implementation.

## Verification

- ESLint: PASS with 7 pre-existing warnings and 0 errors.
- Existing regression suites: PASS after updating the Day 31 boundary guard for the delegated Day 32 resolver.
- Day 32 service-zone suite: 6/6 PASS.
- Next.js production build: PASS, 581 static pages generated.

## Safety evidence

- No hard-coded operational zone assignments or fee values were added.
- Policy missing, unverified zone and outside-service-area cases return `contact`.
- Fixed surcharge requires a positive finite amount.
- Base Pricing V2 is unchanged; surcharge is stored separately.
- Private pickup/dropoff addresses remain booking-instance data and are absent from the resolver.

## Pending production acceptance

1. Merge the implementation PR.
2. Package and deploy Gocar Core 0.5.0.
3. Enter only operator-approved Location zones and Route rules.
4. Verify REST read-back for Location and Route meta.
5. Create a non-notifying safe booking fixture, verify persisted resolution, then remove it.

Until those steps pass, production must remain on contact fallback and Day 32 is not `PRODUCTION VERIFIED`.
