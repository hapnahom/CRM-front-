import { formatUserName } from '@/lib/format-user-name';
import {
  formatCustomFieldListValue,
  type CustomFieldDirectory,
} from '@/lib/pipeline/format-custom-field-value';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import {
  fetchEntityFields,
  fetchFieldsForStage,
} from '@/store/server/features/entity-fields/queries';
import { fieldAppliesToEntity } from '@/store/server/features/entity-fields/mappers';
import type { EntityFieldResponse } from '@/store/server/features/entity-fields/types';
import {
  fetchBulkEntityFieldValues,
  type BulkEntityFieldValueRow,
} from '@/store/server/features/entity-fields/values';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';
import type {
  ReportCompositeSubFieldColumn,
  ReportCustomFieldColumn,
} from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

function activeReportFields(
  fields: EntityFieldResponse[],
): EntityFieldResponse[] {
  return (
    fields
      .filter((field) => field.active !== false)
      .filter((field) => field.showInReports !== false)
      // File uploads are not useful as tabular report columns.
      .filter((field) => field.fieldType !== 'FILE')
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  );
}

function normalizeFieldsPage(response: unknown): EntityFieldResponse[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as EntityFieldResponse[];
  if (
    typeof response === 'object' &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: EntityFieldResponse[] }).data;
  }
  return [];
}

function mapCompositeSubFields(
  field: EntityFieldResponse,
): ReportCompositeSubFieldColumn[] | undefined {
  const settings = field.settings ?? {};
  if (!Array.isArray(settings.subFields)) return undefined;
  return settings.subFields
    .map((raw): ReportCompositeSubFieldColumn | null => {
      if (!raw || typeof raw !== 'object') return null;
      const sub = raw as Record<string, unknown>;
      const key = String(sub.key ?? '').trim();
      const label = String(sub.label ?? '').trim();
      if (!key || !label) return null;
      return {
        key,
        label,
        fieldType: String(sub.fieldType ?? 'STRING'),
        options: Array.isArray(sub.options)
          ? sub.options.map((option) => {
              const item = option as Record<string, unknown>;
              return {
                label: String(item.label ?? ''),
                value: String(item.value ?? item.label ?? ''),
              };
            })
          : undefined,
      };
    })
    .filter((sub): sub is ReportCompositeSubFieldColumn => sub != null);
}

function toColumn(
  field: EntityFieldResponse,
  entityType: 'LEAD' | 'DEAL',
): ReportCustomFieldColumn {
  const legacyStageId = field.stageId ?? null;
  return {
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    entityType,
    dealStageId:
      field.dealStageId ?? (entityType === 'DEAL' ? legacyStageId : null),
    leadStageId:
      field.leadStageId ?? (entityType === 'LEAD' ? legacyStageId : null),
    reportColumnGroup:
      typeof field.settings?.reportColumnGroup === 'string'
        ? field.settings.reportColumnGroup
        : null,
    reportColumnLabel:
      typeof field.settings?.reportColumnLabel === 'string'
        ? field.settings.reportColumnLabel
        : null,
    showInInactiveReport: Boolean(field.settings?.showInInactiveReport),
    options: (field.options ?? [])
      .filter((option) => option.active !== false)
      .map((option) => ({ label: option.label, value: option.value })),
    subFields:
      field.fieldType === 'COMPOSITE'
        ? mapCompositeSubFields(field)
        : undefined,
  };
}

function splitPipelineFieldColumns(fields: EntityFieldResponse[]): {
  dealColumns: ReportCustomFieldColumn[];
  leadColumns: ReportCustomFieldColumn[];
} {
  const active = activeReportFields(fields);
  return {
    dealColumns: active
      .filter((field) => fieldAppliesToEntity(field, 'DEAL'))
      .map((field) => toColumn(field, 'DEAL')),
    leadColumns: active
      .filter((field) => fieldAppliesToEntity(field, 'LEAD'))
      .map((field) => toColumn(field, 'LEAD')),
  };
}

