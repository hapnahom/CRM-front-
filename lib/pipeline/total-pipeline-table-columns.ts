/**
 * Canonical Total Pipeline table column order — shared by sales reports (Excel/PDF),
 * the report modal, and the Sales Hub pipeline tab.
 *
 * Dynamic custom fields and assignment roles are inserted after DR Status.
 * Report exports also include engagement columns after custom fields.
 */

import { opportunityNameColumnLabel } from '@/config/salesWorkflow';
import type { PipelineListColumnId } from './list-columns';

/** Built-in columns before custom fields + assignment roles. */
export const TOTAL_PIPELINE_BUILTINS_BEFORE_DYNAMIC = [
  'customer',
  'name',
  'type',
  'stage',
  'value',
  'currency',
  'solution',
  'vendor',
  'dr_status',
] as const;

/** Built-in columns after custom fields, before assignment roles. */
export const TOTAL_PIPELINE_BUILTINS_AFTER_CUSTOM = [
  'days_in_current_stage',
  'last_activity_date',
] as const;

/** Built-in columns after custom fields + assignment roles. */
export const TOTAL_PIPELINE_BUILTINS_AFTER_DYNAMIC = [
  'fiscal_year',
  'quarter',
  'quarter_closed',
  'contact',
  'contact_position',
  'contact_email',
  'contact_phone',
] as const;

/** Full built-in order for the Sales Hub pipeline list and report defaults. */
export const TOTAL_PIPELINE_BUILTIN_COLUMN_ORDER = [
  ...TOTAL_PIPELINE_BUILTINS_BEFORE_DYNAMIC,
  ...TOTAL_PIPELINE_BUILTINS_AFTER_CUSTOM,
  ...TOTAL_PIPELINE_BUILTINS_AFTER_DYNAMIC,
] as const;

/** Report-only built-ins inserted after custom fields (before assignment roles). */
export type TotalPipelineReportOnlyBuiltInColumnId =
  (typeof TOTAL_PIPELINE_BUILTINS_AFTER_CUSTOM)[number];

export type TotalPipelineBuiltInColumnId =
  | (typeof TOTAL_PIPELINE_BUILTIN_COLUMN_ORDER)[number]
  | TotalPipelineReportOnlyBuiltInColumnId;

/** Default selected columns for the opportunities / total pipeline table. */
export const DEFAULT_TOTAL_PIPELINE_TABLE_COLUMNS: PipelineListColumnId[] = [
  ...TOTAL_PIPELINE_BUILTIN_COLUMN_ORDER,
];

/** Human-readable labels aligned with report Total Pipeline columns. */
export const TOTAL_PIPELINE_COLUMN_LABELS: Record<
  TotalPipelineBuiltInColumnId,
  string
> = {
  customer: 'Client name',
  name: opportunityNameColumnLabel(),
  type: 'Type',
  stage: 'Stage',
  value: 'Estimated Value',
  currency: 'Currency',
  solution: 'Solution',
  vendor: 'Vendor',
  dr_status: 'DR Status',
  days_in_current_stage: 'Days in Current Stage',
  last_activity_date: 'Last Activity Date',
  fiscal_year: 'FY',
  quarter: 'Opportunity Originated',
  quarter_closed: 'Current Reporting',
  contact: 'Client Contact',
  contact_position: 'Client Contact Position',
  contact_email: 'Client Contact Email',
  contact_phone: 'Client Contact Phone',
};

/** Map list-table built-in ids to report column ids. */
export const TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID: Record<
  TotalPipelineBuiltInColumnId,
  string
> = {
  customer: 'total_pipeline.customer',
  name: 'total_pipeline.name',
  type: 'total_pipeline.type',
  stage: 'total_pipeline.stage',
  value: 'total_pipeline.value',
  currency: 'total_pipeline.currency',
  solution: 'total_pipeline.product_family',
  vendor: 'total_pipeline.vendor',
  dr_status: 'total_pipeline.dr_status',
  days_in_current_stage: 'total_pipeline.days_in_current_stage',
  last_activity_date: 'total_pipeline.last_activity_date',
  fiscal_year: 'total_pipeline.fiscal_year',
  quarter: 'total_pipeline.quarter',
  quarter_closed: 'total_pipeline.quarter_closed',
  contact: 'total_pipeline.contact',
  contact_position: 'total_pipeline.contact_position',
  contact_email: 'total_pipeline.contact_email',
  contact_phone: 'total_pipeline.contact_phone',
};

export const TOTAL_PIPELINE_REPORT_BUILTIN_BEFORE_DYNAMIC =
  TOTAL_PIPELINE_BUILTINS_BEFORE_DYNAMIC.map(
    (id) => TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID[id],
  );

export const TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_CUSTOM =
  TOTAL_PIPELINE_BUILTINS_AFTER_CUSTOM.map(
    (id) => TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID[id],
  );

export const TOTAL_PIPELINE_REPORT_BUILTIN_AFTER_DYNAMIC =
  TOTAL_PIPELINE_BUILTINS_AFTER_DYNAMIC.map(
    (id) => TOTAL_PIPELINE_BUILTIN_TO_REPORT_ID[id],
  );

export function isTotalPipelineReportColumnId(id: string): boolean {
  return id.startsWith('total_pipeline.');
}

/**
 * Consolidate selected Total Pipeline columns into one block and order them
 * according to the canonical definition (built-ins → custom → roles → rest).
 */
export function normalizeTotalPipelineReportColumnOrder(
  selectedIds: string[],
  canonicalOrder: string[],
): string[] {
  const orderSet = new Set(canonicalOrder);
  const orderedTp = canonicalOrder.filter((id) => selectedIds.includes(id));
  if (!orderedTp.length) return selectedIds;

  const withoutTp = selectedIds.filter((id) => !orderSet.has(id));
  const firstTpIndex = selectedIds.findIndex((id) => orderSet.has(id));
  if (firstTpIndex < 0) return selectedIds;

  return [
    ...withoutTp.slice(0, firstTpIndex),
    ...orderedTp,
    ...withoutTp.slice(firstTpIndex),
  ];
}

/**
 * Insert newly available columns after their preceding sibling in `availableOrder`
 * instead of appending them at the end of the full selection.
 */
export function insertNewColumnsInAvailableOrder(
  selected: string[],
  availableOrder: string[],
  known: Set<string>,
): string[] {
  const next = [...selected];
  const selectedSet = new Set(next);

  for (const id of availableOrder) {
    if (selectedSet.has(id) || known.has(id)) continue;

    const availIndex = availableOrder.indexOf(id);
    let insertAt = next.length;
    for (let index = availIndex - 1; index >= 0; index -= 1) {
      const previousId = availableOrder[index];
      const previousIndex = next.indexOf(previousId ?? '');
      if (previousIndex >= 0) {
        insertAt = previousIndex + 1;
        break;
      }
    }

    next.splice(insertAt, 0, id);
    selectedSet.add(id);
  }

  return next;
}
