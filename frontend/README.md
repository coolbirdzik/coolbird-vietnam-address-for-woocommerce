# Coolbird Vietnam Address - Frontend

React + TypeScript frontend for the Coolbird Vietnam Address plugin.

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

```bash
npm install
```

## Development

Run the development server with hot module replacement:

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies WordPress AJAX requests.

To test with a local WordPress installation, ensure your WordPress site is running and accessible.

## Building

Build production bundles:

```bash
npm run build
```

This outputs compiled files to `../assets/dist/`:
- `checkout.js` + `checkout.css` - Frontend checkout address selectors
- `admin-order.js` + `admin-order.css` - Admin order address editor
- `admin-shipping.js` + `admin-shipping.css` - Shipping rate manager

## Type Checking

Run TypeScript type checker:

```bash
npm run type-check
```

## Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── main-checkout.tsx           # Checkout entry point
├── main-admin-order.tsx        # Admin order editor entry point  
├── main-admin-shipping.tsx     # Shipping rate manager entry point
├── components/
│   ├── AddressSelector.tsx     # Province/District/Ward cascading selects
│   ├── GetAddressByPhoneModal.tsx
│   └── admin/
│       ├── OrderAddressEditor.tsx
│       └── ShippingRateManager.tsx
├── api/
│   ├── client.ts              # Axios instance with WordPress config
│   ├── addressApi.ts          # Address AJAX endpoints
│   └── shippingApi.ts         # Shipping rate AJAX endpoints
├── types/
│   ├── address.types.ts       # Province, District, Ward types
│   ├── shipping.types.ts      # Shipping rate types
│   └── api.types.ts           # API response types
└── hooks/
    ├── useAddressData.ts      # React Query hooks for address data
    └── useShippingRates.ts    # CRUD hooks for shipping rates
```

## WordPress Integration

The React apps mount to specific DOM elements:

- **Checkout**: `#coolbirdzik-checkout-app` (on checkout/cart pages)
- **Admin Order**: `#coolbirdzik-admin-order-app` (on order edit screen)
- **Admin Shipping**: `#coolbirdzik-admin-shipping-app` (on shipping settings page)

Data is passed from PHP via `wp_localize_script()`:

```javascript
window.coolviad_checkout_data = {
  ajaxurl: '...',
  nonce: '...',
  // ...
}
```

## Notes

- Components maintain same field IDs/names as original plugin for backward compatibility
- Existing CSS classes are reused to preserve UI appearance
- AJAX endpoints remain unchanged from original plugin
