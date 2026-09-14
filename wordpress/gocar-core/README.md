# Gocar Core

WordPress-side foundation for Gocar VN contracts and controlled migrations.

## Day 6 scope

The first version solved the missing Location data discovered in the Route Pair CMS:

- scan published legacy `route` posts;
- read `diem_di` and `diem_den`;
- normalize commercial package suffixes such as `1 ngày`, `2 ngày 1 đêm`, `3N2Đ` out of Location names;
- deduplicate by WordPress Location slug;
- classify ambiguous names containing `/` or parentheses as `review_required`;
- create only explicitly approved Location posts;
- never change `origin_location_id` or `destination_location_id` in this phase.

Airport posts remain ordinary `location` entities. Existing airports such as Tân Sơn Nhất and Long Thành are not duplicated.

## Day 10 scope — v0.1.1

`class-gocar-rank-math-rest.php` exposes read-only Rank Math title/description fields for Province Hub (`diem_den`) responses. The frontend still owns metadata fallback policy.

## Day 12 scope — v0.2.0

`class-gocar-combo-content.php` adds the source-controlled Route × Vehicle content contract:

- route meta key: `combo_descriptions`;
- one row = `vehicle_id` + hand-written `description`;
- REST exposure under `route.meta.combo_descriptions`;
- route edit-screen meta box with one textarea per vehicle post;
- invalid vehicle IDs, empty descriptions and duplicate vehicle rows are discarded;
- content is independent from Pricing V2 and must not contain hard-coded price claims.

The Next.js layer resolves `vehicle_id` to the canonical `vehicle_type` taxonomy and uses the editorial description before any legacy/mock fallback.

## Content rule

Each Route × Vehicle description must be materially specific to that combination. Editors should describe useful trip context such as group profile, luggage/capacity fit, pickup/dropoff reality or use case. Do not create near-duplicate text by only swapping destination or vehicle names. If no editorial content exists, the frontend may render a safe fallback for UX, but that fallback does not qualify as unique SEO content; indexability is handled separately by the thin-content guard.

## Safety

Location migration remains intentionally two-stage:

1. Preview candidates.
2. Apply only after explicit confirmation.

The plugin does not migrate anything on activation. Ambiguous candidates are skipped by default.

## Planned commands

```text
wp gocar locations preview
wp gocar locations apply --confirm=MIGRATE_LOCATIONS_V1
```

The apply command creates missing `location` posts with `location_type=locality`. It does not migrate route IDs. Route mapping is a separate acceptance-tested migration after the Location catalog has been reviewed.

## Rollout

1. Package/deploy `gocar-core` v0.2.0 while existing WPCode V2 snippets remain active.
2. Verify Province Hub REST still exposes `rank_math_title` + `rank_math_description`.
3. Open a `route` edit screen and confirm the new Route × Vehicle meta box lists vehicle posts.
4. Save one combo description and verify `meta.combo_descriptions` through `/wp-json/wp/v2/route/<id>`.
5. Smoke a combo landing page and confirm editorial text is rendered.
6. Test a route without `combo_descriptions`; it must keep rendering via fallback without runtime/build errors.
7. Continue migrating WPCode contracts into this plugin one module at a time only after acceptance tests.
