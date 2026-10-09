import { saveAs } from 'file-saver';
import type { Fill, Worksheet } from 'exceljs';
import { textOnStageColor, textOnStageColorRgb } from '@/lib/stage-presets';
import {
  loadTenantLogoPng,
  type ReportLogoImage,
} from '@/modules/sales-pipeline/report/load-logo';
import { arrayBufferToDataUrl } from '@/modules/sales-pipeline/report/charts';
import {
  renderPartnerStageCharts,
  renderTargetAchievementChartPng,
  type PartnerChartImage,
} from './charts';
import type {
  PartnerLeadPipelineRow,
  PartnerPipelineRow,
  PartnersReportData,
} from './types';

type Argb = string;

const FONT = 'Calibri';
const GUTTER = 1;
const START = 2;
const EMPTY = '—';
const HEADER_LOGO_H = 28;
const HEADER_LOGO_MAX_W = 72;

const C = {
  slate900: 'FF0F172A',
  slate800: 'FF1E293B',
  slate700: 'FF334155',
  slate600: 'FF475569',
  slate500: 'FF64748B',
  slate200: 'FFE2E8F0',
  slate100: 'FFF1F5F9',
  slate50: 'FFF8FAFC',
  white: 'FFFFFFFF',
  banner: 'FFFFF7ED',
  brand: 'FFED6925',
} as const;

const thin = (argb: Argb = C.slate200) => ({
  style: 'thin' as const,
  color: { argb },
});
const thick = (argb: Argb) => ({ style: 'thick' as const, color: { argb } });

function solid(argb: Argb): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function argbFromHex(
  hex: string | null | undefined,
  fallback: Argb = C.brand,
): Argb {
  if (!hex) return fallback;
  const cleaned = hex.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `FF${cleaned.toUpperCase()}`;
  if (/^[0-9a-fA-F]{8}$/.test(cleaned)) return cleaned.toUpperCase();
  return fallback;
}

function money(value: number) {
  return Math.round(value).toLocaleString();
}

function filenameBase(report: PartnersReportData): string {
  const role = (report.meta.primaryRoleName || 'Partners')
    .replace(/\s+/g, '_')
    .trim();
  const year = (report.meta.exportFiscalYear || '')
    .replace(/^FY[-\s_]*/i, '')
    .trim();
  const quarter = (report.meta.exportQuarter || '').trim();
  return (
    [year ? `FY-${year}` : null, quarter, role, 'Pipeline']
      .filter(Boolean)
      .join('_') || `Partners_Report_${new Date().toISOString().slice(0, 10)}`
  );
}

function setupSheet(sheet: Worksheet, colCount: number, hasLogo = false) {
  sheet.views = [{ state: 'normal', showGridLines: true }];
  sheet.getColumn(GUTTER).width = hasLogo ? 10 : 3;
  const defaults = [
    18, 10, 14, 22, 28, 14, 16, 14, 14, 14, 14, 14, 14, 14, 14, 12, 10, 28, 28,
  ];
  for (let i = 0; i < colCount; i += 1) {
    sheet.getColumn(START + i).width = defaults[i] ?? 14;
  }
  sheet.getRow(1).height = 10;
}

