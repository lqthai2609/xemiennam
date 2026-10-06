# Cloudflare migration: Day 1 compatibility spike

Status: preliminary build succeeds; not a deployable production candidate.
Baseline: main at 5a446a0cb5af384c9da97d8da9e124aa263e77dc.
Branch: chore/cloudflare-day1-spike. Production remains on Vercel.

## Reproduce

Use Node 24 and `npm ci`. No production credentials are required for this spike.

1. `GOCAR_ENABLE_MOCK_FALLBACK=false npm run cf:build`
2. `npm run cf:dry-run` (packages only; does not deploy)
3. `npm run cf:preview -- --ip 127.0.0.1 --inspector-port 9229`

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

## Required before deployment

CF-03 account/access; CF-06 isolated backend and server secrets; CF-07 persistent
cache, queue/tag invalidation; CF-08 image plan; CF-09 successful full runtime
checks. This config deliberately has no persistent cache or real credentials.
The IMAGES binding here is a local capability declaration; its online use and
cost still need evaluation. Do not deploy it against real booking data.

Workers Free suitability is unproven: local packaging is not CPU/quota evidence.
There is no deployment command or Cloudflare provisioning in the npm scripts.
No domain, DNS, canonical, WordPress, analytics, pricing or business-code changes.

Sources:
- https://github.com/opennextjs/opennextjs-cloudflare/releases
- https://opennext.js.org/cloudflare/get-started
- https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/

Next action: verify the connected Cloudflare packaging-only build, then prepare
a protected online test against an isolated backend. Keep Vercel deployment dpl_BFFRuhmGE5LVA2ZVx6TF4pANj2dr
as the migration baseline. Do not merge or cut over this spike.

## Dashboard connection, 2026-10-06

Evidence: project owner's Cloudflare Settings screenshot, after connecting GitHub.
This is dashboard configuration evidence, not a successful application build or
runtime test.

- Worker `alodatxe-migration-spike` was created using the Hello World template.
  Its public endpoint currently serves that template, not the migrated website.
- Git repository: `lqthai2609/xemiennam`.
- Production branch for this dedicated test Worker: `chore/cloudflare-day1-spike`.
- Build command: `npm run cf:build`.
- Deploy command and Version command: `npm run cf:dry-run`.
- Root directory: `/`.
- No runtime or build variables/secrets, and no bindings, appear in the screenshot.
- Builds for non-production branches is checked in the screenshot. Disable this
  setting to keep migration builds limited to the spike branch.
- Do not select Set up Worker Previews yet; that is a separate configuration step.

This documentation commit triggers the first packaging-only build through the
connected branch. The result must be checked in Cloudflare build history.
A successful dry run does not replace Hello World, validate WordPress runtime
connectivity, or establish production readiness.

Remaining before an online application test: preview access protection and
noindex, backend write isolation, and review of image bindings and cache behavior.
Do not add production credentials or switch the deploy command to a real deploy
until that test scope is prepared.
