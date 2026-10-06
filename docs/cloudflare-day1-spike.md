# Cloudflare migration: Day 1 compatibility spike

Status: online homepage, guard marker and public WordPress connectivity confirmed
for 6de7222. A preview cache improvement is prepared; online performance and route
acceptance remain open. Not a production candidate.
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
  That was the initial online version; the application was subsequently deployed
  as recorded below.
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
That dry run left Hello World unchanged. The owner subsequently saved
`npm run cf:deploy:preview` as the Deploy command and retried the build.

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

### Initial application deployment procedure (completed by owner)

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

## Online evidence and reported slowness, 2026-10-06

The owner provided an online homepage screenshot and two browser screenshots with
the dedicated Worker URLs visible. Health returns `mode: read-only` and
`guard: readonly-20261006`; the direct WordPress GET probe returns
`wordpress_reachable: true`, HTTP 200 and one public route. This establishes
those specific online results for 6de7222. It does not establish every route,
mobile behavior, fresh CMS updates, booking functionality or production readiness.

One retry build failed during prerendering with a WordPress fetch
`UND_ERR_SOCKET` (connection closed); a subsequent retry displayed the application.
The underlying intermittent connection cause is not proven. The owner then
reported very slow page loading; no authenticated browser waterfall or online
before/after timings are available in the agent environment.

### Narrow preview performance change

- The prior `defineCloudflareConfig()` resolves to a dummy incremental cache in
  the pinned adapter, so it cannot reuse the build-time pages/data at runtime.
  Configure the adapter's read-only Static Assets incremental cache and cache
  interception instead. No R2, KV, D1, Durable Objects, credentials or paid plan
  are provisioned. Assets and the existing self-reference remain the only bindings.
- Public prerendered pages/data become a **build snapshot**. WordPress changes
  require a new build/deployment; time-based/on-demand revalidation is unsupported
  by this cache and remains CF-07. Newly added routes may require runtime reads.
  Keep the direct WordPress health probe uncached to check live connectivity.
- Only successful cookie-free `/_next/static/` responses may be stored privately
  in the signed-in browser for one year (immutable build files). HTML, non-versioned
  public images, errors and responses with cookies retain `private, no-store`.
  Access, noindex and the write/private-route guard remain in place. External reads
  of `/cdn-cgi/_next_cache` are explicitly denied; internal ASSETS binding reads
  populate/serve the snapshot without going through that external route.
- Health also reports `cache: build-snapshot`; responses carry
  `X-AloDatXe-Cache: build-snapshot` and a `Server-Timing` handler duration. That
  duration ends at response headers, not full streamed body/image transfer.
  Image optimization remains disabled and is not addressed by this change.

### Verification of the cache candidate

- Six guard/cache-policy tests, typecheck, focused ESLint and diff checks passed.
- Full build succeeded with 556 pages. After preview cache population, dry run
  succeeded with 941 assets; Worker upload 10351.57 KiB, gzip 1948.23 KiB.
- Real local workerd served homepage and Sài Gòn–Vũng Tàu public route with HTTP
  200 from the snapshot. Repeated complete response times were 39.1/29.8 ms for
  home and 8.8/8.6 ms for the route on localhost; these **are not Cloudflare online
  load times**, have no TLS/Access/remote network and exclude browser rendering.
- Both pages' React Server Component navigation requests returned 200 with
  `text/x-component`. An actual compiled JavaScript asset returned private
  immutable cache headers. Booking POST, admin page and internal cache URL
  remained 403; every checked response carried noindex.
- Homepage HTML is still 1,080,379 bytes uncompressed and RSC data 902,501 bytes;
  the route HTML is 152,004 bytes. Large page payloads and original images may
  still contribute to browser loading; no complete frontend performance acceptance
  is claimed. Reduce payload/image costs only with separate measured evidence.

### Việc tiếp theo

1. Core pushes this tested candidate only to `chore/cloudflare-day1-spike`; the
   connected build uses the already saved real preview Deploy command.
2. Owner checks the new build is green, reloads homepage and Sài Gòn–Vũng Tàu
   twice in the authenticated browser, and reports whether repeated loads improve.
   Health must report `cache: build-snapshot` for this candidate.
3. If slow loading persists, measure the authenticated request waterfall to
   distinguish document wait, RSC payload, image transfer and JavaScript work.
   Do not recommend an upgrade or claim a speed improvement without online evidence.
4. Core keeps performance/route acceptance open; persistent CMS cache/revalidation,
   image optimization and production readiness remain later tasks. The previous
   6de7222 Worker version is available as rollback for this cache change.

Implementation references:
- https://opennext.js.org/cloudflare/howtos/custom-worker
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
