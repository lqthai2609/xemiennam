# SEO-006A Day 37 — AC15 build evidence receipt (24/09/2026)

Status: SOURCE AND BUILT-HTML EVIDENCE FOR 9190 / 9117; D35-10 INSTANCE PENDING. PR #128 remains draft. This receipt supersedes the earlier source-only claim for the two inspected routes; it does not claim SEO VERIFY, preview, deployed production or Day 37 joint closure.

## Exact source and CI

- Source guard: `bbb944453cf884509c917e1da55236aebb43c69b` suppresses every JSON-LD type on commercial Route pages in Long Thanh prelaunch or an active `d35_10_blocked` Content Readiness record. This includes BreadcrumbList.
- Evidence audit: `925071af46d6e8b8edf247799350c1b6b1caf508` strengthens the built-HTML regression so Route 9190 and comparison Route 9117 must actually be generated and logged. CI run [257](https://github.com/lqthai2609/xemiennam/actions/runs/35948732959) passed lint, typecheck, Node regressions, production build and built HTML audits. Gocar Core Package [50](https://github.com/lqthai2609/xemiennam/actions/runs/35948733054) and Location Migration Preview [67](https://github.com/lqthai2609/xemiennam/actions/runs/35948732807) passed on the same head. Build output in these runs is evidence only; there was no deployment.
- The earlier broad Long Thanh test could pass with zero matching files. The new representative test makes 9190 presence mandatory; CI passed.

## Representative CI output

| Route | JSON-LD scripts | Robots meta | Canonical printed by CI | Conclusion |
|---|---:|---|---|---|
| Long Thanh → Vung Tau, 9190 | 0 | `noindex, follow` | `https://xemiennam.vercel.app/tuyen-duong/ba-ria-vung-tau/san-bay-long-thanh-vung-tau` | Source/build AC15 negative case observed. Existing technical host in CI; no domain change. |
| Tan Son Nhat → Vung Tau, 9117 | 2 | No explicit robots meta in built HTML | `https://xemiennam.vercel.app/tuyen-duong/ba-ria-vung-tau/san-bay-tan-son-nhat-vung-tau` | Positive comparison; Offer audit passed. Exact schema types and SEO-005 record/version still require instance audit. |
| TP. Ho Chi Minh → Vung Tau 2d1n, 9055 (D35-10 group) | Not observed | Not observed | Not observed | `NOT_BUILT` in this CI environment; no D35-10 instance PASS is claimed. |

The CI log prints metadata and counts, not full HTML. The route IDs and technical paths are identifiers. Public location text continues to use the shared Sai Gon formatter; no slug or canonical ownership was changed. The general built-page Offer/AggregateOffer audit also passed. Prices remain unapproved and public pricing stays `contact`.

## Remaining proof for SEO VERIFY

1. Record and version of SEO-005 for 9190, 9055 and 9117 from the target WordPress/preview instance, with service, editorial, canonical, mapping, requested indexability and schema states. The Day 35 inventory is not a current SEO-005 record; version 0 does not certify readiness or D35-10 suppression. The nine D35-10 groups remain OPEN/P0.
2. A D35-10 blocked Route actually built/previewed with zero JSON-LD, noindex and absent from sitemap; compare the actual sitemap output of all three cases. Current CI did not build 9055.
3. Outbound and inbound post-hydration output for 9117 (only existing tuples), H1, cards, calls to action and canonical path. Do not derive new canonical links from 9055.
4. Operations public-safe fact ledger for service, packages, stops/wait, FAQ and future approved prices. No private booking addresses or notes.
5. WordPress plus frontend preview integration for malformed response, timeout/retry and idempotent replay of the same lead ID. Client contact clicks and submit attempts remain intent.

DEP-011 BLOCKER/P0; D35-10 OPEN/P0; Long Thanh and KU-068–KU-072 PRELAUNCH; production migration INACTIVE; launch NOT READY. No new URL, canonical/redirect/DNS/sitemap activation, price approval, PR merge or production deployment is authorized by this receipt.
