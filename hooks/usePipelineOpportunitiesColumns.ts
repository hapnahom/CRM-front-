'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_OPPORTUNITY_TABLE_COLUMNS,
  buildAvailableOpportunityTableColumns,
  customFieldIdsForEntityType,
  loadPipelineListColumns,
  migrateOpportunityColumnIds,
  normalizePipelineListColumns,
  savePipelineListColumns,
  type PipelineListColumnDef,
  type PipelineListColumnId,
} from '@/lib/pipeline/list-columns';
import { insertNewColumnsInAvailableOrder } from '@/lib/pipeline/total-pipeline-table-columns';
import { usePipelineCustomFields } from '@/store/server/features/entity-fields/queries';
import {
  fieldAppliesToEntity,
  mapCompositeSubFieldsForListColumn,
} from '@/store/server/features/entity-fields/mappers';
import { useBulkEntityFieldValues } from '@/store/server/features/entity-fields/values';
import { usePipelineRoles } from '@/store/server/features/pipeline-roles/queries';

function sameIds(a: PipelineListColumnId[], b: PipelineListColumnId[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function mapFields(
  fields: Array<{
    id: string;
    label: string;
    fieldType: string;
    active: boolean;
    visibleInLists: boolean;
    settings?: Record<string, unknown> | null;
    options?: Array<{ label: string; value: string; active?: boolean }>;
  }>,
) {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    active: field.active,
    visibleInLists: field.visibleInLists,
    reportColumnGroup:
      typeof field.settings?.reportColumnGroup === 'string'
        ? field.settings.reportColumnGroup
        : null,
    options: (field.options ?? [])
      .filter((option) => option.active !== false)
      .map((option) => ({ label: option.label, value: option.value })),
    subFields:
      field.fieldType === 'COMPOSITE'
        ? mapCompositeSubFieldsForListColumn(field.settings)
        : undefined,
  }));
}

export function usePipelineOpportunitiesColumns({
  leadIds,
  dealIds,
  enabled = true,
}: {
  leadIds: string[];
  dealIds: string[];
  enabled?: boolean;
}) {
  const fieldsQuery = usePipelineCustomFields({
    pageSize: 200,
    enabled,
  });
  const allFields = fieldsQuery.data?.data ?? [];
  const leadFields = allFields.filter((field) =>
    fieldAppliesToEntity(field, 'LEAD'),
  );
  const dealFields = allFields.filter((field) =>
    fieldAppliesToEntity(field, 'DEAL'),
  );
  const rolesQuery = usePipelineRoles({ enabled });

  const assignmentRoles = useMemo(
    () =>
      (rolesQuery.data ?? [])
        .filter((role) => role.active !== false && role.id)
        .sort(
          (a, b) =>
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
            (a.name ?? '').localeCompare(b.name ?? ''),
        )
        .map((role) => ({
          id: role.id,
          label: role.name?.trim() || 'Unnamed role',
          isPrimary: role.isPrimary,
          displayOrder: role.displayOrder,
          appliesTo: role.appliesTo,
          usageContext: role.usageContext,
        })),
    [rolesQuery.data],
  );

  const availableColumns = useMemo(
    () =>
      buildAvailableOpportunityTableColumns({
        leadFields: mapFields(leadFields),
        dealFields: mapFields(dealFields),
        includeAllActiveCustomFields: true,
        assignmentRoles,
      }),
    [assignmentRoles, dealFields, leadFields],
  );

  const availableIdsKey = useMemo(
    () => availableColumns.map((column) => column.id).join('|'),
    [availableColumns],
  );

  const availableIds = useMemo(
    () => new Set(availableColumns.map((column) => column.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableIdsKey],
  );

  const [selectedColumnIds, setSelectedColumnIds] = useState<
    PipelineListColumnId[]
  >(() => [...DEFAULT_OPPORTUNITY_TABLE_COLUMNS]);
  const [hydrated, setHydrated] = useState(false);
  const fieldsReady = fieldsQuery.isFetched || fieldsQuery.isError;
  const rolesReady = rolesQuery.isFetched || rolesQuery.isError;
  const columnsReady = fieldsReady && rolesReady;

  useEffect(() => {
    if (hydrated) return;
    if (!columnsReady) return;
    const stored = loadPipelineListColumns('opportunities');
    const normalized = normalizePipelineListColumns(
      stored ?? [...DEFAULT_OPPORTUNITY_TABLE_COLUMNS],
      availableIds,
      {
        fieldsReady: true,
        rolesReady: true,
        defaults: DEFAULT_OPPORTUNITY_TABLE_COLUMNS,
      },
    );
    setSelectedColumnIds(
      migrateOpportunityColumnIds(
        insertNewColumnsInAvailableOrder(
          normalized,
          availableColumns.map((column) => column.id),
          new Set(stored ?? DEFAULT_OPPORTUNITY_TABLE_COLUMNS),
        ),
        availableColumns,
      ),
    );
    setHydrated(true);
  }, [availableColumns, availableIds, columnsReady, hydrated]);

  useEffect(() => {
    if (!hydrated || !columnsReady) return;
    setSelectedColumnIds((prev) => {
      const normalized = normalizePipelineListColumns(prev, availableIds, {
        fieldsReady: true,
        rolesReady: true,
        defaults: DEFAULT_OPPORTUNITY_TABLE_COLUMNS,
      });
      const next = migrateOpportunityColumnIds(
        insertNewColumnsInAvailableOrder(
          normalized,
          availableColumns.map((column) => column.id),
          new Set(prev),
        ),
        availableColumns,
      );
      if (sameIds(prev, next)) return prev;
      savePipelineListColumns('opportunities', next);
      return next;
    });
  }, [availableColumns, availableIds, columnsReady, hydrated]);

  const setColumns = useCallback(
    (next: PipelineListColumnId[]) => {
      const normalized = migrateOpportunityColumnIds(
        normalizePipelineListColumns(next, availableIds, {
          fieldsReady: true,
          rolesReady: true,
          defaults: DEFAULT_OPPORTUNITY_TABLE_COLUMNS,
        }),
        availableColumns,
      );
      setSelectedColumnIds(normalized);
      savePipelineListColumns('opportunities', normalized);
    },
    [availableColumns, availableIds],
  );

  const visibleColumns: PipelineListColumnDef[] = useMemo(() => {
    const byId = new Map(availableColumns.map((column) => [column.id, column]));
    return selectedColumnIds
      .map((id) => byId.get(id))
      .filter((column): column is PipelineListColumnDef => Boolean(column));
  }, [availableColumns, selectedColumnIds]);

  const leadCustomFieldIds = useMemo(
    () => customFieldIdsForEntityType(visibleColumns, 'LEAD'),
    [visibleColumns],
  );
  const dealCustomFieldIds = useMemo(
    () => customFieldIdsForEntityType(visibleColumns, 'DEAL'),
    [visibleColumns],
  );

  const leadValues = useBulkEntityFieldValues(
    'LEAD',
    enabled ? leadIds : [],
    enabled ? leadCustomFieldIds : [],
  );
  const dealValues = useBulkEntityFieldValues(
    'DEAL',
    enabled ? dealIds : [],
    enabled ? dealCustomFieldIds : [],
  );

  return {
    availableColumns,
    selectedColumnIds,
    visibleColumns,
    setColumns,
    leadCustomValuesByEntityId: leadValues.valuesByEntityId,
    dealCustomValuesByEntityId: dealValues.valuesByEntityId,
    fieldsLoading: fieldsQuery.isLoading || rolesQuery.isLoading,
    hydrated,
  };
}
