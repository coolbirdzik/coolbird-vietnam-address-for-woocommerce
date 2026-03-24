import React from "react";

interface AddressSelectorProps {
  type: "billing" | "shipping" | "calc_shipping";
  showWard?: boolean;
}

// Checkout behavior moved to the imperative controller in frontend/src/checkout.
export const AddressSelector: React.FC<AddressSelectorProps> = () => null;
