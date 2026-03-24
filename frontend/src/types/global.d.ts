// Global type declarations for WordPress/jQuery environment

import type { Province } from "./address.types";
import type { Region } from "./shipping.types";

declare global {
  interface Window {
    jQuery?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    $?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    coolviad_checkout_data?: {
      ajaxurl?: string;
      nonce?: string;
      provinces?: Province[];
      formatNoMatches?: string;
      phone_error?: string;
      loading_text?: string;
      loadaddress_error?: string;
      get_address?: string;
      active_village?: string;
      required_village?: string;
      address_schema?: "old" | "new";
      [key: string]: unknown;
    };
    coolviad_shipping_admin_data?: {
      ajaxurl?: string;
      nonce?: string;
      provinces?: Province[];
      regions?: Region[];
      [key: string]: unknown;
    };
    coolviad_admin_order_data?: {
      ajaxurl?: string;
      provinces?: Province[];
      billing_state?: string;
      billing_city?: string;
      shipping_state?: string;
      shipping_city?: string;
      [key: string]: unknown;
    };
    coolviad_vn?: {
      ajax_url?: string;
      address_schema?: "old" | "new";
      preloaded_names?: Record<string, string>;
      i18n?: {
        district_label?: string;
        ward_label?: string;
        select_district?: string;
        select_ward?: string;
        loading?: string;
        load_error?: string;
      };
    };
    woocommerce_district_shipping_rate_rows?: {
      i18n: { delete_rates: string };
      delete_box_nonce: string;
    };
    coolbirdCheckoutDebugSnapshot?: (
      prefix?: "billing" | "shipping" | "calc_shipping",
    ) => unknown;
    wp?: {
      data?: {
        dispatch?: (store: string) => Record<string, unknown> | undefined;
        select?: (store: string) => Record<string, unknown> | undefined;
        subscribe?: (listener: () => void) => (() => void) | undefined;
      };
    };
    coolbirdCheckoutPreserveLegacyAddress2Until?: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jQuery: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const $: any;
}

export {};
