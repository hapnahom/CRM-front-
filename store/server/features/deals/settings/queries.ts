import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  authHeaders,
  DEAL_ACTIVITY_TYPES_URL,
  DEAL_TYPES_URL,
  retryUnlessUnauthorized,
} from '../pipeline/api';

export interface DealActivityTypeDto {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealTypeDto {
  id: string;
  name: string;
  dealsCount?: number;
}

function asArray<T>(response: unknown): T[] {
  return Array.isArray(response) ? (response as T[]) : [];
}

export function useDealActivityTypesSettings() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['deal-activity-types', tenantId],
    queryFn: async (): Promise<DealActivityTypeDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: DEAL_ACTIVITY_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<DealActivityTypeDto>(response);
    },
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDealTypesSettings() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['opportunity-types', tenantId],
    queryFn: async (): Promise<DealTypeDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: DEAL_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<DealTypeDto>(response);
    },
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
  });
}
