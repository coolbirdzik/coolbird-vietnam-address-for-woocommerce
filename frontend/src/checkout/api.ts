import { apiClient } from "@/api/client";
import type { AjaxResponse } from "@/types/api.types";
import type { District, Ward } from "@/types/address.types";

const provinceChildrenCache = new Map<string, Promise<District[]>>();
const districtChildrenCache = new Map<string, Promise<Ward[]>>();

export const loadProvinceChildren = async (provinceCode: string) => {
  if (!provinceCode) {
    return [];
  }

  if (!provinceChildrenCache.has(provinceCode)) {
    const request = apiClient
      .post<AjaxResponse<District[]>>("", {
        action: "coolviad_load_administrative_units",
        matp: provinceCode,
      })
      .then((response) => response.data.data || [])
      .catch(() => []);

    provinceChildrenCache.set(provinceCode, request);
  }

  return provinceChildrenCache.get(provinceCode)!;
};

export const loadDistrictChildren = async (districtCode: string) => {
  if (!districtCode) {
    return [];
  }

  if (!districtChildrenCache.has(districtCode)) {
    const request = apiClient
      .post<AjaxResponse<Ward[]>>("", {
        action: "coolviad_load_administrative_units",
        maqh: districtCode,
      })
      .then((response) => response.data.data || [])
      .catch(() => []);

    districtChildrenCache.set(districtCode, request);
  }

  return districtChildrenCache.get(districtCode)!;
};
