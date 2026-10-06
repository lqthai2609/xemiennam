# Cloudflare migration: Day 1 compatibility spike

Status: protected read-only preview prepared and locally packaged; online
application runtime remains unverified. Not a production candidate.
Baseline: main at 5a446a0cb5af384c9da97d8da9e124aa263e77dc.
Branch: chore/cloudflare-day1-spike. Production remains on Vercel.

## Reproduce

Use Node 24 and `npm ci`. No production credentials are required for this spike.

1. `GOCAR_ENABLE_MOCK_FALLBACK=false npm run cf:build`
2. `npm run cf:dry-run` (packages only; does not deploy)
3. `npm run cf:preview -- --ip 127.0.0.1 --inspector-port 9229`
4. `npm run test:cf-preview`

Pinned versions: Next.js and eslint-config-next 16.3.8,
@opennextjs/cloudflare 1.20.8, Wrangler 4.147.0. React stays 19.2.8.
OpenNext 1.20.8 refuses Next.js 16.3.4; its release notes require the patched
16.3.8 minimum. No force install, adapter downgrade or major framework upgrade.

## Evidence, 2026-10-04

- OpenNext build completed with 555 generated pages; `npm run build` remains
  the unchanged Next.js entry point and is invoked by OpenNext.
- Typecheck passed. ESLint: zero errors, eight existing source warnings.
- 26 targeted existing tests passed across lead idempotency, indexability,
  price rules, schema pricing and admin wizard.
- Wrangler dry run: 10332.57 KiB total upload, 1944.16 KiB gzip; 108 assets.
- Local workerd responds correctly to robots (200), revalidation health (200),
  admin session without a token (401), empty booking JSON (400), and admin
  login without an Origin (403). The invalid requests stop before backend
  writes. No successful booking or real notification was attempted.
- Homepage and sitemap return 500 locally: runtime logs show public WordPress
  fetches fail. Build-time WordPress reads succeed. The agent environment has
  restricted networking; the cause must be checked on a real Cloudflare preview
  before claiming compatibility. Do not mask it with mock pricing/content.
- Explicit inspector/host options avoid a local network-interface discovery
  error. agent-browser's daemon also fails to start in this environment, so
  there is no browser acceptance or performance measurement.

## Full migration release gates

CF-06 isolated backend and server secrets for booking/admin tests; CF-07
persistent cache, queue/tag invalidation; CF-08 image optimization; CF-09
successful full runtime checks. This config deliberately has no persistent
cache or production credentials. The read-only preview below is a narrower
compatibility test and does not complete these tasks.

Workers Free suitability is unproven: local packaging is not CPU/quota evidence.
No domain, DNS, canonical, WordPress writes, analytics, pricing or business-code
changes. Images use their original sources only on this spike branch; image
optimization and its performance/cost assessment remain deferred.

Sources:
- https://github.com/opennextjs/opennextjs-cloudflare/releases
- https://opennext.js.org/cloudflare/get-started
- https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/

Keep Vercel deployment dpl_BFFRuhmGE5LVA2ZVx6TF4pANj2dr
as the migration baseline. Do not merge or cut over this spike.

## Dashboard connection, 2026-10-06

Evidence: project owner's Cloudflare Settings and build-result screenshots,
plus the Access checks described below.

- Worker `alodatxe-migration-spike` was created using the Hello World template.
  Its public endpoint currently serves that template, not the migrated website.
- Git repository: `lqthai2609/xemiennam`.
- Production branch for this dedicated test Worker: `chore/cloudflare-day1-spike`.
- Build command: `npm run cf:build`.
- Deploy command and Version command: `npm run cf:dry-run`.
- Root directory: `/`.
- No runtime or build variables/secrets, and no bindings, appeared in the initial
  connection screenshot. The committed configuration supplies two non-secret
  false flags, ASSETS and WORKER_SELF_REFERENCE when actually deployed.
