import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  authHeaders,
  LEAD_ACTIVITY_TYPES_URL,
  LEAD_SCORING_RULES_URL,
  LEAD_TYPES_URL,
  retryUnlessUnauthorized,
} from '../pipeline/api';

export interface LeadTypeDto {
  id: string;
  name: string;
  leadsCount?: number;
}

export interface LeadActivityTypeDto {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadScoringRuleDto {
  id: string;
  name: string;
  criteria: string;
  points: number;
  enabled: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

function asArray<T>(response: unknown): T[] {
  return Array.isArray(response) ? (response as T[]) : [];
}

export function useLeadActivityTypesSettings() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['lead-activity-types', tenantId],
    queryFn: async (): Promise<LeadActivityTypeDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: LEAD_ACTIVITY_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<LeadActivityTypeDto>(response);
    },
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadTypesSettings() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['opportunity-types', tenantId],
    queryFn: async (): Promise<LeadTypeDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: LEAD_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<LeadTypeDto>(response);
    },
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadScoringRules() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['lead-scoring-rules', tenantId],
    queryFn: async (): Promise<LeadScoringRuleDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: LEAD_SCORING_RULES_URL,
        method: 'GET',
        headers,
      });
      return asArray<LeadScoringRuleDto>(response);
    },
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
  });
}
