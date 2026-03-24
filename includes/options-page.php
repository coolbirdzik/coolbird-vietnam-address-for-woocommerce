<?php
if (! defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap coolviad-settings-wrap coolviad-modern-wrap">
    <div class="coolviad-header">
        <h1><?php esc_html_e('Coolbird Vietnam Address for WooCommerce', 'coolbird-vietnam-address'); ?>
        </h1>
        <p class="coolviad-header-desc">
            <?php esc_html_e('Fine-tune how Vietnamese addresses, currency conversion and advanced checkout helpers behave in your store.', 'coolbird-vietnam-address'); ?>
        </p>
    </div>

    <?php
    settings_fields($this->_optionGroup);
    $flra_options = wp_parse_args(get_option($this->_optionName), $this->_defaultOptions);
    global $coolviad_provinces;
    ?>

    <!-- Tab Navigation -->
    <div class="coolviad-tabs">
        <nav class="coolviad-tabs-nav">
            <a href="#tab-address" class="coolviad-tab active" data-tab="address">
                <span class="coolviad-tab-icon">📍</span>
                <?php esc_html_e('Address', 'coolbird-vietnam-address'); ?>
            </a>
            <a href="#tab-currency" class="coolviad-tab" data-tab="currency">
                <span class="coolviad-tab-icon">💰</span>
                <?php esc_html_e('Currency & Shipping', 'coolbird-vietnam-address'); ?>
            </a>
            <a href="#tab-checkout" class="coolviad-tab" data-tab="checkout">
                <span class="coolviad-tab-icon">🛒</span>
                <?php esc_html_e('Checkout Fields', 'coolbird-vietnam-address'); ?>
            </a>
            <a href="#tab-orders" class="coolviad-tab" data-tab="orders">
                <span class="coolviad-tab-icon">📦</span>
                <?php esc_html_e('Order Management', 'coolbird-vietnam-address'); ?>
            </a>
        </nav>

        <?php
        // Handle form submission manually to avoid redirect issues
        if (isset($_POST['save_coolviad_settings']) && check_admin_referer('coolviad_settings_nonce')) {
            $option_name = $this->_optionName;
            $current_options = wp_parse_args(get_option($option_name, array()), $this->_defaultOptions);
            $posted_options = isset($_POST[$option_name]) && is_array($_POST[$option_name])
                ? wp_unslash($_POST[$option_name])
                : array();
            $posted_options = $this->sanitize_options($posted_options);

            $checkbox_fields = array(
                'active_village',
                'required_village',
                'to_vnd',
                'active_vnd2usd',
                'remove_methob_title',
                'freeship_remove_other_methob',
                'enable_firstname',
                'enable_country',
                'enable_postcode',
                'active_filter_order',
            );

            $managed_fields = array(
                'address_schema',
                'active_village',
                'required_village',
                'to_vnd',
                'khoiluong_quydoi',
                'active_vnd2usd',
                'vnd2usd_currency',
                'vnd_usd_rate',
                'remove_methob_title',
                'freeship_remove_other_methob',
                'enable_firstname',
                'enable_country',
                'enable_postcode',
                'active_filter_order',
            );

            foreach ($managed_fields as $field_key) {
                if (in_array($field_key, $checkbox_fields, true)) {
                    $current_options[$field_key] = isset($posted_options[$field_key]) ? '1' : '';
                    continue;
                }

                if (isset($posted_options[$field_key])) {
                    $current_options[$field_key] = $posted_options[$field_key];
                }
            }

            $current_options = $this->sanitize_options($current_options);
            update_option($option_name, $current_options);
            $flra_options = wp_parse_args($current_options, $this->_defaultOptions);
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Settings saved!', 'coolbird-vietnam-address') . '</p></div>';
        }
        ?>
        <form method="post" action="" novalidate="novalidate" class="coolviad-settings-form">
            <?php wp_nonce_field('coolviad_settings_nonce'); ?>
            <input type="hidden" name="save_coolviad_settings" value="1" />

            <!-- Tab: Address (MOVE TO TOP) -->
            <div id="tab-address" class="coolviad-tab-content active">
                <div class="coolviad-card">
                    <div class="coolviad-card-header">
                        <h2><?php esc_html_e('Vietnam Address Layout', 'coolbird-vietnam-address'); ?>
                        </h2>
                        <p><?php esc_html_e('Choose how provinces, districts and wards are shown on checkout and account pages.', 'coolbird-vietnam-address'); ?>
                        </p>
                    </div>
                    <div class="coolviad-card-body">
                        <div class="coolviad-field">
                            <label
                                for="address_schema"><?php esc_html_e('Address Format', 'coolbird-vietnam-address'); ?></label>
                            <div class="coolviad-radio-group">
                                <label class="coolviad-radio">
                                    <input type="radio" name="<?php echo esc_attr($this->_optionName); ?>[address_schema]"
                                        value="old" <?php checked('old', $flra_options['address_schema']); ?> />
                                    <span class="coolviad-radio-content">
                                        <strong><?php esc_html_e('Old Format', 'coolbird-vietnam-address'); ?></strong>
                                        <small><?php esc_html_e('Province/City → District → Ward/Commune', 'coolbird-vietnam-address'); ?></small>
                                    </span>
                                </label>
                                <label class="coolviad-radio">
                                    <input type="radio" name="<?php echo esc_attr($this->_optionName); ?>[address_schema]"
                                        value="new" <?php checked('new', $flra_options['address_schema']); ?> />
                                    <span class="coolviad-radio-content">
                                        <strong><?php esc_html_e('New Format', 'coolbird-vietnam-address'); ?></strong>
                                        <small><?php esc_html_e('Province/City → Ward/Commune (District hidden)', 'coolbird-vietnam-address'); ?></small>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[active_village]"
                                    <?php checked('1', $flra_options['active_village']); ?> value="1"
                                    id="active_village" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Hide Ward/Commune Field', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Hide Ward/Commune/Town field in checkout form. Default is shown.', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[required_village]"
                                    <?php checked('1', $flra_options['required_village']); ?> value="1"
                                    id="required_village" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Ward/Commune is NOT Required', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('When Ward/Commune field is shown, it is optional.', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Currency & Shipping -->
            <div id="tab-currency" class="coolviad-tab-content">
                <div class="coolviad-card">
                    <div class="coolviad-card-header">
                        <h2><?php esc_html_e('Currency & Conversion', 'coolbird-vietnam-address'); ?>
                        </h2>
                        <p><?php esc_html_e('Control currency formatting, volumetric weight and VNĐ ↔ foreign currency conversion.', 'coolbird-vietnam-address'); ?>
                        </p>
                    </div>
                    <div class="coolviad-card-body">
                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[to_vnd]"
                                    <?php checked('1', $flra_options['to_vnd']); ?> value="1" id="to_vnd" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Convert ₫ to VNĐ', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Allow conversion to VNĐ', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="coolviad-field">
                            <label
                                for="khoiluong_quydoi"><?php esc_html_e('Conversion Quotient', 'coolbird-vietnam-address'); ?></label>
                            <input type="number" min="0" name="<?php echo esc_attr($this->_optionName); ?>[khoiluong_quydoi]"
                                value="<?php echo esc_attr($flra_options['khoiluong_quydoi']); ?>" id="khoiluong_quydoi"
                                class="regular-text" />
                            <small><?php esc_html_e('Default by Viettel Post is 6000', 'coolbird-vietnam-address'); ?></small>
                        </div>
                    </div>
                </div>

                <div class="coolviad-card">
                    <div class="coolviad-card-header">
                        <h2><?php esc_html_e('PayPal Conversion', 'coolbird-vietnam-address'); ?></h2>
                        <p><?php esc_html_e('Enable VNĐ to foreign currency conversion to use PayPal.', 'coolbird-vietnam-address'); ?>
                        </p>
                    </div>
                    <div class="coolviad-card-body">
                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[active_vnd2usd]"
                                    <?php checked('1', $flra_options['active_vnd2usd']); ?> value="1" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Enable VNĐ to USD Conversion', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Enable VNĐ to USD conversion to use PayPal', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="coolviad-field-row">
                            <div class="coolviad-field">
                                <label
                                    for="vnd2usd_currency"><?php esc_html_e('Target Currency', 'coolbird-vietnam-address'); ?></label>
                                <select name="<?php echo esc_attr($this->_optionName); ?>[vnd2usd_currency]" id="vnd2usd_currency"
                                    class="regular-text">
                                    <?php
                                    $paypal_supported_currencies = array('AUD', 'BRL', 'CAD', 'MXL', 'NZD', 'HKD', 'SGD', 'USD', 'EUR', 'JPY', 'TRY', 'NOK', 'CZK', 'DKK', 'HUF', 'ILS', 'MYR', 'PHP', 'PLN', 'SEK', 'CHF', 'TWD', 'THB', 'GBP', 'RMB', 'RUB');
                                    foreach ($paypal_supported_currencies as $currency) {
                                        echo '<option value="' . esc_attr($currency) . '" ' . selected(strtoupper($currency), $flra_options['vnd2usd_currency'], false) . '>' . esc_html($currency) . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                            <div class="coolviad-field">
                                <label
                                    for="vnd_usd_rate"><?php esc_html_e('Exchange Rate', 'coolbird-vietnam-address'); ?></label>
                                <input type="number" min="0" name="<?php echo esc_attr($this->_optionName); ?>[vnd_usd_rate]"
                                    value="<?php echo esc_attr($flra_options['vnd_usd_rate']); ?>" id="vnd_usd_rate"
                                    class="regular-text" />
                                <small><?php esc_html_e('Exchange rate from VNĐ', 'coolbird-vietnam-address'); ?></small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="coolviad-card">
                    <div class="coolviad-card-header">
                        <h2><?php esc_html_e('Shipping Options', 'coolbird-vietnam-address'); ?></h2>
                        <p><?php esc_html_e('Configure shipping method display options.', 'coolbird-vietnam-address'); ?>
                        </p>
                    </div>
                    <div class="coolviad-card-body">
                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[remove_methob_title]"
                                    <?php checked('1', $flra_options['remove_methob_title']); ?> value="1"
                                    id="remove_methob_title" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Remove Shipping Title', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Completely remove shipping method title', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox"
                                    name="<?php echo esc_attr($this->_optionName); ?>[freeship_remove_other_methob]"
                                    <?php checked('1', $flra_options['freeship_remove_other_methob']); ?> value="1"
                                    id="freeship_remove_other_methob" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Hide Methods When Free Shipping Available', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Hide all other shipping methods when free shipping is available', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Checkout Fields -->
            <div id="tab-checkout" class="coolviad-tab-content">
                <div class="coolviad-card">
                    <div class="coolviad-card-header">
                        <h2><?php esc_html_e('Alepay & Billing Fields', 'coolbird-vietnam-address'); ?>
                        </h2>
                        <p><?php esc_html_e('Configure additional billing fields required by Alepay and other gateways.', 'coolbird-vietnam-address'); ?>
                        </p>
                    </div>
                    <div class="coolviad-card-body">
                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[enable_firstname]"
                                    <?php checked('1', $flra_options['enable_firstname']); ?> value="1" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Show First Name Field', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Required for Alepay payment.', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[enable_country]"
                                    <?php checked('1', $flra_options['enable_country']); ?> value="1" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Show Country Field', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Required for Alepay payment.', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[enable_postcode]"
                                    <?php checked('1', $flra_options['enable_postcode']); ?> value="1" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Show Postcode Field', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Required for Alepay Tokenization payment.', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Order Management -->
            <div id="tab-orders" class="coolviad-tab-content">
                <div class="coolviad-card">
                    <div class="coolviad-card-header">
                        <h2><?php esc_html_e('Order Management', 'coolbird-vietnam-address'); ?></h2>
                        <p><?php esc_html_e('Extra filters for quickly finding orders by province and date.', 'coolbird-vietnam-address'); ?>
                        </p>
                    </div>
                    <div class="coolviad-card-body">
                        <div class="coolviad-field">
                            <label class="coolviad-toggle">
                                <input type="checkbox" name="<?php echo esc_attr($this->_optionName); ?>[active_filter_order]"
                                    <?php checked('1', $flra_options['active_filter_order']); ?> value="1" />
                                <span class="coolviad-toggle-slider"></span>
                                <span class="coolviad-toggle-label">
                                    <strong><?php esc_html_e('Enable Order Filter', 'coolbird-vietnam-address'); ?></strong>
                                    <small><?php esc_html_e('Enable filter by province and date in order list page', 'coolbird-vietnam-address'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <?php do_settings_fields($this->_optionGroup, 'default'); ?>
            <?php do_settings_sections($this->_optionGroup, 'default'); ?>

            <div class="coolviad-submit">
                <?php submit_button(__('Save Changes', 'coolbird-vietnam-address'), 'primary coolviad-btn-primary', 'save_coolviad_settings', false); ?>
            </div>
        </form>
    </div>
</div>
