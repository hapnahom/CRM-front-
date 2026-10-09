import { FILTER_FIELDS } from './definitions';
import type { FilterFieldId, FilterOption, ReportBuilderState } from './types';

export type LiveFilterOptionsMap = Partial<
  Record<FilterFieldId, FilterOption[]>
>;

/** Resolve a filter value id to a display label (prefer live API options). */
export function getFilterOptionLabel(
  fieldId: FilterFieldId | string,
  id: string,
  liveOptions?: LiveFilterOptionsMap | null,
): string {
  const live = liveOptions?.[fieldId as FilterFieldId];
  const fromLive = live?.find((o) => o.id === id)?.label;
  if (fromLive) return fromLive;

  const fromStatic = FILTER_FIELDS[fieldId]?.options?.find(
    (o) => o.id === id,
  )?.label;
  return fromStatic ?? id;
}

export function formatMultiFilterLabels(
  state: ReportBuilderState,
  fieldId: FilterFieldId,
  liveOptions?: LiveFilterOptionsMap | null,
): string | null {
  const ids = state.criteria.multi[fieldId] ?? [];
  if (!ids.length) return null;
  return ids
    .map((id) => getFilterOptionLabel(fieldId, id, liveOptions))
    .join(', ');
}

/** Human-readable filter tags for summary / generated report overview. */
export function buildCriteriaFilterTags(
  state: ReportBuilderState,
  periodLabel: string,
  liveOptions?: LiveFilterOptionsMap | null,
  options?: { scopeLabel?: string; salesReport?: boolean },
): string[] {
  const tags: string[] = [];
  if (options?.scopeLabel) tags.push(`Scope: ${options.scopeLabel}`);
  if (periodLabel) tags.push(`Period: ${periodLabel}`);

  const salesFields: FilterFieldId[] = [
    'currency',
    'department',
    'team',
    'owner',
    'customer',
    'solution',
    'vector',
    'dealStage',
    'dealStatus',
    'probability',
    'vendor',
    'implementationPartner',
    'status',
  ];

  const isSales =
    options?.salesReport ??
    (state.categories.length === 1 && state.categories[0] === 'sales');
  const fieldIds = isSales
    ? salesFields
    : ([
        'currency',
        ...(Object.keys(state.criteria.multi) as FilterFieldId[]),
      ].filter((id, i, arr) => arr.indexOf(id) === i) as FilterFieldId[]);

  for (const fieldId of fieldIds) {
    const ids = state.criteria.multi[fieldId] ?? [];
    const fieldLabel = FILTER_FIELDS[fieldId]?.label ?? fieldId;
    if (!ids.length) {
      if (isSales && fieldId === 'team') tags.push('Teams: All teams');
      else if (fieldId === 'currency') tags.push('Currency: All currencies');
      continue;
    }
    const values = ids
      .map((id) => getFilterOptionLabel(fieldId, id, liveOptions))
      .join(', ');
    tags.push(`${fieldLabel}: ${values}`);
  }

  return tags;
}
