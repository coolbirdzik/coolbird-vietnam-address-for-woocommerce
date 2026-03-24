import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrderAddressEditor } from "./components/admin/OrderAddressEditor";
import type { Province } from "./types/address.types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Admin Order App Component
const AdminOrderApp: React.FC = () => {
  // Get provinces and initial values from localized data
  const provinces: Province[] = React.useMemo(() => {
    if (
      window.coolviad_admin_order_data &&
      (window.coolviad_admin_order_data as any).provinces
    ) {
      return (window.coolviad_admin_order_data as any).provinces;
    }
    return [];
  }, []);

  const initialValues = React.useMemo(() => {
    const getData = window.coolviad_admin_order_data as any;
    return {
      billingState: getData?.billing_state || "",
      billingCity: getData?.billing_city || "",
      shippingState: getData?.shipping_state || "",
      shippingCity: getData?.shipping_city || "",
    };
  }, []);

  return (
    <OrderAddressEditor
      provinces={provinces}
      initialBillingState={initialValues.billingState}
      initialBillingCity={initialValues.billingCity}
      initialShippingState={initialValues.shippingState}
      initialShippingCity={initialValues.shippingCity}
    />
  );
};

// Mount the app
const mountAdminOrderApp = () => {
  const container = document.getElementById("coolbirdzik-admin-order-app");
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <AdminOrderApp />
        </QueryClientProvider>
      </React.StrictMode>,
    );
  }
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAdminOrderApp);
} else {
  mountAdminOrderApp();
}
