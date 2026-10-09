/** Shared list-table column selection for leads/deals pipeline views. */

import {
  roleColumnId,
  type RolePipelineListColumnId,
} from '@/lib/pipeline/role-columns';
import {
  DEFAULT_TOTAL_PIPELINE_TABLE_COLUMNS,
  TOTAL_PIPELINE_COLUMN_LABELS,
} from '@/lib/pipeline/total-pipeline-table-columns';
import type { PipelineRoleAppliesTo } from '@/store/server/features/pipeline-roles/queries';

/** Legacy cap removed — users may select every available column. */
export const MAX_PIPELINE_LIST_COLUMNS = Number.MAX_SAFE_INTEGER;
export const MAX_PIPELINE_LIST_CELL_VALUES = 4;

export const DEFAULT_PIPELINE_LIST_COLUMNS = [
  'name',
  'customer',
  'stage',
  'value',
  'expectedClose',
  'responsible',
] as const;

/** Deals list follows Total Pipeline column order (client before opportunity). */
export const DEFAULT_DEALS_LIST_COLUMNS = [
  'customer',
  'name',
  'stage',
  'value',
  'expectedClose',
  'responsible',
] as const;

const LEGACY_DEALS_LIST_COLUMNS = [
  'name',
  'customer',
  'stage',
  'value',
  'expectedClose',
  'responsible',
] as const;

export function isLegacyDealsListColumnOrder(
  columns: readonly PipelineListColumnId[],
): boolean {
  return (
    columns.length === LEGACY_DEALS_LIST_COLUMNS.length &&
    columns.every((id, index) => id === LEGACY_DEALS_LIST_COLUMNS[index])
  );
}

export type BuiltInPipelineListColumnId =
  | 'name'
  | 'customer'
  | 'contact'
  | 'contact_position'
  | 'contact_email'
  | 'contact_phone'
  | 'stage'
  | 'value'
  | 'currency'
  | 'solution'
  | 'vendor'
  | 'dr_status'
  | 'days_in_current_stage'
  | 'last_activity_date'
  | 'fiscal_year'
  | 'quarter'
  | 'quarter_closed'
  | 'expectedClose'
  | 'responsible'
  | 'observers'
  | 'products'
  | 'createdAt'
  | 'type'
  | 'age';

export type CustomPipelineListColumnId = `custom:${string}`;
export type GroupedCustomPipelineListColumnId = `custom-group:${string}`;

export type PipelineListColumnId =
  | BuiltInPipelineListColumnId
  | CustomPipelineListColumnId
  | GroupedCustomPipelineListColumnId
  | RolePipelineListColumnId;

/** Removed from the Total Pipeline table — assignment roles cover ownership. */
export const DEPRECATED_OPPORTUNITY_TABLE_COLUMN_IDS =
  new Set<BuiltInPipelineListColumnId>(['responsible', 'observers']);

export type PipelineListGroupedCustomFieldRef = {
  fieldId: string;
  entityType: 'LEAD' | 'DEAL';
  fieldType: string;
  options?: Array<{ label: string; value: string }>;
  subFields?: PipelineListColumnDef['subFields'];
};

export type PipelineListColumnGroup = 'built-in' | 'custom' | 'role';

export interface PipelineListColumnDef {
  id: PipelineListColumnId;
  label: string;
  group: PipelineListColumnGroup;
  /** When true, column cannot be deselected (e.g. name). */
  locked?: boolean;
  align?: 'left' | 'right';
  /** Optional fixed width hint for table-fixed layout */
  widthClass?: string;
  /** Custom field metadata when group === 'custom' */
  fieldId?: string;
  fieldType?: string;
  options?: Array<{ label: string; value: string }>;
  subFields?: Array<{
    key: string;
    label: string;
    fieldType: string;
    options?: Array<{ label: string; value: string }>;
  }>;
  /** Set on mixed opportunity-table custom columns. */
  entityType?: 'LEAD' | 'DEAL';
  /** Fields merged into one column via report column group. */
  groupedFields?: PipelineListGroupedCustomFieldRef[];
  /** Assignment role metadata when group === 'role'. */
  roleId?: string;
  isPrimary?: boolean;
  appliesTo?: PipelineRoleAppliesTo;
}

export type AssignmentRoleColumnInput = {
  id: string;
  label: string;
  isPrimary?: boolean;
  displayOrder?: number;
  appliesTo?: PipelineRoleAppliesTo;
};

