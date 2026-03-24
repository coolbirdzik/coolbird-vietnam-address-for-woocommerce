import { apiClient } from './client';
import type { AjaxResponse } from '@/types/api.types';
import type { Province, District, Ward, AddressData } from '@/types/address.types';

// Get list of provinces (from PHP data)
export const getProvinces = async (): Promise<Province[]> => {
  // In actual implementation, this might be localized data
  // For now, we'll make it compatible with the existing structure
  const response = await apiClient.post<AjaxResponse<Province[]>>('', {
    action: 'get_provinces',
  });
  return response.data.data || [];
};

// Get districts by province code
export const getDistricts = async (provinceCode: string): Promise<District[]> => {
  try {
    const response = await apiClient.post<AjaxResponse<District[]>>('', {
      action: 'coolviad_load_administrative_units',
      matp: provinceCode,
    });
    return response.data.data || [];
  } catch (error) {
    return [];
  }
};

// Get wards by district code
export const getWards = async (districtCode: string): Promise<Ward[]> => {
  const response = await apiClient.post<AjaxResponse<Ward[]>>('', {
    action: 'coolviad_load_administrative_units',
    maqh: districtCode,
  });
  return response.data.data || [];
};

// Get address by phone number
export const getAddressByPhone = async (
  phone: string,
  recaptchaToken?: string
): Promise<{ billing: AddressData; district: District[] }> => {
  const response = await apiClient.post<AjaxResponse<{ billing: AddressData; district: District[] }>>('', {
    action: 'get_address_byphone',
    phone,
    'g-recaptcha-response': recaptchaToken || '',
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get address');
  }
  
  return response.data.data!;
};
