import {
  TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID,
  TOTAL_PIPELINE_COLUMN_LABELS,
  TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_CUSTOM,
  TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_DYNAMIC,
  TOTAL_PIPELINE_REPORT_BUILTIN_BEFORE_DYNAMIC,
  insertNewColumnsInAvailableOrder,
  normalizeTotalPipelineReportColumnOrder,
} from '@/lib/pipeline/total-pipeline-table-columns';
import type { ReportCustomFieldColumn } from './types';
import { isLeadsEnabled } from '@/config/salesWorkflow';

export type ReportColumnGroupId =
  | 'total_pipeline'
  | 'inactive_opportunities'
  | 'org_teams'
  | 'sales_reps'
  | 'product_portfolio'
  | 'team_engagements';

export type ReportColumnDef = {
  id: string;
  groupId: ReportColumnGroupId;
  label: string;
};

export const REPORT_COLUMN_GROUPS: Array<{
  id: ReportColumnGroupId;
  title: string;
}> = [
  {
    id: 'product_portfolio',
    title: 'Product Portfolio Allocation',
  },
  {
    id: 'team_engagements',
    title: 'Team Solution Engagements',
  },
  {
    id: 'org_teams',
    title: 'Team Performance',
  },
  {
    id: 'sales_reps',
    title: 'Sales Representative Performance',
  },
  {
    id: 'total_pipeline',
    title: 'Total Pipeline',
  },
  {
    id: 'inactive_opportunities',
    title: 'Inactive Opportunities',
  },
];

const INACTIVE_OPPORTUNITIES_REPORT_BUILTIN_BEFORE_DYNAMIC = [
  'inactive_opportunities.customer',
  'inactive_opportunities.name',
  'inactive_opportunities.type',
  'inactive_opportunities.stage',
  'inactive_opportunities.previous_stage',
  'inactive_opportunities.value',
  'inactive_opportunities.currency',
  'inactive_opportunities.product_family',
] as const;

export const INACTIVE_OPPORTUNITIES_EXPORT_EXCLUDED_COLUMN_IDS = new Set([
  'inactive_opportunities.fiscal_year',
  'inactive_opportunities.quarter',
  'inactive_opportunities.quarter_closed',
  'inactive_opportunities.vendor',
  'inactive_opportunities.dr_status',
  'inactive_opportunities.contact',
  'inactive_opportunities.contact_position',
  'inactive_opportunities.contact_email',
  'inactive_opportunities.contact_phone',
]);

const INACTIVE_OPPORTUNITIES_REPORT_BUILTIN_AFTER_DYNAMIC = [] as const;

const REPORT_ID_TO_BUILTIN_LABEL = Object.fromEntries(
  Object.entries(TOTAL_PIPELINE_COLUMN_LABELS).map(([builtin, label]) => [
    TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID[
      builtin as keyof typeof TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID
    ],
    label,
  ]),
) as Record<string, string>;

function totalPipelineReportLabel(reportColumnId: string): string {
  return REPORT_ID_TO_BUILTIN_LABEL[reportColumnId] ?? reportColumnId;
}

function inactiveOpportunityReportLabel(reportColumnId: string): string {
  const totalPipelineId = reportColumnId.replace(
    'inactive_opportunities.',
    'total_pipeline.',
  );
  if (reportColumnId === 'inactive_opportunities.previous_stage') {
    return 'Previous Stage';
  }
  return totalPipelineReportLabel(totalPipelineId);
}

const INACTIVE_OPPORTUNITIES_BASE_COLUMNS: ReportColumnDef[] = [
  ...INACTIVE_OPPORTUNITIES_REPORT_BUILTIN_BEFORE_DYNAMIC.map((id) => ({
    id,
    groupId: 'inactive_opportunities' as const,
    label: inactiveOpportunityReportLabel(id),
  })),
  ...INACTIVE_OPPORTUNITIES_REPORT_BUILTIN_AFTER_DYNAMIC.map((id) => ({
    id,
    groupId: 'inactive_opportunities' as const,
    label: inactiveOpportunityReportLabel(id),
  })),
];

/** Canonical Total Pipeline column order including dynamic custom fields and roles. */
export function buildTotalPipelineReportColumnOrder(input?: {
  dealCustomFields?: ReportCustomFieldColumn[];
  leadCustomFields?: ReportCustomFieldColumn[];
  assignmentRoles?: ReportAssignmentRoleColumn[];
}): string[] {
  const mergedCustom = mergePipelineCustomFields(
    input?.dealCustomFields,
    input?.leadCustomFields,
  ).map((field) => pipelineCustomColumnId(field));
  const roles = [...(input?.assignmentRoles ?? [])]
    .filter((role) => Boolean(role.id))
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        (a.label ?? '').localeCompare(b.label ?? ''),
    )
    .map((role) => assignmentRoleColumnId(role.id));
  return [
    ...TOTAL_PIPELINE_REPORT_BUILTIN_BEFORE_DYNAMIC,
    ...mergedCustom,
    ...TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_CUSTOM,
    ...roles,
    ...TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_DYNAMIC,
  ];
}

