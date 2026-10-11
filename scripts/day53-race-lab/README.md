# RELEASE-01-RACE-01 isolated lab

Run only in a disposable workspace, never a real WordPress installation.
Set `DAY53_LAB_ROOT` to that workspace. Put a checkout of this source at
`$DAY53_LAB_ROOT/xemiennam` and copy this kit into `runtime/testkit` below it.
Run `python3 runtime/testkit/bootstrap.py`, then `python3 runtime/testkit/run.py`.
The bootstrap pins downloaded WordPress/PHP/MySQL/WP-CLI/JWT bytes; it refuses
local plugin modifications and verifies source version 0.17.2. It requires curl,
dpkg-deb, Python 3 and loopback server access. The runner uses its own MySQL data
directory and database with synthetic accounts only; it stops both PHP workers
and MySQL in `finally`. Verify the reserved ports are unused first. Existing
lab runs keep old fixture records and use new UUIDs; do not delete pending keys.

Exactly three repeated two-worker races reproduce the prior schedule: both
workers reach the real option INSERT before either finishes; B waits one second.
The query filter observes/delays real SQL and returns it unchanged. It never
replaces wpdb, add_option, post insertion or the plugin class. Direct SQL checks
count posts by request-key hash and verify one reservation, snapshot, attribution
and initial history. Additional targeted controls cover stale Options caches,
intent conflict, pending reservations, lost responses and a real MySQL permission
error. Failed assertions exit nonzero. Nothing reads the public pricing table.

Email is blocked at pre_wp_mail and sendmail_path=/bin/false. External WordPress
HTTP, cron and updates are disabled; synthetic users use example.invalid.
The CPT and route/vehicle meta are explicit test dependencies, and JWT 1.5.0
is independently installed. Lab success does not certify production parity.
Results, versions, email proof, observed SQL and logs stay in runtime/testkit.
Credentials in this kit are local synthetic values; no production secrets.