async function fetchPipelineCustomFields(
  tenantId: string,
): Promise<EntityFieldResponse[]> {
  const page = await fetchEntityFields(tenantId, {
    pipelineOnly: true,
    page: 1,
    pageSize: 200,
  });
  return normalizeFieldsPage(page);
}

async function fetchAllFieldValues(
  tenantId: string,
  entityType: BackendEntityType,
  entityIds: string[],
  fieldIds: string[],
): Promise<BulkEntityFieldValueRow[]> {
  if (!entityIds.length || !fieldIds.length) return [];

  const entityChunkSize = 500;
  const fieldChunkSize = 150;
  const tasks: Promise<BulkEntityFieldValueRow[]>[] = [];

  for (let i = 0; i < entityIds.length; i += entityChunkSize) {
    const chunkIds = entityIds.slice(i, i + entityChunkSize);
    for (let j = 0; j < fieldIds.length; j += fieldChunkSize) {
      const chunkFields = fieldIds.slice(j, j + fieldChunkSize);
      tasks.push(
        fetchBulkEntityFieldValues(tenantId, {
          entityType,
          entityIds: chunkIds,
          entityFieldIds: chunkFields,
        }),
      );
    }
  }

  const pages = await Promise.all(tasks);
  return pages.flat();
}

function customFieldSelectionFromColumns(
  selectedColumnIds: string[] | undefined,
): {
  dealFieldIds: Set<string>;
  leadFieldIds: Set<string>;
  loadAllPipelineCustomValues: boolean;
  loadInactiveDealStageFields: boolean;
  loadInactiveLeadStageFields: boolean;
} {
  const dealFieldIds = new Set<string>();
  const leadFieldIds = new Set<string>();
  let loadAllPipelineCustomValues = false;
  let loadInactiveDealStageFields = false;
  let loadInactiveLeadStageFields = false;

  for (const id of selectedColumnIds ?? []) {
    if (id.startsWith('total_pipeline.deal_custom:')) {
      dealFieldIds.add(id.slice('total_pipeline.deal_custom:'.length));
    } else if (id.startsWith('total_pipeline.lead_custom:')) {
      leadFieldIds.add(id.slice('total_pipeline.lead_custom:'.length));
    } else if (
      id.startsWith('total_pipeline.custom:') ||
      id.startsWith('total_pipeline.group:')
    ) {
      loadAllPipelineCustomValues = true;
    } else if (id.startsWith('inactive_opportunities.deal_custom:')) {
      loadInactiveDealStageFields = true;
      dealFieldIds.add(id.slice('inactive_opportunities.deal_custom:'.length));
    } else if (id.startsWith('inactive_opportunities.lead_custom:')) {
      loadInactiveLeadStageFields = true;
      leadFieldIds.add(id.slice('inactive_opportunities.lead_custom:'.length));
    } else if (
      id.startsWith('inactive_opportunities.custom:') ||
      id.startsWith('inactive_opportunities.group:')
    ) {
      loadInactiveDealStageFields = true;
      loadInactiveLeadStageFields = true;
      loadAllPipelineCustomValues = true;
    }
  }

  return {
    dealFieldIds,
    leadFieldIds,
    loadAllPipelineCustomValues,
    loadInactiveDealStageFields,
    loadInactiveLeadStageFields,
  };
}

function valuesByEntityId(
  rows: BulkEntityFieldValueRow[],
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const current = map.get(row.entityId) ?? {};
    current[row.entityFieldId] = row.value;
    map.set(row.entityId, current);
  }
  return map;
}

function normalizeBindingFieldType(fieldType: unknown): string {
  return String(fieldType ?? '')
    .trim()
    .toUpperCase();
}

function entityFieldUsesBindingType(
  field: EntityFieldResponse,
  type: 'USER' | 'TEAM' | 'DEPARTMENT',
): boolean {
  if (field.fieldType === type) return true;
  if (field.fieldType !== 'COMPOSITE') return false;
  const subFields = field.settings?.subFields;
  if (!Array.isArray(subFields)) return false;
  return subFields.some(
    (sub) =>
      normalizeBindingFieldType((sub as Record<string, unknown>).fieldType) ===
      type,
  );
}

