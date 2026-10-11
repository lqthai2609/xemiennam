<?php
/** Read-only contract harness: no database, booking, mail or network. */
define( 'ABSPATH', __DIR__ );
function add_action( $event, $callback ) { $GLOBALS['actions'][$event][] = $callback; }
function add_filter() {}
function register_rest_route( $namespace, $path, $args ) { $GLOBALS['routes'][$namespace . $path] = $args; }
class WP_REST_Response {
    public array $headers = array();
    public function __construct( public array $data ) {}
    public function header( $key, $value ) { $this->headers[$key] = $value; }
}
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-lead-lifecycle.php';
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-promotion-snapshot.php';
require __DIR__ . '/../wordpress/gocar-core/includes/class-gocar-booking-contract.php';
$checks = 0;
function verify( $ok, $label ) { $GLOBALS['checks']++; if ( ! $ok ) { throw new Exception( $label ); } }
Gocar_Booking_Contract::routes();
$route = $GLOBALS['routes']['gocar/v1/leads/contract'];
verify( 'GET' === $route['methods'], 'GET only' );
verify( '__return_true' === $route['permission_callback'], 'public versions, no credentials' );
verify( array( Gocar_Booking_Contract::class, 'read' ) === $route['callback'], 'exact read callback' );
$response = Gocar_Booking_Contract::read();
verify( array( 'contract_version' => 1, 'intent_version' => 2, 'snapshot_version' => 1, 'replay_lookup' => true, 'snapshot_persistence' => true ) === $response->data, 'actual source classes advertise supported protocols only' );
verify( 'no-store, max-age=0' === $response->headers['Cache-Control'], 'not cached' );
verify( 'noindex, nofollow, noarchive' === $response->headers['X-Robots-Tag'], 'not indexable' );
verify( $response->data === Gocar_Booking_Contract::read()->data, 'repeated read has no state' );
echo "PASS: $checks booking capability checks; no writes or external calls.\n";
