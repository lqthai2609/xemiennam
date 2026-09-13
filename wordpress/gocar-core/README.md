# Gocar Core

WordPress-side foundation for Gocar VN contracts and controlled migrations.

## Day 6 scope

This first version solves the missing Location data discovered in the Route Pair CMS:

- scan published legacy `route` posts;
- read `diem_di` and `diem_den`;
- normalize commercial package suffixes such as `1 ngày`, `2 ngày 1 đêm`, `3N2Đ` out of Location names;
- deduplicate by WordPress Location slug;
- classify ambiguous names containing `/` or parentheses as `review_required`;
- create only explicitly approved Location posts;
- never change `origin_location_id` or `destination_location_id` in this phase.

Airport posts remain ordinary `location` entities. Existing airports such as Tân Sơn Nhất and Long Thành are not duplicated.

## Safety

Migration is intentionally two-stage:

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

1. Deploy/activate `gocar-core` while the existing WPCode V2 snippets remain active.
2. Run preview and review generated candidates.
3. Apply safe candidates only.
4. Confirm the Route Pair Origin/Destination dropdown contains local destinations.
5. Complete the Day 6 save/REST acceptance test.
6. Later migrate WPCode contracts into this plugin one module at a time.
