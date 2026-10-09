import type { jsPDF } from 'jspdf';
import { tokens } from '@/lib/design-tokens';
import { textOnStageColorRgb } from '@/lib/stage-presets';
import {
  achievementChartHeading,
  achievementSummaryFromRow,
  arrayBufferToDataUrl,
  currencyStageCharts,
  overviewChartCardSize,
  renderAchievementChartPng,
  renderDonutPng,
} from './charts';
import { formatDate, formatMoneyMap } from './format';
import { loadTenantLogoPng, type ReportLogoImage } from './load-logo';
import {
  buildPipelineExportFilename,
  buildExportPeriodHeaderLines,
} from './export-naming';
import {
  buildKpiCards,
  buildOverviewKpiCards,
  buildOrgTeamsTable,
  buildInactiveOpportunitiesSheetTable,
  buildPipelineSheetTable,
  buildSalesRepRows,
  hasSection,
  hasSelectedGroupColumns,
  type ReportKpiCard,
} from './report-layout-data';
import { reportTableVisibility } from './report-visibility';
import { collapseRepeatedColumns } from './table-display';
import type { SalesPipelineReportData } from './types';

const MARGIN = 36;
const BRAND = tokens.color.brand;
const FOOTER_GUARD = 40;
const PAGE_TOP = 52;
const KPI_GAP = 4;
const CHART_COUNT = 4;
const KPI_CARD_COUNT = 5;
/** Header logo display height in PDF points. */
const LOGO_DISPLAY_H = 22;
const LOGO_GAP = 8;
/** Fixed chart currencies matching the reference briefing layout. */
const CHART_CURRENCIES = ['ETB', 'USD'] as const;

/** jsPDF Helvetica is WinAnsi — normalize to ASCII-safe glyphs before drawing. */
function pdfSafe(text: string): string {
  return String(text ?? '')
    .replace(/\u2014/g, '-') // —
    .replace(/\u2013/g, '-') // –
    .replace(/\u2212/g, '-') // −
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022/g, '-') // •
    .replace(/\u00B7/g, '-') // ·
    .replace(/\u25B6/g, '>') // ▶
    .replace(/\u26A0\uFE0F?/g, '!') // ⚠️
    .replace(/\u{1F3E2}/gu, '') // 🏢
    .replace(/\u21B3/g, '>') // ↳
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

type Doc = jsPDF & { getNumberOfPages: () => number };

function hex(color: string): [number, number, number] {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return [237, 105, 37];
  return [
    parseInt(match[1]!, 16),
    parseInt(match[2]!, 16),
    parseInt(match[3]!, 16),
  ];
}

function packTitle(): string {
  return 'Executive Intelligence Briefing';
}

function kpiSlotWidth(usable: number) {
  return (usable - KPI_GAP * (KPI_CARD_COUNT - 1)) / KPI_CARD_COUNT;
}

function chartSlotWidth(usable: number) {
  return (usable - KPI_GAP * (CHART_COUNT - 1)) / CHART_COUNT;
}

function findAchievement(
  rows: SalesPipelineReportData['summary']['achievementByCurrency'],
  currency: string,
) {
  return rows.find((row) => row.currency === currency) ?? null;
}

function findStageChart(
  charts: ReturnType<typeof currencyStageCharts>,
  currency: string,
) {
  return charts.find((chart) => chart.currency === currency) ?? null;
}

class PdfWriter {
  doc: Doc;
  y = MARGIN;
  report: SalesPipelineReportData;
  packName: string;
  periodLabel: string;
  logo: ReportLogoImage | null;

  constructor(
    doc: Doc,
    report: SalesPipelineReportData,
    logo: ReportLogoImage | null = null,
  ) {
    this.doc = doc;
    this.report = report;
    this.logo = logo;
    this.packName = packTitle();
    this.periodLabel = `${formatDate(report.meta.periodFrom)} – ${formatDate(report.meta.periodTo)}`;
  }

  get pageW() {
    return this.doc.internal.pageSize.getWidth();
  }

