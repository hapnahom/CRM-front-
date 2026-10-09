import { useMutation, useQuery, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { catalogAuthHeaders } from './api';

export const PRODUCT_CATALOG_SETTINGS_URL = `${CRM_URL}/product-catalog/settings`;

export interface ProductCatalogSettings {
  id: string;
  tenantId: string;
  requireProductFamily: boolean;
  requireProduct: boolean;
}

export type UpdateProductCatalogSettingsPayload = Partial<
  Pick<ProductCatalogSettings, 'requireProductFamily' | 'requireProduct'>
>;

export const productCatalogSettingsKeys = {
  all: ['product-catalog-settings'] as const,
  detail: (tenantId: string | null | undefined) =>
    [...productCatalogSettingsKeys.all, tenantId] as const,
};

export function useProductCatalogSettings() {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);

  return useQuery({
    queryKey: productCatalogSettingsKeys.detail(tenantId),
    queryFn: async (): Promise<ProductCatalogSettings> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: PRODUCT_CATALOG_SETTINGS_URL,
        method: 'GET',
        headers,
      });
    },
    enabled: !!tenantId && !!userId,
  });
}

export function useUpdateProductCatalogSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProductCatalogSettingsPayload) => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: PRODUCT_CATALOG_SETTINGS_URL,
        method: 'PATCH',
        headers,
        data: payload,
      }) as Promise<ProductCatalogSettings>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productCatalogSettingsKeys.all,
      });
    },
  });
}
