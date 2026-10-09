import {
  canViewFieldGroup,
  type PipelineFieldEntity,
  type PipelineFieldGroup,
} from '@/lib/pipeline/field-access';
import type { ReportColumnDef } from './columns';

const CORE_COLUMN_IDS = new Set([
  'total_pipeline.stage',
  'total_pipeline.type',
  'total_pipeline.name',
  'total_pipeline.fiscal_year',
  'total_pipeline.quarter',
  'total_pipeline.quarter_closed',
  'inactive_opportunities.stage',
  'inactive_opportunities.previous_stage',
  'inactive_opportunities.type',
  'inactive_opportunities.name',
]);

const CUSTOMER_COLUMN_IDS = new Set([
  'total_pipeline.customer',
  'total_pipeline.contact',
  'total_pipeline.contact_position',
  'total_pipeline.contact_email',
  'total_pipeline.contact_phone',
  'inactive_opportunities.customer',
]);

const VALUE_COLUMN_IDS = new Set([
  'total_pipeline.value',
  'total_pipeline.currency',
  'inactive_opportunities.value',
  'inactive_opportunities.currency',
]);

const SOLUTIONS_COLUMN_IDS = new Set([
  'total_pipeline.product_family',
  'total_pipeline.vendor',
  'total_pipeline.dr_status',
  'inactive_opportunities.product_family',
]);

function columnFieldGroup(columnId: string): PipelineFieldGroup | null {
  if (columnId.startsWith('total_pipeline.role:')) return 'assignment';
  if (columnId.startsWith('total_pipeline.solution_role:')) return 'assignment';
  if (columnId.startsWith('inactive_opportunities.role:')) return 'assignment';
  if (columnId.startsWith('inactive_opportunities.solution_role:')) {
    return 'assignment';
  }
  if (
    columnId.startsWith('total_pipeline.custom:') ||
    columnId.startsWith('total_pipeline.deal_custom:') ||
    columnId.startsWith('total_pipeline.lead_custom:') ||
    columnId.startsWith('inactive_opportunities.custom:') ||
    columnId.startsWith('inactive_opportunities.group:') ||
    columnId.startsWith('inactive_opportunities.deal_custom:') ||
    columnId.startsWith('inactive_opportunities.lead_custom:')
  ) {
    return 'customFields';
  }
  if (CORE_COLUMN_IDS.has(columnId)) return 'core';
  if (CUSTOMER_COLUMN_IDS.has(columnId)) return 'customer';
  if (VALUE_COLUMN_IDS.has(columnId)) return 'value';
  if (SOLUTIONS_COLUMN_IDS.has(columnId)) return 'solutions';
  return null;
}

function entityForPipelineColumn(columnId: string): PipelineFieldEntity | null {
  if (columnId.startsWith('total_pipeline.')) return 'DEAL';
  if (columnId.startsWith('inactive_opportunities.')) return 'DEAL';
  return null;
}

export function canViewReportColumn(
  granted: Set<string>,
  columnId: string,
): boolean {
  const group = columnFieldGroup(columnId);
  if (!group) return true;
  const entity = entityForPipelineColumn(columnId);
  if (!entity) return canViewFieldGroup(granted, 'DEAL', group);
  return canViewFieldGroup(granted, entity, group);
}

export function filterReportColumnsByAccess(
  columns: ReportColumnDef[],
  granted: Set<string>,
): ReportColumnDef[] {
  return columns.filter((column) => canViewReportColumn(granted, column.id));
}

export function filterReportColumnIdsByAccess(
  columnIds: string[],
  granted: Set<string>,
): string[] {
  return columnIds.filter((id) => canViewReportColumn(granted, id));
}
