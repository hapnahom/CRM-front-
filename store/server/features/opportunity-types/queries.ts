import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  authHeaders,
  OPPORTUNITY_TYPES_URL,
  retryUnlessUnauthorized,
} from './api';

export type OpportunityTypeAppliesTo = 'LEAD' | 'DEAL' | 'BOTH';
export type OpportunityTypeCategory = 'SD' | 'BID';

export interface OpportunityTypeDto {
  id: string;
  name: string;
  description?: string | null;
  appliesTo?: OpportunityTypeAppliesTo;
  category?: OpportunityTypeCategory;
  leadsCount?: number;
  dealsCount?: number;
  usageCount?: number;
}

function asArray<T>(response: unknown): T[] {
  return Array.isArray(response) ? (response as T[]) : [];
}

/** Types valid for leads include LEAD and BOTH (missing appliesTo treated as BOTH). */
export function typeAppliesToLead(type: OpportunityTypeDto): boolean {
  const scope = type.appliesTo ?? 'BOTH';
  return scope === 'LEAD' || scope === 'BOTH';
}

/** Types valid for deals include DEAL and BOTH (missing appliesTo treated as BOTH). */
export function typeAppliesToDeal(type: OpportunityTypeDto): boolean {
  const scope = type.appliesTo ?? 'BOTH';
  return scope === 'DEAL' || scope === 'BOTH';
}

export function useOpportunityTypes(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['opportunity-types', tenantId],
    queryFn: async (): Promise<OpportunityTypeDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: OPPORTUNITY_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<OpportunityTypeDto>(response);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Alias used by settings pages — same catalog as pipeline forms. */
export const useOpportunityTypesSettings = useOpportunityTypes;
