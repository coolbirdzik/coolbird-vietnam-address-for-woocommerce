<?php

/**
 * VNCheckout Shipping Admin Class
 * 
 * Handles admin UI and AJAX for shipping rate management
 */

if (!defined('ABSPATH')) {
    exit;
}

class CoolBirdVietnam_Shipping_Admin
{
    /**
     * Get shipping rates table name.
     *
     * @return string
     */
    private function get_shipping_rates_table_name()
    {
        global $wpdb;

        return $wpdb->prefix . 'vncheckout_shipping_rates';
    }

    /**
     * Get escaped shipping rates table name for raw SQL statements.
     *
     * @return string
     */
    private function get_shipping_rates_table_sql()
    {
        return '`' . esc_sql($this->get_shipping_rates_table_name()) . '`';
    }

    /**
     * Read and sanitize a string value from POST.
     *
     * @param string $key Request key.
     * @return string
     */
    private function get_post_string($key)
    {
        if (!isset($_POST[$key])) {
            return '';
        }

        return sanitize_text_field(wp_unslash($_POST[$key]));
    }

    /**
     * Constructor
     */
    public function __construct()
    {
        add_action('admin_menu', array($this, 'add_admin_menu'), 99);
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));

        // AJAX actions
        add_action('wp_ajax_vncheckout_get_shipping_rates', array($this, 'ajax_get_shipping_rates'));
        add_action('wp_ajax_vncheckout_save_shipping_rate', array($this, 'ajax_save_shipping_rate'));
        add_action('wp_ajax_vncheckout_delete_shipping_rate', array($this, 'ajax_delete_shipping_rate'));
        add_action('wp_ajax_vncheckout_import_rates_csv', array($this, 'ajax_import_rates_csv'));
        add_action('wp_ajax_vncheckout_export_rates_csv', array($this, 'ajax_export_rates_csv'));
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu()
    {
        add_submenu_page(
            'woocommerce',
            __('Vietnam Shipping Rates', 'coolbird-vietnam-address-for-woocommerce'),
            __('Shipping Rates', 'coolbird-vietnam-address-for-woocommerce'),
            'manage_woocommerce',
            'vncheckout-shipping-rates',
            array($this, 'render_admin_page')
        );
    }

    /**
     * Enqueue admin scripts
     *
     * @param string $hook Current page hook
     */
    public function enqueue_admin_scripts($hook)
    {
        if ($hook === 'woocommerce_page_vncheckout-shipping-rates') {
            // Enqueue React admin shipping app
            $asset_file = plugin_dir_path(dirname(__FILE__)) . 'assets/dist/admin-shipping.js';
            if (file_exists($asset_file)) {
                wp_enqueue_script(
                    'vncheckout-admin-shipping',
                    plugins_url('assets/dist/admin-shipping.js', dirname(__FILE__)),
                    array(),
                    filemtime($asset_file),
                    true
                );

                $css_file = plugin_dir_path(dirname(__FILE__)) . 'assets/dist/admin-shipping.css';
                if (file_exists($css_file)) {
                    wp_enqueue_style(
                        'vncheckout-admin-shipping',
                        plugins_url('assets/dist/admin-shipping.css', dirname(__FILE__)),
                        array(),
                        filemtime($css_file)
                    );
                }

                // Localize script
                wp_localize_script('vncheckout-admin-shipping', 'coolbirdvik_district_admin', array(
                    'ajaxurl' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('vncheckout_shipping_admin'),
                    'provinces' => $this->get_provinces_for_js(),
                ));
            }
        }
    }

    /**
     * Render admin page
     */
    public function render_admin_page()
    {
        echo '<div id="vncheckout-admin-shipping-app"></div>';
    }

    /**
     * Get provinces for JavaScript
     *
     * @return array
     */
    private function get_provinces_for_js()
    {
        $tinh_thanhpho_file = plugin_dir_path(dirname(__FILE__)) . 'cities/provinces.php';
        if (file_exists($tinh_thanhpho_file)) {
            include $tinh_thanhpho_file;
            $provinces = array();
            if (isset($tinh_thanhpho) && is_array($tinh_thanhpho)) {
                foreach ($tinh_thanhpho as $code => $name) {
                    $provinces[] = array(
                        'code' => $code,
                        'name' => $name,
                    );
                }
            }
            return $provinces;
        }
        return array();
    }

    /**
     * AJAX: Get shipping rates
     */
    public function ajax_get_shipping_rates()
    {
        check_ajax_referer('vncheckout_shipping_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }

        global $wpdb;
        $table_name = $this->get_shipping_rates_table_name();
        $table_sql = $this->get_shipping_rates_table_sql();

        $location_type = $this->get_post_string('location_type');
        $location_code = $this->get_post_string('location_code');

        if (!$location_type || !$location_code) {
            wp_send_json_error(array('message' => 'Missing parameters'));
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Admin AJAX: read-only SELECT on plugin-owned table; no caching needed. $table_sql is already backtick-wrapped and esc_sql()-escaped.
        $rates = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table_sql} WHERE location_type = %s AND location_code = %s ORDER BY priority DESC",
            $location_type,
            $location_code
        ), ARRAY_A);

        // Add location names
        foreach ($rates as &$rate) {
            $rate['location_name'] = $this->get_location_name($rate['location_type'], $rate['location_code']);
            $rate['weight_tiers'] = json_decode($rate['weight_tiers'], true);
            $rate['order_total_rules'] = json_decode($rate['order_total_rules'], true);
        }

        wp_send_json_success($rates);
    }

    /**
     * AJAX: Save shipping rate
     */
    public function ajax_save_shipping_rate()
    {
        check_ajax_referer('vncheckout_shipping_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }

        $rate_json = isset($_POST['rate']) ? wp_unslash($_POST['rate']) : '';
        $rate_data = json_decode($rate_json, true);

        if (!$rate_data) {
            wp_send_json_error(array('message' => 'Invalid rate data'));
        }

        global $wpdb;
        $table_name = $this->get_shipping_rates_table_name();
        $table_sql = $this->get_shipping_rates_table_sql();

        $data = array(
            'location_type' => sanitize_text_field($rate_data['location_type']),
            'location_code' => sanitize_text_field($rate_data['location_code']),
            'base_rate' => floatval($rate_data['base_rate']),
            'weight_tiers' => json_encode($rate_data['weight_tiers']),
            'order_total_rules' => json_encode($rate_data['order_total_rules']),
            'priority' => isset($rate_data['priority']) ? intval($rate_data['priority']) : 0,
            'updated_at' => current_time('mysql'),
        );

        if (isset($rate_data['id']) && $rate_data['id']) {
            // Update existing rate
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin AJAX: intentionally direct UPDATE on plugin-owned table; no caching needed.
            $wpdb->update($table_name, $data, array('id' => intval($rate_data['id'])));
            $rate_id = intval($rate_data['id']);
        } else {
            // Insert new rate
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin AJAX: intentionally direct INSERT on plugin-owned table; no caching needed.
            $wpdb->insert($table_name, $data);
            $rate_id = $wpdb->insert_id;
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Admin AJAX: read-only SELECT to fetch saved rate; $table_sql is backtick-wrapped and esc_sql()-escaped.
        $rate = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_sql} WHERE id = %d", $rate_id), ARRAY_A);
        $rate['weight_tiers'] = json_decode($rate['weight_tiers'], true);
        $rate['order_total_rules'] = json_decode($rate['order_total_rules'], true);
        $rate['location_name'] = $this->get_location_name($rate['location_type'], $rate['location_code']);

        wp_send_json_success($rate);
    }

    /**
     * AJAX: Delete shipping rate
     */
    public function ajax_delete_shipping_rate()
    {
        check_ajax_referer('vncheckout_shipping_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }

        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;

        if (!$id) {
            wp_send_json_error(array('message' => 'Invalid ID'));
        }

        global $wpdb;
        $table_name = $this->get_shipping_rates_table_name();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin AJAX: intentionally direct DELETE on plugin-owned table; no caching needed.
        $wpdb->delete($table_name, array('id' => $id));

        wp_send_json_success();
    }

    /**
     * AJAX: Import rates from CSV
     */
    public function ajax_import_rates_csv()
    {
        check_ajax_referer('vncheckout_shipping_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }

        if (!isset($_FILES['file'])) {
            wp_send_json_error(array('message' => 'No file uploaded'));
        }

        $file = $_FILES['file'];
        $handle = fopen($file['tmp_name'], 'r');

        if (!$handle) {
            wp_send_json_error(array('message' => 'Cannot read file'));
        }

        global $wpdb;
        $table_name = $this->get_shipping_rates_table_name();

        $success = 0;
        $failed = 0;
        $errors = array();
        $row_number = 0;

        // Skip header row
        fgetcsv($handle);

        while (($data = fgetcsv($handle)) !== FALSE) {
            $row_number++;

            try {
                $rate_data = array(
                    'location_type' => sanitize_text_field($data[0]),
                    'location_code' => sanitize_text_field($data[1]),
                    'base_rate' => floatval($data[2]),
                    'weight_tiers' => isset($data[3]) ? $data[3] : '[]',
                    'order_total_rules' => isset($data[4]) ? $data[4] : '[]',
                    'priority' => isset($data[5]) ? intval($data[5]) : 0,
                    'updated_at' => current_time('mysql'),
                );

                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin AJAX bulk import: intentionally direct INSERT on plugin-owned table; no caching needed.
                $wpdb->insert($table_name, $rate_data);
                $success++;
            } catch (Exception $e) {
                $failed++;
                $errors[] = array(
                    'row' => $row_number,
                    'message' => $e->getMessage(),
                );
            }
        }

        fclose($handle);

        wp_send_json_success(array(
            'success' => $success,
            'failed' => $failed,
            'errors' => $errors,
        ));
    }

    /**
     * AJAX: Export rates to CSV
     */
    public function ajax_export_rates_csv()
    {
        check_ajax_referer('vncheckout_shipping_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }

        global $wpdb;
        $table_name = $this->get_shipping_rates_table_name();
        $table_sql = $this->get_shipping_rates_table_sql();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Admin AJAX export: read-only SELECT; $table_sql is backtick-wrapped and esc_sql()-escaped.
        $rates = $wpdb->get_results("SELECT * FROM {$table_sql} ORDER BY location_type, location_code", ARRAY_A);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=shipping-rates-' . date('Y-m-d') . '.csv');

        $output = fopen('php://output', 'w');

        // Header
        fputcsv($output, array('location_type', 'location_code', 'base_rate', 'weight_tiers', 'order_total_rules', 'priority'));

        // Data
        foreach ($rates as $rate) {
            fputcsv($output, array(
                $rate['location_type'],
                $rate['location_code'],
                $rate['base_rate'],
                $rate['weight_tiers'],
                $rate['order_total_rules'],
                $rate['priority'],
            ));
        }

        fclose($output);
        exit;
    }

    /**
     * Get location name
     *
     * @param string $type Location type
     * @param string $code Location code
     * @return string
     */
    private function get_location_name($type, $code)
    {
        switch ($type) {
            case 'province':
                return get_name_city($code);
            case 'district':
                return get_name_district($code);
            case 'ward':
                return get_name_village($code);
            default:
                return $code;
        }
    }
}

// Initialize
new CoolBirdVietnam_Shipping_Admin();