/** Stable base columns (custom fields are appended at runtime). */
export const BASE_REPORT_COLUMNS: ReportColumnDef[] = [
  {
    id: 'product_portfolio.family',
    groupId: 'product_portfolio',
    label: 'Product family',
  },
  {
    id: 'product_portfolio.vendors',
    groupId: 'product_portfolio',
    label: 'Key vendors',
  },
  {
    id: 'product_portfolio.volume',
    groupId: 'product_portfolio',
    label: 'Volume & mix',
  },
  {
    id: 'product_portfolio.value',
    groupId: 'product_portfolio',
    label: 'Pipeline value',
  },
  {
    id: 'product_portfolio.share',
    groupId: 'product_portfolio',
    label: 'Share %',
  },
  {
    id: 'product_portfolio.status',
    groupId: 'product_portfolio',
    label: 'Status',
  },

  {
    id: 'team_engagements.product',
    groupId: 'team_engagements',
    label: 'Product / solution',
  },
  {
    id: 'team_engagements.accounts',
    groupId: 'team_engagements',
    label: 'Accounts & owners',
  },
  {
    id: 'team_engagements.volume',
    groupId: 'team_engagements',
    label: 'Volume',
  },
  {
    id: 'team_engagements.value',
    groupId: 'team_engagements',
    label: 'Pipeline value',
  },
  {
    id: 'team_engagements.stage',
    groupId: 'team_engagements',
    label: 'Stage',
  },
  {
    id: 'team_engagements.status',
    groupId: 'team_engagements',
    label: 'Status',
  },

  ...TOTAL_PIPELINE_REPORT_BUILTIN_BEFORE_DYNAMIC.map((id) => ({
    id,
    groupId: 'total_pipeline' as const,
    label: totalPipelineReportLabel(id),
  })),
  ...TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_CUSTOM.map((id) => ({
    id,
    groupId: 'total_pipeline' as const,
    label: totalPipelineReportLabel(id),
  })),
  ...TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_DYNAMIC.map((id) => ({
    id,
    groupId: 'total_pipeline' as const,
    label: totalPipelineReportLabel(id),
  })),

  { id: 'org_teams.department', groupId: 'org_teams', label: 'Department' },
  { id: 'org_teams.team', groupId: 'org_teams', label: 'Sales team' },
  {
    id: 'org_teams.vector',
    groupId: 'org_teams',
    label: 'Business vector / sector',
  },
  {
    id: 'org_teams.opportunities',
    groupId: 'org_teams',
    label: 'Opportunities',
  },
  { id: 'org_teams.pipeline', groupId: 'org_teams', label: 'Pipeline value' },
  { id: 'org_teams.target', groupId: 'org_teams', label: 'Target' },
  { id: 'org_teams.achieved', groupId: 'org_teams', label: 'Achieved' },
  { id: 'org_teams.remaining', groupId: 'org_teams', label: 'Remaining' },

  {
    id: 'sales_reps.name',
    groupId: 'sales_reps',
    label: 'Sales representative',
  },
  { id: 'sales_reps.team', groupId: 'sales_reps', label: 'Team' },
  { id: 'sales_reps.department', groupId: 'sales_reps', label: 'Department' },
  {
    id: 'sales_reps.opportunities',
    groupId: 'sales_reps',
    label: 'Opportunities',
  },
  {
    id: 'sales_reps.open_pipeline',
    groupId: 'sales_reps',
    label: 'Open pipeline',
  },
  { id: 'sales_reps.target', groupId: 'sales_reps', label: 'Target' },
  { id: 'sales_reps.won_revenue', groupId: 'sales_reps', label: 'Won' },
  { id: 'sales_reps.remaining', groupId: 'sales_reps', label: 'Remaining' },
  {
    id: 'sales_reps.achievement',
    groupId: 'sales_reps',
    label: 'Achievement (%)',
  },
  { id: 'sales_reps.win_rate', groupId: 'sales_reps', label: 'Win Rate' },
  {
    id: 'sales_reps.pipeline_target',
    groupId: 'sales_reps',
    label: 'Pipeline Target',
  },
  {
    id: 'sales_reps.pipeline_achievement',
    groupId: 'sales_reps',
    label: 'Pipeline Achievement',
  },
];

export function dealCustomColumnId(fieldId: string): string {
  return `total_pipeline.deal_custom:${fieldId}`;
}

export function leadCustomColumnId(fieldId: string): string {
  return `total_pipeline.lead_custom:${fieldId}`;
}

