import { EMPTY_REPORT_FILTERS, type ReportFilters } from './types';

const STORAGE_PREFIX = 'pipeline-report-prefs';
/** Bump when stored column ids are no longer compatible — resets column selection. */
const PREFS_VERSION = 9;

export type ReportExportFormat = 'pdf' | 'xlsx';
export type PipelineRowColorMode = 'full' | 'indicator';

export const DEFAULT_PIPELINE_ROW_COLOR_MODE: PipelineRowColorMode = 'full';

export type PipelineReportPreferences = {
  version: number;
  exportFormat: ReportExportFormat;
  filters: ReportFilters;
  /** null = first-time user → Total Pipeline columns only */
  selectedColumnIds: string[] | null;
  /** Column ids known when prefs were last saved (for detecting new custom fields). */
  knownColumnIds: string[] | null;
  /** Total Pipeline stage coloring style for PDF and Excel exports. */
  pipelineRowColorMode: PipelineRowColorMode;
};

function storageKey(tenantId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${tenantId}:${userId}`;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function parseFilters(raw: unknown): ReportFilters {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_REPORT_FILTERS };
  const value = raw as Partial<ReportFilters>;
  return {
    ownerIds: isStringArray(value.ownerIds) ? value.ownerIds : [],
    teamIds: isStringArray(value.teamIds) ? value.teamIds : [],
    dealStageIds: [],
    productFamilyIds: isStringArray(value.productFamilyIds)
      ? value.productFamilyIds
      : [],
    productIds: isStringArray(value.productIds) ? value.productIds : [],
    vectorIds: isStringArray(value.vectorIds) ? value.vectorIds : [],
    currencies: [],
  };
}

function parseColorMode(raw: unknown): PipelineRowColorMode {
  if (raw === 'indicator') return 'indicator';
  return DEFAULT_PIPELINE_ROW_COLOR_MODE;
}

export function loadReportPreferences(
  tenantId: string,
  userId: string,
): PipelineReportPreferences | null {
  if (typeof window === 'undefined' || !tenantId || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PipelineReportPreferences>;
    const storedVersion =
      typeof parsed.version === 'number' ? parsed.version : 0;
    const exportFormat =
      parsed.exportFormat === 'xlsx' || parsed.exportFormat === 'pdf'
        ? parsed.exportFormat
        : null;
    if (!exportFormat) return null;

    // v9: legacy column-id maps removed — reset column prefs once, keep other settings.
    const resetColumnPrefs = storedVersion < PREFS_VERSION;

    return {
      version: PREFS_VERSION,
      knownColumnIds: resetColumnPrefs
        ? null
        : isStringArray(parsed.knownColumnIds)
          ? parsed.knownColumnIds
          : null,
      exportFormat,
      filters: parseFilters(parsed.filters),
      selectedColumnIds: resetColumnPrefs
        ? null
        : isStringArray(parsed.selectedColumnIds)
          ? parsed.selectedColumnIds
          : null,
      pipelineRowColorMode: parseColorMode(parsed.pipelineRowColorMode),
    };
  } catch {
    return null;
  }
}

export function saveReportPreferences(
  tenantId: string,
  userId: string,
  prefs: Omit<PipelineReportPreferences, 'version'>,
): void {
  if (typeof window === 'undefined' || !tenantId || !userId) return;
  try {
    const payload: PipelineReportPreferences = {
      version: PREFS_VERSION,
      ...prefs,
      filters: {
        ...prefs.filters,
        ownerIds: [],
        teamIds: [],
        productFamilyIds: [],
        productIds: [],
        vectorIds: [],
        dealStageIds: [],
        currencies: [],
      },
      selectedColumnIds: prefs.selectedColumnIds,
      knownColumnIds: prefs.knownColumnIds,
      pipelineRowColorMode:
        prefs.pipelineRowColorMode ?? DEFAULT_PIPELINE_ROW_COLOR_MODE,
    };
    window.localStorage.setItem(
      storageKey(tenantId, userId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function pruneIds(ids: string[], allowed: Set<string>): string[] {
  return ids.filter((id) => allowed.has(id));
}

export function loadPipelineRowColorMode(
  tenantId: string,
  userId: string,
): PipelineRowColorMode {
  return (
    loadReportPreferences(tenantId, userId)?.pipelineRowColorMode ??
    DEFAULT_PIPELINE_ROW_COLOR_MODE
  );
}

export function savePipelineRowColorMode(
  tenantId: string,
  userId: string,
  mode: PipelineRowColorMode,
): void {
  const existing = loadReportPreferences(tenantId, userId);
  saveReportPreferences(tenantId, userId, {
    exportFormat: existing?.exportFormat ?? 'pdf',
    filters: existing?.filters ?? { ...EMPTY_REPORT_FILTERS },
    selectedColumnIds: existing?.selectedColumnIds ?? null,
    knownColumnIds: existing?.knownColumnIds ?? null,
    pipelineRowColorMode: mode,
  });
}
