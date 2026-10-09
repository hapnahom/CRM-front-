import { saveAs } from 'file-saver';
import type { Worksheet, Workbook } from 'exceljs';
import { tokens } from '@/lib/design-tokens';
import { renderChartPng } from './export-report-pdf';
import type {
  GeneratedReport,
  ReportChart,
  ReportKpi,
  ReportSection,
} from './types';

const HEADER_FILL = `FF${tokens.color.brand.replace('#', '').toUpperCase()}`;
const ZEBRA_FILL = 'FFF9FAFB';
const KPI_LABEL_FILL = 'FFF8FAFC';
const SECTION_FILL = `FF${tokens.color.brand.replace('#', '').toUpperCase()}`;

function buildFilename(name: string): string {
  const base = (name || 'CRM_Report')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
  const date = new Date().toISOString().slice(0, 10);
  return `${base || 'CRM_Report'}_${date}.xlsx`;
}

function styleTableHeader(
  sheet: Worksheet,
  rowNumber: number,
  colCount: number,
) {
  const row = sheet.getRow(rowNumber);
  for (let c = 1; c <= colCount; c += 1) {
    const cell = row.getCell(c);
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      name: 'Calibri',
      size: 10,
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  }
}

function zebraRange(
  sheet: Worksheet,
  startRow: number,
  endRow: number,
  colCount: number,
) {
  for (let r = startRow; r <= endRow; r += 1) {
    if ((r - startRow) % 2 === 1) continue;
    const row = sheet.getRow(r);
    for (let c = 1; c <= colCount; c += 1) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: ZEBRA_FILL },
      };
    }
  }
}

function setColWidths(sheet: Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

function blankRow(sheet: Worksheet) {
  sheet.addRow([]);
}

function writeBanner(
  sheet: Worksheet,
  report: GeneratedReport,
  subtitle: string,
) {
  const filters = report.filterTags
    .filter((t) => !t.startsWith('Period:'))
    .join(' · ');

  const titleRow = sheet.addRow([
    report.name || 'CRM Report',
    '',
    '',
    '',
    `Period: ${report.periodLabel || '—'}`,
  ]);
  titleRow.font = {
    bold: true,
    size: 12,
    name: 'Calibri',
    color: { argb: 'FF111827' },
  };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 4);
  sheet.mergeCells(titleRow.number, 5, titleRow.number, 7);

  const metaRow = sheet.addRow([
    subtitle,
    '',
    '',
    '',
    `Generated: ${report.generatedAt}${report.generatedBy ? ` · ${report.generatedBy}` : ''}`,
  ]);
  metaRow.font = { size: 9, name: 'Calibri', color: { argb: 'FF6B7280' } };
  sheet.mergeCells(metaRow.number, 1, metaRow.number, 4);
  sheet.mergeCells(metaRow.number, 5, metaRow.number, 7);

  if (filters) {
    const filterRow = sheet.addRow([`Filters: ${filters}`]);
    filterRow.font = { size: 8, name: 'Calibri', color: { argb: 'FF9CA3AF' } };
    sheet.mergeCells(filterRow.number, 1, filterRow.number, 7);
  }
}

function writeKpiStrip(sheet: Worksheet, kpis: ReportKpi[]) {
  if (!kpis.length) return;
  blankRow(sheet);

  const labels = kpis.map((k) => k.label.toUpperCase());
  const values = kpis.map((k) => k.value);
  const hints = kpis.map((k) => k.hint ?? '');

  while (labels.length < 4) {
    labels.push('');
    values.push('');
    hints.push('');
  }

  const labelRow = sheet.addRow(labels.slice(0, 4));
  labelRow.font = {
    bold: true,
    size: 8,
    name: 'Calibri',
    color: { argb: 'FF6B7280' },
  };
  labelRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: KPI_LABEL_FILL },
    };
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });

  const valueRow = sheet.addRow(values.slice(0, 4));
  valueRow.font = {
    bold: true,
    size: 12,
    name: 'Calibri',
    color: { argb: 'FF111827' },
  };
  valueRow.eachCell((cell) => {
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });

  const hintRow = sheet.addRow(hints.slice(0, 4));
  hintRow.font = { size: 8, name: 'Calibri', color: { argb: 'FF9CA3AF' } };
  hintRow.eachCell((cell) => {
    cell.alignment = { wrapText: true, vertical: 'top' };
  });

  // Extra KPIs beyond 4 go on another strip
  if (kpis.length > 4) {
    writeKpiStrip(sheet, kpis.slice(4));
  }
}