function writeSheetHeader(
  workbook: import('exceljs').Workbook,
  sheet: Worksheet,
  companyName: string,
  title: string,
  periodLabel: string,
  generatedAt: string,
  logo: ReportLogoImage | null,
  colCount: number,
  filterSummary?: string | null,
): number {
  const endCol = START + Math.max(colCount, 4) - 1;
  const mid = START + Math.max(Math.floor(Math.max(colCount, 4) / 2) - 1, 2);

  sheet.mergeCells(2, START, 2, mid);
  sheet.mergeCells(2, mid + 1, 2, endCol);

  const titleCell = sheet.getCell(2, START);
  titleCell.value = companyName || title;
  titleCell.font = {
    name: FONT,
    bold: true,
    size: 16,
    color: { argb: C.slate900 },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  const period = sheet.getCell(2, mid + 1);
  period.value = `Period: ${periodLabel}`;
  period.font = {
    name: FONT,
    bold: true,
    size: 10,
    color: { argb: C.slate700 },
  };
  period.alignment = { vertical: 'middle', horizontal: 'right' };

  let detailRow = 3;
  const filterLine = filterSummary?.trim();
  if (filterLine) {
    sheet.mergeCells(detailRow, START, detailRow, endCol);
    const filterCell = sheet.getCell(detailRow, START);
    filterCell.value = filterLine;
    filterCell.font = {
      name: FONT,
      size: 10,
      italic: true,
      color: { argb: C.slate600 },
    };
    filterCell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true,
    };
    sheet.getRow(detailRow).height = Math.max(
      18,
      Math.ceil(filterLine.length / 90) * 14,
    );
    detailRow += 1;
  }

  sheet.mergeCells(detailRow, START, detailRow, mid);
  sheet.mergeCells(detailRow, mid + 1, detailRow, endCol);

  const sub = sheet.getCell(detailRow, START);
  sub.value = title;
  sub.font = { name: FONT, size: 11, color: { argb: C.slate500 } };
  sub.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  const generated = sheet.getCell(detailRow, mid + 1);
  generated.value = `Generated: ${generatedAt}`;
  generated.font = { name: FONT, size: 10, color: { argb: C.slate500 } };
  generated.alignment = { vertical: 'middle', horizontal: 'right' };

  sheet.getRow(2).height = logo ? 40 : 28;
  sheet.getRow(detailRow).height = 18;

  if (logo) {
    const ratio = logo.width / Math.max(logo.height, 1);
    const height = HEADER_LOGO_H;
    const width = Math.min(HEADER_LOGO_MAX_W, Math.round(height * ratio));
    const rowPixels = Math.round(40 / 0.75);
    const yPx = Math.max(0, Math.round((rowPixels - height) / 2));
    const imageId = workbook.addImage({
      buffer: logo.buffer,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0.05, row: 1 + yPx / rowPixels },
      ext: { width, height },
    });
  }

  return detailRow + 2;
}

function writeSectionBanner(
  sheet: Worksheet,
  row: number,
  title: string,
  endCol: number,
): number {
  const last = Math.max(endCol, START);
  sheet.mergeCells(row, START, row, last);
  for (let c = START; c <= last; c += 1) {
    const cell = sheet.getCell(row, c);
    cell.fill = solid(C.banner);
    cell.font = {
      name: FONT,
      bold: true,
      size: 11,
      color: { argb: C.slate800 },
    };
  }
  const cell = sheet.getCell(row, START);
  cell.value = `▶  ${title}`;
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(row).height = 22;
  return row + 1;
}

function writeTableHeader(sheet: Worksheet, row: number, headers: string[]) {
  for (let c = 0; c < headers.length; c += 1) {
    const cell = sheet.getCell(row, START + c);
    cell.value = headers[c];
    cell.fill = solid(C.slate100);
    cell.font = {
      name: FONT,
      bold: true,
      size: 10,
      color: { argb: C.slate600 },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: thin(),
      left: thin(),
      right: thin(),
      bottom: thin(),
    };
  }
  sheet.getRow(row).height = 22;
}

