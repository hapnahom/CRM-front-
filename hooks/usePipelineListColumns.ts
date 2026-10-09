'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_DEALS_LIST_COLUMNS,
  DEFAULT_PIPELINE_LIST_COLUMNS,
  buildAvailablePipelineListColumns,
  isLegacyDealsListColumnOrder,
  loadPipelineListColumns,
  normalizePipelineListColumns,
  parseCustomColumnId,
  savePipelineListColumns,
  type PipelineListColumnDef,
  type PipelineListColumnId,
} from '@/lib/pipeline/list-columns';
import { usePipelineCustomFields } from '@/store/server/features/entity-fields/queries';
import {
  fieldAppliesToEntity,
  mapCompositeSubFieldsForListColumn,
} from '@/store/server/features/entity-fields/mappers';
import { useBulkEntityFieldValues } from '@/store/server/features/entity-fields/values';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';
import {
  isEntityRole,
  usePipelineRoles,
} from '@/store/server/features/pipeline-roles/queries';

type UsePipelineListColumnsArgs = {
  entity: 'leads' | 'deals';
  entityType: BackendEntityType;
  entityLabel: 'Lead' | 'Deal';
  entityDisplayLabel?: string;
  entityIds: string[];
  enabled?: boolean;
};

function sameIds(a: PipelineListColumnId[], b: PipelineListColumnId[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function usePipelineListColumns({
  entity,
  entityType,
  entityLabel,
  entityDisplayLabel,
  entityIds,
  enabled = true,
}: UsePipelineListColumnsArgs) {
  const fieldsQuery = usePipelineCustomFields({ pageSize: 200 });
  const rolesQuery = usePipelineRoles({ enabled });

  const assignmentRoles = useMemo(
    () =>
      (rolesQuery.data ?? [])
        .filter(
          (role) => role.active !== false && role.id && isEntityRole(role),
        )
        .map((role) => ({
          id: role.id,
          label: role.name?.trim() || 'Unnamed role',
          isPrimary: role.isPrimary,
          displayOrder: role.displayOrder,
          appliesTo: role.appliesTo,
        })),
    [rolesQuery.data],
  );

  const availableColumns = useMemo(
    () =>
      buildAvailablePipelineListColumns({
        entityLabel,
        entityDisplayLabel,
        includeAllActiveCustomFields: true,
        assignmentRoles,
        customFields: (fieldsQuery.data?.data ?? [])
          .filter((f) => fieldAppliesToEntity(f, entityType))
          .map((f) => ({
            id: f.id,
            label: f.label,
            fieldType: f.fieldType,
            active: f.active,
            visibleInLists: f.visibleInLists,
            options: (f.options ?? [])
              .filter((o) => o.active !== false)
              .map((o) => ({ label: o.label, value: o.value })),
            subFields:
              f.fieldType === 'COMPOSITE'
                ? mapCompositeSubFieldsForListColumn(f.settings)
                : undefined,
          })),
      }),
    [assignmentRoles, entityDisplayLabel, entityLabel, fieldsQuery.data],
  );

  const availableIdsKey = useMemo(
    () => availableColumns.map((c) => c.id).join('|'),
    [availableColumns],
  );

  const availableIds = useMemo(
    () => new Set(availableColumns.map((c) => c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableIdsKey],
  );

  const defaultColumnIds = useMemo(
    () =>
      entity === 'deals'
        ? ([...DEFAULT_DEALS_LIST_COLUMNS] as PipelineListColumnId[])
        : ([...DEFAULT_PIPELINE_LIST_COLUMNS] as PipelineListColumnId[]),
    [entity],
  );

  const [selectedColumnIds, setSelectedColumnIds] = useState<
    PipelineListColumnId[]
  >(() =>
    entity === 'deals'
      ? ([...DEFAULT_DEALS_LIST_COLUMNS] as PipelineListColumnId[])
      : ([...DEFAULT_PIPELINE_LIST_COLUMNS] as PipelineListColumnId[]),
  );

  const [hydrated, setHydrated] = useState(false);
  const fieldsReady = fieldsQuery.isFetched || fieldsQuery.isError;
  const rolesReady = rolesQuery.isFetched || rolesQuery.isError;
  const columnsReady = fieldsReady && rolesReady;

  useEffect(() => {
    if (hydrated) return;
    if (!columnsReady) return;
    const stored = loadPipelineListColumns(entity);
    const initial =
      entity === 'deals' && stored && isLegacyDealsListColumnOrder(stored)
        ? null
        : stored;
    setSelectedColumnIds(
      normalizePipelineListColumns(initial ?? defaultColumnIds, availableIds, {
        fieldsReady: true,
        rolesReady: true,
        defaults: defaultColumnIds,
      }),
    );
    setHydrated(true);
  }, [availableIds, columnsReady, defaultColumnIds, entity, hydrated]);

  useEffect(() => {
    if (!hydrated || !columnsReady) return;
    setSelectedColumnIds((prev) => {
      const next = normalizePipelineListColumns(prev, availableIds, {
        fieldsReady: true,
        rolesReady: true,
        defaults: defaultColumnIds,
      });
      if (sameIds(prev, next)) return prev;
      savePipelineListColumns(entity, next);
      return next;
    });
  }, [availableIds, columnsReady, defaultColumnIds, entity, hydrated]);

  const setColumns = useCallback(
    (next: PipelineListColumnId[]) => {
      const normalized = normalizePipelineListColumns(next, availableIds, {
        fieldsReady: true,
        rolesReady: true,
        defaults: defaultColumnIds,
      });
      setSelectedColumnIds(normalized);
      savePipelineListColumns(entity, normalized);
    },
    [availableIds, defaultColumnIds, entity],
  );

  const visibleColumns: PipelineListColumnDef[] = useMemo(() => {
    const byId = new Map(availableColumns.map((c) => [c.id, c]));
    return selectedColumnIds
      .map((id) => byId.get(id))
      .filter((c): c is PipelineListColumnDef => Boolean(c));
  }, [availableColumns, selectedColumnIds]);

  const customFieldIds = useMemo(
    () =>
      selectedColumnIds
        .map((id) => parseCustomColumnId(id))
        .filter((id): id is string => Boolean(id)),
    [selectedColumnIds],
  );

  const bulkValues = useBulkEntityFieldValues(
    entityType,
    enabled ? entityIds : [],
    enabled ? customFieldIds : [],
  );

  return {
    availableColumns,
    selectedColumnIds,
    visibleColumns,
    setColumns,
    customFieldValuesByEntityId: bulkValues.valuesByEntityId,
    fieldsLoading: fieldsQuery.isLoading || rolesQuery.isLoading,
    customValuesLoading: bulkValues.isLoading,
    hydrated,
  };
}