export const BUILT_IN_PIPELINE_LIST_COLUMNS: PipelineListColumnDef[] = [
  {
    id: 'customer',
    label: TOTAL_PIPELINE_COLUMN_LABELS.customer,
    group: 'built-in',
    widthClass: 'w-[16%]',
  },
  {
    id: 'name',
    label: 'Name',
    group: 'built-in',
    locked: true,
    widthClass: 'w-[22%]',
  },
  {
    id: 'type',
    label: TOTAL_PIPELINE_COLUMN_LABELS.type,
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'contact',
    label: TOTAL_PIPELINE_COLUMN_LABELS.contact,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'stage',
    label: TOTAL_PIPELINE_COLUMN_LABELS.stage,
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'value',
    label: TOTAL_PIPELINE_COLUMN_LABELS.value,
    group: 'built-in',
    align: 'right',
    widthClass: 'w-[10%]',
  },
  {
    id: 'expectedClose',
    label: 'Expected close',
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'responsible',
    label: 'Responsible',
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'observers',
    label: 'Observers',
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'products',
    label: 'Products',
    group: 'built-in',
    widthClass: 'w-[16%]',
  },
  {
    id: 'createdAt',
    label: 'Created',
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
];

export const DEFAULT_OPPORTUNITY_TABLE_COLUMNS: PipelineListColumnId[] = [
  ...DEFAULT_TOTAL_PIPELINE_TABLE_COLUMNS,
];

const OPPORTUNITY_EXTRA_COLUMNS: PipelineListColumnDef[] = [
  {
    id: 'products',
    label: 'Products',
    group: 'built-in',
    widthClass: 'w-[16%]',
  },
  {
    id: 'age',
    label: 'Age in stage',
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'expectedClose',
    label: 'Expected close',
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'createdAt',
    label: 'Created',
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
];

export const OPPORTUNITY_TABLE_BUILT_IN_COLUMNS: PipelineListColumnDef[] = [
  {
    id: 'customer',
    label: TOTAL_PIPELINE_COLUMN_LABELS.customer,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'name',
    label: TOTAL_PIPELINE_COLUMN_LABELS.name,
    group: 'built-in',
    locked: true,
    widthClass: 'w-[22%]',
  },
  {
    id: 'type',
    label: TOTAL_PIPELINE_COLUMN_LABELS.type,
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'stage',
    label: TOTAL_PIPELINE_COLUMN_LABELS.stage,
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  {
    id: 'value',
    label: TOTAL_PIPELINE_COLUMN_LABELS.value,
    group: 'built-in',
    align: 'right',
    widthClass: 'w-[10%]',
  },
  {
    id: 'currency',
    label: TOTAL_PIPELINE_COLUMN_LABELS.currency,
    group: 'built-in',
    widthClass: 'w-[10%]',
  },
  {
    id: 'solution',
    label: TOTAL_PIPELINE_COLUMN_LABELS.solution,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'vendor',
    label: TOTAL_PIPELINE_COLUMN_LABELS.vendor,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'dr_status',
    label: TOTAL_PIPELINE_COLUMN_LABELS.dr_status,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'fiscal_year',
    label: TOTAL_PIPELINE_COLUMN_LABELS.fiscal_year,
    group: 'built-in',
    widthClass: 'w-[10%]',
  },
  {
    id: 'quarter',
    label: TOTAL_PIPELINE_COLUMN_LABELS.quarter,
    group: 'built-in',
    widthClass: 'w-[10%]',
  },
  {
    id: 'quarter_closed',
    label: TOTAL_PIPELINE_COLUMN_LABELS.quarter_closed,
    group: 'built-in',
    widthClass: 'w-[10%]',
  },
  {
    id: 'contact',
    label: TOTAL_PIPELINE_COLUMN_LABELS.contact,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'contact_position',
    label: TOTAL_PIPELINE_COLUMN_LABELS.contact_position,
    group: 'built-in',
    widthClass: 'w-[14%]',
  },
  {
    id: 'contact_email',
    label: TOTAL_PIPELINE_COLUMN_LABELS.contact_email,
    group: 'built-in',
    widthClass: 'w-[16%]',
  },
  {
    id: 'contact_phone',
    label: TOTAL_PIPELINE_COLUMN_LABELS.contact_phone,
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
  ...OPPORTUNITY_EXTRA_COLUMNS,
];

/** Engagement columns inserted after custom fields (matches report Total Pipeline). */
export const OPPORTUNITY_ENGAGEMENT_COLUMNS: PipelineListColumnDef[] = [
  {
    id: 'days_in_current_stage',
    label: TOTAL_PIPELINE_COLUMN_LABELS.days_in_current_stage,
    group: 'built-in',
    align: 'right',
    widthClass: 'w-[10%]',
  },
  {
    id: 'last_activity_date',
    label: TOTAL_PIPELINE_COLUMN_LABELS.last_activity_date,
    group: 'built-in',
    widthClass: 'w-[12%]',
  },
];

export function customColumnId(fieldId: string): CustomPipelineListColumnId {
  return `custom:${fieldId}`;
}

export function parseCustomColumnId(id: PipelineListColumnId): string | null {
  if (!id.startsWith('custom:')) return null;
  return id.slice('custom:'.length) || null;
}

export function parseCustomGroupColumnId(
  id: PipelineListColumnId,
): string | null {
  if (!id.startsWith('custom-group:')) return null;
  return id.slice('custom-group:'.length) || null;
}

function normalizeReportColumnGroup(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

function titleCaseReportGroupLabel(groupKey: string): string {
  return groupKey
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function groupedCustomColumnLabel(
  fields: Array<{ reportColumnGroup?: string | null; label: string }>,
): string {
  const groupName = fields
    .map((field) => field.reportColumnGroup?.trim())
    .find(Boolean);
  if (groupName) {
    const normalized = normalizeReportColumnGroup(groupName);
    if (groupName === normalized) {
      return titleCaseReportGroupLabel(normalized);
    }
    return groupName;
  }
  return fields[0]?.label?.trim() || 'Custom field';
}

function mapSingleOpportunityCustomField(
  field: OpportunityCustomField,
  entityType: 'LEAD' | 'DEAL',
): PipelineListColumnDef {
  return {
    id: customColumnId(field.id),
    label: field.label,
    group: 'custom',
    widthClass: 'w-[12%]',
    fieldId: field.id,
    fieldType: field.fieldType,
    options: field.options,
    subFields: field.subFields,
    entityType,
  };
}

/**
 * Merge custom fields that share reportColumnGroup into one table column.
 * Ungrouped fields stay as individual columns (deal + lead with same label remain separate).
 */
export function mergeOpportunityCustomFieldColumns(
  dealFields: OpportunityCustomField[] = [],
  leadFields: OpportunityCustomField[] = [],
  includeAllActiveCustomFields = false,
): PipelineListColumnDef[] {
  const isVisible = (field: OpportunityCustomField) =>
    field.active && (includeAllActiveCustomFields || field.visibleInLists);

  const byGroup = new Map<
    string,
    {
      label: string;
      groupedFields: PipelineListGroupedCustomFieldRef[];
      sourceFields: OpportunityCustomField[];
    }
  >();
  const groupOrder: string[] = [];
  const ungrouped: PipelineListColumnDef[] = [];

  const addField = (
    field: OpportunityCustomField,
    entityType: 'LEAD' | 'DEAL',
  ) => {
    if (!isVisible(field)) return;
    const groupKey = normalizeReportColumnGroup(field.reportColumnGroup);
    if (!groupKey) {
      ungrouped.push(mapSingleOpportunityCustomField(field, entityType));
      return;
    }
    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, {
        label: '',
        groupedFields: [],
        sourceFields: [],
      });
      groupOrder.push(groupKey);
    }
    const entry = byGroup.get(groupKey)!;
    entry.sourceFields.push(field);
    entry.groupedFields.push({
      fieldId: field.id,
      entityType,
      fieldType: field.fieldType,
      options: field.options,
      subFields: field.subFields,
    });
  };

  for (const field of dealFields) addField(field, 'DEAL');
  for (const field of leadFields) addField(field, 'LEAD');

  const grouped = groupOrder.map((groupKey) => {
    const entry = byGroup.get(groupKey)!;
    entry.label = groupedCustomColumnLabel(entry.sourceFields);
    return {
      id: `custom-group:${groupKey}` as GroupedCustomPipelineListColumnId,
      label: entry.label,
      group: 'custom' as const,
      widthClass: 'w-[12%]',
      groupedFields: entry.groupedFields,
    };
  });

  return [...grouped, ...ungrouped];
}

/** Collect entity field ids referenced by visible custom / grouped columns. */
export function customFieldIdsForEntityType(
  columns: PipelineListColumnDef[],
  entityType: 'LEAD' | 'DEAL',
): string[] {
  const ids = new Set<string>();
  for (const column of columns) {
    if (column.groupedFields?.length) {
      for (const ref of column.groupedFields) {
        if (ref.entityType === entityType) ids.add(ref.fieldId);
      }
      continue;
    }
    if (column.fieldId && column.entityType === entityType) {
      ids.add(column.fieldId);
    }
  }
  return [...ids];
}

/** Drop deprecated columns and remap legacy custom ids to grouped columns. */
export function migrateOpportunityColumnIds(
  selected: PipelineListColumnId[],
  available: PipelineListColumnDef[],
): PipelineListColumnId[] {
  const fieldIdToColumnId = new Map<string, PipelineListColumnId>();
  for (const column of available) {
    if (column.fieldId) {
      fieldIdToColumnId.set(column.fieldId, column.id);
    }
    for (const ref of column.groupedFields ?? []) {
      fieldIdToColumnId.set(ref.fieldId, column.id);
    }
  }

  const seen = new Set<PipelineListColumnId>();
  const result: PipelineListColumnId[] = [];

  for (const id of selected) {
    if (
      DEPRECATED_OPPORTUNITY_TABLE_COLUMN_IDS.has(
        id as BuiltInPipelineListColumnId,
      )
    ) {
      continue;
    }

    let resolved = id;
    const legacyFieldId = parseCustomColumnId(id);
    if (legacyFieldId) {
      resolved = fieldIdToColumnId.get(legacyFieldId) ?? id;
    }

    if (seen.has(resolved)) continue;
    seen.add(resolved);
    result.push(resolved);
  }

  return result;
}

export { parseRoleColumnId, roleColumnId } from '@/lib/pipeline/role-columns';

function mapAssignmentRoleColumns(
  roles: AssignmentRoleColumnInput[],
): PipelineListColumnDef[] {
  return [...roles]
    .filter((role) => Boolean(role.id))
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        (a.label ?? '').localeCompare(b.label ?? ''),
    )
    .map((role) => ({
      id: roleColumnId(role.id),
      label: role.label?.trim() || 'Unnamed role',
      group: 'role' as const,
      widthClass: 'w-[14%]',
      roleId: role.id,
      isPrimary: role.isPrimary,
      appliesTo: role.appliesTo,
    }));
}

function insertRoleColumnsAfterDrStatus(
  builtIn: PipelineListColumnDef[],
  roleColumns: PipelineListColumnDef[],
): PipelineListColumnDef[] {
  if (!roleColumns.length) return builtIn;
  const drIdx = builtIn.findIndex((column) => column.id === 'dr_status');
  const insertAt = drIdx >= 0 ? drIdx + 1 : builtIn.length;
  return [
    ...builtIn.slice(0, insertAt),
    ...roleColumns,
    ...builtIn.slice(insertAt),
  ];
}

export function isBuiltInColumnId(
  id: string,
): id is BuiltInPipelineListColumnId {
  return (
    BUILT_IN_PIPELINE_LIST_COLUMNS.some((c) => c.id === id) ||
    OPPORTUNITY_TABLE_BUILT_IN_COLUMNS.some((c) => c.id === id) ||
    OPPORTUNITY_ENGAGEMENT_COLUMNS.some((c) => c.id === id)
  );
}

export type PipelineListColumnStoreId = 'leads' | 'deals' | 'opportunities';

function storageKey(entity: PipelineListColumnStoreId): string {
  return `pipeline-list-columns:${entity}`;
}

export function loadPipelineListColumns(
  entity: PipelineListColumnStoreId,
): PipelineListColumnId[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(entity));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (id): id is PipelineListColumnId => typeof id === 'string',
    );
  } catch {
    return null;
  }
}

