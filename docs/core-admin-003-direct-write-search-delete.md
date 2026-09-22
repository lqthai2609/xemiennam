# CORE-ADMIN-003 — Direct write, route search and recoverable delete

Status: IMPLEMENTED, pending production rollout.

## User outcome

`/quan-tri` keeps the existing draft → approval workflow and adds an owner-operated direct path:

1. Create Route: save/submit a workflow draft or write immediately to WordPress backend.
2. Pricing V2: search an existing Route and either submit a workflow draft or apply the selected tuple immediately.
3. Route management: search an existing Route, submit a soft-archive draft, or remove it from the site immediately.

## Mutation contract

- Direct mutation endpoint: `POST /wp-json/gocar/v1/admin/apply`.
- Permission: `publish_posts`; editor-only accounts cannot use the direct path.
- Supported direct operations: `create_route`, `update_pricing`, `delete_route`.
- All direct operations require a reason, run backend validation, and create an immutable audit row containing actor, timestamp and before/after snapshots.
- Direct create stores the Route as WordPress `draft`. It does not create a public URL, canonical, sitemap entry or schema surface.
- Direct delete uses WordPress Trash (`wp_trash_post`), not permanent deletion. The public route disappears immediately and an eligible latest audit may restore its previous status and metadata.

## Route search contract

- Authenticated endpoint: `GET /wp-json/gocar/v1/admin/routes`.
- Results include published, draft, pending and private Route posts, up to 500 records.
- Suggestions match Route ID, slug, origin label and destination label with accent-insensitive search.
- Long Thành and D35-10 records remain visible as locked choices and cannot be mutated.

## Guardrails retained

- D35-10 remains OPEN/P0 and blocked in backend validation.
- Long Thành remains PRELAUNCH and blocked in backend validation.
- Fixed price must be a positive integer; `contact` and `disabled` never persist a numeric price.
- Pricing updates affect only one explicit Route × Direction × Vehicle × Package tuple.
- Browser mutations continue through the same-origin Next.js proxy with HttpOnly JWT session, CSRF validation and endpoint allowlisting.
- Direct and destructive actions use an inline confirmation step and write an audit record.

## Verification gate

- `npm run lint`: zero errors; five existing warnings outside this scope.
- `npm run typecheck`: pass.
- `npm run test:admin-wizard`: pass.
- `node --test scripts/*.test.mjs`: 102/102 pass.
- `npm run build`: pass; the final local build generated 519 pages from the then-current WordPress dataset.
- PHP syntax and behavior are authoritative in GitHub Actions because the local runtime has no PHP binary.