- Builds for non-production branches is checked in the screenshot. Disable this
  setting to keep migration builds limited to the spike branch.
- Do not select Set up Worker Previews yet; that is a separate configuration step.

Cloudflare build #ef075761 for commit
`9200d899233664f1359b7034c6152d657cecb7a0` succeeded in approximately 1m38s.
Its log shows 556 generated pages and a successful packaging-only dry run.
Hello World remains the online application until the real deploy command is used.

## Access and read-only preview, 2026-10-06

- The owner activated Zero Trust Free and applied Worker Access to **All traffic**.
  The Allow policy is **Cloudflare account members**, not a verified single-user
  restriction. The owner's screenshot confirms production and preview coverage.
- An independent anonymous browser request redirected to Cloudflare Access login
  without showing application content. The owner subsequently confirmed successful
  sign-in and access to Hello World. This confirms access to the template, not yet
  the migrated application.
- `cloudflare/preview-worker.mjs` delegates public page reads to generated OpenNext
  code. Its guard denies every method except GET/HEAD and denies every `/api`
  and `/quan-tri` route before delegation, including booking, lead management,
  admin authentication and revalidation. No real booking/notification was tested.
- Every response, including assets, carries `X-Robots-Tag: noindex, nofollow,
  noarchive` and `Cache-Control: private, no-store`. `/robots.txt` disallows all
  crawling. `assets.run_worker_first` is true so assets also pass through the guard.
  This invokes the Worker for asset reads; production cost/performance is untested.
- Images use original sources with `images.unoptimized: true`; the IMAGES binding
  was removed. Do not treat this temporary image configuration as CF-08 completion.
- Only public WordPress reads are permitted by the application test scope. No
  production credentials are supplied. This is not an isolated WordPress backend
  and does not authorize booking/admin write tests.
- `/__migration/health` returns the marker `readonly-20261006` and mode `read-only`.
  `/__migration/wordpress` performs a fixed, credential-free GET for at most one
  public route and returns connectivity status/count only, not source records.

### Verification of the prepared preview

- Five guard tests passed, including encoded private paths and no delegation of
  blocked requests. Typecheck, focused ESLint and `git diff --check` passed.
- Full OpenNext build succeeded with 556 generated pages. Wrangler dry run
  succeeded: 10337.54 KiB total upload, 1945.34 KiB gzip and 108 assets.
- Local workerd HTTP checks: health/robots/favicon return 200; HEAD robots has
  no body; booking POST, admin session, revalidation, admin page and lead DELETE
  return 403. Every checked response carries noindex, including the actual asset.
- Local homepage still returns 500 and the WordPress connectivity probe returns
  502. Build-time reads succeed. The cause remains unresolved until a real
  Cloudflare runtime test; do not claim it is proven to be only a local-network
  limitation. No browser visual or performance acceptance has been completed.

### Next dashboard action after this commit is available

1. Keep Build command `npm run cf:build`, root `/`, and branch
   `chore/cloudflare-day1-spike`. Disable builds for non-production branches.
2. In Settings > Builds, change only Deploy command to
   `npm run cf:deploy:preview` and save. Keep Version command `npm run cf:dry-run`.
3. Once the automatic packaging-only build has finished, retry the build for the
   latest commit through Deployments > View build history. Retry uses the current
   saved build settings. This deploys only the dedicated migration Worker.
4. After successful deployment, sign in through Access and check health, the
   WordPress probe, homepage and representative public route pages. Confirm the
   marker and actual runtime results before marking online compatibility passed.
   Never submit a real booking on this preview.

If the preview fails, use the previous Hello World Worker version as rollback;
Vercel production stays unchanged. Access must remain enabled for all traffic.
No production cutover, DNS change, isolated-backend acceptance, persistent ISR
cache acceptance, Free CPU suitability or Day 1 closure is claimed here.

Implementation references:
- https://opennext.js.org/cloudflare/howtos/custom-worker
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
