# Day 37 — Lead lifecycle and PAID-001 contract

Source of truth is the existing WordPress `booking_request` post. Its post ID is `lead_id`; no parallel CRM record is created. Core alone owns status transitions through `POST /wp-json/gocar/v1/admin/leads/{id}/transition`. The same-origin admin proxy exposes read and transition under `/api/admin/leads/{id}`; `/quan-tri/lead` uses that proxy. Frontend booking forms call the existing `/api/booking` handler, now delegating creation to `POST /wp-json/gocar/v1/leads` with a UUID idempotency key. One key yields one `lead_id`; retries return `replayed=true` and do not send a second notification. A stale in-progress reservation returns 409 for operator investigation. Calls and Zalo clicks remain intent only.

| State | Business meaning | Allowed next |
|---|---|---|
| `new` | Server accepted a valid request and created a `booking_request` | `quote`, `lost` |
| `quote` | Staff is preparing or revising a quote; no verified quoted amount implied | `sent`, `lost` |
| `sent` | Staff recorded that a quote was sent | `agreed`, `quote`, `lost` |
| `agreed` | Staff recorded customer agreement; not a separately confirmed booking | `deposit`, `lost` |
| `deposit` | Staff recorded deposit stage; no money or payment proof inferred | `assigned`, `lost` |
| `assigned` | Staff recorded car assignment stage | `complete`, `lost` |
| `complete` | Staff marked request resolved after the trip; completed-trip KPI requires verified booking link | terminal |
| `lost` | Staff closed the opportunity without a completed service | terminal |

Each transition needs exact `from`, `to`, `source=admin|operations`, an authenticated actor, and reason for `quote`, `sent` or `lost`. `agreed`, `deposit`, `assigned` and `complete` require `publish_posts`; other transitions require `edit_post` on this booking request. A row lock and transaction serialize transitions. Each entry appends UTC timestamp, actor ID, source, old/new state and optional reason to `_gocar_lead_history_v1`; current state is `_gocar_lead_state_v1`. The legacy `trang_thai_booking` is synchronized for old admin readers. Core REST updates and WordPress meta writes that bypass the transition route cannot change lifecycle status after initialization. Existing records without Day 37 meta are read through the legacy status map, defaulting to `new`; no speculative backfill history is created.

The immutable `_gocar_lead_context_v1` snapshot captures available `source`, `medium`, `campaign`, UTM values, `landing_page_id` or `landing_path`, `landing_family`, `context_captured_at` in UTC and `context_schema_version=1`. Fields missing or rejected for length, private URL or PII become null. The server receives only same-origin landing path and allowlisted UTM parameters, never raw referrer, full query, phone, email, name, precise location, chat or booking note. No campaign is inferred. The client `contact_click` event now sends a path without query. No click identifier, first touch or attributed touch is modeled at Day 37.

`qualified lead` is **not** inferred from `quote` or `agreed`; an explicit qualification assessment is needed before counting that KPI. A quote stage is **not** an immutable priced quote record; the versioned quote ledger is Day 39. `booking_request` is a lead intake record, **not** proof of a confirmed `booking_id`. `complete` alone does not establish a completed trip or recognized revenue. Do not count any of these as booking or finance measures without verified linked records. Day 38 owns DEP-002 and PAID-002 touch attribution, classification, propagation and privacy policy. All legacy bookings without observed context retain unknown fields.

Rollback: revert frontend and plugin together to the prior versions while keeping new private metadata and history for later recovery. Never delete historical entries or reconstruct them from notes. Source is safe to merge independently of production activation; deploy the WordPress plugin before the new Next.js booking handler or requests to `/gocar/v1/leads` will fail. No deployment occurs in this change.