export function savePipelineListColumns(
  entity: PipelineListColumnStoreId,
  columns: PipelineListColumnId[],
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(entity), JSON.stringify(columns));
  } catch {
    // Ignore quota / private mode failures
  }
}

/** Ensure name is present, dedupe, and preserve user column order. */
export function normalizePipelineListColumns(
  selected: PipelineListColumnId[],
  availableIds: Set<PipelineListColumnId>,
  options?: {
    fieldsReady?: boolean;
    rolesReady?: boolean;
    defaults?: readonly PipelineListColumnId[];
  },
): PipelineListColumnId[] {
  const fieldsReady = options?.fieldsReady ?? true;
  const rolesReady = options?.rolesReady ?? true;
  const defaults = options?.defaults ?? DEFAULT_PIPELINE_LIST_COLUMNS;
  const seen = new Set<PipelineListColumnId>();
  const result: PipelineListColumnId[] = [];

  const push = (id: PipelineListColumnId) => {
    if (seen.has(id)) return;
    if (id !== 'name' && !availableIds.has(id)) {
      // Keep persisted custom/role columns until defs have loaded
      if (id.startsWith('custom:') && !fieldsReady) {
        // fall through
      } else if (id.startsWith('role:') && !rolesReady) {
        // fall through
      } else {
        return;
      }
    }
    seen.add(id);
    result.push(id);
  };

  for (const id of selected) {
    push(id);
  }

  if (!result.includes('name')) {
    result.unshift('name');
  }

  if (result.length === 1) {
    for (const id of defaults) {
      push(id);
    }
  }

  return result;
}

