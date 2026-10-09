import type {
  FavoriteReport,
  GeneratedReport,
  ParentCategoryId,
  ReportBuilderState,
  ReportCriteriaState,
  GroupingState,
} from '@/modules/reports/builder/types';
import { buildCriteriaFilterTags } from '@/modules/reports/builder/filter-labels';
import { getCategory } from '@/modules/reports/builder/definitions';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

async function authHeaders() {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  return {
    Authorization: `Bearer ${token}`,
    tenantId: tenantId ?? '',
  };
}

export type ApiFavorite = {
  id: string;
  name?: string | null;
  categories: ParentCategoryId[];
  criteria?: ReportCriteriaState | null;
  grouping?: GroupingState | null;
};

export type ApiScheduledReport = {
  id: string;
  name: string;
  frequency: string;
  format: string;
  recipients: string[];
  enabled: boolean;
  nextRunAt: string;
  startAt: string;
  timezone: string;
  config: Record<string, unknown>;
};

export type FilterOptionsMap = Record<
  string,
  { id: string; label: string; isDefault?: boolean }[]
>;

async function withReadableFilterTags(
  report: GeneratedReport,
  state: ReportBuilderState,
  periodLabel: string,
): Promise<GeneratedReport> {
  const isSalesOnly =
    state.categories.length === 1 && state.categories[0] === 'sales';

  const categoryTags = state.categories.map(
    (id) => getCategory(id)?.shortName ?? id,
  );

  // Sales-only reports: backend already resolves filter names from DB.
  if (isSalesOnly && report.filterTags.length > 0) {
    return {
      ...report,
      filterTags: [...categoryTags, ...report.filterTags],
    };
  }

  let liveOptions: FilterOptionsMap | undefined;
  try {
    liveOptions = await fetchFilterOptionsApi();
  } catch {
    liveOptions = undefined;
  }

  const scopeLabel = report.filterTags
    .find((tag) => tag.startsWith('Scope:'))
    ?.replace(/^Scope:\s*/, '');

  const criteriaTags = buildCriteriaFilterTags(
    state,
    periodLabel || report.periodLabel,
    liveOptions,
    {
      scopeLabel,
      salesReport: isSalesOnly,
    },
  );

  return {
    ...report,
    filterTags: [...categoryTags, ...criteriaTags],
  };
}

export async function generateReportApi(
  state: ReportBuilderState,
  name: string,
  periodLabel?: string,
): Promise<GeneratedReport> {
  const resolvedPeriod = periodLabel || 'Selected period';

  let live: GeneratedReport;
  try {
    live = (await crudRequest({
      url: `${CRM_URL}/reports/generate`,
      method: 'POST',
      headers: await authHeaders(),
      data: {
        name,
        categories: state.categories,
        criteria: state.criteria,
        grouping: state.grouping,
      },
    })) as GeneratedReport;
  } catch (error: unknown) {
    throw new Error(extractApiErrorMessage(error, 'Failed to generate report'));
  }

  return withReadableFilterTags(
    live,
    state,
    periodLabel || live.periodLabel || resolvedPeriod,
  );
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const axiosLike = error as {
    message?: string;
    response?: { data?: { message?: string | string[]; error?: string } };
  };
  const payload = axiosLike.response?.data?.message;
  if (Array.isArray(payload) && payload.length) return payload.join(', ');
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (typeof axiosLike.response?.data?.error === 'string') {
    return axiosLike.response.data.error;
  }
  if (typeof axiosLike.message === 'string' && axiosLike.message.trim()) {
    return axiosLike.message;
  }
  return fallback;
}

