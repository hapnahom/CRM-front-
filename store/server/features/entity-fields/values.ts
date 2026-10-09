import { useMemo } from 'react';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import type { BackendEntityType, EntityFieldResponse } from './types';

async function buildHeaders(tenantId: string) {
  const token = await getCurrentToken();
  return { tenantId, Authorization: `Bearer ${token}` };
}

export interface EntityFieldValueRow {
  entityFieldId: string;
  value: unknown;
  /** Primary assignee (first of responsibleUserIds). */
  responsibleUserId?: string | null;
  /** All assignees for this field. */
  responsibleUserIds?: string[];
  /** Same as primary responsibleUserId — no owner fallback. */
  effectiveResponsibleUserId?: string | null;
  /** Opportunity/lead owner — owns field values on this record. */
  opportunityOwnerUserId?: string | null;
  dueAt?: string | null;
  valueEnteredAt?: string | null;
  completionStatus?: 'pending' | 'completed' | 'overdue';
  isOverdue?: boolean;
  responsibilityTaskId?: string | null;
}

export interface BulkEntityFieldValueRow extends EntityFieldValueRow {
  entityId: string;
}

export interface StageTransitionCheckResult {
  valid: boolean;
  missingRequiredFieldIds: string[];
  /** Stage fields (cumulative) with no stored/submitted value yet — prompt until filled. */
  unfilledFieldIds: string[];
  errors: Array<{
    entityFieldId: string;
    internalName: string;
    label: string;
    message: string;
    code: 'REQUIRED' | 'RULE_FAILED';
  }>;
  fields: EntityFieldResponse[];
  values: EntityFieldValueRow[];
}

export async function fetchEntityFieldValues(
  tenantId: string,
  entityType: BackendEntityType,
  entityId: string,
): Promise<EntityFieldValueRow[]> {
  const headers = await buildHeaders(tenantId);
  return crudRequest({
    url: `${CRM_URL}/entity-fields/values?entityType=${entityType}&entityId=${entityId}`,
    method: 'GET',
    headers,
  });
}

export function useEntityFieldValues(
  entityType: BackendEntityType,
  entityId: string | null | undefined,
) {
  const { tenantId } = useAuthenticationStore();
  return useQuery({
    queryKey: ['entityFieldValues', entityType, entityId],
    queryFn: () => fetchEntityFieldValues(tenantId!, entityType, entityId!),
    enabled: !!tenantId && !!entityId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export async function fetchBulkEntityFieldValues(
  tenantId: string,
  body: {
    entityType: BackendEntityType;
    entityIds: string[];
    entityFieldIds?: string[];
  },
): Promise<BulkEntityFieldValueRow[]> {
  const headers = await buildHeaders(tenantId);
  return crudRequest({
    url: `${CRM_URL}/entity-fields/values/bulk`,
    method: 'POST',
    headers,
    data: body,
  });
}

/**
 * Map of entityId -> fieldId -> value for list table custom columns.
 */
export function useBulkEntityFieldValues(
  entityType: BackendEntityType,
  entityIds: string[],
  entityFieldIds: string[],
) {
  const { tenantId } = useAuthenticationStore();
  const sortedEntityIds = useStableSortedIds(entityIds);
  const sortedFieldIds = useStableSortedIds(entityFieldIds);
  const enabled =
    !!tenantId && sortedEntityIds.length > 0 && sortedFieldIds.length > 0;

  const query = useQuery({
    queryKey: [
      'entityFieldValuesBulk',
      entityType,
      sortedEntityIds,
      sortedFieldIds,
    ],
    queryFn: async () => {
      const rows: BulkEntityFieldValueRow[] = [];
      for (let i = 0; i < sortedEntityIds.length; i += 200) {
        const entityIds = sortedEntityIds.slice(i, i + 200);
        const page = await fetchBulkEntityFieldValues(tenantId!, {
          entityType,
          entityIds,
          entityFieldIds: sortedFieldIds.slice(0, 100),
        });
        rows.push(...page);
      }
      return rows;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const valuesByEntityId = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of query.data ?? []) {
      const current = map.get(row.entityId) ?? {};
      current[row.entityFieldId] = row.value;
      map.set(row.entityId, current);
    }
    return map;
  }, [query.data]);

  return { ...query, valuesByEntityId };
}

function useStableSortedIds(ids: string[]): string[] {
  const idsKey = [...new Set(ids.filter(Boolean))].sort().join('|');
  return useMemo(() => (idsKey ? idsKey.split('|') : []), [idsKey]);
}

export async function checkStageTransition(
  tenantId: string,
  body: {
    entityType: BackendEntityType;
    entityId?: string;
    stageId: string;
    fieldValues?: EntityFieldValueRow[];
  },
): Promise<StageTransitionCheckResult> {
  const headers = await buildHeaders(tenantId);
  return crudRequest({
    url: `${CRM_URL}/entity-fields/check-stage-transition`,
    method: 'POST',
    headers,
    data: body,
  });
}

export function useUpsertEntityFieldValues() {
  const { tenantId } = useAuthenticationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      entityType: BackendEntityType;
      entityId: string;
      values: EntityFieldValueRow[];
      allowValidationException?: boolean;
    }) => {
      const headers = await buildHeaders(tenantId!);
      return crudRequest({
        url: `${CRM_URL}/entity-fields/values`,
        method: 'PUT',
        headers,
        data: {
          entityType: payload.entityType,
          entityId: payload.entityId,
          values: payload.values.map((v) => ({
            entityFieldId: v.entityFieldId,
            value: v.value,
          })),
          allowValidationException: payload.allowValidationException,
        },
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      queryClient.invalidateQueries({
        queryKey: [
          'entityFieldValues',
          variables.entityType,
          variables.entityId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['entityFieldValuesBulk', variables.entityType],
      });
    },
  });
}

export function useUpdateEntityFieldResponsibility() {
  const { tenantId } = useAuthenticationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      entityType: BackendEntityType;
      entityId: string;
      entityFieldId: string;
      responsibleUserId?: string | null;
      responsibleUserIds?: string[];
      dueAt?: string | null;
    }) => {
      const headers = await buildHeaders(tenantId!);
      return crudRequest({
        url: `${CRM_URL}/entity-fields/values/responsibility`,
        method: 'PATCH',
        headers,
        data: payload,
      }) as Promise<EntityFieldValueRow>;
    },
    onSuccess: (result, variables) => {
      void result;
      queryClient.invalidateQueries({
        queryKey: [
          'entityFieldValues',
          variables.entityType,
          variables.entityId,
        ],
      });
    },
  });
}