function writeDataRows(
  sheet: Worksheet,
  startRow: number,
  rows: Array<Array<string | number>>,
  options?: {
    stageColors?: Array<string | null | undefined>;
    mergeFirstColumn?: boolean;
    firstColumnKeys?: string[];
    stageColorMode?: 'full' | 'indicator';
    /** Keep the partner/role column uncolored (merged partner groups). */
    skipFirstColumnColor?: boolean;
  },
): number {
  const colorMode = options?.stageColorMode ?? 'indicator';
  const skipFirst = Boolean(options?.skipFirstColumnColor);
  const indicatorCol = skipFirst ? 1 : 0;

  if (!rows.length) {
    sheet.getCell(startRow, START).value = 'No records for this section.';
    sheet.getCell(startRow, START).font = {
      name: FONT,
      italic: true,
      size: 11,
      color: { argb: C.slate500 },
    };
    return startRow + 2;
  }

  for (let r = 0; r < rows.length; r += 1) {
    const excelRow = startRow + r;
    const stageColor = options?.stageColors?.[r];

    for (let c = 0; c < rows[r].length; c += 1) {
      const raw = rows[r][c];
      const cell = sheet.getCell(excelRow, START + c);
      const isPartnerCol = skipFirst && c === 0;
      const applyFull =
        Boolean(stageColor) && colorMode === 'full' && !isPartnerCol;
      cell.value = raw == null || raw === '' ? EMPTY : raw;
      cell.fill = solid(applyFull ? argbFromHex(stageColor) : C.white);
      cell.font = {
        name: FONT,
        bold: c === 0,
        size: 10,
        color: {
          argb: applyFull
            ? argbFromHex(textOnStageColor(stageColor!))
            : C.slate700,
        },
      };
      cell.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true,
      };
      cell.border = {
        top: thin(),
        right: thin(),
        bottom: thin(),
        left:
          c === indicatorCol && stageColor && colorMode === 'indicator'
            ? thick(argbFromHex(stageColor))
            : thin(),
      };
    }
    sheet.getRow(excelRow).height = 36;
  }

  if (options?.mergeFirstColumn && options.firstColumnKeys?.length) {
    let runStart = 0;
    while (runStart < rows.length) {
      let runEnd = runStart;
      const key = options.firstColumnKeys[runStart];
      while (
        runEnd + 1 < rows.length &&
        options.firstColumnKeys[runEnd + 1] === key
      ) {
        runEnd += 1;
      }
      if (runEnd > runStart && key) {
        sheet.mergeCells(startRow + runStart, START, startRow + runEnd, START);
      }
      runStart = runEnd + 1;
    }
  }

  return startRow + rows.length + 1;
}

function pipelineHeaders(report: PartnersReportData): string[] {
  return [
    report.meta.primaryRoleName || 'Partner',
    'R.No',
    'SD/EOI/Bid/PI',
    'Customer Name',
    'Deal Name',
    'Stage',
    'Deal Status',
    ...report.meta.assignmentRoles.map((role) => role.label),
    'Value',
    'Fiscal Year',
    'Quarter',
    ...report.meta.customFieldColumns.map((field) => field.label),
  ];
}

function pipelineCells(
  row: PartnerPipelineRow,
  report: PartnersReportData,
): Array<string | number> {
  return [
    row.partnerName,
    row.rowNumber,
    row.opportunityType || EMPTY,
    row.customerName || EMPTY,
    row.dealName || EMPTY,
    row.stage || EMPTY,
    row.dealRegistrationStatus || EMPTY,
    ...report.meta.assignmentRoles.map(
      (role) => row.roleValues[role.id] || EMPTY,
    ),
    row.value || EMPTY,
    row.fiscalYear || EMPTY,
    row.quarter || EMPTY,
    ...report.meta.customFieldColumns.map(
      (field) => row.customValues[field.id] || EMPTY,
    ),
  ];
}

function writePipelineSheet(
  workbook: import('exceljs').Workbook,
  name: string,
  title: string,
  rows: PartnerPipelineRow[],
  report: PartnersReportData,
  logo: ReportLogoImage | null,
  options?: {
    stageColorMode?: 'full' | 'indicator';
    skipFirstColumnColor?: boolean;
  },
) {
  const headers = pipelineHeaders(report);
  const sheet = workbook.addWorksheet(name.slice(0, 31));
  setupSheet(sheet, headers.length, Boolean(logo));
  let row = writeSheetHeader(
    workbook,
    sheet,
    report.meta.companyName,
    title,
    report.meta.periodLabel,
    report.meta.generatedAt,
    logo,
    headers.length,
    report.meta.filterSummary,
  );
  row = writeSectionBanner(sheet, row, title, START + headers.length - 1);
  writeTableHeader(sheet, row, headers);
  writeDataRows(
    sheet,
    row + 1,
    rows.map((item) => pipelineCells(item, report)),
    {
      stageColors: rows.map((item) => item.stageColor),
      mergeFirstColumn: true,
      firstColumnKeys: rows.map((item) => item.partnerId),
      stageColorMode: options?.stageColorMode,
      skipFirstColumnColor: options?.skipFirstColumnColor,
    },
  );
}

