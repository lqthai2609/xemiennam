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

## Day 24 scope — v0.3.0

`class-gocar-blog-relations.php` adds the source-controlled Blog semantic relation contract:

- Blog ↔ Province reuses the existing `province` taxonomy;
- Blog ↔ Vehicle reuses the existing `vehicle_type` taxonomy;
- the module attaches those existing taxonomies to normal WordPress `post` objects when they are registered;
- Blog ↔ Airport uses post meta `related_airport_location_ids` containing Location V2 post IDs;
- airport IDs are accepted only when the target post type is `location` and `location_type=airport`;
- REST exposes the airport relation under `post.meta.related_airport_location_ids`;
- a post edit-screen meta box lists only Location V2 airport entities;
- no title, excerpt or body text matching is used to manufacture relations.

The Next.js blog mapper converts embedded taxonomy terms into `provinceSlugs` and `vehicleTypeSlugs`, and converts the REST meta relation into `airportLocationIds`. Related-post ranking uses structured relations only, with Airport > Province > Vehicle > blog category priority.

## Day 31 scope — v0.4.0

`class-gocar-booking-request.php` adds the source-controlled Booking V2 pickup/dropoff persistence contract for `booking_request`:

- `pickup_location_id`: optional Location V2 reference for the pickup side;
- `dropoff_location_id`: optional Location V2 reference for the dropoff side;
- `pickup_address`: exact pickup address or meeting point entered for this trip;
- `dropoff_address`: exact dropoff address entered for this trip;
- `pickup_note`: optional operational note for finding the passenger or pickup point;
- all fields are exposed through REST and sanitized server-side;
- existing registered meta keys are not re-registered or overridden.

The exact address fields are trip-instance data. They do not replace Route Pair/Direction V2, and they are not Pricing V2 inputs. The Next.js `/api/booking` handler keeps Route + Direction as the canonical journey/pricing context, derives endpoint Location IDs from Route V2 when the client does not send a more specific valid Location ID, and stores exact pickup/dropoff separately.

Day 31 intentionally does **not** create an authoritative `center/suburb` or surcharge flag. Zone/service-area classification and surcharge evaluation belong to Day 32. This prevents booking capture from forking future Zone/Pricing rules.

## Content rule

Each Route × Vehicle description must be materially specific to that combination. Editors should describe useful trip context such as group profile, luggage/capacity fit, pickup/dropoff reality or use case. Do not create near-duplicate text by only swapping destination or vehicle names. If no editorial content exists, the frontend may render a safe fallback for UX, but that fallback does not qualify as unique SEO content; indexability is handled separately by the thin-content guard.

For blog relations, editors must assign the relevant Province/Vehicle taxonomy or Airport Location explicitly. Do not infer semantic relations from words in a title or article body when structured relation data exists.

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

1. Package/deploy `gocar-core` while existing WPCode V2 snippets remain active.
2. Verify Province Hub REST still exposes `rank_math_title` + `rank_math_description`.
3. Verify route edit screens still expose the Route × Vehicle meta box and existing `combo_descriptions` data.
4. Open a normal blog post and confirm Province/Vehicle taxonomies remain available where registered.
5. Confirm the `Gocar VN — Quan hệ nội dung` meta box lists only Location posts with `location_type=airport`.
6. Save one airport relation and verify `/wp-json/wp/v2/posts/<id>?_embed=1` returns `meta.related_airport_location_ids` together with embedded Province/Vehicle terms.
7. Smoke Province/Vehicle blog-related sections and verify they return only exact taxonomy matches.
8. Verify an Airport relation can be resolved by Location ID and that posts with no structured relation are not injected into Province/Vehicle/Airport sections.
9. For Day 31, verify `booking_request` REST accepts and returns the five pickup/dropoff meta keys without changing Route/Pricing fields.
10. Submit one representative booking and verify exact pickup/dropoff are persisted while the canonical Route + Direction remain unchanged.
11. Continue migrating WPCode contracts into this plugin one module at a time only after acceptance tests.
