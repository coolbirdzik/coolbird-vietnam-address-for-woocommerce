import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDistricts, getWards, getAddressByPhone } from '@/api/addressApi';
import type { Province } from '@/types/address.types';

// Query keys
export const addressKeys = {
  all: ['address'] as const,
  provinces: () => [...addressKeys.all, 'provinces'] as const,
  districts: (provinceCode: string) => [...addressKeys.all, 'districts', provinceCode] as const,
  wards: (districtCode: string) => [...addressKeys.all, 'wards', districtCode] as const,
};

// Hook to get provinces (from localized data)
export const useProvinces = () => {
  return useQuery({
    queryKey: addressKeys.provinces(),
    queryFn: async (): Promise<Province[]> => {
      // Provinces are typically provided via wp_localize_script
      // We'll return them from window object if available
      if (window.vncheckout_array && (window.vncheckout_array as any).provinces) {
        return (window.vncheckout_array as any).provinces;
      }
      return [];
    },
    staleTime: Infinity, // Provinces don't change
  });
};

// Hook to get districts
export const useDistricts = (provinceCode: string | null) => {
  console.log('[useDistricts] called with provinceCode:', provinceCode);
  return useQuery({
    queryKey: addressKeys.districts(provinceCode || ''),
    queryFn: () => getDistricts(provinceCode!),
    enabled: !!provinceCode,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to get wards
export const useWards = (districtCode: string | null) => {
  return useQuery({
    queryKey: addressKeys.wards(districtCode || ''),
    queryFn: () => getWards(districtCode!),
    enabled: !!districtCode,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to get address by phone
export const useGetAddressByPhone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ phone, recaptcha }: { phone: string; recaptcha?: string }) =>
      getAddressByPhone(phone, recaptcha),
    onSuccess: (data) => {
      // Invalidate districts cache if needed
      if (data.billing.billing_state) {
        queryClient.setQueryData(
          addressKeys.districts(data.billing.billing_state),
          data.district
        );
      }
    },
  });
};
