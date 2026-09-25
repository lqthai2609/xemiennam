# Day 38 — isolated WordPress lead integration and rollout plan

Status: **PLAN / NOT EXECUTED**. Target: a throwaway WordPress 8.1-compatible instance with the current `gocar-core` package and private database. No production booking submissions.

## Test setup

1. Restore sanitized schema/fixtures or create an isolated test database; disable outgoing email/webhooks, indexing and real notification delivery. Use a dedicated Editor JWT account. Record plugin commit, WordPress/PHP versions and instance URL privately.
2. Install backend plugin first. Verify `POST /gocar/v1/leads` authentication and existing `POST /wp/v2/booking_request` compatibility. Read only authorized lead endpoint for evidence. Do not include names, phone, addresses or raw URL/referrer in logs/screenshots.
3. Submit synthetic requests and inspect `booking_request` count, `_gocar_lead_context_v1`, `_gocar_lead_attribution_v1`, history and hashed-key option. Use dedicated test keys; clean only isolated test data afterward.

| Case | Expected result |
|---|---|
| Valid request, consent unknown | One positive backend `lead_id`, one lead record and one immutable attribution snapshot; channel unknown unless supported source evidence exists. |
| Same UUID and same payload replay | Same `lead_id`, `replayed=true`, no extra post, history entry or notification. |
| Distinct UUID/payload | Distinct `lead_id`; no cross-request collision. |
| Same UUID with changed payload | HTTP 409; original lead/snapshot unchanged. |
| Invalid JSON, booking body or UUID | 4xx; zero new leads and no false frontend success. |
| Backend timeout or malformed response after insert | Frontend shows uncertainty/failure; replay cannot create duplicate. Inspect pending reservation and reconcile against actual post before release. |
| Definitive WordPress REST failure | Error; reservation released only when insertion conclusively failed. |
| Denied consent and unsafe campaign/referrer | Operational lead may exist; marketing snapshot is privacy_rejected; raw query, PII, click/ad IDs absent. |
| Valid Google/Bing referrer, granted consent | Organic only with allowlisted search host; strip path/query. Organic UTM with unknown host remains unknown. |
| Legacy create and lifecycle transition | Existing fields readable, acquisition/attribution immutable, actor/time/reason history append-only. |

## Rollout and recovery gate

- Before frontend: deploy backend plugin with backup of code and WordPress database; smoke authenticated GET/POST on isolated test first, then verify production read-only endpoints and health under release authority. Do not send synthetic booking to production.
- Resolve pending idempotency TTL/reconciliation before accepting unbounded POST traffic. A pending key must not be deleted solely because it is old: check its associated post/fingerprint and operator audit first.
- Activate frontend only after backend schema and API behavior are certified, CI passes and owner authorizes production. Smoke one real authorized lead using an agreed operational procedure; reconcile ID, private snapshot, notification and dashboard counts.
- Rollback frontend first, then backend only if old clients remain compatible. Restore database from backup only under an incident procedure; do not discard already created leads or pending keys blindly.

Acceptance remains PENDING until test instance evidence, actor and timestamps are attached to the technical receipt.
