import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddressSelector } from '@/components/AddressSelector';

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

// Track if already mounted
let mounted = false;

const initCheckout = () => {
  if (mounted) return;

  // Also exit early on My Account pages if no address form is present yet
  // We'll mount when the form appears via MutationObserver
  const existingContainer = document.getElementById('coolbirdzik-checkout-app');
  if (existingContainer) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'coolbirdzik-checkout-app';
  document.body.appendChild(container);

  // Wrap everything in QueryClientProvider
  const App = () => (
    <QueryClientProvider client={queryClient}>
      <AddressSelector type="billing" showWard={showWard} />
      <AddressSelector type="shipping" showWard={showWard} />
      <AddressSelector type="calc_shipping" showWard={false} />
    </QueryClientProvider>
  );

  createRoot(container).render(<App />);
  mounted = true;
};

// On My Account edit-address pages, WooCommerce loads the form via AJAX.
// Use MutationObserver to detect when address forms appear.
const mountWhenFormReady = () => {
  if (mounted) return;

  // Check for both classic checkout and WooCommerce Blocks
  const hasClassicForm = document.querySelector('.woocommerce-address-fields');
  const hasBlocksForm = document.querySelector('.wc-block-components-address-form') 
    || document.getElementById('billing') 
    || document.getElementById('shipping');
  
  if (hasClassicForm || hasBlocksForm) {
    initCheckout();
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check for newly added nodes
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // Classic checkout
          if (node.classList && node.classList.contains('woocommerce-address-fields')) {
            initCheckout();
            return;
          }
          // WooCommerce Blocks checkout
          if (node.classList && node.classList.contains('wc-block-components-address-form')) {
            initCheckout();
            return;
          }
          if (node.id === 'billing' || node.id === 'shipping') {
            initCheckout();
            return;
          }
          // Check nested elements
          if (node.querySelector) {
            if (node.querySelector('.woocommerce-address-fields') 
              || node.querySelector('.wc-block-components-address-form')
              || node.querySelector('#billing')
              || node.querySelector('#shipping')) {
              initCheckout();
              return;
            }
          }
        }
      }
      
      // Check for attribute changes (like aria-expanded="true" on edit button)
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
        const target = mutation.target;
        
        // If edit button was clicked (aria-expanded changed to true)
        if (target.classList.contains('wc-block-components-address-card__edit') 
          && target.getAttribute('aria-expanded') === 'true') {
          // Form is now visible, re-init after a short delay
          setTimeout(() => {
            initCheckout();
          }, 100);
          return;
        }
        
        // If address form became visible
        if (target.classList.contains('wc-block-components-address-form')) {
          setTimeout(() => {
            initCheckout();
          }, 100);
          return;
        }
      }
    }
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-expanded', 'style', 'class']
  });
};

// Also listen for WooCommerce's own AJAX completion events
// to re-trigger element finding when forms are re-rendered
document.addEventListener('woocommerce_update_order_review', () => {
  // WooCommerce order review updated
});
document.addEventListener('wc_fragment_refreshed', () => {
  // WC fragment refreshed
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountWhenFormReady);
} else {
  mountWhenFormReady();
}

// Listen for edit button clicks to re-init when form becomes visible
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  
  // If user clicked on edit address button
  if (target && (
    target.classList.contains('wc-block-components-address-card__edit') ||
    target.closest('.wc-block-components-address-card__edit')
  )) {
    // Re-init after form becomes visible
    setTimeout(() => {
      mounted = false; // Allow re-mounting
      mountWhenFormReady();
    }, 200);
  }
});

// Fix address card display - convert IDs to names
const fixAddressCards = () => {
  const addressCards = document.querySelectorAll('.wc-block-components-address-card address');
  
  addressCards.forEach(card => {
    const text = card.textContent || '';
    // Look for 4-6 digit numbers that could be ward/district IDs
    const updatedText = text.replace(/\b(\d{4,6})\b/g, (match) => {
      // Check if we have preloaded names for this ID
      const preloadedNames = window.coolbirdzik_vn?.preloaded_names || {};
      return preloadedNames[match] || match;
    });
    
    if (updatedText !== text) {
      // Update the text while preserving structure
      const spans = card.querySelectorAll('span');
      spans.forEach(span => {
        const spanText = span.textContent || '';
        const updatedSpanText = spanText.replace(/\b(\d{4,6})\b/g, (match) => {
          const preloadedNames = window.coolbirdzik_vn?.preloaded_names || {};
          return preloadedNames[match] || match;
        });
        if (updatedSpanText !== spanText) {
          span.textContent = updatedSpanText;
        }
      });
    }
  });
};

// Run fix on load and when checkout updates
setTimeout(fixAddressCards, 500);
document.addEventListener('woocommerce_checkout_loaded', fixAddressCards);
document.addEventListener('wc_fragments_refreshed', fixAddressCards);
