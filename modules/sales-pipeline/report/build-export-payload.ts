import { masterPipelineSheetTitle } from '@/config/salesWorkflow';
import {
  achievementChartHeading,
  achievementSummaryFromRow,
  currencyStageCharts,
  overviewChartCardSize,
  renderAchievementChartPng,
  renderDonutPng,
} from './charts';
import { formatDate, formatMoneyMap } from './format';
import {
  buildExportPeriodHeaderLines,
  buildPipelineExportFilename,
} from './export-naming';
import { reportTableVisibility } from './report-visibility';
import {
  buildOverviewKpiCards,
  buildOrgTeamsTable,
  buildInactiveOpportunitiesSheetTable,
  buildPipelineSheetTable,
  buildProductPortfolioRows,
  buildSalesRepRows,
  hasSection,
  hasSelectedGroupColumns,
} from './report-layout-data';
import type { SalesPipelineReportData } from './types';

const CHART_CURRENCIES = ['ETB', 'USD'] as const;

export type PipelineReportExportPayload = {
  format: 'xlsx' | 'pdf';
  meta: {
    reportKindLabel: string;
    companyName?: string;
    periodLabel: string;
    periodFrom: string;
    periodTo: string;
    generatedAt: string;
    filterSummary?: string | null;
    periodHeaderLines: string[];
    filenameBase: string;
  };
  overviewKpiCards?: Array<{
    label: string;
    value: string;
    valueRight?: string;
    valueSecondary?: string;
    context: string;
    valueColor?: string;
  }>;
  overviewCharts?: Array<{
    base64: string;
    width: number;
    height: number;
  }>;
  sheets: Array<{
    name: string;
    subtitle: string;
    kpiCards?: PipelineReportExportPayload['overviewKpiCards'];
    charts?: PipelineReportExportPayload['overviewCharts'];
    tables: Array<{
      title: string;
      headers: string[];
      rows: Array<Array<string | number>>;
      widths: number[];
      stageColors?: Array<string | null | undefined>;
      stageColorMode?: 'full' | 'indicator';
      footer?: boolean;
      collapseColumnIndexes?: number[];
    }>;
  }>;
};