/** Case-insensitive key for matching lead/deal custom fields by display label. */
export function normalizeCustomFieldLabel(
  label: string | null | undefined,
): string {
  return (label ?? '').trim().toLowerCase();
}

function customFieldLabel(field: ReportCustomFieldColumn): string {
  const label = field.label?.trim();
  return label || field.id || 'Custom field';
}

export type MergedPipelineCustomField = {
  label: string;
  dealField?: ReportCustomFieldColumn;
  leadField?: ReportCustomFieldColumn;
};

/** Inactive Opportunities columns — supports grouped stage-specific fields. */
export type MergedInactiveOpportunityCustomField = {
  label: string;
  reportColumnGroup?: string;
  dealFields: ReportCustomFieldColumn[];
  leadFields: ReportCustomFieldColumn[];
};

export function normalizeReportColumnGroup(
  value: string | null | undefined,
): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

function reportColumnGroupKey(field: ReportCustomFieldColumn): string {
  return normalizeReportColumnGroup(field.reportColumnGroup);
}

function titleCaseReportGroupLabel(groupKey: string): string {
  return groupKey
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inactiveReportColumnHeaderLabel(
  fields: ReportCustomFieldColumn[],
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
  return customFieldLabel(fields[0]!);
}

/**
 * Merge inactive/lost custom fields for the Inactive Opportunities table.
 * Fields sharing reportColumnGroup become one column; values are coalesced per row.
 */
export function mergeInactiveOpportunityCustomFields(
  dealFields: ReportCustomFieldColumn[] = [],
  leadFields: ReportCustomFieldColumn[] = [],
): MergedInactiveOpportunityCustomField[] {
  const byGroup = new Map<string, MergedInactiveOpportunityCustomField>();
  const groupOrder: string[] = [];
  const ungroupedDeals: ReportCustomFieldColumn[] = [];
  const ungroupedLeads: ReportCustomFieldColumn[] = [];

  for (const field of dealFields) {
    const key = reportColumnGroupKey(field);
    if (!key) {
      ungroupedDeals.push(field);
      continue;
    }
    if (!byGroup.has(key)) {
      byGroup.set(key, {
        label: '',
        reportColumnGroup: key,
        dealFields: [],
        leadFields: [],
      });
      groupOrder.push(key);
    }
    byGroup.get(key)!.dealFields.push(field);
  }

  for (const field of leadFields) {
    const key = reportColumnGroupKey(field);
    if (!key) {
      ungroupedLeads.push(field);
      continue;
    }
    if (!byGroup.has(key)) {
      byGroup.set(key, {
        label: '',
        reportColumnGroup: key,
        dealFields: [],
        leadFields: [],
      });
      groupOrder.push(key);
    }
    byGroup.get(key)!.leadFields.push(field);
  }

  for (const key of groupOrder) {
    const entry = byGroup.get(key)!;
    entry.label = inactiveReportColumnHeaderLabel([
      ...entry.dealFields,
      ...entry.leadFields,
    ]);
  }

  const grouped = groupOrder.map((key) => byGroup.get(key)!);
  const ungrouped = mergePipelineCustomFields(
    ungroupedDeals,
    ungroupedLeads,
  ).map((field) => ({
    label: field.label,
    dealFields: field.dealField ? [field.dealField] : [],
    leadFields: field.leadField ? [field.leadField] : [],
  }));

  return [...grouped, ...ungrouped];
}

export function coalesceInactiveCustomFieldValue(
  values: Record<string, string> | undefined,
  fieldIds: string[],
): string {
  if (!values || !fieldIds.length) return '';
  for (const fieldId of fieldIds) {
    const value = values[fieldId];
    if (value != null && String(value).trim() !== '') return value;
  }
  return '';
}

/**
 * Merge lead and deal custom fields that share the same display label into one
 * column. Deal fields are listed first; lead-only fields follow.
 */
export function dealInactiveLostStageIds(
  stages: Array<{ id: string; category?: string }>,
): string[] {
  return stages
    .filter(
      (stage) => stage.category === 'inactive' || stage.category === 'lost',
    )
    .map((stage) => stage.id)
    .filter(Boolean);
}

export function leadInactiveLostStageIds(
  stages: Array<{ id: string; category?: string }>,
): string[] {
  return stages
    .filter((stage) => stage.category === 'lost')
    .map((stage) => stage.id)
    .filter(Boolean);
}

function customFieldStageId(field: ReportCustomFieldColumn): string | null {
  const stageId =
    field.entityType === 'DEAL' ? field.dealStageId : field.leadStageId;
  return stageId?.trim() ? stageId : null;
}

function isInactiveLostStageCustomField(
  field: ReportCustomFieldColumn,
  dealInactiveLostStageIds: Set<string>,
  leadInactiveLostStageIds: Set<string>,
): boolean {
  const stageId = customFieldStageId(field);
  if (!stageId) return false;
  if (field.entityType === 'DEAL') {
    return dealInactiveLostStageIds.has(stageId);
  }
  return leadInactiveLostStageIds.has(stageId);
}

/** Fields configured only on inactive/lost stages — hidden from Total Pipeline. */
export function exclusiveInactiveLostFieldIds(input: {
  dealCustomFields?: ReportCustomFieldColumn[];
  leadCustomFields?: ReportCustomFieldColumn[];
  inactiveLostDealCustomFields?: ReportCustomFieldColumn[];
  inactiveLostLeadCustomFields?: ReportCustomFieldColumn[];
}): {
  dealFieldIds: Set<string>;
  leadFieldIds: Set<string>;
} {
  const pipelineDealIds = new Set(
    (input.dealCustomFields ?? []).map((field) => field.id),
  );
  const pipelineLeadIds = new Set(
    (input.leadCustomFields ?? []).map((field) => field.id),
  );
  const dealFieldIds = new Set<string>();
  const leadFieldIds = new Set<string>();

  for (const field of input.inactiveLostDealCustomFields ?? []) {
    if (!pipelineDealIds.has(field.id)) dealFieldIds.add(field.id);
  }
  for (const field of input.inactiveLostLeadCustomFields ?? []) {
    if (!pipelineLeadIds.has(field.id)) leadFieldIds.add(field.id);
  }

  return { dealFieldIds, leadFieldIds };
}

export function filterTotalPipelineCustomFields(input: {
  dealCustomFields?: ReportCustomFieldColumn[];
  leadCustomFields?: ReportCustomFieldColumn[];
  inactiveLostDealCustomFields?: ReportCustomFieldColumn[];
  inactiveLostLeadCustomFields?: ReportCustomFieldColumn[];
  dealInactiveLostStageIds?: string[];
  leadInactiveLostStageIds?: string[];
}): {
  dealCustomFields: ReportCustomFieldColumn[];
  leadCustomFields: ReportCustomFieldColumn[];
} {
  const dealInactiveLostStages = new Set(input.dealInactiveLostStageIds ?? []);
  const leadInactiveLostStages = new Set(input.leadInactiveLostStageIds ?? []);
  const hasStageSets =
    dealInactiveLostStages.size > 0 || leadInactiveLostStages.size > 0;

  if (hasStageSets) {
    const leadCustomFields = isLeadsEnabled()
      ? (input.leadCustomFields ?? []).filter(
          (field) =>
            !isInactiveLostStageCustomField(
              field,
              dealInactiveLostStages,
              leadInactiveLostStages,
            ),
        )
      : [];
    return {
      dealCustomFields: (input.dealCustomFields ?? []).filter(
        (field) =>
          !isInactiveLostStageCustomField(
            field,
            dealInactiveLostStages,
            leadInactiveLostStages,
          ),
      ),
      leadCustomFields,
    };
  }

  const exclusive = exclusiveInactiveLostFieldIds(input);
  const leadCustomFields = isLeadsEnabled()
    ? (input.leadCustomFields ?? []).filter(
        (field) => !exclusive.leadFieldIds.has(field.id),
      )
    : [];
  return {
    dealCustomFields: (input.dealCustomFields ?? []).filter(
      (field) => !exclusive.dealFieldIds.has(field.id),
    ),
    leadCustomFields,
  };
}

function dedupeCustomFieldColumns(
  fields: ReportCustomFieldColumn[],
): ReportCustomFieldColumn[] {
  const seen = new Set<string>();
  const result: ReportCustomFieldColumn[] = [];
  for (const field of fields) {
    if (seen.has(field.id)) continue;
    seen.add(field.id);
    result.push(field);
  }
  return result;
}

/** Open/won pipeline fields opted into the Inactive Opportunities table. */
function openPipelineFieldsForInactiveReport(
  pipelineFields: ReportCustomFieldColumn[] | undefined,
  dealInactiveLostStages: Set<string>,
  leadInactiveLostStages: Set<string>,
): ReportCustomFieldColumn[] {
  return (pipelineFields ?? []).filter((field) => {
    if (!field.showInInactiveReport) return false;
    return !isInactiveLostStageCustomField(
      field,
      dealInactiveLostStages,
      leadInactiveLostStages,
    );
  });
}

/**
 * Custom fields for the Inactive Opportunities table: inactive/lost-stage
 * fields plus open/won pipeline fields with showInInactiveReport enabled.
 */
export function inactiveLostOnlyCustomFields(input: {
  inactiveLostDealCustomFields?: ReportCustomFieldColumn[];
  inactiveLostLeadCustomFields?: ReportCustomFieldColumn[];
  dealInactiveLostStageIds?: string[];
  leadInactiveLostStageIds?: string[];
  dealCustomFields?: ReportCustomFieldColumn[];
  leadCustomFields?: ReportCustomFieldColumn[];
}): {
  dealCustomFields: ReportCustomFieldColumn[];
  leadCustomFields: ReportCustomFieldColumn[];
} {
  const dealInactiveLostStages = new Set(input.dealInactiveLostStageIds ?? []);
  const leadInactiveLostStages = new Set(input.leadInactiveLostStageIds ?? []);
  const hasStageSets =
    dealInactiveLostStages.size > 0 || leadInactiveLostStages.size > 0;

  let dealCustomFields: ReportCustomFieldColumn[];
  let leadCustomFields: ReportCustomFieldColumn[];

  if (hasStageSets) {
    dealCustomFields = (input.inactiveLostDealCustomFields ?? []).filter(
      (field) =>
        isInactiveLostStageCustomField(
          field,
          dealInactiveLostStages,
          leadInactiveLostStages,
        ),
    );
    leadCustomFields = isLeadsEnabled()
      ? (input.inactiveLostLeadCustomFields ?? []).filter((field) =>
          isInactiveLostStageCustomField(
            field,
            dealInactiveLostStages,
            leadInactiveLostStages,
          ),
        )
      : [];
  } else {
    const exclusive = exclusiveInactiveLostFieldIds(input);
    dealCustomFields = (input.inactiveLostDealCustomFields ?? []).filter(
      (field) => exclusive.dealFieldIds.has(field.id),
    );
    leadCustomFields = isLeadsEnabled()
      ? (input.inactiveLostLeadCustomFields ?? []).filter((field) =>
          exclusive.leadFieldIds.has(field.id),
        )
      : [];
  }

  return {
    dealCustomFields: dedupeCustomFieldColumns([
      ...dealCustomFields,
      ...openPipelineFieldsForInactiveReport(
        input.dealCustomFields,
        dealInactiveLostStages,
        leadInactiveLostStages,
      ),
    ]),
    leadCustomFields: dedupeCustomFieldColumns([
      ...leadCustomFields,
      ...(isLeadsEnabled()
        ? openPipelineFieldsForInactiveReport(
            input.leadCustomFields,
            dealInactiveLostStages,
            leadInactiveLostStages,
          )
        : []),
    ]),
  };
}

export function primaryAssignmentRoles(
  roles: ReportAssignmentRoleColumn[] = [],
): ReportAssignmentRoleColumn[] {
  return roles.filter((role) => Boolean(role.id) && role.isPrimary);
}

export function mergePipelineCustomFields(
  dealFields: ReportCustomFieldColumn[] = [],
  leadFields: ReportCustomFieldColumn[] = [],
): MergedPipelineCustomField[] {
  const byKey = new Map<string, MergedPipelineCustomField>();
  const order: string[] = [];

  const ensure = (key: string, label: string): MergedPipelineCustomField => {
    let entry = byKey.get(key);
    if (!entry) {
      entry = { label: label.trim() || label };
      byKey.set(key, entry);
      order.push(key);
    }
    return entry;
  };

  for (const field of dealFields) {
    const label = customFieldLabel(field);
    const key = normalizeCustomFieldLabel(label);
    if (!key) continue;
    const entry = ensure(key, label);
    entry.dealField = field;
    entry.label = label;
  }

  for (const field of leadFields) {
    const label = customFieldLabel(field);
    const key = normalizeCustomFieldLabel(label);
    if (!key) continue;
    const entry = ensure(key, label);
    entry.leadField = field;
    if (!entry.dealField) entry.label = label;
  }

  return order.map((key) => byKey.get(key)!);
}

/** Stable column id for a merged or entity-specific pipeline custom field. */
export function pipelineCustomColumnId(
  merged: MergedPipelineCustomField,
): string {
  if (merged.dealField && merged.leadField) {
    return `total_pipeline.custom:${normalizeCustomFieldLabel(merged.label)}`;
  }
  if (merged.dealField) return dealCustomColumnId(merged.dealField.id);
  if (merged.leadField) return leadCustomColumnId(merged.leadField.id);
  return `total_pipeline.custom:${normalizeCustomFieldLabel(merged.label) || 'unknown'}`;
}

/** Map legacy deal/lead custom column ids to merged ids when labels match. */
export function resolvePipelineCustomColumnId(
  id: string,
  mergedFields: MergedPipelineCustomField[],
): string {
  if (id.startsWith('total_pipeline.custom:')) return id;

  if (id.startsWith('total_pipeline.deal_custom:')) {
    const fieldId = id.slice('total_pipeline.deal_custom:'.length);
    const merged = mergedFields.find(
      (field) => field.dealField?.id === fieldId,
    );
    if (merged) return pipelineCustomColumnId(merged);
  }
  if (id.startsWith('total_pipeline.lead_custom:')) {
    const fieldId = id.slice('total_pipeline.lead_custom:'.length);
    const merged = mergedFields.find(
      (field) => field.leadField?.id === fieldId,
    );
    if (merged) return pipelineCustomColumnId(merged);
  }
  return id;
}

export function inactiveDealCustomColumnId(fieldId: string): string {
  return `inactive_opportunities.deal_custom:${fieldId}`;
}

export function inactiveLeadCustomColumnId(fieldId: string): string {
  return `inactive_opportunities.lead_custom:${fieldId}`;
}

export function inactiveOpportunityCustomColumnId(
  merged: MergedInactiveOpportunityCustomField,
): string {
  if (merged.reportColumnGroup) {
    return `inactive_opportunities.group:${merged.reportColumnGroup}`;
  }
  if (merged.dealFields.length === 1 && merged.leadFields.length === 1) {
    return `inactive_opportunities.custom:${normalizeCustomFieldLabel(merged.label)}`;
  }
  if (merged.dealFields.length === 1 && !merged.leadFields.length) {
    return inactiveDealCustomColumnId(merged.dealFields[0]!.id);
  }
  if (merged.leadFields.length === 1 && !merged.dealFields.length) {
    return inactiveLeadCustomColumnId(merged.leadFields[0]!.id);
  }
  return `inactive_opportunities.custom:${normalizeCustomFieldLabel(merged.label) || 'unknown'}`;
}

export function resolveInactiveOpportunityCustomColumnId(
  id: string,
  mergedFields: MergedInactiveOpportunityCustomField[],
): string {
  if (
    id.startsWith('inactive_opportunities.custom:') ||
    id.startsWith('inactive_opportunities.group:')
  ) {
    return id;
  }

  let fieldId: string | null = null;
  if (id.startsWith('inactive_opportunities.deal_custom:')) {
    fieldId = id.slice('inactive_opportunities.deal_custom:'.length);
  } else if (id.startsWith('inactive_opportunities.lead_custom:')) {
    fieldId = id.slice('inactive_opportunities.lead_custom:'.length);
  }
  if (fieldId) {
    const merged = mergedFields.find(
      (field) =>
        field.dealFields.some((dealField) => dealField.id === fieldId) ||
        field.leadFields.some((leadField) => leadField.id === fieldId),
    );
    if (merged) return inactiveOpportunityCustomColumnId(merged);
  }
  return id;
}

export function inactiveAssignmentRoleColumnId(roleId: string): string {
  return `inactive_opportunities.role:${roleId}`;
}

export function assignmentRoleColumnId(roleId: string): string {
  return `total_pipeline.role:${roleId}`;
}

/** @deprecated Solution roles use the same column id as assignment roles. */
export function solutionRoleColumnId(roleId: string): string {
  return assignmentRoleColumnId(roleId);
}

export type ReportAssignmentRoleColumn = {
  id: string;
  label: string;
  isPrimary?: boolean;
  countsTowardTargetAchievement?: boolean;
  displayOrder?: number;
  usageContext?: 'ENTITY' | 'SOLUTION';
};

export function buildAvailableReportColumns(input?: {
  dealCustomFields?: ReportCustomFieldColumn[];
  leadCustomFields?: ReportCustomFieldColumn[];
  inactiveLostDealCustomFields?: ReportCustomFieldColumn[];
  inactiveLostLeadCustomFields?: ReportCustomFieldColumn[];
  dealInactiveLostStageIds?: string[];
  leadInactiveLostStageIds?: string[];
  assignmentRoles?: ReportAssignmentRoleColumn[];
}): ReportColumnDef[] {
  const assignmentRoles = [...(input?.assignmentRoles ?? [])]
    .filter((role) => Boolean(role.id))
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        (a.label ?? '').localeCompare(b.label ?? ''),
    )
    .map((role) => ({
      id: assignmentRoleColumnId(role.id),
      groupId: 'total_pipeline' as const,
      label: role.label?.trim() || 'Unnamed role',
    }));
  const totalPipelineCustom = filterTotalPipelineCustomFields({
    dealCustomFields: input?.dealCustomFields,
    leadCustomFields: input?.leadCustomFields,
    inactiveLostDealCustomFields: input?.inactiveLostDealCustomFields,
    inactiveLostLeadCustomFields: input?.inactiveLostLeadCustomFields,
    dealInactiveLostStageIds: input?.dealInactiveLostStageIds,
    leadInactiveLostStageIds: input?.leadInactiveLostStageIds,
  });
  const inactiveOpportunityCustom = inactiveLostOnlyCustomFields({
    inactiveLostDealCustomFields: input?.inactiveLostDealCustomFields,
    inactiveLostLeadCustomFields: input?.inactiveLostLeadCustomFields,
    dealInactiveLostStageIds: input?.dealInactiveLostStageIds,
    leadInactiveLostStageIds: input?.leadInactiveLostStageIds,
    dealCustomFields: input?.dealCustomFields,
    leadCustomFields: input?.leadCustomFields,
  });
  const mergedCustom = mergePipelineCustomFields(
    totalPipelineCustom.dealCustomFields,
    totalPipelineCustom.leadCustomFields,
  ).map((field) => ({
    id: pipelineCustomColumnId(field),
    groupId: 'total_pipeline' as const,
    label: field.label,
  }));
  const inactiveMergedCustom = mergeInactiveOpportunityCustomFields(
    inactiveOpportunityCustom.dealCustomFields,
    inactiveOpportunityCustom.leadCustomFields,
  ).map((field) => ({
    id: inactiveOpportunityCustomColumnId(field),
    groupId: 'inactive_opportunities' as const,
    label: field.label,
  }));
  const inactiveAssignmentRoles = primaryAssignmentRoles(input?.assignmentRoles)
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        (a.label ?? '').localeCompare(b.label ?? ''),
    )
    .map((role) => ({
      id: inactiveAssignmentRoleColumnId(role.id),
      groupId: 'inactive_opportunities' as const,
      label: role.label?.trim() || 'Unnamed role',
    }));
  // Total Pipeline: custom fields after DR status, engagement columns, then roles.
  // Inactive Opportunities: custom fields and roles after Solution.
  const base = [...BASE_REPORT_COLUMNS];
  const drStatusIdx = base.findIndex(
    (col) => col.id === 'total_pipeline.dr_status',
  );
  const afterDynamicIdx = base.findIndex(
    (col) => col.id === 'total_pipeline.fiscal_year',
  );
  const customInsertAt = drStatusIdx >= 0 ? drStatusIdx + 1 : base.length;
  const engagementEndAt = afterDynamicIdx >= 0 ? afterDynamicIdx : base.length;
  const withRoles = [
    ...base.slice(0, customInsertAt),
    ...mergedCustom,
    ...base.slice(customInsertAt, engagementEndAt),
    ...assignmentRoles,
    ...(afterDynamicIdx >= 0 ? base.slice(afterDynamicIdx) : []),
  ];

  const inactiveProductFamilyIdx =
    INACTIVE_OPPORTUNITIES_BASE_COLUMNS.findIndex(
      (col) => col.id === 'inactive_opportunities.product_family',
    );
  const inactiveInsertAt =
    inactiveProductFamilyIdx >= 0
      ? inactiveProductFamilyIdx + 1
      : INACTIVE_OPPORTUNITIES_BASE_COLUMNS.length;
  const inactiveWithRoles = [
    ...INACTIVE_OPPORTUNITIES_BASE_COLUMNS.slice(0, inactiveInsertAt),
    ...inactiveMergedCustom,
    ...inactiveAssignmentRoles,
    ...INACTIVE_OPPORTUNITIES_BASE_COLUMNS.slice(inactiveInsertAt),
  ];

  return [...withRoles, ...inactiveWithRoles];
}