async function writeTargetSheet(
  workbook: import('exceljs').Workbook,
  report: PartnersReportData,
  logo: ReportLogoImage | null,
  chart: PartnerChartImage | null,
) {
  const sheet = workbook.addWorksheet('Target vs Achievement');
  const headers = [
    // All primary-role partners with targets (not limited to primary partnership type)
    report.meta.primaryRoleName
      ? `${report.meta.primaryRoleName}s`
      : 'Partners',
    'Target',
    'Pipeline',
    'Achievement',
    'Current Partnership Level',
    'Next Partnership Target',
  ];

  setupSheet(sheet, headers.length, Boolean(logo));
  let row = writeSheetHeader(
    workbook,
    sheet,
    report.meta.companyName,
    report.meta.sheetTitles.targetVsAchievement,
    report.meta.periodLabel,
    report.meta.generatedAt,
    logo,
    headers.length,
    report.meta.filterSummary,
  );
  row = writeSectionBanner(
    sheet,
    row,
    report.meta.sheetTitles.targetVsAchievement,
    START + headers.length - 1,
  );

  writeTableHeader(sheet, row, headers);
  const dataRows = report.targetVsAchievement.map((item) => [
    item.name,
    item.target,
    item.pipeline,
    item.achievement,
    item.partnershipLevel || EMPTY,
    item.nextPartnershipTarget || EMPTY,
  ]);
  row = writeDataRows(sheet, row + 1, dataRows);

  if (report.targetVsAchievement.length) {
    const totals = report.targetVsAchievement.reduce(
      (acc, item) => {
        acc.target += item.target;
        acc.pipeline += item.pipeline;
        acc.achievement += item.achievement;
        return acc;
      },
      { target: 0, pipeline: 0, achievement: 0 },
    );
    const totalRow = row;
    const values = [
      'Grand Total',
      totals.target,
      totals.pipeline,
      totals.achievement,
      '',
      '',
    ];
    for (let c = 0; c < values.length; c += 1) {
      const cell = sheet.getCell(totalRow, START + c);
      cell.value = values[c];
      cell.font = {
        name: FONT,
        bold: true,
        size: 10,
        color: { argb: C.slate900 },
      };
      cell.fill = solid(C.slate100);
      cell.border = {
        top: thin(),
        left: thin(),
        right: thin(),
        bottom: thin(),
      };
    }
    row = totalRow + 2;
  }

  if (chart?.buffer) {
    const imageId = workbook.addImage({
      buffer: chart.buffer,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: START - 1, row: row - 1 },
      ext: { width: chart.width * 0.75, height: chart.height * 0.75 },
    });
  }
}

async function writeChartsSheet(
  workbook: import('exceljs').Workbook,
  report: PartnersReportData,
  logo: ReportLogoImage | null,
  charts: PartnerChartImage[],
) {
  const sheet = workbook.addWorksheet(
    report.meta.sheetTitles.partnersChart.slice(0, 31),
  );
  setupSheet(sheet, 8, Boolean(logo));
  let row = writeSheetHeader(
    workbook,
    sheet,
    report.meta.companyName,
    report.meta.sheetTitles.partnersChart,
    report.meta.periodLabel,
    report.meta.generatedAt,
    logo,
    8,
    report.meta.filterSummary,
  );
  row = writeSectionBanner(
    sheet,
    row,
    report.meta.sheetTitles.partnersChart,
    START + 7,
  );

  if (!charts.length) {
    sheet.getCell(row, START).value =
      `No ${report.meta.primaryPartnershipTypeName || 'primary-type'} partner pipeline to chart.`;
    sheet.getCell(row, START).font = {
      name: FONT,
      italic: true,
      color: { argb: C.slate500 },
    };
    return;
  }

  // Two-column layout of pie images
  const colWidthPx = 280;
  for (let i = 0; i < charts.length; i += 1) {
    const chart = charts[i];
    if (!chart.buffer) continue;
    const imageId = workbook.addImage({
      buffer: chart.buffer,
      extension: 'png',
    });
    const colOffset = i % 2 === 0 ? START - 1 : START - 1 + 4;
    const rowOffset = row - 1 + Math.floor(i / 2) * 18;
    sheet.addImage(imageId, {
      tl: { col: colOffset, row: rowOffset },
      ext: {
        width: Math.min(chart.width, colWidthPx),
        height: Math.min(chart.height, 260),
      },
    });
  }
}

