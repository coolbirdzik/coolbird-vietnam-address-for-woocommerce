import { apiClient } from "./client";
import type { AjaxResponse } from "@/types/api.types";
import type {
  ShippingRate,
  CSVImportResult,
  LocationType,
} from "@/types/shipping.types";

const nonce = (): string =>
  (window.coolviad_shipping_admin_data?.nonce as string) || "";

export const getShippingRates = async (
  locationType?: LocationType,
  locationCode?: string,
): Promise<ShippingRate[]> => {
  const response = await apiClient.post<AjaxResponse<ShippingRate[]>>("", {
    action: "coolviad_get_shipping_rates",
    nonce: nonce(),
    location_type: locationType,
    location_code: locationCode,
  });
  return response.data.data || [];
};

export const saveShippingRate = async (
  rate: Partial<ShippingRate>,
): Promise<ShippingRate> => {
  const response = await apiClient.post<AjaxResponse<ShippingRate>>("", {
    action: "coolviad_save_shipping_rate",
    nonce: nonce(),
    rate: JSON.stringify(rate),
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to save rate");
  }
  return response.data.data!;
};

export const deleteShippingRate = async (id: number): Promise<void> => {
  const response = await apiClient.post<AjaxResponse>("", {
    action: "coolviad_delete_shipping_rate",
    nonce: nonce(),
    id,
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete rate");
  }
};

export const importRatesCSV = async (file: File): Promise<CSVImportResult> => {
  const formData = new FormData();
  formData.append("action", "coolviad_import_rates_csv");
  formData.append("nonce", nonce());
  formData.append("file", file);

  const response = await apiClient.post<AjaxResponse<CSVImportResult>>(
    "",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to import CSV");
  }
  return response.data.data!;
};

export const exportRatesCSV = async (): Promise<void> => {
  const response = await apiClient.post(
    "",
    { action: "coolviad_export_rates_csv", nonce: nonce() },
    { responseType: "blob" },
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `shipping-rates-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