  get pageH() {
    return this.doc.internal.pageSize.getHeight();
  }

  get usable() {
    return this.pageW - MARGIN * 2;
  }

  ensure(space: number) {
    if (this.y + space > this.pageH - FOOTER_GUARD) this.newPage(false);
  }

  newPage(withKpis: boolean) {
    this.doc.addPage();
    this.y = MARGIN;
    this.pageChrome(withKpis);
  }

  pageChrome(withKpis: boolean) {
    const { doc, report } = this;
    const { meta } = report;

    doc.setFillColor(...hex(BRAND));
    doc.rect(0, 0, this.pageW, 6, 'F');

    let titleX = MARGIN;
    if (this.logo) {
      const ratio = this.logo.width / Math.max(this.logo.height, 1);
      const logoH = LOGO_DISPLAY_H;
      const logoW = Math.min(64, logoH * ratio);
      const logoY = 28 - logoH + 4;
      doc.addImage(
        arrayBufferToDataUrl(this.logo.buffer),
        'PNG',
        MARGIN,
        logoY,
        logoW,
        logoH,
      );
      titleX = MARGIN + logoW + LOGO_GAP;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(meta.reportKindLabel), titleX, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const right = pdfSafe(
      `PERIOD: ${this.periodLabel}   |  Generated: ${meta.generatedAt}`,
    );
    doc.text(right, this.pageW - MARGIN, 28, { align: 'right' });

    let metaY = 38;
    if (meta.filterSummary) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const filterLines = doc.splitTextToSize(
        pdfSafe(meta.filterSummary),
        this.pageW - MARGIN - titleX,
      );
      doc.text(filterLines, titleX, metaY);
      metaY += filterLines.length * 9 + 2;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    for (const line of buildExportPeriodHeaderLines(meta)) {
      doc.text(pdfSafe(line), titleX, metaY);
      metaY += 9;
    }

    this.y = Math.max(PAGE_TOP, metaY + 6);
    if (withKpis) {
      this.kpiCards(buildKpiCards(report));
      this.y += 8;
    } else {
      this.y += 8;
    }
  }

  kpiCards(cards: ReportKpiCard[]) {
    const primary = cards.slice(0, KPI_CARD_COUNT);
    const overflow = cards.slice(KPI_CARD_COUNT);
    const cardW = kpiSlotWidth(this.usable);
    const hasDualValue = primary.some((card) => card.valueRight);
    const hasSecondary =
      !hasDualValue && primary.some((card) => card.valueSecondary);
    const cardH = hasSecondary ? 62 : 52;
    const top = this.y;

    const paintCard = (
      card: ReportKpiCard,
      x: number,
      cardTop: number,
      width: number,
      height: number,
    ) => {
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(x, cardTop, width, height, 3, 3, 'FD');
      this.doc.setFillColor(...hex(BRAND));
      this.doc.rect(x, cardTop, width, 2.5, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(pdfSafe(card.label), x + 8, cardTop + 14);

      this.doc.setFontSize(12);
      const valueColor = card.valueColor
        ? hex(card.valueColor)
        : ([30, 41, 59] as [number, number, number]);
      this.doc.setTextColor(...valueColor);
      const valueLines = this.doc.splitTextToSize(
        pdfSafe(card.value),
        width - 16,
      );
      this.doc.text(valueLines[0] || '-', x + 8, cardTop + 30);

      let contextY = cardTop + 44;
      if (card.valueRight) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(12);
        this.doc.setTextColor(...valueColor);
        const rightLines = this.doc.splitTextToSize(
          pdfSafe(card.valueRight),
          width - 16,
        );
        this.doc.text(rightLines[0] || '', x + width - 8, cardTop + 30, {
          align: 'right',
        });
      } else if (card.valueSecondary) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(8);
        this.doc.setTextColor(71, 85, 105);
        const secondary = this.doc.splitTextToSize(
          pdfSafe(card.valueSecondary),
          width - 16,
        );
        this.doc.text(secondary[0] || '', x + 8, cardTop + 42);
        contextY = cardTop + 54;
      }

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(100, 116, 139);
      const context = this.doc.splitTextToSize(
        pdfSafe(card.context),
        width - 16,
      );
      this.doc.text(context[0] || '', x + 8, contextY);
    };

    primary.forEach((card, index) => {
      const x = MARGIN + index * (cardW + KPI_GAP);
      paintCard(card, x, top, cardW, cardH);
    });

    let bottom = top + cardH;
    if (overflow.length) {
      const row2Top = bottom + KPI_GAP;
      const overflowH = 52;
      overflow.forEach((card, index) => {
        const x = MARGIN + index * (cardW + KPI_GAP);
        paintCard(card, x, row2Top, cardW, overflowH);
      });
      bottom = row2Top + overflowH;
    }

    this.y = bottom + 8;
  }