export async function exportReportApi(
  state: ReportBuilderState,
  name: string,
  format: 'excel' | 'pdf' | 'csv' | 'word',
): Promise<{ blob: Blob; filename: string }> {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  const response = await fetch(`${CRM_URL}/reports/export`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      tenantId: tenantId ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      categories: state.categories,
      criteria: state.criteria,
      grouping: state.grouping,
      format,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text || `Export failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (parsed?.message) {
        message = Array.isArray(parsed.message)
          ? parsed.message.join(', ')
          : parsed.message;
      }
    } catch {
      // keep raw text
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const fromHeader = parseFilenameFromContentDisposition(
    response.headers.get('Content-Disposition'),
  );
  const filename = fromHeader || buildExportFilename(name, format);
  const mime =
    format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : format === 'pdf'
        ? 'application/pdf'
        : format === 'csv'
          ? 'text/csv;charset=utf-8'
          : 'application/msword';
  const typedBlob =
    blob.type && blob.type !== 'application/octet-stream'
      ? blob
      : new Blob([blob], { type: mime });
  return { blob: typedBlob, filename };
}

export async function exportGeneratedReportApi(
  report: GeneratedReport,
  format: 'excel' | 'pdf' | 'csv' | 'word',
): Promise<{ blob: Blob; filename: string }> {
  return exportReportApi(
    {
      categories: report.categories,
      criteria: {
        periodMode: 'dateRange',
        fiscalPeriod: { type: 'annual' },
        dateRange: 'custom',
        multi: {},
      },
      grouping: report.grouping,
    },
    report.name,
    format,
  );
}

export async function fetchFilterOptionsApi(
  fields?: string[],
): Promise<FilterOptionsMap> {
  const qs =
    fields && fields.length
      ? `?fields=${encodeURIComponent(fields.join(','))}`
      : '';
  return crudRequest({
    url: `${CRM_URL}/reports/filter-options${qs}`,
    method: 'GET',
    headers: await authHeaders(),
  });
}

export async function listFavoritesApi(): Promise<ApiFavorite[]> {
  return crudRequest({
    url: `${CRM_URL}/reports/favorites`,
    method: 'GET',
    headers: await authHeaders(),
  });
}

export async function createFavoriteApi(payload: {
  name?: string;
  categories: ParentCategoryId[];
  criteria?: ReportCriteriaState;
  grouping?: GroupingState;
}): Promise<ApiFavorite> {
  return crudRequest({
    url: `${CRM_URL}/reports/favorites`,
    method: 'POST',
    headers: await authHeaders(),
    data: payload,
  });
}

export async function deleteFavoriteApi(id: string): Promise<void> {
  await crudRequest({
    url: `${CRM_URL}/reports/favorites/${id}`,
    method: 'DELETE',
    headers: await authHeaders(),
  });
}

export async function createScheduleApi(payload: {
  name: string;
  config: {
    name: string;
    categories: ParentCategoryId[];
    criteria: ReportCriteriaState;
    grouping: GroupingState;
  };
  frequency: string;
  format: string;
  recipients: string;
  startDate: string;
  time: string;
  timezone?: string;
}): Promise<ApiScheduledReport> {
  return crudRequest({
    url: `${CRM_URL}/reports/schedules`,
    method: 'POST',
    headers: await authHeaders(),
    data: payload,
  });
}

export async function shareReportApi(payload: {
  name: string;
  categories: ParentCategoryId[];
  criteria: ReportCriteriaState;
  grouping: GroupingState;
  formats: Array<'excel' | 'pdf'>;
  recipients: string;
}): Promise<{ sent: true; recipients: string[]; formats: string[] }> {
  return crudRequest({
    url: `${CRM_URL}/reports/share`,
    method: 'POST',
    headers: await authHeaders(),
    data: payload,
  });
}

export function toFavoriteReport(fav: ApiFavorite): FavoriteReport {
  return {
    id: fav.id,
    categories: fav.categories,
  };
}

export function buildExportFilename(
  name: string,
  format: 'excel' | 'pdf' | 'csv' | 'word',
): string {
  const ext = format === 'excel' ? 'xlsx' : format === 'word' ? 'doc' : format;
  const base = (name || 'CRM_Report')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
  const date = new Date().toISOString().slice(0, 10);
  return `${base || 'CRM_Report'}_${date}.${ext}`;
}

function parseFilenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      return utfMatch[1].trim();
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || null;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