/**
 * Switch PDF to landscape when any table has more columns than this.
 * Portrait A4 stays comfortable around this density.
 */
export const PDF_LANDSCAPE_COLUMN_THRESHOLD = 8;

/** @deprecated Use PDF_LANDSCAPE_COLUMN_THRESHOLD — kept for width-scaling helpers. */
export const PDF_MAX_TABLE_COLUMNS = PDF_LANDSCAPE_COLUMN_THRESHOLD;

/**
 * First visit → Total Pipeline table only (all columns in that group).
 * Returning users → keep saved selection **and order**; only brand-new
 * columns default on (appended).
 */
export function resolveSelectedColumnIds(
  available: ReportColumnDef[],
  stored: string[] | null | undefined,
  knownColumnIds?: string[] | null,
  customFieldMigration?: {
    dealCustomFields?: ReportCustomFieldColumn[];
    leadCustomFields?: ReportCustomFieldColumn[];
  },
): string[] {
  const availableIds = available.map((column) => column.id);
  const availableSet = new Set(availableIds);
  const totalPipelineOrder = availableIds.filter((id) =>
    id.startsWith('total_pipeline.'),
  );

  if (!stored) {
    return normalizeTotalPipelineReportColumnOrder(
      totalPipelineOrder,
      totalPipelineOrder,
    );
  }

  const mergedFields = customFieldMigration
    ? mergePipelineCustomFields(
        customFieldMigration.dealCustomFields,
        customFieldMigration.leadCustomFields,
      )
    : [];
  const migrateId = (raw: string) => {
    if (typeof raw !== 'string') return '';
    return customFieldMigration
      ? resolvePipelineCustomColumnId(raw, mergedFields)
      : raw;
  };

  const known = new Set(
    (knownColumnIds ?? stored).map((id) => migrateId(id)).filter(Boolean),
  );
  // Preserve the user's saved order for columns that still exist.
  const next: string[] = [];
  const selected = new Set<string>();
  for (const rawId of stored) {
    const id = migrateId(rawId);
    if (!id) continue;
    if (!availableSet.has(id) || selected.has(id)) continue;
    next.push(id);
    selected.add(id);
  }

  const withNewColumns = insertNewColumnsInAvailableOrder(
    next,
    availableIds,
    known,
  );
  const didInsertNewColumns = withNewColumns.length !== next.length;
  const shouldNormalizeTotalPipeline =
    didInsertNewColumns || !knownColumnIds?.length;

  if (!shouldNormalizeTotalPipeline) {
    return withNewColumns;
  }

  return normalizeTotalPipelineReportColumnOrder(
    withNewColumns,
    totalPipelineOrder,
  );
}