  sectionTitle(title: string, aside?: string) {
    this.ensure(28);
    this.y += 6;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(pdfSafe(title), MARGIN, this.y);
    if (aside) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(pdfSafe(aside), this.pageW - MARGIN, this.y, {
        align: 'right',
      });
    }
    this.y += 6;
    this.doc.setFillColor(255, 247, 237);
    this.doc.rect(MARGIN, this.y, this.usable, 3, 'F');
    this.y += 12;
  }

  muted(text: string) {
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(pdfSafe(text), MARGIN, this.y);
    this.y += 14;
  }

  /**
   * Overview charts on one row — titles are embedded in each PNG (Excel parity).
   * Pie diameter is fixed from the square pie block (not the legend height), so
   * rings stay equal and top-aligned; longer legends simply extend the panels.
   */
  chartRow(
    charts: Array<{
      buffer: ArrayBuffer | null;
      sourceWidth: number;
      sourceHeight: number;
    }>,
    options?: { alignTop?: boolean },
  ) {
    const cells = charts.slice(0, CHART_COUNT);
    if (!cells.length) return;

    const padX = 4;
    const padTop = 6;
    const padBottom = 10;
    const chromeH = padTop + padBottom;
    // Equal display width for every chart — legends never shrink the rings.
    const heightBudget = this.pageH - FOOTER_GUARD - this.y - chromeH;
    const maxImageW = chartSlotWidth(this.usable) - padX * 2;
    const imageW = Math.max(96, Math.min(maxImageW, heightBudget / 1.1));
    const tightSlotW = imageW + padX * 2;
    const rowW = CHART_COUNT * tightSlotW + KPI_GAP * (CHART_COUNT - 1);
    const reference = cells.find((chart) => chart.buffer);
    const unifiedRatio = reference
      ? reference.sourceHeight / reference.sourceWidth
      : 1;
    const unifiedImageH = imageW * unifiedRatio;
    const imageBandH = Math.max(unifiedImageH, imageW);
    const cellH = chromeH + imageBandH;
    // Prefer staying on this page; only break if the pie block itself won't fit.
    if (this.y + chromeH + imageW > this.pageH - FOOTER_GUARD) {
      this.newPage(false);
    }
    if (!options?.alignTop) {
      const slack = this.pageH - FOOTER_GUARD - this.y - cellH;
      if (slack > 0) this.y += Math.min(slack / 2, 24);
    }
    const top = this.y;
    const rowStartX = MARGIN + Math.max(0, (this.usable - rowW) / 2);

    cells.forEach((chart, index) => {
      const x = rowStartX + index * (tightSlotW + KPI_GAP);
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(x, top, tightSlotW, cellH, 3, 3, 'FD');

      const imageX = x + padX;
      // Top-align with identical scale so every pie sits on the same row.
      const imageY = top + padTop;
      if (chart.buffer) {
        this.doc.addImage(
          arrayBufferToDataUrl(chart.buffer),
          'PNG',
          imageX,
          imageY,
          imageW,
          unifiedImageH,
        );
      } else {
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(8);
        this.doc.setTextColor(148, 163, 184);
        this.doc.text('No data', x + tightSlotW / 2, imageY + imageW / 2, {
          align: 'center',
        });
      }
    });

    this.y = top + cellH + 10;
  }

  table(
    headers: string[],
    rows: Array<Array<string | number>>,
    options?: {
      widths?: number[];
      stageColors?: Array<string | null | undefined>;
      stageColorMode?: 'full' | 'indicator';
      footer?: boolean;
      minRowH?: number;
      collapseColumnIndexes?: number[];
    },
  ) {
    if (!headers.length) return;
    if (!rows.length) {
      this.muted('No records for this section.');
      return;
    }

    const displayRows = options?.collapseColumnIndexes?.length
      ? collapseRepeatedColumns(rows, options.collapseColumnIndexes)
      : rows;

    const cols = headers.length;
    const usable = this.usable;
    const weights = (options?.widths ?? headers.map(() => 16)).slice(0, cols);
    while (weights.length < cols) weights.push(16);
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const colW = weights.map((w) => (w / weightSum) * usable);
    const padY = 5;
    const lineH = 9;
    const minRowH = options?.minRowH ?? 18;
    const stageColors = options?.stageColors;
    const colorMode = options?.stageColorMode ?? 'indicator';

    const wrap = (text: string, width: number, indent = 4) =>
      this.doc.splitTextToSize(
        pdfSafe(String(text || '-')),
        Math.max(16, width - indent),
      ) as string[];

    const headerLines = headers.map((header, i) => wrap(header, colW[i]!, 4));
    const headerH = Math.max(
      18,
      padY * 2 + Math.max(...headerLines.map((lines) => lines.length)) * lineH,
    );

    const cellIndent = (rowIndex: number, colIndex: number) => {
      const stage = stageColors?.[rowIndex];
      return stage && colorMode === 'indicator' && colIndex === 0 ? 10 : 4;
    };

    const rowHeight = (row: Array<string | number>, rowIndex: number) => {
      const lines = Math.max(
        ...row.map(
          (cell, i) =>
            wrap(String(cell), colW[i]!, cellIndent(rowIndex, i)).length,
        ),
        1,
      );
      return Math.max(minRowH, padY * 2 + lines * lineH);
    };

    const paintHeader = () => {
      this.doc.setFillColor(241, 245, 249);
      this.doc.rect(MARGIN, this.y, usable, headerH, 'F');
      this.doc.setDrawColor(226, 232, 240);
      this.doc.rect(MARGIN, this.y, usable, headerH, 'S');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(71, 85, 105);
      let x = MARGIN;
      headerLines.forEach((lines, i) => {
        this.doc.text(lines, x + 4, this.y + padY + lineH - 1);
        x += colW[i]!;
      });
      this.y += headerH;
    };

    this.ensure(headerH + rowHeight(displayRows[0]!, 0));
    paintHeader();

    displayRows.forEach((row, rowIndex) => {
      const isFooter = Boolean(
        options?.footer && rowIndex === displayRows.length - 1,
      );
      const rowH = rowHeight(row, rowIndex);
      if (this.y + rowH > this.pageH - FOOTER_GUARD) {
        this.newPage(false);
        paintHeader();
      }

      const stage = stageColors?.[rowIndex];
      if (isFooter) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(MARGIN, this.y, usable, rowH, 'F');
      } else if (stage && colorMode === 'full') {
        this.doc.setFillColor(...hex(stage));
        this.doc.rect(MARGIN, this.y, usable, rowH, 'F');
      } else if (rowIndex % 2 === 0) {
        this.doc.setFillColor(255, 255, 255);
        this.doc.rect(MARGIN, this.y, usable, rowH, 'F');
      } else {
        this.doc.setFillColor(249, 250, 251);
        this.doc.rect(MARGIN, this.y, usable, rowH, 'F');
      }

      if (stage && colorMode === 'indicator') {
        this.doc.setFillColor(...hex(stage));
        this.doc.rect(MARGIN, this.y, 5, rowH, 'F');
      }

      // Department banner rows
      const first = String(row[0] ?? '');
      if (first.startsWith('🏢')) {
        this.doc.setFillColor(226, 232, 240);
        this.doc.rect(MARGIN, this.y, usable, rowH, 'F');
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(8);
        this.doc.setTextColor(30, 41, 59);
        this.doc.text(
          pdfSafe(first).trim(),
          MARGIN + 6,
          this.y + padY + lineH - 1,
        );
        this.y += rowH;
        return;
      }

      this.doc.setFont('helvetica', isFooter ? 'bold' : 'normal');
      this.doc.setFontSize(8);
      if (!isFooter && stage && colorMode === 'full') {
        this.doc.setTextColor(...textOnStageColorRgb(stage));
      } else {
        this.doc.setTextColor(
          isFooter ? 15 : 51,
          isFooter ? 23 : 65,
          isFooter ? 42 : 85,
        );
      }
      let x = MARGIN;
      row.forEach((cell, i) => {
        const indent = cellIndent(rowIndex, i);
        const lines = wrap(String(cell), colW[i]!, indent);
        this.doc.text(lines, x + indent, this.y + padY + lineH - 1);
        x += colW[i]!;
      });
      this.y += rowH;
    });
    this.y += 14;
  }

  footer() {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
      this.doc.setPage(i);
      const pageW = this.doc.internal.pageSize.getWidth();
      const pageH = this.doc.internal.pageSize.getHeight();
      this.doc.setDrawColor(226, 232, 240);
      this.doc.line(MARGIN, pageH - 26, pageW - MARGIN, pageH - 26);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(100, 116, 139);
      const company = this.report.meta.companyName?.trim() || 'Selamnew';
      this.doc.text(
        pdfSafe(`${company} Business · ${this.packName}`).replace(' · ', ' - '),
        MARGIN,
        pageH - 14,
      );
      this.doc.text(pdfSafe(this.periodLabel), pageW / 2, pageH - 14, {
        align: 'center',
      });
      this.doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, pageH - 14, {
        align: 'right',
      });
    }
  }
}

