<?php
/**
 * Plugin Name: Gocar Core
 * Description: Core WordPress contracts and migration helpers for Gocar VN.
 * Version: 0.1.1
 * Author: Gocar VN
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'GOCAR_CORE_VERSION', '0.1.1' );
define( 'GOCAR_CORE_PATH', plugin_dir_path( __FILE__ ) );

// Phase 1 is intentionally non-mutating: shared normalization only.
// WordPress write/migration commands will be added after the generated
// Location manifest has been reviewed and an authenticated REST workflow is ready.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-location-normalizer.php';

// Day 10: source-controlled headless SEO contract for Province Hubs.
require_once GOCAR_CORE_PATH . 'includes/class-gocar-rank-math-rest.php';