export function buildAvailablePipelineListColumns(opts: {
  entityLabel: 'Lead' | 'Deal';
  /** Overrides the name column label while keeping internal entity type. */
  entityDisplayLabel?: string;
  /** Include active custom fields even if they are hidden from list views. */
  includeAllActiveCustomFields?: boolean;
  assignmentRoles?: AssignmentRoleColumnInput[];
  customFields?: Array<{
    id: string;
    label: string;
    fieldType: string;
    active: boolean;
    visibleInLists: boolean;
    options?: Array<{ label: string; value: string }>;
    subFields?: PipelineListColumnDef['subFields'];
  }>;
}): PipelineListColumnDef[] {
  const entityType = opts.entityLabel === 'Lead' ? 'LEAD' : 'DEAL';
  const nameColumnLabel = opts.entityDisplayLabel ?? opts.entityLabel;
  const builtIn = BUILT_IN_PIPELINE_LIST_COLUMNS.map((col) =>
    col.id === 'name' ? { ...col, label: nameColumnLabel } : col,
  );
  const roleColumns = mapAssignmentRoleColumns(
    (opts.assignmentRoles ?? []).filter(
      (role) =>
        !role.appliesTo ||
        role.appliesTo === 'BOTH' ||
        role.appliesTo === entityType,
    ),
  );
  const builtInWithRoles = insertRoleColumnsAfterDrStatus(builtIn, roleColumns);

  const custom = (opts.customFields ?? [])
    .filter(
      (f) =>
        f.active && (opts.includeAllActiveCustomFields || f.visibleInLists),
    )
    .map((f) => ({
      id: customColumnId(f.id) as PipelineListColumnId,
      label: f.label,
      group: 'custom' as const,
      widthClass: 'w-[12%]',
      fieldId: f.id,
      fieldType: f.fieldType,
      options: f.options,
      subFields: f.subFields,
    }));

  return [...builtInWithRoles, ...custom];
}

