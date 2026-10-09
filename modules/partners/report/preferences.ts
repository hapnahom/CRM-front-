import {
  DEFAULT_PIPELINE_ROW_COLOR_MODE,
  type PipelineRowColorMode,
} from '@/modules/sales-pipeline/report/preferences';

const STORAGE_PREFIX = 'partners-report-prefs';

export type PartnersReportPreferences = {
  pipelineRowColorMode: PipelineRowColorMode;
};

function storageKey(tenantId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${tenantId}:${userId}`;
}

export function loadPartnersPipelineRowColorMode(
  tenantId: string,
  userId: string,
): PipelineRowColorMode {
  if (typeof window === 'undefined' || !tenantId || !userId) {
    return DEFAULT_PIPELINE_ROW_COLOR_MODE;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId, userId));
    if (!raw) return DEFAULT_PIPELINE_ROW_COLOR_MODE;
    const parsed = JSON.parse(raw) as Partial<PartnersReportPreferences>;
    if (parsed.pipelineRowColorMode === 'indicator') return 'indicator';
    return DEFAULT_PIPELINE_ROW_COLOR_MODE;
  } catch {
    return DEFAULT_PIPELINE_ROW_COLOR_MODE;
  }
}

export function savePartnersPipelineRowColorMode(
  tenantId: string,
  userId: string,
  mode: PipelineRowColorMode,
): void {
  if (typeof window === 'undefined' || !tenantId || !userId) return;
  try {
    const payload: PartnersReportPreferences = {
      pipelineRowColorMode: mode,
    };
    window.localStorage.setItem(
      storageKey(tenantId, userId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export { DEFAULT_PIPELINE_ROW_COLOR_MODE };
export type { PipelineRowColorMode };