function writeLeadSheet(
  workbook: import('exceljs').Workbook,
  report: PartnersReportData,
  logo: ReportLogoImage | null,
) {
  const headers = [
    'Lead ID',
    `${report.meta.primaryRoleName || 'Partner'} Name`,
    'Client Name (Company)',
    'Solution Area',
    'Estimated Value',
    'Stage',
    'Report',
    'Next Action',
    'Blockers',
    ...report.meta.leadCustomFieldColumns.map((field) => field.label),
  ];
  const sheet = workbook.addWorksheet(
    report.meta.sheetTitles.partnerLeadPipeline.slice(0, 31),
  );
  setupSheet(sheet, headers.length, Boolean(logo));
  let row = writeSheetHeader(
    workbook,
    sheet,
    report.meta.companyName,
    report.meta.sheetTitles.partnerLeadPipeline,
    report.meta.periodLabel,
    report.meta.generatedAt,
    logo,
    headers.length,
    report.meta.filterSummary,
  );
  row = writeSectionBanner(
    sheet,
    row,
    report.meta.sheetTitles.partnerLeadPipeline,
    START + headers.length - 1,
  );

  writeTableHeader(sheet, row, headers);
  const body = report.partnerLeadPipeline.map(
    (item: PartnerLeadPipelineRow) => [
      item.leadId,
      item.partnerName || EMPTY,
      item.clientName || EMPTY,
      item.solutionArea || EMPTY,
      item.estimatedValue ?? EMPTY,
      item.stage || EMPTY,
      item.report || EMPTY,
      item.nextAction || EMPTY,
      item.blockers || EMPTY,
      ...report.meta.leadCustomFieldColumns.map(
        (field) => item.customValues[field.id] || EMPTY,
      ),
    ],
  );
  writeDataRows(sheet, row + 1, body, {
    stageColors: report.partnerLeadPipeline.map((item) => item.stageColor),
    stageColorMode: report.meta.pipelineRowColorMode ?? 'full',
  });
}

