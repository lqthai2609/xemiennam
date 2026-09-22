# Gocar Core

WordPress-side foundation for Alo Đặt Xe contracts and controlled migrations.

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

## Day 32 scope — v0.5.0

`class-gocar-service-area.php` adds the source-controlled service-area and surcharge contract:

- Location V2 owns `service_zone_id`, `service_zone_tier` (`center/suburb/outskirt`) and `service_area_status`;
- Route V2 owns the version-gated `zone_surcharge_rules_v2` policy;
- Booking V2 persists the resolved zone IDs, surcharge mode, positive amount and matched rule keys;
- missing policy, unverified/missing zones and outside-service-area cases fall back to `contact`;
- exact pickup/dropoff address text is never used to classify a zone;
- surcharge remains separate from Pricing V2 base price and from revenue.

No operational zone assignment or fee value is seeded by the plugin. Operators must approve and enter those values before activating a route policy.

## Day 33 scope — v0.6.0

Booking V2 now accepts `intermediate_stops_v1` for up to three ordered intermediate stops:

- each stop stores an exact trip-instance address and waiting time in minutes;
- the server rebuilds one-based sequential order and sanitizes every row;
- old clients may omit the array and keep the existing booking behavior;
- exact stop addresses remain private and are not Location V2, Route/Direction, SEO or analytics entities;
- Day 33 does not calculate extra-stop, waiting, overtime or distance pricing.

The Contact form, Route Quick Booking and Booking Search quote dialog use the same limits and payload contract. Pricing integration is deferred to Day 34.

## Day 34 scope — v0.7.0

`class-gocar-price-rules.php` adds a version-gated modifier policy without changing Pricing V2 as
the base-price source of truth. Route rules may cover extra stops, waiting minutes, overtime hours
and extra kilometres, scoped by direction, vehicle and package. No policy is active by default and
no operational rate ships with the plugin.

Booking V2 stores a resolution snapshot only after the server combines the exact Pricing V2 row,
the Day 32 surcharge result and applicable Day 34 modifier rules. Missing, invalid or ambiguous
rules resolve to `contact`; `contact` and `disabled` never become a zero price. `estimated_total` is
stored only when every component resolves numerically and is not recognized revenue or quoted price.

## Day 35 scope — v0.8.0

The existing Price Rules Engine now supports a separate version-gated condition policy for approved
local date/time, weekday/weekend, holiday and package rules. The evaluator uses priority and specificity,
requires an explicit `none` rule for zero adjustment, and returns `contact` for inactive, missing,
invalid or ambiguous states. No rate, factor, holiday date or effective window ships with the plugin.
Temporal rules require an Operations-approved IANA timezone. Weekend rules require explicit
weekend membership; the plugin does not infer Saturday/Sunday. Booking V2 stores the server-derived
condition trace, policy version and timezone separately from the Pricing V2 base snapshot.

## Content rule

Each Route × Vehicle description must be materially specific to that combination. Editors should describe useful trip context such as group profile, luggage/capacity fit, pickup/dropoff reality or use case. Do not create near-duplicate text by only swapping destination or vehicle names. If no editorial content exists, the frontend may render a safe fallback for UX, but that fallback does not qualify as unique SEO content; indexability is handled separately by the thin-content guard.

## CORE-ADMIN-002 scope — v0.10.0

`class-gocar-admin-api.php` adds the private mutation boundary used by `/quan-tri`:

- WordPress/JWT authentication with `edit_posts` for drafts and `publish_posts` for approval;
- private server-side drafts with validate → submit → publish workflow;
- route creation remains WordPress `draft`, so it does not create a new public URL;
- existing Pricing V2 tuples may be updated only after server validation and approval;
- route removal is soft archive (`draft` + both directions disabled), never hard delete;
- every applied change stores actor, timestamp, reason and complete before/after snapshots;
- rollback is optimistic and refuses to overwrite a route changed after the selected audit record;
- D35-10 endpoint groups/route IDs and Long Thành PRELAUNCH are blocked in the backend, not only in the UI;
- `fixed` requires a positive integer; `contact` and `disabled` never carry a numeric price.

The browser must use the Next.js authenticated proxy. It must not call these endpoints or the
WordPress core post endpoints directly.

## CORE-ADMIN-003 scope — v0.11.0

The private `/quan-tri` boundary now also supports the owner-operated fast path:

- authenticated publishers may validate and apply route creation or one Pricing V2 tuple directly, without creating an approval draft;
- direct route creation still creates a WordPress `draft`, so it does not silently open a new public URL;
- the route picker searches the authenticated backend catalog and suggests published plus draft/private routes;
- a publisher may remove a route immediately by moving it to WordPress Trash;
- route removal is recoverable: it stores the same before/after audit snapshot and can be rolled back;
- every direct mutation still requires a reason and passes the D35-10, Long Thành PRELAUNCH, direction and positive-price guards;
- the two-step draft/approval path remains available alongside the direct path.

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
5. Confirm the `Alo Đặt Xe — Quan hệ nội dung` meta box lists only Location posts with `location_type=airport`.
6. Save one airport relation and verify `/wp-json/wp/v2/posts/<id>?_embed=1` returns `meta.related_airport_location_ids` together with embedded Province/Vehicle terms.
7. Smoke Province/Vehicle blog-related sections and verify they return only exact taxonomy matches.
8. Verify an Airport relation can be resolved by Location ID and that posts with no structured relation are not injected into Province/Vehicle/Airport sections.
9. For Day 31, verify `booking_request` REST accepts and returns the five pickup/dropoff meta keys without changing Route/Pricing fields.
10. Submit one representative booking and verify exact pickup/dropoff are persisted while the canonical Route + Direction remain unchanged.
11. For Day 33, submit bookings with zero, one and three intermediate stops; verify order, address and waiting minutes round-trip through REST.
12. Confirm a fourth stop and invalid waiting values are rejected by the frontend/API boundary and capped by WordPress defense-in-depth.
13. Continue migrating WPCode contracts into this plugin one module at a time only after acceptance tests.
