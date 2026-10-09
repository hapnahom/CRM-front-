import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  authHeaders,
  DEALS_BASE_URL,
  retryUnlessUnauthorized,
} from '../pipeline/api';

export type StageHistorySource =
  | 'user'
  | 'approval'
  | 'stage_expiration'
  | 'import'
  | 'system';

export interface StageHistoryStageSummary {
  id: string;
  name: string;
  category?: string | null;
}

export interface StageHistoryUserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface DealStageHistoryItem {
  id: string;
  entityType: 'DEAL' | 'LEAD';
  opportunityId: string;
  previousStage?: StageHistoryStageSummary | null;
  newStage: StageHistoryStageSummary;
  previousStageEntryAt?: string | null;
  changedAt: string;
  durationInPreviousStageMs?: string | null;
  changedBy?: StageHistoryUserSummary | null;
  changeReason?: string | null;
  source: StageHistorySource;
}

export interface PaginatedDealStageHistory {
  data: DealStageHistoryItem[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export function useDealStageHistory(
  dealId: string,
  options?: { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['deal-stage-history', dealId, tenantId],
    queryFn: async (): Promise<PaginatedDealStageHistory> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${DEALS_BASE_URL}/${dealId}/stage-history`,
        method: 'GET',
        headers,
      });
      return (
        (response as PaginatedDealStageHistory) ?? {
          data: [],
          pagination: {
            totalItems: 0,
            currentPage: 1,
            itemsPerPage: 50,
            totalPages: 1,
          },
        }
      );
    },
    enabled: enabled && Boolean(tenantId) && Boolean(dealId),
    retry: retryUnlessUnauthorized,
  });
}