export async function exportPipelinePdf(report: SalesPipelineReportData) {
  const { meta, summary } = report;
  const scopeLevel = meta.permissionScopeLevel;
  const visibility = reportTableVisibility(scopeLevel);

  const includeExecutive =
    visibility.executiveSummary && hasSection(report, 'executive_summary');
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

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  }) as Doc;
  const logo = await loadTenantLogoPng(report.meta.logoUrl);
  const pdf = new PdfWriter(doc, report, logo);

  const currencyCharts = currencyStageCharts(report.stages, CHART_CURRENCIES);

  const overviewChartSpecs = CHART_CURRENCIES.map((currency) => {
    const achievement = findAchievement(
      summary.achievementByCurrency,
      currency,
    );
    const stage = findStageChart(currencyCharts, currency) ?? {
      currency,
      stages: [],
      totalLabel: formatMoneyMap({ [currency]: 0 }, true),
    };
    return { currency, achievement, stage };
  });

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
      overviewChartSpecs.map(({ currency, stage }) => {
        return renderDonutPng(stage.stages, stage.totalLabel, {
          heading: `Pipeline by Stage · ${currency}`,
          sliceBy: 'value',
          centerCaption: 'By stage',
          legendPosition: 'bottom',
          includeZeroSlices: true,
          currency,
          canvasSize: overviewCardSize,
        });
      }),
    ),
  ]);

  const pipelineColorMode = meta.pipelineRowColorMode ?? 'full';

  const writeOverviewCharts = (alignTop = false) => {
    if (!includeExecutive) return;

    pdf.chartRow(
      [
        {
          buffer: achievementBuffers[0] ?? null,
          sourceWidth: overviewCardSize.width,
          sourceHeight: overviewCardSize.height,
        },
        {
          buffer: achievementBuffers[1] ?? null,
          sourceWidth: overviewCardSize.width,
          sourceHeight: overviewCardSize.height,
        },
        {
          buffer: stageBuffers[0] ?? null,
          sourceWidth: overviewCardSize.width,
          sourceHeight: overviewCardSize.height,
        },
        {
          buffer: stageBuffers[1] ?? null,
          sourceWidth: overviewCardSize.width,
          sourceHeight: overviewCardSize.height,
        },
      ],
      { alignTop },
    );
  };

  type SectionSpec = {
    title: string;
    aside: string;
    table: {
      headers: string[];
      rows: Array<Array<string | number>>;
      widths: number[];
      stageColors?: Array<string | null | undefined>;
    };
    options?: {
      footer?: boolean;
      minRowH?: number;
      stageColorMode?: 'full' | 'indicator';
      collapseColumnIndexes?: number[];
    };
  };

  /** Section groups; each group starts on its own page. */
  const groups: SectionSpec[][] = [];
  const pushGroup = (...specs: Array<SectionSpec | null>) => {
    const withRows = specs.filter(
      (spec): spec is SectionSpec =>
        Boolean(spec) &&
        spec!.table.headers.length > 0 &&
        spec!.table.rows.length > 0,
    );
    if (withRows.length) groups.push(withRows);
  };

  const pipelineSection = (title: string, aside: string): SectionSpec | null =>
    includePipeline
      ? {
          title,
          aside,
          table: buildPipelineSheetTable(report, 'pdf'),
          options: { minRowH: 22, stageColorMode: pipelineColorMode },
        }
      : null;

  const inactiveOpportunitiesSection = (
    title: string,
    aside: string,
  ): SectionSpec | null =>
    includeInactiveOpportunities
      ? {
          title,
          aside,
          table: buildInactiveOpportunitiesSheetTable(report, 'pdf'),
          options: { minRowH: 22, stageColorMode: pipelineColorMode },
        }
      : null;

  const orgTeamsSection = (
    title: string,
    aside: string,
  ): SectionSpec | null => {
    if (!includeOrgTeams) return null;
    const table = buildOrgTeamsTable(report, 'pdf');
    const deptCol = table.headers.findIndex((h) => /department/i.test(h));
    return {
      title,
      aside,
      table,
      options: {
        minRowH: 20,
        collapseColumnIndexes: deptCol >= 0 ? [deptCol] : [0],
      },
    };
  };

  const salesRepsSection = (
    title: string,
    aside: string,
  ): SectionSpec | null =>
    includeSalesReps
      ? {
          title,
          aside,
          table: buildSalesRepRows(report, 'pdf'),
          options: { minRowH: 22 },
        }
      : null;

  // Same page structure for every access level; data is scoped upstream.
  pushGroup(
    orgTeamsSection('Team Performance', 'Department & Team Rollup'),
    salesRepsSection(
      'Sales Representative Performance',
      'Sales Representatives',
    ),
  );
  pushGroup(pipelineSection('Total Pipeline', 'Master Records'));
  pushGroup(
    inactiveOpportunitiesSection('Inactive Opportunities', 'Inactive & Lost'),
  );

  // Page 1: overview KPI cards (5 in one row + optional overflow) above charts.
  pdf.pageChrome(false);
  if (includeExecutive) {
    pdf.kpiCards(buildOverviewKpiCards(report));
    pdf.y += 2;
  }
  writeOverviewCharts(true);
  let pageInUse = includeExecutive;

  groups.forEach((group) => {
    if (pageInUse) pdf.newPage(false);
    pageInUse = true;
    group.forEach((spec) => {
      pdf.sectionTitle(spec.title, spec.aside);
      pdf.table(spec.table.headers, spec.table.rows, {
        widths: spec.table.widths,
        stageColors: spec.table.stageColors,
        stageColorMode: spec.options?.stageColorMode,
        footer: spec.options?.footer,
        minRowH: spec.options?.minRowH,
        collapseColumnIndexes: spec.options?.collapseColumnIndexes,
      });
    });
  });

  pdf.footer();
  doc.save(buildPipelineExportFilename(meta, 'pdf'));
}
