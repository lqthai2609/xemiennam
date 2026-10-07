# Day 41 — WordPress/frontend synchronization repair

## Problem and observed data

The owner reported that multiple route edits in the existing WordPress backend
were not reaching this project's production frontend. Read-only comparison
confirmed stale route data. Detailed runtime values are retained only in the
owner's Day41 handoff files, not in this repository.

The repair addresses the existing webhook configuration, response verification,
post/meta commit timing, and shared frontend cache invalidation.

## Implementation

- Shared WordPress fetch now has resource tags across list, detail and pagination.
- Webhook expires the matching tags with `{expire:0}` and refreshes affected pages
  plus sitemap, including route/vehicle combos, locations and province hub content.
- Admin publish/apply/archive/rollback expires the same shared data.
- Cache identity v2 discards the old untagged entries at rollout; default fallback
  is 300 seconds with normal traffic-driven ISR, not a strict freshness SLA.
- Network/500/429 retry and last-successful-page protection remain intact.
- Source-controlled standalone WPCode PHP is `wordpress/snippets/frontend-sync.php`.
  It deduplicates by data type, sends at shutdown after fields/meta/terms commit,
  checks HTTP/JSON success, stores a secret-free status and retries transient
  failures up to three attempts. It uses only https://alodatxe.com/api/revalidate.
- No route prices, booking records, engine business rules or readiness data change.
  No Gocar Core update, database restoration, fixture publishing or analytics enable.

## Rollout and acceptance

Source/tests ready does not mean production fixed. Required evidence:

1. Successful CI and exact released commit/deployment recorded.
2. Matching private secret stored as Vercel production REVALIDATE_SECRET and
   WordPress option alo_dat_xe_frontend_sync_secret; never commit/export it.
3. User reviews/enables the new WPCode snippet. The connector always creates PHP
   snippets disabled; only the user can activate them. Legacy #16 may be disabled
   after the new callback has succeeded, through the user's WPCode screen.
4. Read option alo_dat_xe_frontend_sync_status: callback HTTP200/result=ok.
   First enabled request sends taxonomy invalidation without changing any record.
5. Compare actual production tuple, duration, distance and display fields to a fresh
   backend snapshot, including list/detail/combo/schema. Use the owner's real edits;
   do not invent prices or send booking/email tests.

## Rollback

Revert this PR through a new commit if necessary; compare current main and live
backend before any release. Keep the owner's current CMS values. Disable the new
snippet in WPCode if its transport needs stopping; do not restore the database.
Retain the prior deployment only as a reference, never blindly promote an old SHA.
Rotate the sync credential only with matching values at both ends.

## Next work

Day 41 remains open. Finish runtime synchronization acceptance before SEO handoff.
Then receive SEO-009/domain acceptance, settle scoped Promotion Engine design
carry-over, and separately retain the missing actual-email confirmation and GSC
sitemap Couldn't fetch/DEP-011. Do not begin Day 42.
