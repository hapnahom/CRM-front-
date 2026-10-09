import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getTenantCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { retryUnlessUnauthorized } from './api';

export const TENANT_CURRENCIES_QUERY_KEY = 'tenantCurrencies';

export interface PipelineCurrencyInfo {
  id: string;
  code: string;
  isActive: boolean;
}

export function usePipelineCurrencies() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: [TENANT_CURRENCIES_QUERY_KEY, tenantId],
    queryFn: getTenantCurrencies,
    select: (response): PipelineCurrencyInfo[] =>
      response.map((item) => ({
        id: item.id,
        code: item.currency?.name ?? 'ETB',
        isActive: item.isActive ?? true,
      })),
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