type OpportunityCustomField = {
  id: string;
  label: string;
  fieldType: string;
  active: boolean;
  visibleInLists: boolean;
  reportColumnGroup?: string | null;
  options?: Array<{ label: string; value: string }>;
  subFields?: PipelineListColumnDef['subFields'];
};

export function buildAvailableOpportunityTableColumns(opts: {
  leadFields?: OpportunityCustomField[];
  dealFields?: OpportunityCustomField[];
  includeAllActiveCustomFields?: boolean;
  assignmentRoles?: AssignmentRoleColumnInput[];
}): PipelineListColumnDef[] {
  const roleColumns = mapAssignmentRoleColumns(opts.assignmentRoles ?? []);

  const mergedCustom = mergeOpportunityCustomFieldColumns(
    opts.dealFields,
    opts.leadFields,
    opts.includeAllActiveCustomFields,
  );

  const drIdx = OPPORTUNITY_TABLE_BUILT_IN_COLUMNS.findIndex(
    (column) => column.id === 'dr_status',
  );
  const insertAt =
    drIdx >= 0 ? drIdx + 1 : OPPORTUNITY_TABLE_BUILT_IN_COLUMNS.length;

  return [
    ...OPPORTUNITY_TABLE_BUILT_IN_COLUMNS.slice(0, insertAt),
    ...mergedCustom,
    ...OPPORTUNITY_ENGAGEMENT_COLUMNS,
    ...roleColumns,
    ...OPPORTUNITY_TABLE_BUILT_IN_COLUMNS.slice(insertAt),
  ];
}