function writeSectionBanner(sheet: Worksheet, title: string, hint?: string) {
  blankRow(sheet);
  const text = hint ? `▶  ${title}  [ ${hint} ]` : `▶  ${title}`;
  const row = sheet.addRow([text]);
  row.font = {
    bold: true,
    size: 10,
    name: 'Calibri',
    color: { argb: 'FFFFFFFF' },
  };
  row.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: SECTION_FILL },
  };
  sheet.mergeCells(row.number, 1, row.number, 7);
}

function writeDataTable(sheet: Worksheet, section: ReportSection) {
  if (!section.columns.length) return;

  writeSectionBanner(
    sheet,
    section.title,
    section.description?.slice(0, 80) || undefined,
  );

  const headers = section.columns.map((c) => c.label);
  const headerRow = sheet.addRow(headers);
  styleTableHeader(sheet, headerRow.number, headers.length);

  const start = headerRow.number + 1;
  for (const row of section.rows) {
    const excelRow = sheet.addRow(
      section.columns.map((col) => {
        const v = row.cells[col.id];
        return v == null ? '' : String(v);
      }),
    );
    section.columns.forEach((col, index) => {
      const color = row.cellColors?.[col.id];
      if (!color) return;
      const argb = color.replace('#', '').toUpperCase();
      if (!/^[0-9A-F]{6}$/.test(argb) && !/^[0-9A-F]{8}$/.test(argb)) return;
      excelRow.getCell(index + 1).font = {
        name: 'Calibri',
        size: 9,
        bold: true,
        color: { argb: argb.length === 6 ? `FF${argb}` : argb },
      };
    });
  }
  const end = sheet.rowCount;
  if (end >= start) zebraRange(sheet, start, end, headers.length);
}

/** Excel column width (character units) → approximate screen pixels. */
function excelColWidthToPx(width: number): number {
  return Math.floor(((256 * width + Math.floor(128 / 7)) / 256) * 7);
}

/** Stitch chart PNGs into one horizontal strip (no Excel inter-image gap). */
async function stitchChartsRowPng(
  buffers: Array<ArrayBuffer | null>,
  gapPx = 8,
): Promise<{ buffer: ArrayBuffer; width: number; height: number } | null> {
  if (typeof document === 'undefined') return null;
  const bitmaps: ImageBitmap[] = [];
  try {
    for (const buf of buffers) {
      if (!buf) continue;
      bitmaps.push(
        await createImageBitmap(
          new Blob([new Uint8Array(buf)], { type: 'image/png' }),
        ),
      );
    }
    if (!bitmaps.length) return null;

    const height = Math.max(...bitmaps.map((b) => b.height));
    const width =
      bitmaps.reduce((sum, b) => sum + b.width, 0) +
      gapPx * (bitmaps.length - 1);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    let x = 0;
    for (const bmp of bitmaps) {
      const y = Math.floor((height - bmp.height) / 2);
      ctx.drawImage(bmp, x, y);
      x += bmp.width + gapPx;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) return null;
    return { buffer: await blob.arrayBuffer(), width, height };
  } finally {
    for (const bmp of bitmaps) bmp.close();
  }
}

/**
 * Embed chart PNGs on the Overview sheet.
 * Excel: all four charts on one row (single stitched image — no column gaps).
 */
