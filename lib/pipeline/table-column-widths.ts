import type { PipelineListColumnId } from './list-columns';

export type PipelineTableWidthStoreId = 'leads' | 'deals' | 'opportunities';

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 220,
  customer: 168,
  contact: 148,
  stage: 132,
  value: 112,
  expectedClose: 140,
  responsible: 156,
  observers: 156,
  products: 168,
  source: 128,
  createdAt: 128,
  type: 88,
  age: 120,
  days_in_current_stage: 120,
  last_activity_date: 140,
};

const CUSTOM_FIELD_DEFAULT_WIDTH = 148;
const MIN_COLUMN_WIDTH = 72;
const MAX_COLUMN_WIDTH = 640;

function storageKey(entity: PipelineTableWidthStoreId): string {
  return `pipeline-table-column-widths:${entity}`;
}

export function getDefaultColumnWidth(columnId: PipelineListColumnId): number {
  if (columnId.startsWith('custom:') || columnId.startsWith('custom-group:')) {
    return CUSTOM_FIELD_DEFAULT_WIDTH;
  }
  return DEFAULT_WIDTHS[columnId] ?? CUSTOM_FIELD_DEFAULT_WIDTH;
}

export function clampColumnWidth(width: number): number {
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width));
}

export function loadPipelineTableColumnWidths(
  entity: PipelineTableWidthStoreId,
): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(entity));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[key] = clampColumnWidth(value);
      }
    }
    return result;
  } catch {
    return null;
  }
}

export function savePipelineTableColumnWidths(
  entity: PipelineTableWidthStoreId,
  widths: Record<string, number>,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(entity), JSON.stringify(widths));
  } catch {
    // Ignore quota / private mode failures
  }
}

export function resolveColumnWidths(
  columnIds: PipelineListColumnId[],
  stored: Record<string, number> | null | undefined,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of columnIds) {
    const saved = stored?.[id];
    result[id] =
      typeof saved === 'number' && Number.isFinite(saved)
        ? clampColumnWidth(saved)
        : getDefaultColumnWidth(id);
  }
  return result;
}

export function sumColumnWidths(
  columnIds: PipelineListColumnId[],
  widths: Record<string, number>,
  extraWidth = 40,
): number {
  const columnsTotal = columnIds.reduce(
    (sum, id) => sum + (widths[id] ?? getDefaultColumnWidth(id)),
    0,
  );
  return columnsTotal + extraWidth;
}

export { MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH };
