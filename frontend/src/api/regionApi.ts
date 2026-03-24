import { apiClient } from "./client";
import type { AjaxResponse } from "@/types/api.types";
import type {
  Region,
  ShippingRate,
  BulkApplyResult,
} from "@/types/shipping.types";

const nonce = (): string =>
  (window.coolviad_shipping_admin_data?.nonce as string) || "";

// ---- Regions ----------------------------------------------------------------

export const getRegions = async (): Promise<Region[]> => {
  const response = await apiClient.post<AjaxResponse<Region[]>>("", {
    action: "coolviad_get_regions",
    nonce: nonce(),
  });
  return response.data.data || [];
};

export const saveRegion = async (region: Partial<Region>): Promise<Region> => {
  const response = await apiClient.post<AjaxResponse<Region>>("", {
    action: "coolviad_save_region",
    nonce: nonce(),
    region: JSON.stringify(region),
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to save region");
  }
  return response.data.data!;
};

export const deleteRegion = async (id: number): Promise<void> => {
  const response = await apiClient.post<AjaxResponse>("", {
    action: "coolviad_delete_region",
    nonce: nonce(),
    id,
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete region");
  }
};

// ---- Bulk apply -------------------------------------------------------------

export const bulkApplyRegionRate = async (
  regionCode: string,
  rate: Partial<ShippingRate>,
): Promise<BulkApplyResult> => {
  const response = await apiClient.post<AjaxResponse<BulkApplyResult>>("", {
    action: "coolviad_bulk_apply_region_rate",
    nonce: nonce(),
    region_code: regionCode,
    rate: JSON.stringify(rate),
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Bulk apply failed");
  }
  return response.data.data!;
};
