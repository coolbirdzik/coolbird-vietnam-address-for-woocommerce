import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddressSelector } from '@/components/AddressSelector';

// Debug: Log initialization
console.log('[VN Checkout] Initializing checkout...');
console.log('[VN Checkout] vncheckout_array:', window.vncheckout_array);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Read config from wp_localize_script
// Note: Types are defined in types/global.d.ts
const schema = (window.vncheckout_array?.address_schema as 'old' | 'new') || 'new';
const showWard = schema !== 'new';
console.log('[VN Checkout] Schema:', schema, 'showWard:', showWard);

// Mount AddressSelector for billing and shipping address types
const initCheckout = () => {
  // Create container for billing
  const billingContainer = document.createElement('div');
  billingContainer.id = 'coolbirdzik-billing-selector';
  document.body.appendChild(billingContainer);

  // Create container for shipping
  const shippingContainer = document.createElement('div');
  shippingContainer.id = 'coolbirdzik-shipping-selector';
  document.body.appendChild(shippingContainer);

  // Create container for shipping calculator (cart page)
  const calcContainer = document.createElement('div');
  calcContainer.id = 'coolbirdzik-calc-selector';
  document.body.appendChild(calcContainer);

  // Wrap everything in QueryClientProvider
  const App = () => (
    <QueryClientProvider client={queryClient}>
      <AddressSelector type="billing" showWard={showWard} />
      <AddressSelector type="shipping" showWard={showWard} />
      <AddressSelector type="calc_shipping" showWard={false} />
    </QueryClientProvider>
  );

  createRoot(billingContainer).render(<App />);
  createRoot(shippingContainer).render(<App />);
  createRoot(calcContainer).render(<App />);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckout);
} else {
  initCheckout();
}