async function writeChartsBlock(
  sheet: Worksheet,
  workbook: Workbook,
  charts: ReportChart[],
) {
  if (!charts.length) return;
  writeSectionBanner(
    sheet,
    'PIPELINE / TARGET VISUALIZATIONS',
    'All charts on one row',
  );
  blankRow(sheet);

  const buffers = await Promise.all(charts.map((c) => renderChartPng(c)));
  const stitched = await stitchChartsRowPng(buffers, 8);
  if (!stitched) return;

  // Wide enough sheet area for the full strip.
  const CHART_COL_W = 12;
  const displayW = Math.min(stitched.width, 1040);
  const scale = displayW / stitched.width;
  const displayH = Math.round(stitched.height * scale);
  const colsSpanned = Math.max(
    8,
    Math.ceil(displayW / excelColWidthToPx(CHART_COL_W)) + 1,
  );
  for (let c = 1; c <= colsSpanned; c += 1) {
    sheet.getColumn(c).width = CHART_COL_W;
  }

  const rowsNeeded = Math.max(8, Math.ceil(displayH / 15));
  const startRow = sheet.rowCount;
  for (let r = 0; r < rowsNeeded; r += 1) {
    const empty = sheet.addRow(Array.from({ length: colsSpanned }, () => ''));
    empty.height = 15;
  }

  const imageId = workbook.addImage({
    // exceljs browser typings expect Buffer; Uint8Array works at runtime
    buffer: new Uint8Array(stitched.buffer) as never,
    extension: 'png',
  });
  sheet.addImage(imageId, {
    tl: { col: 0, row: startRow },
    ext: { width: displayW, height: displayH },
    editAs: 'oneCell',
  });

  blankRow(sheet);
}

/**
 * Excel mirrors on-screen generated report.
 * Sales-only: permission Overview + Sales Registry (2 sheets).
 * Otherwise: Overview + one Registry sheet per selected category.
 */
function finalizeSheet(sheet: Worksheet) {
  setColWidths(sheet, [34, 34, 34, 34, 18, 16, 18]);
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];
}

const SALES_SECTION_SHORT_TITLE: Record<string, string> = {
  'sales-team-performance': 'Team Performance',
  'sales-rep-performance': 'Rep Performance',
  'sales-customer-concentration': 'Customer Concentration',
  'sales-opportunity-registry': 'Total Opportunity',
  'sales-closed-won': 'Closed Won',
};

const CATEGORY_REGISTRY_NAME: Record<string, string> = {
  sales: 'Sales Registry',
  customers: 'Customers Registry',
  marketing: 'Marketing Registry',
  'partners-vendors': 'Partners Registry',
  'targets-performance': 'Targets Registry',
};

