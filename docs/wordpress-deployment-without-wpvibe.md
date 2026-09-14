# WordPress deployment without WPVibe

## Goal

Gocar VN must not depend on WPVibe, WPWriter, or any chat connector for a production-critical WordPress workflow.

GitHub is the source of truth for WordPress code. Connectors are optional convenience tools only.

## Source flow

1. WordPress code lives under `wordpress/gocar-core`.
2. Changes are made on a GitHub branch and reviewed in a pull request.
3. CI validates the Next.js application as usual.
4. `.github/workflows/gocar-core-package.yml` additionally runs PHP syntax checks and produces `gocar-core.zip` whenever Gocar Core changes.
5. Production WordPress is updated using the packaged ZIP or a hosting-level deployment method.
6. Production behavior is verified through the public WordPress REST API and frontend smoke tests.

## Manual production update

Use this path when no automated hosting deployment has been configured yet:

1. Open the successful `Gocar Core Package` GitHub Actions run for the commit to deploy.
2. Download the `gocar-core-plugin` artifact and extract `gocar-core.zip` if GitHub wraps the artifact in another ZIP.
3. Take a current WordPress/hosting backup before replacing production plugin code.
4. In WordPress admin, upload/update the Gocar Core plugin using the packaged `gocar-core.zip`, or replace the plugin directory through the hosting file manager/SFTP using the exact artifact contents.
5. Confirm Gocar Core is active and its reported version matches the source commit being deployed.
6. Purge WordPress/server/CDN cache if the environment uses caching.
7. Run the acceptance checks below.

Do not copy individual PHP snippets from chat into production as the normal deployment path. Emergency hotfixes must be ported back to Git immediately.

## Day 12 acceptance checks

After deploying Gocar Core v0.2.0 or later:

1. Open one Route edit screen and confirm the Route × Vehicle combo-content editor is present.
2. Save one unique description for a real vehicle attached to that route.
3. Verify the route REST response exposes the saved `combo_descriptions` row with `vehicle_id` and `description`.
4. Verify the corresponding Route × Vehicle page uses the CMS description.
5. Verify a combo without CMS content still renders safely using the frontend fallback, but is not treated as proof of unique editorial content for thin-content/indexing decisions.
6. Confirm Pricing V2 values, booking context, direction handling, and route URLs are unchanged.

## Production verification without connector access

Read-only verification should prefer public, reproducible interfaces:

- WordPress REST endpoints under `/wp-json/wp/v2/...`.
- Public frontend URLs.
- GitHub Actions CI/build logs.
- Vercel deployment/check results where applicable.

Authenticated content edits remain a WordPress-admin/hosting responsibility unless a separate secure deployment integration is explicitly configured.

## Future automation

If production hosting supports SSH/SFTP/deploy hooks, a later infrastructure task may add GitHub Actions deployment using repository/environment secrets. Secrets must never be committed to the repository, printed in workflow logs, or exposed to the browser.

This automation is optional. The project must remain deployable through the packaged ZIP path above.

## Connector policy

WPVibe or similar plugins/connectors may be used when convenient for inspection or repetitive admin tasks, but:

- no roadmap acceptance criterion may require a connector;
- connector quota/outage must not block source development, CI, packaging, or read-only production verification;
- production code must have a source-controlled deployment path independent of the connector;
- removal of a connector must not require application architecture changes.
