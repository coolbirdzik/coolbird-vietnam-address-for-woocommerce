import axios, { AxiosInstance } from "axios";

// Create axios instance with WordPress AJAX config
const createApiClient = (): AxiosInstance => {
  const baseURL = (window.coolviad_checkout_data?.ajaxurl ||
    window.coolviad_shipping_admin_data?.ajaxurl ||
    window.coolviad_admin_order_data?.ajaxurl ||
    "/wp-admin/admin-ajax.php") as string;

  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  // Add request interceptor to convert data to FormData format
  client.interceptors.request.use((config) => {
    if (config.data && config.method === "post") {
      const formData = new URLSearchParams();
      Object.keys(config.data).forEach((key) => {
        const value = config.data[key];
        if (value !== undefined && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        }
      });
      config.data = formData;
    }
    return config;
  });

  return client;
};

export const apiClient = createApiClient();
