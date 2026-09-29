# SEO-006A Day 37 — Core response to Preview review

Date: 24 September 2026. Scope: PR #128 source and read-only evidence. **SOURCE CORRECTED / SEO VERIFY PENDING / LAUNCH NOT READY**. This receipt consolidates the response to `SEO-006A-DAY37-PREVIEW-INSTANCE-REVIEW.md`; it does not close the joint Day 37 review.

## Version boundary and corrections

- The Vercel Preview `dpl_AbaH4WnFxKCJQ3mXSEKoz3QEFmZH` at commit `69601d9abf18a84b2356934fc5a2ce9e68d5f212` is **older than these source corrections**. Its 9117 and 9190 observations remain historical evidence; do not treat that Preview as verification of the new copy or related links.
- In the Route pricing cards, unverified pickup and drop-off promises for 4, 7 and 16 seats now ask the visitor to confirm points at quote time. The general Route booking card asks visitors to confirm payment conditions instead of promising that no advance payment is needed. These are safe interim words, not proof of vehicle, package, stop or payment capability.
- The related Route module excludes Long Thành prelaunch routes, explicit SEO-005 `serviceState=prelaunch` or `mappingState=d35_10_blocked`, and versioned records not eligible for the sitemap. Existing legacy routes with version 0 retain their current recommendation policy; a version 0 record is never described here as SEO ready. This changes neither URL identity nor the sitemap.
- In a local post-change production build, Route 9117 HTML contains no related link to `san-bay-long-thanh-vung-tau`; its vehicle cards use neutral pickup wording and still emit two JSON-LD blocks (BreadcrumbList and Service). The local build is not a deployed Preview or production observation.

## Current evidence and open acceptance

| Area | Core evidence or disposition |
|---|---|
| AC02–05 | The older Preview shows direction-aware H1, package tabs and contact price fallback for 9117. New copy requires a fresh Preview after this PR head is deployed. Vehicle/package availability still needs Operations approval by direction and tuple. No approved fixed prices; do not emit Offer. |
| AC09 | Prelaunch/explicitly blocked related Route suggestions are suppressed in source and the local 9117 HTML. Recheck hydration and links on a fresh Preview; other link targets still need the SEO-004/005 inventory. |
| AC10–11 | Opening a form is intent. No booking form was submitted against production WordPress. A valid backend `lead_id`, malformed/timeout response and replay require an isolated compatible WordPress test environment; booking, trip and revenue remain separate evidence under DEP-002. |
| AC12–15 | Prior read-only WordPress audit: 9190 and 9117 project to SEO-005 version 0; 9190 production noindex and absent from production sitemap, while the old production build still had BreadcrumbList. The PR Preview at `69601d9` had 0 JSON-LD and noindex for 9190, and 2 JSON-LD/no Offer for 9117. Route 9055 returned 401 publicly and was not built. The nine D35-10 representative old routes project version 0, mapping clear and appear in production sitemap. Thus no actual version >=1 `d35_10_blocked` instance has been demonstrated. Do not report AC14/15 or Preview sitemap as PASS. |
| AC06–08, AC16–18 | Operations fact ledger, FAQ, allowed stops/wait, policy versions, DEP-011, Day 38 attribution and deployment evidence remain outstanding under their existing owners. |

## Operations handoff (one fact ledger)

Return public-safe `fact_id | route_id | direction_id | vehicle_id | package_id | claim | source_ref | verified_at | owner | state | review_at | fallback` for actual service and packages, pickup/drop-off and stops/wait, advance payment, and FAQ. `Tối đa 3 điểm` in the form currently describes an input limit, not a promise of free stops or approved service. Other cards and Route × Vehicle pages may still contain location-specific claims: review them against the same ledger before approving SEO copy. Keep absent facts hidden or at contact fallback; never use private booking addresses or notes as SEO or attribution data.

## Release boundary

PR #128 remains draft and unmerged. The existing production frontend is `main` at `dad97006ab422be2be40ceeafce4566a930220b3`; the WordPress lead plugin has not been rolled out. No WordPress write, production deployment, DNS/domain change, canonical/redirect change, sitemap activation, new URL or price update was performed. DEP-011 **BLOCKER/P0**; D35-10 **OPEN/P0**; Long Thành/KU-068–KU-072 **PRELAUNCH**; production migration **INACTIVE**. A fresh Preview and Operations facts are required before SEO VERIFY. A production rollout of the lead lifecycle requires a separately reviewed backend-first plan and smoke tests.