/** Selected column ids that belong to a report table group, in selection order. */
export function selectedIdsForGroup(
  selectedIds: string[],
  groupId: ReportColumnGroupId,
  columns: ReportColumnDef[],
): string[] {
  const groupIds = new Set(
    columns.filter((column) => column.groupId === groupId).map((c) => c.id),
  );
  return selectedIds.filter((id) => groupIds.has(id));
}

/**
 * Reorder selected columns within one group; other groups keep relative positions.
 */
export function reorderSelectedIdsInGroup(
  selectedIds: string[],
  groupColumnIds: string[],
  activeId: string,
  overId: string,
): string[] {
  const groupSet = new Set(groupColumnIds);
  const groupSelected = selectedIds.filter((id) => groupSet.has(id));
  const oldIndex = groupSelected.indexOf(activeId);
  const newIndex = groupSelected.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return selectedIds;
  }
  const reordered = [...groupSelected];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved!);

  let cursor = 0;
  return selectedIds.map((id) =>
    groupSet.has(id) ? reordered[cursor++]! : id,
  );
}

export function isColumnSelected(
  selectedIds: string[] | Set<string>,
  columnId: string,
): boolean {
  if (selectedIds instanceof Set) return selectedIds.has(columnId);
  return selectedIds.includes(columnId);
}

