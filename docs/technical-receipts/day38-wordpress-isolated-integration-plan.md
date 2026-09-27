# Day 38 — isolated WordPress lead integration and rollout plan

Status: **PARTIAL / ISOLATED BACKEND VERIFIED, PREVIEW-TO-WORDPRESS PENDING** (2026-09-27). Target: `https://laquangthai.datxesaigon.com/alo-day38-test/`, a new WordPress installation in its own directory. Database separation still needs direct configuration evidence. No production booking submissions.

## Preview connection prepared, not activated

- The test fixture v0.3 gates anonymous front pages behind WordPress login and all anonymous REST calls with HTTP 401; it keeps mail suppressed and registers empty catalog endpoints. The owner installed v0.3 after a v0.2 REST gate defect was found, and verified the anonymous REST gate in a private window. Confirm front-page login redirect again if needed before sending synthetic traffic.
- The frontend branch supports WordPress Application Passwords solely when `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=day38-wordpress-isolated-test`, `WP_TEST_APPLICATION_AUTH_ENABLED=1` and `WP_API_BASE_URL` equals exactly `https://laquangthai.datxesaigon.com/alo-day38-test/wp-json/wp/v2`. Missing or mismatched configuration fails closed, including when the new branch first deploys without scoped variables. Its server fetches send those credentials only to that exact target. The Preview test route suppresses Web3Forms notifications. Production continues using JWT.
- A dedicated test WordPress Editor user and its Application Password are still needed. Set `WP_API_BASE_URL`, `WP_TEST_APPLICATION_AUTH_ENABLED`, `WP_TEST_USERNAME`, `WP_TEST_APPLICATION_PASSWORD` only for the Day 38 branch Preview. Never place credentials in the repository, client variables, screenshots or chat. Confirm Preview deployment is protected before submitting only synthetic names and phone numbers.
- No full form submission or authenticated Preview-to-WordPress connection has run yet. The fixture remains an isolated approximation of the booking schema, not a production data or schema replica. Record anonymous 401, authenticated REST read, one synthetic submission and matching `lead_id` before changing this receipt to PASS.
- Local checks on 2026-09-27: `npm run typecheck` passed; the three source idempotency tests passed; `next build` compiled and passed TypeScript but was stopped after static page generation repeatedly timed out against the existing WordPress source (HTTP 500 from media/location/route endpoints). This is not a successful complete build. The attempted GitHub branch push was rejected by automatic approval review, so no new Preview deployment exists for this branch.
- Live gate check on 2026-09-27 found a security failure in fixture v0.2: the front page redirected to WordPress login, but anonymous `/wp-json/wp/v2/route` returned `[]`. WordPress cookie authentication may return `true` without a nonce while setting current user to zero; the v0.2 filter incorrectly treated `true` as proof of a logged-in user. Fixture v0.3 preserves prior errors and tests `is_user_logged_in()` regardless of a prior `true`. Screenshot `Screenshot_1(20260927-075143).png` from a private browser shows `/alo-day38-test/wp-json/wp/v2/route?day38=3` returning `alo_day38_login_required` with `status:401`. This is a PASS for the anonymous REST gate, not yet for authenticated Preview transport.
- Screenshot `Screenshot_1(20260927-075939).png` shows the dedicated `alo-day38-preview` account logged in, but its profile disables Application Passwords with a Basic Authentication conflict warning. WordPress checks `PHP_AUTH_USER`/`PHP_AUTH_PW` on the current request, so previously cached browser Basic credentials or remaining server protection are plausible causes; neither has been confirmed. Retest from a completely fresh private browser session before changing server configuration or authentication code. Do not share either password in chat.
- Screenshot `Screenshot_1(20260927-081640).png` shows the dedicated `alo-day38-preview` account logged in from a fresh private browser session with the Application Password creation form available. The previous Basic Authentication warning no longer appears. This resolves the profile UI blocker but does not prove a password was generated or that the Preview can authenticate.

## Evidence received on 2026-09-27

- The owner installed WordPress at the test path, enabled the WordPress search-indexing discouragement setting, and confirmed cPanel Directory Privacy prompts for a separate password in an incognito window. The parent site remains in its own directory.
- The owner activated a test-only `booking_request` registration fixture, the source `gocar-core` plugin packaged from local commit `302a2a9`, and the guarded Day 38 verifier v0.2. The fixture refuses activation outside the exact test `site_url` and suppresses WordPress email. It does **not** reproduce every production WPCode schema or integration.
- Screenshot `Screenshot_1(20260927-055826).png` shows 10/10 internal WordPress checks PASS: create returns positive persisted `lead_id`; authorized read reports state and unknown consent; replay reuses the ID; changed payload with same key returns 409; distinct request gets a distinct ID; malformed key and missing booking are rejected; denied consent drops campaign/referrer attribution; legacy creation initializes the lifecycle; audited state transition appends history. The synthetic posts and key reservations are removed by the verifier after the run.
- Source-side `node scripts/gocar-lead-idempotency.test.mjs` passed 3/3 on 2026-09-27: retry key retention after failed submit, private URL/query omission from analytics, and no success on HTTP 200 without a persisted lead ID.

**Not yet verified:** an actual Vercel Preview booking request reaching this protected WordPress installation, JWT or alternative authenticated transport through the directory password, timeout/malformed-response behavior across that network boundary, production WPCode schema equivalence, and notification/webhook compatibility. This receipt does not authorize a merge or production rollout.

**Preview integration constraint:** The original authenticated frontend URL builder discarded the WordPress subdirectory. Commit `88f0be2` preserves `/alo-day38-test` in JWT and lead REST URLs; this is locally typechecked but has not been deployed. The test directory's HTTP Basic password competes with the WordPress REST authorization header. WordPress explicitly documents Basic Auth protection as an Application Password conflict, so using one shared Basic credential for both layers is not an accepted workaround. The isolated WordPress fixture also does not define the production `route` and `vehicle` REST contracts needed by the complete booking handler. A dedicated test-only transport and sanitized schema fixtures, or another isolated environment with compatible authentication, are required before calling Preview-to-WordPress integration PASS.

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
