<?php
/**
 * Plugin Name: Gocar Core
 * Description: Core WordPress contracts and migration helpers for Gocar VN.
 * Version: 0.7.0
 * Author: Gocar VN
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'GOCAR_CORE_VERSION', '0.7.0' );
define( 'GOCAR_CORE_PATH', plugin_dir_path( __FILE__ ) );

// Phase 1 is intentionally non-mutating: shared normalization only.
// WordPress write/migration commands will be added after the generated
// Location manifest has been reviewed and an authenticated REST workflow is ready.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-location-normalizer.php';

// Day 10: source-controlled headless SEO contract for Province Hubs.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-rank-math-rest.php';

// Day 12: route × vehicle editorial content contract + route edit-screen CMS.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-combo-content.php';

// Day 24: structured Blog ↔ Province / Vehicle / Airport relation contract.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-blog-relations.php';

// Day 31: Booking V2 exact pickup/dropoff persistence contract.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-booking-request.php';

// Day 32: authoritative Location service zones + Booking surcharge result persistence.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-service-area.php';

// Day 34: version-gated stop/waiting/overtime/extra-distance price rules.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-price-rules.php';