function columnUsesBindingType(
  column: Pick<ReportCustomFieldColumn, 'fieldType' | 'subFields'>,
  type: 'USER' | 'TEAM' | 'DEPARTMENT',
): boolean {
  if (column.fieldType === type) return true;
  return (column.subFields ?? []).some(
    (sub) => normalizeBindingFieldType(sub.fieldType) === type,
  );
}

async function buildCustomFieldDirectory(
  fields: EntityFieldResponse[],
  columns: ReportCustomFieldColumn[] = [],
): Promise<CustomFieldDirectory> {
  const directory: CustomFieldDirectory = {};
  const needsUsers =
    fields.some((field) => entityFieldUsesBindingType(field, 'USER')) ||
    columns.some((column) => columnUsesBindingType(column, 'USER'));
  const needsTeams =
    fields.some((field) => entityFieldUsesBindingType(field, 'TEAM')) ||
    columns.some((column) => columnUsesBindingType(column, 'TEAM'));
  const needsDepartments =
    fields.some((field) => entityFieldUsesBindingType(field, 'DEPARTMENT')) ||
    columns.some((column) => columnUsesBindingType(column, 'DEPARTMENT'));
  if (!needsUsers && !needsTeams && !needsDepartments) return directory;

  const headers = await authHeaders();

  if (needsUsers) {
    const response = await crudRequest({
      url: `${CRM_URL}/users`,
      method: 'GET',
      headers,
      params: { page: 1, pageSize: 1000 },
    });
    const users = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];
    const userMap = new Map<string, string>();
    for (const user of users) {
      const name = formatUserName(user, user.email || 'User');
      if (user.id) userMap.set(String(user.id), name);
      if (user.selamnewId) userMap.set(String(user.selamnewId), name);
    }
    directory.USER = userMap;
  }

  if (needsTeams) {
    const response = await crudRequest({
      url: `${CRM_URL}/teams`,
      method: 'GET',
      headers,
      params: { page: 1, pageSize: 200 },
    });
    const teams = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];
    const teamMap = new Map<string, string>();
    for (const team of teams) {
      if (team?.id) teamMap.set(String(team.id), String(team.name ?? team.id));
    }
    directory.TEAM = teamMap;
  }

  if (needsDepartments) {
    const response = await crudRequest({
      url: `${CRM_URL}/departments`,
      method: 'GET',
      headers,
      params: { page: 1, pageSize: 200 },
    });
    const departments = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];
    const departmentMap = new Map<string, string>();
    for (const department of departments) {
      if (department?.id) {
        departmentMap.set(
          String(department.id),
          String(department.name ?? department.id),
        );
      }
    }
    directory.DEPARTMENT = departmentMap;
  }

  return directory;
}

export type ReportCustomFieldPayload = {
  dealColumns: ReportCustomFieldColumn[];
  leadColumns: ReportCustomFieldColumn[];
  inactiveLostDealColumns: ReportCustomFieldColumn[];
  inactiveLostLeadColumns: ReportCustomFieldColumn[];
  dealValuesById: Map<string, Record<string, unknown>>;
  leadValuesById: Map<string, Record<string, unknown>>;
  directory: CustomFieldDirectory;
};

function dedupeFieldColumns(
  fields: EntityFieldResponse[],
  entityType: 'LEAD' | 'DEAL',
): ReportCustomFieldColumn[] {
  const seen = new Set<string>();
  const columns: ReportCustomFieldColumn[] = [];
  for (const field of activeReportFields(fields)) {
    if (seen.has(field.id)) continue;
    seen.add(field.id);
    columns.push(toColumn(field, entityType));
  }
  return columns;
}

async function fetchStageFieldColumns(
  tenantId: string,
  entityType: 'LEAD' | 'DEAL',
  stageIds: string[],
): Promise<ReportCustomFieldColumn[]> {
  if (!stageIds.length) return [];
  const stageIdSet = new Set(stageIds);
  const stagePages = await Promise.all(
    stageIds.map(async (stageId) => {
      try {
        const page = await fetchFieldsForStage(tenantId, entityType, stageId);
        return Array.isArray(page) ? page : [];
      } catch {
        return [];
      }
    }),
  );
  const fields = stagePages.flat();
  return dedupeFieldColumns(
    fields.filter((field) => fieldAppliesToEntity(field, entityType)),
    entityType,
  ).filter((field) => {
    const configuredStageId =
      entityType === 'DEAL' ? field.dealStageId : field.leadStageId;
    return Boolean(configuredStageId && stageIdSet.has(configuredStageId));
  });
}

