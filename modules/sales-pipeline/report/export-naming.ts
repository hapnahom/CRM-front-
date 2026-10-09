import type { ReportScopeLevel } from './report-visibility';
import type { ResolvedReportPeriod, SalesPipelineReportData } from './types';

/** Entity label used in export filenames. */
export function exportEntityLabel(
  level: ReportScopeLevel | null | undefined,
): string {
  if (level === 'company') return 'Executive';
  if (level === 'department') return 'Department';
  if (level === 'team') return 'Team';
  if (level === 'personal') return 'My Report';
  return 'Report';
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Drop a leading FY / year prefix from quarter/week labels so filenames don't
 * become FY-2019_FY2019_Q1 when the session name already includes the year.
 */
function stripLeadingFiscalYearPrefix(
  label: string,
  fiscalYearPart: string,
): string {
  let value = label.trim();
  if (!value) return value;

  // FY2019_Q1 / FY-2019 Q1 / FY 2019 - Q1
  value = value.replace(/^FY[-\s_]*/i, '');

  const year = fiscalYearPart.trim();
  if (year) {
    const escaped = year.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    value = value.replace(new RegExp(`^${escaped}[\\s_-]*`, 'i'), '');
  } else {
    value = value.replace(/^\d{4}([-/]\d{2,4})?[-\s_]*/i, '');
  }

  return value.trim();
}

/**
 * FY-{fiscal_year}_{quarter}_{entity}_{date}
 * Empty segments after FY-year are omitted so we never get double underscores.
 */
export function buildPipelineExportBasename(
  meta: Pick<
    SalesPipelineReportData['meta'],
    | 'exportFiscalYear'
    | 'exportQuarter'
    | 'exportEntityLabel'
    | 'permissionScopeLevel'
  >,
  date = new Date().toISOString().slice(0, 10),
): string {
  const entity =
    meta.exportEntityLabel || exportEntityLabel(meta.permissionScopeLevel);
  const rawYear = (meta.exportFiscalYear || '').trim();
  const yearWithoutPrefix = rawYear.replace(/^FY[-\s_]*/i, '');
  const fiscalYearPart = sanitizeFilenamePart(yearWithoutPrefix);
  const fySegment = fiscalYearPart ? `FY-${fiscalYearPart}` : 'FY';

  const quarterPart = sanitizeFilenamePart(
    stripLeadingFiscalYearPrefix(meta.exportQuarter || '', fiscalYearPart),
  );

  const parts = [fySegment, quarterPart, entity, date]
    .map((part) => sanitizeFilenamePart(part || ''))
    .filter(Boolean);
  return parts.join('_') || `FY_Report_${date}`;
}

export function buildPipelineExportFilename(
  meta: SalesPipelineReportData['meta'],
  ext: 'pdf' | 'xlsx',
): string {
  return `${buildPipelineExportBasename(meta)}.${ext}`;
}

/** Lines rendered under the report title in PDF/Excel. */
export function buildExportPeriodHeaderLines(
  meta: Pick<
    SalesPipelineReportData['meta'],
    'exportFiscalYear' | 'exportQuarter' | 'exportWeek'
  >,
): string[] {
  const lines: string[] = [];
  if (meta.exportFiscalYear) {
    lines.push(`Fiscal Year: ${meta.exportFiscalYear}`);
  }
  if (meta.exportQuarter) {
    lines.push(`Quarter: ${meta.exportQuarter}`);
  }
  if (meta.exportWeek) {
    lines.push(`Week: ${meta.exportWeek}`);
  }
  return lines;
}

/** Map a resolved period into export fiscal fields (kept in sync with generation). */
export function exportFiscalFieldsFromPeriod(
  period: ResolvedReportPeriod,
): Pick<
  SalesPipelineReportData['meta'],
  'exportFiscalYear' | 'exportQuarter' | 'exportWeek'
> {
  return {
    exportFiscalYear: period.fiscalYear?.trim() || '',
    exportQuarter: period.quarter?.trim() || '',
    exportWeek: period.week?.trim() || '',
  };
}