export async function exportPartnersReportXlsx(
  report: PartnersReportData,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.meta.companyName || 'CRM';
  workbook.created = new Date();

  const selected = new Set(report.meta.selectedSections);
  const [logo, partnerCharts, targetChart] = await Promise.all([
    loadTenantLogoPng(report.meta.logoUrl),
    selected.has('partners_chart')
      ? renderPartnerStageCharts(report)
      : Promise.resolve([] as PartnerChartImage[]),
    selected.has('target_vs_achievement')
      ? renderTargetAchievementChartPng(report.targetVsAchievement)
      : Promise.resolve(null as PartnerChartImage | null),
  ]);

  if (selected.has('target_vs_achievement')) {
    await writeTargetSheet(workbook, report, logo, targetChart);
  }
  if (selected.has('partners_chart')) {
    await writeChartsSheet(workbook, report, logo, partnerCharts);
  }
  if (selected.has('vendor_pipeline')) {
    writePipelineSheet(
      workbook,
      report.meta.sheetTitles.vendorPipeline,
      report.meta.sheetTitles.vendorPipeline,
      report.vendorPipeline,
      report,
      logo,
      {
        stageColorMode: report.meta.pipelineRowColorMode ?? 'full',
        skipFirstColumnColor: true,
      },
    );
  }
  if (selected.has('strategic_vendors')) {
    writePipelineSheet(
      workbook,
      report.meta.sheetTitles.strategicVendors,
      report.meta.sheetTitles.strategicVendors,
      report.strategicPipeline,
      report,
      logo,
      {
        stageColorMode: report.meta.pipelineRowColorMode ?? 'full',
        skipFirstColumnColor: true,
      },
    );
  }
  if (selected.has('partner_lead_pipeline')) {
    writeLeadSheet(workbook, report, logo);
  }

  if (!workbook.worksheets.length) {
    throw new Error('Select at least one report section to export');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase(report)}.xlsx`,
  );
}

/* ---------------- PDF ---------------- */

type JsPdf = import('jspdf').jsPDF;

function pdfSafe(value: string): string {
  return value
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/[^\x20-\x7E\n\r\t]/g, '?');
}

function brandRgb(): [number, number, number] {
  return [237, 105, 37]; // #ed6925
}

class PartnersPdfWriter {
  doc: JsPdf;
  report: PartnersReportData;
  logo: ReportLogoImage | null;
  y = 0;
  page = 1;
  readonly margin = 36;
  readonly pageW: number;
  readonly pageH: number;

  constructor(
    doc: JsPdf,
    report: PartnersReportData,
    logo: ReportLogoImage | null,
  ) {
    this.doc = doc;
    this.report = report;
    this.logo = logo;
    this.pageW = doc.internal.pageSize.getWidth();
    this.pageH = doc.internal.pageSize.getHeight();
    this.y = this.margin;
  }

  ensure(space: number) {
    if (this.y + space <= this.pageH - this.margin) return;
    this.doc.addPage();
    this.page += 1;
    this.y = this.margin;
    this.headerBand(false);
  }

  headerBand(firstPage: boolean) {
    const { doc, report, logo } = this;
    const { meta } = report;
    const brand = brandRgb();
    doc.setFillColor(...brand);
    doc.rect(0, 0, this.pageW, 6, 'F');

    let titleX = this.margin;
    if (logo) {
      try {
        const dataUrl = arrayBufferToDataUrl(logo.buffer);
        doc.addImage(dataUrl, 'PNG', this.margin, this.y, 28, 16);
        titleX = this.margin + 34;
      } catch {
        // ignore logo failures
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(meta.companyName || meta.title), titleX, this.y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const right = pdfSafe(
      `PERIOD: ${meta.periodLabel}   |  Generated: ${meta.generatedAt}${firstPage ? '' : `   |  p.${this.page}`}`,
    );
    doc.text(right, this.pageW - this.margin, this.y + 10, { align: 'right' });

    let metaY = this.y + 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(meta.reportKindLabel), titleX, metaY);
    metaY += 12;
    if (meta.filterSummary) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const filterLines = doc.splitTextToSize(
        pdfSafe(meta.filterSummary),
        this.pageW - this.margin - titleX,
      );
      doc.text(filterLines, titleX, metaY);
      metaY += filterLines.length * 9 + 2;
    }
    this.y = Math.max(this.margin + 40, metaY + 4);
  }

  sectionTitle(title: string, subtitle?: string) {
    this.ensure(28);
    this.y += 4;
    docSet(this.doc, 'helvetica', 'bold', 12, [15, 23, 42]);
    this.doc.text(pdfSafe(title), this.margin, this.y);
    if (subtitle) {
      docSet(this.doc, 'helvetica', 'normal', 8, [100, 116, 139]);
      this.doc.text(pdfSafe(subtitle), this.pageW - this.margin, this.y, {
        align: 'right',
      });
    }
    this.y += 6;
    this.doc.setFillColor(255, 247, 237);
    this.doc.rect(this.margin, this.y, this.pageW - this.margin * 2, 3, 'F');
    this.y += 14;
  }

  table(
    headers: string[],
    rows: Array<Array<string | number>>,
    options?: {
      stageColors?: Array<string | null | undefined>;
      stageColorMode?: 'full' | 'indicator';
      skipFirstColumnColor?: boolean;
    },
  ) {
    const stageColors = options?.stageColors;
    const colorMode = options?.stageColorMode ?? 'indicator';
    const skipFirst = Boolean(options?.skipFirstColumnColor);
    const usable = this.pageW - this.margin * 2;
    const colW = usable / Math.max(headers.length, 1);
    const rowH = 16;
    const top = () => this.y - 10;

    const drawHeader = () => {
      this.ensure(rowH + 4);
      this.doc.setFillColor(241, 245, 249);
      this.doc.rect(this.margin, top(), usable, rowH, 'F');
      docSet(this.doc, 'helvetica', 'bold', 7, [71, 85, 105]);
      headers.forEach((header, i) => {
        this.doc.text(
          pdfSafe(String(header)).slice(0, 28),
          this.margin + i * colW + 2,
          this.y,
          { maxWidth: colW - 4 },
        );
      });
      this.y += rowH;
    };

    drawHeader();

    if (!rows.length) {
      docSet(this.doc, 'helvetica', 'italic', 9, [100, 116, 139]);
      this.doc.text('No records for this section.', this.margin, this.y);
      this.y += 18;
      return;
    }

    rows.forEach((cells, rowIndex) => {
      this.ensure(rowH + 4);
      const color = stageColors?.[rowIndex];
      const rgb = color ? hexToRgb(color) : null;
      const zebra = rowIndex % 2 === 1;

      if (colorMode === 'full' && rgb) {
        if (skipFirst) {
          if (zebra) {
            this.doc.setFillColor(248, 250, 252);
            this.doc.rect(this.margin, top(), colW, rowH, 'F');
          }
          this.doc.setFillColor(rgb.r, rgb.g, rgb.b);
          this.doc.rect(
            this.margin + colW,
            top(),
            Math.max(usable - colW, 0),
            rowH,
            'F',
          );
        } else {
          this.doc.setFillColor(rgb.r, rgb.g, rgb.b);
          this.doc.rect(this.margin, top(), usable, rowH, 'F');
        }
      } else if (zebra) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(this.margin, top(), usable, rowH, 'F');
      }

      if (colorMode === 'indicator' && rgb) {
        const barX = skipFirst ? this.margin + colW : this.margin;
        this.doc.setFillColor(rgb.r, rgb.g, rgb.b);
        this.doc.rect(barX, top(), 4, rowH, 'F');
      }

      cells.forEach((cell, i) => {
        const isPartnerCol = skipFirst && i === 0;
        const applyFull = colorMode === 'full' && rgb && !isPartnerCol;
        const textRgb = applyFull
          ? textOnStageColorRgb(color!)
          : ([51, 65, 85] as [number, number, number]);
        const indent =
          colorMode === 'indicator' &&
          ((skipFirst && i === 1) || (!skipFirst && i === 0))
            ? 8
            : 2;
        docSet(this.doc, 'helvetica', i === 0 ? 'bold' : 'normal', 7, textRgb);
        this.doc.text(
          pdfSafe(String(cell ?? EMPTY)).slice(0, 40),
          this.margin + i * colW + indent,
          this.y,
          { maxWidth: colW - (indent + 2) },
        );
      });
      this.y += rowH;
    });
    this.y += 10;
  }

  async images(images: PartnerChartImage[], columns = 2) {
    const usable = this.pageW - this.margin * 2;
    const gap = 8;
    const cellW = (usable - gap * (columns - 1)) / columns;
    let col = 0;
    let rowTop = this.y;

    for (const image of images) {
      if (!image.buffer) continue;
      const scale = cellW / image.width;
      const drawH = image.height * scale;
      if (col === 0) {
        this.ensure(drawH + 8);
        rowTop = this.y;
      }
      try {
        const dataUrl = arrayBufferToDataUrl(image.buffer);
        const x = this.margin + col * (cellW + gap);
        this.doc.addImage(dataUrl, 'PNG', x, rowTop, cellW, drawH);
      } catch {
        // ignore
      }
      col += 1;
      if (col >= columns) {
        col = 0;
        this.y = rowTop + drawH + 10;
      }
    }
    if (col !== 0) this.y = rowTop + 180;
  }
}

function docSet(
  doc: JsPdf,
  font: string,
  style: 'normal' | 'bold' | 'italic',
  size: number,
  rgb: [number, number, number],
) {
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const num = Number.parseInt(cleaned, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export async function exportPartnersReportPdf(
  report: PartnersReportData,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });
  const selected = new Set(report.meta.selectedSections);
  const [logo, partnerCharts, targetChart] = await Promise.all([
    loadTenantLogoPng(report.meta.logoUrl),
    selected.has('partners_chart')
      ? renderPartnerStageCharts(report)
      : Promise.resolve([] as PartnerChartImage[]),
    selected.has('target_vs_achievement')
      ? renderTargetAchievementChartPng(report.targetVsAchievement)
      : Promise.resolve(null as PartnerChartImage | null),
  ]);

  const pdf = new PartnersPdfWriter(doc, report, logo);
  pdf.headerBand(true);
  const pipelineColorMode = report.meta.pipelineRowColorMode ?? 'full';

  if (selected.has('target_vs_achievement')) {
    pdf.sectionTitle(
      report.meta.sheetTitles.targetVsAchievement,
      `${report.targetVsAchievement.length} partners with targets`,
    );
    pdf.table(
      [
        report.meta.primaryRoleName || 'Partner',
        'Target',
        'Pipeline',
        'Achievement',
        'Partnership Level',
        'Next Target',
      ],
      report.targetVsAchievement.map((item) => [
        item.name,
        money(item.target),
        money(item.pipeline),
        money(item.achievement),
        item.partnershipLevel || EMPTY,
        item.nextPartnershipTarget || EMPTY,
      ]),
    );
    if (targetChart?.buffer) {
      await pdf.images([targetChart], 1);
    }
  }

  if (selected.has('partners_chart')) {
    pdf.sectionTitle(
      report.meta.sheetTitles.partnersChart,
      `${report.partnerCharts.length} ${
        report.meta.primaryPartnershipTypeName || 'primary'
      } partners`,
    );
    await pdf.images(partnerCharts, 2);
  }

  if (selected.has('vendor_pipeline')) {
    pdf.sectionTitle(
      report.meta.sheetTitles.vendorPipeline,
      `${report.vendorPipeline.length} opportunities`,
    );
    const headers = pipelineHeaders(report);
    pdf.table(
      headers,
      report.vendorPipeline.map((row) => pipelineCells(row, report)),
      {
        stageColors: report.vendorPipeline.map((row) => row.stageColor),
        stageColorMode: pipelineColorMode,
        skipFirstColumnColor: true,
      },
    );
  }

  if (selected.has('strategic_vendors')) {
    pdf.sectionTitle(
      report.meta.sheetTitles.strategicVendors,
      `${report.strategicPipeline.length} opportunities`,
    );
    pdf.table(
      pipelineHeaders(report),
      report.strategicPipeline.map((row) => pipelineCells(row, report)),
      {
        stageColors: report.strategicPipeline.map((row) => row.stageColor),
        stageColorMode: pipelineColorMode,
        skipFirstColumnColor: true,
      },
    );
  }

  if (selected.has('partner_lead_pipeline')) {
    pdf.sectionTitle(
      report.meta.sheetTitles.partnerLeadPipeline,
      `${report.partnerLeadPipeline.length} originated opportunities`,
    );
    pdf.table(
      [
        'Lead ID',
        report.meta.primaryRoleName || 'Partner',
        'Client',
        'Solution Area',
        'Value',
        'Stage',
        'Report',
        'Next Action',
        'Blockers',
      ],
      report.partnerLeadPipeline.map((item) => [
        item.leadId,
        item.partnerName || EMPTY,
        item.clientName || EMPTY,
        item.solutionArea || EMPTY,
        item.estimatedValue ?? EMPTY,
        item.stage || EMPTY,
        item.report || EMPTY,
        item.nextAction || EMPTY,
        item.blockers || EMPTY,
      ]),
      {
        stageColors: report.partnerLeadPipeline.map((item) => item.stageColor),
        stageColorMode: pipelineColorMode,
      },
    );
  }

  doc.save(`${filenameBase(report)}.pdf`);
}