/** Field definitions configured on inactive/lost stages — for Inactive Opportunities. */
export async function loadInactiveLostStageCustomFieldDefinitions(input: {
  dealInactiveStageIds?: string[];
  dealLostStageIds?: string[];
  leadLostStageIds?: string[];
}): Promise<{
  dealColumns: ReportCustomFieldColumn[];
  leadColumns: ReportCustomFieldColumn[];
}> {
  const { tenantId } = useAuthenticationStore.getState();
  if (!tenantId) return { dealColumns: [], leadColumns: [] };

  const dealStageIds = [
    ...new Set([
      ...(input.dealInactiveStageIds ?? []),
      ...(input.dealLostStageIds ?? []),
    ]),
  ];

  try {
    const [dealColumns, leadColumns] = await Promise.all([
      fetchStageFieldColumns(tenantId, 'DEAL', dealStageIds),
      fetchStageFieldColumns(tenantId, 'LEAD', input.leadLostStageIds ?? []),
    ]);
    return { dealColumns, leadColumns };
  } catch {
    return { dealColumns: [], leadColumns: [] };
  }
}

/** @deprecated Use loadInactiveLostStageCustomFieldDefinitions */
export const loadLostStageCustomFieldDefinitions =
  loadInactiveLostStageCustomFieldDefinitions;

/** Field definitions only — for Columns UI before export data is loaded. */
export async function loadReportCustomFieldDefinitions(): Promise<{
  dealColumns: ReportCustomFieldColumn[];
  leadColumns: ReportCustomFieldColumn[];
}> {
  const { tenantId } = useAuthenticationStore.getState();
  if (!tenantId) return { dealColumns: [], leadColumns: [] };

  try {
    const pipelineFields = await fetchPipelineCustomFields(tenantId);
    const { dealColumns, leadColumns } =
      splitPipelineFieldColumns(pipelineFields);
    return { dealColumns, leadColumns };
  } catch {
    return { dealColumns: [], leadColumns: [] };
  }
}

