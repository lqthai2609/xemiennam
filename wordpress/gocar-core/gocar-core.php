<?php
/**
 * Plugin Name: Gocar Core
 * Description: Core WordPress contracts and migration tools for Gocar VN.
 * Version: 0.1.0
 * Author: Gocar VN
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'GOCAR_CORE_VERSION', '0.1.0' );
define( 'GOCAR_CORE_PATH', plugin_dir_path( __FILE__ ) );

require_once GOCAR_CORE_PATH . 'includes/class-gocar-location-migration.php';

add_action( 'plugins_loaded', array( 'Gocar_Location_Migration', 'boot' ) );