export type TableColumnSpec<T> = {
  id: string;
  header: string;
  width?: number;
  cell: (row: T) => string | number;
  stageColor?: (row: T) => string | undefined;
};

/**
 * Keep only selected columns, ordered by `selectedIds` (drag order).
 * Unselected columns are omitted — nothing is force-included.
 */
export function filterTableColumns<T>(
  columns: TableColumnSpec<T>[],
  selectedIds: string[] | Set<string>,
): TableColumnSpec<T>[] {
  const byId = new Map(columns.map((column) => [column.id, column]));

  if (Array.isArray(selectedIds)) {
    const ordered: TableColumnSpec<T>[] = [];
    for (const id of selectedIds) {
      const column = byId.get(id);
      if (column) ordered.push(column);
    }
    return ordered;
  }

  return columns.filter((column) => selectedIds.has(column.id));
}

/**
 * Project selected columns into table headers/rows.
 * When maxColumns is set (PDF), keep only the first N fully — never partial columns.
 * When fitWidth is set, distribute widths evenly across the page (flexible, not fixed).
 */
export function projectTableColumns<T>(
  columns: TableColumnSpec<T>[],
  selectedIds: string[] | Set<string>,
  rows: T[],
  options?: {
    stageColumnId?: string;
    stageColBase?: 0 | 1;
    maxColumns?: number;
    fitWidth?: number;
  },
): {
  headers: string[];
  widths: number[];
  data: Array<Array<string | number>>;
  stageCol?: number;
  stageColors?: Array<string | null | undefined>;
  truncated: boolean;
} {
  let filtered = filterTableColumns(columns, selectedIds);
  const max = options?.maxColumns;
  const truncated = Boolean(max && filtered.length > max);
  if (max && filtered.length > max) {
    filtered = filtered.slice(0, max);
  }

  const headers = filtered.map((column) => column.header);
  const count = Math.max(filtered.length, 1);
  const widths =
    options?.fitWidth != null
      ? filtered.map(() => options.fitWidth! / count)
      : filtered.map((column) => column.width ?? 60);
  const data = rows.map((row) => filtered.map((column) => column.cell(row)));

  let stageCol: number | undefined;
  let stageColors: Array<string | null | undefined> | undefined;
  if (options?.stageColumnId) {
    const index = filtered.findIndex(
      (column) => column.id === options.stageColumnId,
    );
    if (index >= 0) {
      const base = options.stageColBase ?? 0;
      stageCol = index + base;
      stageColors = rows.map((row) => filtered[index]!.stageColor?.(row));
    }
  }

  return { headers, widths, data, stageCol, stageColors, truncated };
}