export async function loadReportCustomFields(input: {
  dealIds: string[];
  leadIds: string[];
  dealInactiveStageIds?: string[];
  dealLostStageIds?: string[];
  leadLostStageIds?: string[];
  selectedColumnIds?: string[];
}): Promise<ReportCustomFieldPayload> {
  const { tenantId } = useAuthenticationStore.getState();
  if (!tenantId) {
    return {
      dealColumns: [],
      leadColumns: [],
      inactiveLostDealColumns: [],
      inactiveLostLeadColumns: [],
      dealValuesById: new Map(),
      leadValuesById: new Map(),
      directory: {},
    };
  }

  let dealFields: EntityFieldResponse[] = [];
  let leadFields: EntityFieldResponse[] = [];
  let dealColumns: ReportCustomFieldColumn[] = [];
  let leadColumns: ReportCustomFieldColumn[] = [];
  try {
    const pipelineFields = await fetchPipelineCustomFields(tenantId);
    dealFields = pipelineFields.filter((field) =>
      fieldAppliesToEntity(field, 'DEAL'),
    );
    leadFields = pipelineFields.filter((field) =>
      fieldAppliesToEntity(field, 'LEAD'),
    );
    dealFields = activeReportFields(dealFields);
    leadFields = activeReportFields(leadFields);
    dealColumns = dealFields.map((field) => toColumn(field, 'DEAL'));
    leadColumns = leadFields.map((field) => toColumn(field, 'LEAD'));
  } catch {
    return {
      dealColumns: [],
      leadColumns: [],
      inactiveLostDealColumns: [],
      inactiveLostLeadColumns: [],
      dealValuesById: new Map(),
      leadValuesById: new Map(),
      directory: {},
    };
  }

  const selection = customFieldSelectionFromColumns(input.selectedColumnIds);
  const needsCustomValues =
    selection.loadAllPipelineCustomValues ||
    selection.dealFieldIds.size > 0 ||
    selection.leadFieldIds.size > 0;

  const dealInactiveLostStageIds = [
    ...new Set([
      ...(input.dealInactiveStageIds ?? []),
      ...(input.dealLostStageIds ?? []),
    ]),
  ];
  const inactiveStageFetches: Promise<ReportCustomFieldColumn[]>[] = [];
  if (selection.loadInactiveDealStageFields) {
    inactiveStageFetches.push(
      fetchStageFieldColumns(tenantId, 'DEAL', dealInactiveLostStageIds),
    );
  } else {
    inactiveStageFetches.push(Promise.resolve([]));
  }
  if (selection.loadInactiveLeadStageFields) {
    inactiveStageFetches.push(
      fetchStageFieldColumns(tenantId, 'LEAD', input.leadLostStageIds ?? []),
    );
  } else {
    inactiveStageFetches.push(Promise.resolve([]));
  }
  const [inactiveLostDealColumns, inactiveLostLeadColumns] =
    await Promise.all(inactiveStageFetches);

  const dealValueFieldIds = [
    ...new Set([
      ...(selection.loadAllPipelineCustomValues
        ? dealColumns.map((column) => column.id)
        : [...selection.dealFieldIds]),
      ...(selection.loadInactiveDealStageFields
        ? inactiveLostDealColumns.map((column) => column.id)
        : []),
    ]),
  ];
  const leadValueFieldIds = [
    ...new Set([
      ...(selection.loadAllPipelineCustomValues
        ? leadColumns.map((column) => column.id)
        : [...selection.leadFieldIds]),
      ...(selection.loadInactiveLeadStageFields
        ? inactiveLostLeadColumns.map((column) => column.id)
        : []),
    ]),
  ];

  // Load values separately so column headers still appear if values fail.
  let dealValues: BulkEntityFieldValueRow[] = [];
  let leadValues: BulkEntityFieldValueRow[] = [];
  let directory: CustomFieldDirectory = {};
  try {
    const valueTasks: Promise<unknown>[] = [
      buildCustomFieldDirectory(
        [...dealFields, ...leadFields],
        [
          ...dealColumns,
          ...leadColumns,
          ...inactiveLostDealColumns,
          ...inactiveLostLeadColumns,
        ],
      ),
    ];
    if (needsCustomValues && dealValueFieldIds.length) {
      valueTasks.push(
        fetchAllFieldValues(tenantId, 'DEAL', input.dealIds, dealValueFieldIds),
      );
    }
    if (needsCustomValues && leadValueFieldIds.length) {
      valueTasks.push(
        fetchAllFieldValues(tenantId, 'LEAD', input.leadIds, leadValueFieldIds),
      );
    }
    const results = await Promise.all(valueTasks);
    directory = (results[0] as CustomFieldDirectory) ?? {};
    let index = 1;
    if (needsCustomValues && dealValueFieldIds.length) {
      dealValues = (results[index++] as BulkEntityFieldValueRow[]) ?? [];
    }
    if (needsCustomValues && leadValueFieldIds.length) {
      leadValues = (results[index] as BulkEntityFieldValueRow[]) ?? [];
    }
  } catch {
    // Keep columns even when value lookup fails.
  }

  return {
    dealColumns,
    leadColumns,
    inactiveLostDealColumns,
    inactiveLostLeadColumns,
    dealValuesById: valuesByEntityId(dealValues),
    leadValuesById: valuesByEntityId(leadValues),
    directory,
  };
}

export function formatReportCustomValues(
  columns: ReportCustomFieldColumn[],
  values: Record<string, unknown> | undefined,
  directory: CustomFieldDirectory,
): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const column of columns) {
    formatted[column.id] = formatCustomFieldListValue(
      values?.[column.id],
      column.fieldType,
      column.options,
      directory,
      column.subFields,
    );
  }
  return formatted;
}