function arrayBufferToBase64(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function tableFromLayout(
  title: string,
  layout: {
    headers: string[];
    rows: Array<Array<string | number>>;
    widths: number[];
    stageColors?: Array<string | null | undefined>;
  },
  options?: {
    stageColorMode?: 'full' | 'indicator';
    footer?: boolean;
    collapseColumnIndexes?: number[];
  },
) {
  if (!layout.headers.length || !layout.rows.length) return null;
  return {
    title,
    headers: layout.headers,
    rows: layout.rows,
    widths: layout.widths,
    stageColors: layout.stageColors,
    stageColorMode: options?.stageColorMode,
    footer: options?.footer,
    collapseColumnIndexes: options?.collapseColumnIndexes,
  };
}

export async function buildPipelineExportPayload(
  report: SalesPipelineReportData,
  format: 'xlsx' | 'pdf',
): Promise<PipelineReportExportPayload> {
  const { meta, summary } = report;
  const scopeLevel = meta.permissionScopeLevel;
  const visibility = reportTableVisibility(scopeLevel);
  const periodHeaderLines = buildExportPeriodHeaderLines(meta);
  const pipelineColorMode = meta.pipelineRowColorMode ?? 'full';
  const density = format;

  const includeExecutive =
    visibility.executiveSummary && hasSection(report, 'executive_summary');
  const includeProductPortfolio =
    visibility.productPortfolio &&
    hasSelectedGroupColumns(report, 'product_portfolio');
  const includeOrgTeams =
    visibility.orgTeams &&
    hasSection(report, 'team_performance') &&
    hasSelectedGroupColumns(report, 'org_teams') &&
    report.orgUnits.length > 0;
  const includeSalesReps =
    visibility.salesReps &&
    hasSection(report, 'team_performance') &&
    hasSelectedGroupColumns(report, 'sales_reps') &&
    report.salesReps.length > 0;
  const includePipeline =
    visibility.totalPipeline &&
    hasSection(report, 'deal_registry') &&
    hasSelectedGroupColumns(report, 'total_pipeline');
  const includeInactiveOpportunities =
    visibility.inactiveOpportunities &&
    hasSection(report, 'deal_registry') &&
    hasSelectedGroupColumns(report, 'inactive_opportunities') &&
    report.inactiveOpportunitiesRegistry.length > 0;

  let overviewCharts: PipelineReportExportPayload['overviewCharts'];
  let overviewKpiCards: PipelineReportExportPayload['overviewKpiCards'];

  if (includeExecutive) {
    overviewKpiCards = buildOverviewKpiCards(report);
    const currencyCharts = currencyStageCharts(report.stages, CHART_CURRENCIES);
    const overviewChartSpecs = CHART_CURRENCIES.map((currency) => ({
      currency,
      achievement:
        summary.achievementByCurrency.find(
          (row) => row.currency === currency,
        ) ?? null,
      stage: currencyCharts.find((chart) => chart.currency === currency) ?? {
        currency,
        stages: [],
        totalLabel: formatMoneyMap({ [currency]: 0 }, true),
      },
    }));
    const maxStageRows = Math.max(
      ...overviewChartSpecs.map(({ stage }) => stage.stages.length),
      1,
    );
    const overviewCardSize = overviewChartCardSize(maxStageRows, {
      heading: true,
    });
    const targetPeriodLabel =
      report.targets.find((row) => row.level === 'team')?.period ??
      report.targets.find((row) => row.level === 'company')?.period ??
      meta.periodLabel;

    const [achievementBuffers, stageBuffers] = await Promise.all([
      Promise.all(
        overviewChartSpecs.map(({ currency, achievement }) => {
          const heading = achievementChartHeading(targetPeriodLabel, currency);
          const achievementSummary = achievementSummaryFromRow(
            currency,
            achievement,
          );
          if (!achievement) {
            return renderAchievementChartPng(null, 'Achievement', {
              heading,
              subtitle: 'No target data',
              achievementSummary,
              canvasSize: overviewCardSize,
            });
          }
          return renderAchievementChartPng(
            achievement.achievementPct,
            'Achievement',
            {
              heading,
              subtitle: formatMoneyMap(
                { [currency]: achievement.achieved },
                true,
              ),
              achievementSummary,
              canvasSize: overviewCardSize,
            },
          );
        }),
      ),
      Promise.all(
        overviewChartSpecs.map(({ currency, stage }) =>
          renderDonutPng(stage.stages, stage.totalLabel, {
            heading: `Pipeline by Stage · ${currency}`,
            sliceBy: 'value',
            centerCaption: 'By stage',
            legendPosition: 'bottom',
            includeZeroSlices: true,
            currency,
            canvasSize: overviewCardSize,
          }),
        ),
      ),
    ]);

    overviewCharts = [...achievementBuffers, ...stageBuffers]
      .map((buffer) => {
        const base64 = arrayBufferToBase64(buffer);
        if (!base64) return null;
        return {
          base64,
          width: overviewCardSize.width,
          height: overviewCardSize.height,
        };
      })
      .filter((chart): chart is NonNullable<typeof chart> => chart != null);
  }

  const sheets: PipelineReportExportPayload['sheets'] = [];

  if (includeExecutive) {
    sheets.push({
      name: '1. Executive Overview',
      subtitle: 'Executive Command Center · Pipeline Overview',
      kpiCards: overviewKpiCards,
      charts: overviewCharts,
      tables: [],
    });
  }

  if (includePipeline) {
    const pipelineTable = buildPipelineSheetTable(report, density);
    const table = tableFromLayout('Total Pipeline', pipelineTable, {
      stageColorMode: pipelineColorMode,
    });
    if (table) {
      sheets.push({
        name: '2. Total Pipeline',
        subtitle: masterPipelineSheetTitle(),
        tables: [table],
      });
    }
  }

  if (includeInactiveOpportunities) {
    const inactiveTable = buildInactiveOpportunitiesSheetTable(report, density);
    const table = tableFromLayout('Inactive Opportunities', inactiveTable, {
      stageColorMode: pipelineColorMode,
    });
    if (table) {
      sheets.push({
        name: '3. Inactive Opportunities',
        subtitle: 'Inactive & Lost Opportunities',
        tables: [table],
      });
    }
  }

  const orgTables = [];
  if (includeOrgTeams) {
    const orgTeamsTable = buildOrgTeamsTable(report, density);
    const deptCol = orgTeamsTable.headers.findIndex((h) =>
      /department/i.test(h),
    );
    const table = tableFromLayout('Team Performance', orgTeamsTable, {
      collapseColumnIndexes: deptCol >= 0 ? [deptCol] : [0],
    });
    if (table) orgTables.push(table);
  }
  if (includeSalesReps) {
    const table = tableFromLayout(
      'Sales Representative Performance',
      buildSalesRepRows(report, density),
    );
    if (table) orgTables.push(table);
  }
  if (includeProductPortfolio) {
    const table = tableFromLayout(
      'Product Portfolio Allocation',
      buildProductPortfolioRows(report, density),
    );
    if (table) orgTables.push(table);
  }
  if (orgTables.length) {
    sheets.push({
      name:
        meta.appliedTeamIds.length > 0
          ? '4. Team Performance'
          : '4. Org Performance',
      subtitle: '',
      tables: orgTables,
    });
  }

  if (!sheets.length) {
    sheets.push({
      name: '1. Executive Overview',
      subtitle: 'Sales Pipeline Report',
      tables: [],
    });
  }

  return {
    format,
    meta: {
      reportKindLabel: meta.reportKindLabel,
      companyName: meta.companyName,
      periodLabel: meta.periodLabel,
      periodFrom: formatDate(meta.periodFrom),
      periodTo: formatDate(meta.periodTo),
      generatedAt: meta.generatedAt,
      filterSummary: meta.filterSummary,
      periodHeaderLines,
      filenameBase: buildPipelineExportFilename(meta, format).replace(
        /\.(xlsx|pdf)$/,
        '',
      ),
    },
    overviewKpiCards,
    overviewCharts,
    sheets,
  };
}
