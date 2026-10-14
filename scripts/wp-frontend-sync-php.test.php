<?php
// Behavioral harness: only transport/cache signals are stubbed; no booking/email activity.
define('ABSPATH', __DIR__);
$options = array('alo_dat_xe_frontend_sync_secret' => str_repeat('a', 64), 'alo_dat_xe_frontend_sync_bootstrap' => '2');
$hooks = $requests = $events = array();
$posts = array(41 => (object) array('post_type' => 'route'), 77 => (object) array('post_type' => 'booking_request'));
$response = array('code' => 200, 'body' => '{"revalidated":true}');
function add_action($hook, $callback, $priority = 10, $args = 1) { global $hooks; $hooks[$hook][] = $callback; }
function get_option($key, $default = null) { global $options; return $options[$key] ?? $default; }
function update_option($key, $value, $autoload = null) { global $options; $options[$key] = $value; }
function wp_is_post_autosave($id) { return $id === 99; }
function wp_is_post_revision($id) { return $id === 98; }
function get_post($id) { global $posts; return $posts[$id] ?? null; }
function wp_json_encode($body) { return json_encode($body); }
function wp_remote_post($url, $args) { global $requests, $response; $requests[] = array($url, $args); return $response; }
function is_wp_error($response) { return $response === 'error'; }
function wp_remote_retrieve_response_code($response) { return $response['code']; }
function wp_remote_retrieve_body($response) { return $response['body']; }
function wp_next_scheduled($name, $args) { return false; }
function wp_schedule_single_event($at, $name, $args) { global $events; $events[] = array($name, $args); }
function current_user_can($capability) { global $administrator; return $administrator && 'manage_options' === $capability; }
function check($condition, $message) { if (!$condition) { throw new RuntimeException($message); } }
require __DIR__ . '/../wordpress/snippets/frontend-sync.php';
$sync = 'Alo_Dat_Xe_Frontend_Sync_V2';
$sync::post_saved(41, $posts[41]);
$sync::meta_changed(1, 41, 'pricing_v2', 'new final price');
check(count($requests) === 0, 'Must not send before meta commits');
$sync::flush();
check(count($requests) === 1, 'One callback per changed type at shutdown');
check($requests[0][0] === 'https://alodatxe.com/api/revalidate', 'Must use canonical hostname');
check($requests[0][1]['blocking'] && $requests[0][1]['redirection'] === 0, 'Must verify response without leaking secret on redirect');
check($options['alo_dat_xe_frontend_sync_status']['route']['result'] === 'ok', 'Record successful callback');
$requests = array();
$sync::post_saved(77, $posts[77]);
$sync::post_saved(99, $posts[41]);
$sync::post_saved(98, $posts[41]);
$sync::meta_changed(1, 41, '_edit_lock', 'ignored');
$sync::flush();
check(!$requests, 'No booking, autosave, revision or editor lock callbacks');
$sync::post_saved(41, $posts[41]); unset($posts[41]); $sync::flush();
check(count($requests) === 1, 'Deletion still flushes captured type after delete commits');
$sync::term_changed(1, 1, 'province'); $sync::flush();
check(json_decode(end($requests)[1]['body'], true)['post_type'] === 'taxonomy', 'Province term update invalidates embedded terms');
$response = array('code' => 503, 'body' => '{}');
$sync::send('route', 1); $sync::send('route', 3);
check(count($events) === 1 && $events[0][1] === array('route', 2), 'Retries stop after third attempt');
$response = array('code' => 401, 'body' => '{}'); $sync::send('route', 1);
check(count($events) === 1, 'Configuration failure must not loop');
check($options['alo_dat_xe_frontend_sync_status']['route']['http'] === 401, 'Keep rejected status visible without secrets');
unset($options['alo_dat_xe_frontend_sync_secret']); $sync::send('route', 1);
check($options['alo_dat_xe_frontend_sync_status']['route']['result'] === 'missing_secret', 'Never fallback to public secret');
check(strpos(json_encode($options['alo_dat_xe_frontend_sync_status']), str_repeat('a',64)) === false, 'Receipt must never expose credential');

// Only the authenticated inline-pricing REST route has a price-only contract.
define('REST_REQUEST', true);
$administrator = true;
$GLOBALS['wp'] = (object) array('query_vars' => array('rest_route' => '/gocar/v1/admin/routes/41/pricing'));
$_SERVER['REQUEST_METHOD'] = 'POST';
$options['alo_dat_xe_frontend_sync_secret'] = str_repeat('a',64);
$response = array('code' => 200, 'body' => '{"revalidated":true}');
$posts[41] = (object) array('post_type' => 'route');
$requests = array();
$sync::post_saved(41, $posts[41]);
$sync::meta_changed(1, 41, 'pricing_packages_v2', array());
check(!$requests, 'Price callback waits for committed fields');
$sync::flush();
check(count($requests) === 1, 'Price post and metadata events are coalesced');
$payload = json_decode($requests[0][1]['body'], true);
check($payload['post_type'] === 'route' && $payload['pricing_route_id'] === 41, 'Price callback identifies only the server route ID');
$sync::flush();
check(count($requests) === 1, 'Flushed price callbacks are not repeated');

$requests = $events = array();
$response = array('code' => 503, 'body' => '{}');
$sync::send('route', 1, 41);
check($events[0][1] === array('route', 2, 41), 'Transient retry retains the exact price scope');
$sync::send(...$events[0][1]);
check(json_decode(end($requests)[1]['body'], true)['pricing_route_id'] === 41, 'Retried transport remains price-only');
$response = array('code' => 200, 'body' => '{"revalidated":true}');

foreach (array('/gocar/v1/admin/apply', '/gocar/v1/admin/routes/42/pricing', '/wp/v2/route/41') as $rest_route) {
    $requests = array(); $GLOBALS['wp']->query_vars['rest_route'] = $rest_route;
    $sync::post_saved(41, $posts[41]); $sync::flush();
    check(!isset(json_decode($requests[0][1]['body'], true)['pricing_route_id']), 'Unrelated, structural and editor saves keep legacy scope');
}
$GLOBALS['wp']->query_vars['rest_route'] = '/gocar/v1/admin/routes/41/pricing';
$requests = array(); $administrator = false;
$sync::post_saved(41, $posts[41]); $sync::flush();
check(!isset(json_decode($requests[0][1]['body'], true)['pricing_route_id']), 'Non-administrator cannot select price-only scope');
$administrator = true; $requests = array();
$sync::post_saved(41, $posts[41]); $sync::term_changed(1, 1, 'province'); $sync::flush();
check(count($requests) === 1 && json_decode($requests[0][1]['body'], true)['post_type'] === 'taxonomy', 'Actual taxonomy changes retain the broader safe scope');
echo "Frontend sync PHP behavior: PASS\n";