function excelSheetName(raw: string): string {
  const cleaned =
    raw
      .replace(/[:\\/?*[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Sheet';
  return cleaned.slice(0, 31);
}

function isSalesOnlyReport(report: GeneratedReport): boolean {
  if (report.excelLayout?.mode === 'sales-two-sheet') return true;

  const cats = (report.categories ?? []).map((c) => String(c).toLowerCase());
  if (cats.length === 1 && cats[0] === 'sales') return true;

  const salesSections =
    report.sections.length > 0 &&
    report.sections.every(
      (s) => s.categoryId === 'sales' || String(s.id).startsWith('sales-'),
    );
  const mixedCategories = cats.some((c) => c && c !== 'sales');
  return salesSections && !mixedCategories;
}

function resolveSalesSheetNames(report: GeneratedReport): {
  overview: string;
  registry: string;
} {
  if (report.excelLayout?.mode === 'sales-two-sheet') {
    return {
      overview: excelSheetName(report.excelLayout.overviewSheet),
      registry: excelSheetName(
        report.excelLayout.registrySheet || 'Sales Registry',
      ),
    };
  }

  const orgTag = report.filterTags.find(
    (t) =>
      t.startsWith('Teams:') || t.startsWith('Team:') || t.startsWith('Owner:'),
  );
  let overview = 'Executive Overview';
  if (orgTag?.startsWith('Owner:')) {
    const person = orgTag.replace(/^Owner:\s*/, '').slice(0, 20);
    overview = `${person} Overview`;
  } else if (orgTag?.startsWith('Team:')) {
    const team = orgTag.replace(/^Team:\s*/, '').slice(0, 20);
    overview = `${team} Overview`;
  } else if (orgTag?.startsWith('Teams: All teams in ')) {
    overview = 'Department Overview';
  } else if (orgTag === 'Teams: All teams') {
    overview = 'Executive Overview';
  } else {
    const scope = report.filterTags
      .find((t) => t.startsWith('Scope:'))
      ?.replace(/^Scope:\s*/, '');
    if (scope === 'Department') overview = 'Department Overview';
    else if (scope === 'Team') overview = 'Team Overview';
    else if (scope === 'My records') {
      const person = (report.generatedBy || 'Personal').slice(0, 20);
      overview = `${person} Overview`;
    }
  }

  return {
    overview: excelSheetName(overview),
    registry: excelSheetName('Sales Registry'),
  };
}

function shortSectionTitle(section: ReportSection): string {
  return SALES_SECTION_SHORT_TITLE[section.id] || section.title;
}

function sectionCategoryId(section: ReportSection): string {
  if (section.categoryId) return String(section.categoryId);
  const id = String(section.id || '');
  if (id.startsWith('sales-')) return 'sales';
  if (id.startsWith('marketing') || id.includes('lead')) return 'marketing';
  if (id.startsWith('customer') || id.includes('account')) return 'customers';
  if (id.includes('partner') || id.includes('vendor'))
    return 'partners-vendors';
  if (id.includes('target')) return 'targets-performance';
  return 'other';
}

function registrySheetName(categoryId: string): string {
  return excelSheetName(
    CATEGORY_REGISTRY_NAME[categoryId] ||
      `${categoryId
        .split('-')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')} Registry`,
  );
}

function uniqueSheetName(workbook: Workbook, base: string): string {
  const name = excelSheetName(base);
  if (!workbook.getWorksheet(name)) return name;
  for (let i = 2; i < 20; i += 1) {
    const candidate = excelSheetName(`${name.slice(0, 28)} ${i}`);
    if (!workbook.getWorksheet(candidate)) return candidate;
  }
  return excelSheetName(`${name.slice(0, 27)} X`);
}

async function buildAlignedWorkbook(
  workbook: Workbook,
  report: GeneratedReport,
) {
  const hasOverview = report.kpis.length > 0 || report.charts.length > 0;
  const sections = report.sections;

  if (isSalesOnlyReport(report)) {
    const { overview, registry } = resolveSalesSheetNames(report);

    if (hasOverview) {
      const sheet = workbook.addWorksheet(uniqueSheetName(workbook, overview));
      writeBanner(sheet, report, 'Overview · KPIs & charts');
      finalizeSheet(sheet);
      writeKpiStrip(sheet, report.kpis);
      await writeChartsBlock(sheet, workbook, report.charts);
    }

    if (sections.length) {
      const sheet = workbook.addWorksheet(uniqueSheetName(workbook, registry));
      writeBanner(sheet, report, 'Sales tables · same order as on screen');
      for (const section of sections) {
        writeDataTable(sheet, {
          ...section,
          title: shortSectionTitle(section),
        });
      }
      finalizeSheet(sheet);
    }
    return;
  }

  // Option 1: Overview + one Registry sheet per category.
  if (hasOverview) {
    const sheet = workbook.addWorksheet(uniqueSheetName(workbook, 'Overview'));
    writeBanner(sheet, report, 'Overview · KPIs & charts');
    finalizeSheet(sheet);
    writeKpiStrip(sheet, report.kpis);
    await writeChartsBlock(sheet, workbook, report.charts);
  }

  if (!sections.length) return;

  const selected = report.categories.map((c) => String(c));
  const categoryOrder = [
    ...selected,
    ...sections
      .map((s) => sectionCategoryId(s))
      .filter((id) => !selected.includes(id)),
  ];
  const seen = new Set<string>();
  const orderedCategories = categoryOrder.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  for (const categoryId of orderedCategories) {
    const categorySections = sections.filter(
      (s) => sectionCategoryId(s) === categoryId,
    );
    if (!categorySections.length) continue;

    const sheet = workbook.addWorksheet(
      uniqueSheetName(workbook, registrySheetName(categoryId)),
    );
    writeBanner(
      sheet,
      report,
      `${CATEGORY_REGISTRY_NAME[categoryId] || categoryId} · same order as on screen`,
    );
    for (const section of categorySections) {
      writeDataTable(sheet, {
        ...section,
        title:
          categoryId === 'sales' ? shortSectionTitle(section) : section.title,
      });
    }
    finalizeSheet(sheet);
  }
}

export async function exportGeneratedReportExcel(
  report: GeneratedReport,
): Promise<string> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CRM Reports';
  workbook.created = new Date();

  await buildAlignedWorkbook(workbook, report);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = buildFilename(report.name);
  saveAs(
    new Blob([buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
  return filename;
}
