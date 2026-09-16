# Technical Receipt — DEP-001 / Day 31 Booking V2

Date: 2026-09-16  
Owner: Gocar VN — Core  
Dependency: DEP-001 — Content Readiness API/fields  
Day 31 slice: Booking V2 pickup/dropoff field inventory + source-of-truth boundary

## Implementation summary

Core implemented structured trip-instance pickup/dropoff without changing canonical journey or pricing ownership.

New booking fields:

- `pickupLocationId` → `pickup_location_id`
- `dropoffLocationId` → `dropoff_location_id`
- `pickupAddress` → `pickup_address`
- `dropoffAddress` → `dropoff_address`
- `pickupNote` → `pickup_note`

Contract limits:

- `pickupAddress`: required in new UI, max 240 chars
- `dropoffAddress`: required in new UI, max 240 chars
- `pickupNote`: optional, max 300 chars

Route Pair/Direction V2 remains canonical journey context. Location V2 remains canonical place context. Pricing V2 remains canonical pricing context. Exact customer pickup/dropoff is private trip-instance data and is not an SEO/content/indexability source.

## PR / commits

- PR: #103 — `Day 31: Booking V2 pickup/dropoff foundation`
- Branch: `day31/booking-pickup-dropoff-v2`
- Stable implementation validation head: `3574aee9c74700186d796ce1cf277869d779a27b`
- Cleanup head before production receipt: `163a613f29646a8433256bb73fed5206d21c632a`

## CI / regression receipt

On cleanup head `163a613f29646a8433256bb73fed5206d21c632a`:

- CI #186: SUCCESS
- Gocar Core Package #17: SUCCESS
- Location Migration Preview #30: SUCCESS
- Booking pickup/dropoff regression guard: SUCCESS
- Production build: SUCCESS

Regression coverage includes backend schema/persistence, direction-aware Location fallback, WordPress REST meta registration/sanitization, and all three frontend booking entry points.

## Production deployment receipt

Production CMS: `https://xemiennam.datxesaigon.com`

- Gocar Core version: `0.4.0`
- Plugin status: Active
- `booking_request` REST endpoint registered
- Five structured booking meta fields accepted and exposed through REST

Representative safe persistence verification:

1. Created `booking_request` ID `9220` with status `draft`.
2. Persisted values for all five structured fields.
3. Read the record back with REST `context=edit`; all five values matched.
4. Moved record `9220` to `trash` after verification.
5. Did not call `/api/booking`; no booking notification or production lead was generated.

## SEO / Organic Growth handoff

Allowed SEO/content source-of-truth remains Route, Location and Pricing V2 subject to readiness policy.

The following fields are explicitly private trip-instance data and must not be used for page generation, schema, internal-link entities, indexability or scraped SEO content:

- `pickup_address`
- `dropoff_address`
- `pickup_note`

Location IDs attached to a booking describe that booking instance and do not create a new SEO entity or override canonical Route endpoints.

## Boundary / carry-over

Day 31 does not implement authoritative `center`, `suburb`, `outskirt`, `service_zone`, `zone_id`, `surcharge` or extra-fee logic. Those belong to Day 32 Zone / Service Area and Pricing integration.

This receipt closes the **Day 31 slice** of DEP-001 at Core implementation/verification. DEP-001 as a cross-project dependency remains active through Day 31–36 for Content Readiness fields and subsequent SEO verification; do not mark the entire dependency CLOSED from this receipt alone.
