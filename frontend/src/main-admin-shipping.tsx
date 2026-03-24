import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShippingRateManager } from "./components/admin/ShippingRateManager";
import type { Province } from "./types/address.types";
import type { Region } from "./types/shipping.types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AdminShippingApp: React.FC = () => {
  const data = window.coolviad_shipping_admin_data;

  const provinces: Province[] = React.useMemo(
    () => (data?.provinces as unknown as Province[]) || [],
    [data],
  );

  // Regions are seeded on the PHP side and also fetched dynamically via React Query.
  // We pre-populate the React Query cache with the server-provided data to avoid
  // an extra network round-trip on first load.
  React.useEffect(() => {
    const initialRegions = (data?.regions as unknown as Region[]) || [];
    if (initialRegions.length) {
      queryClient.setQueryData(["regions", "list"], initialRegions);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <ShippingRateManager provinces={provinces} />;
};

const mount = () => {
  const container = document.getElementById("coolviad-admin-shipping-app");
  if (!container) return;
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AdminShippingApp />
      </QueryClientProvider>
    </React.StrictMode>,
  );
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
