import { saveAs } from 'file-saver';
import { masterPipelineSheetTitle } from '@/config/salesWorkflow';
import type { Borders, Fill, Font, Worksheet } from 'exceljs';
import { textOnStageColor } from '@/lib/stage-presets';
import {
  achievementChartHeading,
  achievementSummaryFromRow,
  currencyStageCharts,
  overviewChartCardSize,
  renderAchievementChartPng,
  renderDonutPng,
} from './charts';
import { EMPTY, formatDate, formatMoneyMap } from './format';
import { loadTenantLogoPng, type ReportLogoImage } from './load-logo';
import {
  buildExportPeriodHeaderLines,
  buildPipelineExportFilename,
} from './export-naming';
import { reportTableVisibility } from './report-visibility';
import { collapseRepeatedColumns } from './table-display';
import {
  buildOverviewKpiCards,
  buildOrgTeamsTable,
  buildInactiveOpportunitiesSheetTable,
  buildPipelineSheetTable,
  buildProductPortfolioRows,
  buildSalesRepRows,
  hasSection,
  hasSelectedGroupColumns,
  type ReportKpiCard,
} from './report-layout-data';
import type { SalesPipelineReportData } from './types';

type Argb = string;

const FONT = 'Calibri';
const TABLE_FONT_SIZE = 10;
/** Vertical padding (top + bottom) for wrapped table cells, in points. */
const TABLE_ROW_PADDING = 3;
/** Per-line height for TABLE_FONT_SIZE with wrapText enabled. */
const TABLE_LINE_HEIGHT = TABLE_FONT_SIZE * 1.25;
const GUTTER = 1;
const START = 2; // content starts at column B
const GRID = 7; // default B..H for non-overview sheets
const LAST = START + GRID - 1;
/** Overview band: 5 KPI cards + 4 charts share the same total width (legacy 8×2-col span). */
const CHART_COUNT = 4;
const KPI_CARD_COUNT = 5;
const KPI_CARD_COLS = 2;
const KPI_GRID = KPI_CARD_COUNT * KPI_CARD_COLS; // 10
const KPI_LAST = START + KPI_GRID - 1;
const LEGACY_OVERVIEW_COLS = CHART_COUNT * KPI_CARD_COLS; // 8
const LEGACY_KPI_COL_WIDTH = 31;
/** Narrower columns so 5 cards fit the same band width as 4 chart slots. */
const KPI_COL_WIDTH = (LEGACY_OVERVIEW_COLS * LEGACY_KPI_COL_WIDTH) / KPI_GRID;
/** Horizontal gap between adjacent overview chart images. */
const OVERVIEW_CHART_GAP_PX = 4;
const CHART_CURRENCIES = ['ETB', 'USD'] as const;
/** Reference-style KPI top accent (darker orange). */
const KPI_ACCENT = 'FFE65100';

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
  green: 'FF059669',
  red: 'FFDC2626',
  brand: 'FFED6925',
} as const;

const thin = (argb: Argb = C.slate200) => ({
  style: 'thin' as const,
  color: { argb },
});
const medium = (argb: Argb) => ({ style: 'medium' as const, color: { argb } });
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

function paintRange(
  sheet: Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  opts: {
    fill?: Argb;
    font?: Partial<Font>;
    align?: 'left' | 'center' | 'right';
    border?: Partial<Borders>;
  },
) {
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const cell = sheet.getCell(r, c);
      if (opts.fill) cell.fill = solid(opts.fill);
      if (opts.font) cell.font = { name: FONT, ...opts.font };
      if (opts.align) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: opts.align,
          wrapText: true,
        };
      }
      if (opts.border) cell.border = { ...(cell.border || {}), ...opts.border };
    }
  }
}

function setupSheet(sheet: Worksheet, colCount = GRID, hasLogo = false) {
  // Header rows scroll with the sheet — no sticky/frozen title band.
  sheet.views = [{ state: 'normal', showGridLines: true }];
  sheet.getColumn(GUTTER).width = hasLogo ? 10 : 3;
  const defaults = [22, 30, 26, 18, 18, 16, 16];
  for (let i = 0; i < Math.max(colCount, GRID); i += 1) {
    const col = sheet.getColumn(START + i);
    col.width = Math.max(col.width || 0, defaults[i] ?? 16);
  }
  sheet.getRow(1).height = 10;
}

function setupKpiColumns(sheet: Worksheet) {
  for (let i = 0; i < KPI_GRID; i += 1) {
    sheet.getColumn(START + i).width = KPI_COL_WIDTH;
  }
}

function kpiCardSpan(index: number): [number, number] {
  const c1 = START + index * KPI_CARD_COLS;
  return [c1, c1 + KPI_CARD_COLS - 1];
}

function overviewBandPixelWidth(sheet: Worksheet) {
  let width = 0;
  for (let col = START; col <= KPI_LAST; col += 1) {
    width += columnPixels(sheet, col);
  }
  return width;
}

function chartSlotPixelWidth(sheet: Worksheet) {
  const band = overviewBandPixelWidth(sheet);
  const gaps = OVERVIEW_CHART_GAP_PX * (CHART_COUNT - 1);
  return Math.max(1, (band - gaps) / CHART_COUNT);
}

function valueColorArgb(card: ReportKpiCard): Argb {
  if (!card.valueColor) return C.slate800;
  if (card.valueColor.startsWith('#')) {
    return `FF${card.valueColor.slice(1).toUpperCase()}`;
  }
  return card.valueColor as Argb;
}

const HEADER_LOGO_H = 36;
const HEADER_LOGO_MAX_W = 72;

function writeHeader(
  workbook: import('exceljs').Workbook,
  sheet: Worksheet,
  companyName: string,
  subtitle: string,
  periodLabel: string,
  generatedAt: string,
  endCol: number = LAST,
  logo: ReportLogoImage | null = null,
  metaLine?: string | null,
  periodHeaderLines: string[] = [],
  filterSummary?: string | null,
): number {
  const last = Math.max(endCol, START + 4);
  const mid = START + 3;
  sheet.mergeCells(2, START, 2, mid);
  sheet.mergeCells(2, mid + 1, 2, last);

  const title = sheet.getCell(2, START);
  title.value = companyName || 'Executive Report';
  title.font = {
    name: FONT,
    bold: true,
    size: 16,
    color: { argb: C.slate900 },
  };
  title.alignment = { vertical: 'middle', horizontal: 'left' };

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
    sheet.mergeCells(detailRow, START, detailRow, last);
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
  sheet.mergeCells(detailRow, mid + 1, detailRow, last);

  const entityBlock = periodHeaderLines.filter(Boolean).join('\n');
  const kindLine = metaLine?.trim();
  const subParts = [entityBlock, kindLine, subtitle].filter(Boolean);
  const sub = sheet.getCell(detailRow, START);
  sub.value = subParts.join('\n');
  sub.font = { name: FONT, size: 11, color: { argb: C.slate500 } };
  sub.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  const generated = sheet.getCell(detailRow, mid + 1);
  generated.value = `Generated: ${generatedAt}`;
  generated.font = { name: FONT, size: 10, color: { argb: C.slate500 } };
  generated.alignment = { vertical: 'middle', horizontal: 'right' };

  sheet.getRow(2).height = logo ? 40 : 28;
  const subLineCount = Math.max(subParts.join('\n').split('\n').length, 1);
  sheet.getRow(detailRow).height = Math.max(18, subLineCount * 14);

  if (logo) {
    const ratio = logo.width / Math.max(logo.height, 1);
    const height = HEADER_LOGO_H;
    const width = Math.min(HEADER_LOGO_MAX_W, Math.round(height * ratio));
    // Row 2 is 40pt ≈ 53px; center the logo vertically in that band.
    const rowPixels = Math.round(40 / 0.75);
    const yPx = Math.max(0, Math.round((rowPixels - height) / 2));
    addPng(
      workbook,
      sheet,
      logo.buffer,
      {
        nativeCol: GUTTER - 1,
        nativeColOff: Math.round(4 * 9525),
        nativeRow: 1,
        nativeRowOff: Math.round(yPx * 9525),
      },
      width,
      height,
    );
  }

  return detailRow;
}

function writeKpiCards(
  sheet: Worksheet,
  startRow: number,
  cards: ReportKpiCard[],
): number {
  setupKpiColumns(sheet);

  // Breathing room above the card row (reference uses a short spacer).
  sheet.getRow(startRow - 1).height = Math.max(
    sheet.getRow(startRow - 1).height || 0,
    10,
  );

  const primary = cards.slice(0, KPI_CARD_COUNT);
  const overflow = cards.slice(KPI_CARD_COUNT);

  const writeCardRow = (
    rowCards: ReportKpiCard[],
    rowStart: number,
  ): number => {
    const hasDualValue = rowCards.some((card) => Boolean(card.valueRight));
    const hasSecondary =
      !hasDualValue && rowCards.some((card) => Boolean(card.valueSecondary));
    const rowsUsed = hasSecondary ? 4 : 3;
    const labelRow = rowStart;
    const valueRow = rowStart + 1;
    const secondaryRow = hasSecondary ? rowStart + 2 : -1;
    const contextRow = hasSecondary ? rowStart + 3 : rowStart + 2;

    for (let i = 0; i < rowCards.length; i += 1) {
      const [c1, c2] = kpiCardSpan(i);
      const card = rowCards[i]!;

      for (let r = 0; r < rowsUsed; r += 1) {
        if (card.valueRight && r === 1) continue;
        sheet.mergeCells(rowStart + r, c1, rowStart + r, c2);
      }

      paintRange(sheet, labelRow, c1, contextRow, c2, {
        fill: C.white,
        border: {
          left: thin(C.slate200),
          right: thin(C.slate200),
        },
      });
      for (let c = c1; c <= c2; c += 1) {
        const cell = sheet.getCell(labelRow, c);
        cell.border = {
          ...(cell.border || {}),
          top: medium(KPI_ACCENT),
          left: thin(C.slate200),
          right: thin(C.slate200),
        };
      }
      for (let c = c1; c <= c2; c += 1) {
        const cell = sheet.getCell(contextRow, c);
        cell.border = {
          ...(cell.border || {}),
          bottom: thin(C.slate200),
          left: thin(C.slate200),
          right: thin(C.slate200),
        };
      }

      const label = sheet.getCell(labelRow, c1);
      label.value = card.label;
      label.font = {
        name: FONT,
        bold: true,
        size: 8,
        color: { argb: C.slate500 },
      };
      label.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const valueFont = {
        name: FONT,
        bold: true,
        size: 14,
        color: { argb: valueColorArgb(card) },
      };

      const value = sheet.getCell(valueRow, c1);
      value.value = card.value;
      value.font = valueFont;
      value.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      if (card.valueRight) {
        const valueRight = sheet.getCell(valueRow, c2);
        valueRight.value = card.valueRight;
        valueRight.font = valueFont;
        valueRight.alignment = {
          vertical: 'middle',
          horizontal: 'right',
          indent: 1,
        };
      }

      if (hasSecondary && secondaryRow > 0) {
        const secondary = sheet.getCell(secondaryRow, c1);
        secondary.value = card.valueSecondary || '';
        secondary.font = {
          name: FONT,
          bold: true,
          size: 9,
          color: { argb: C.slate600 },
        };
        secondary.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          indent: 1,
        };
      }

      const context = sheet.getCell(contextRow, c1);
      context.value = card.context;
      context.font = { name: FONT, size: 8, color: { argb: C.slate500 } };
      context.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        indent: 1,
        wrapText: true,
      };
    }

    sheet.getRow(labelRow).height = 16;
    sheet.getRow(valueRow).height = 24;
    if (hasSecondary && secondaryRow > 0) {
      sheet.getRow(secondaryRow).height = 14;
    }
    sheet.getRow(contextRow).height = 16;

    const after = contextRow + 1;
    sheet.getRow(after).height = 10;
    return after + 1;
  };

  let nextRow = writeCardRow(primary, startRow);
  if (overflow.length) {
    nextRow = writeCardRow(overflow, nextRow);
  }
  return nextRow;
}

function writeSectionBanner(
  sheet: Worksheet,
  row: number,
  title: string,
  endCol: number = LAST,
): number {
  const last = Math.max(endCol, START);
  sheet.mergeCells(row, START, row, last);
  paintRange(sheet, row, START, row, last, {
    fill: C.banner,
    font: { bold: true, size: 11, color: { argb: C.slate800 } },
  });
  const cell = sheet.getCell(row, START);
  cell.value = `▶  ${title}`;
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(row).height = 22;
  return row + 1;
}

function fitWidths(
  sheet: Worksheet,
  headers: string[],
  rows: Array<Array<string | number>>,
  base: number[],
) {
  headers.forEach((header, index) => {
    let maxLen = header.length;
    for (const row of rows) {
      const value = row[index];
      if (value == null) continue;
      for (const part of String(value).split('\n')) {
        maxLen = Math.max(maxLen, part.length);
      }
    }
    const width = Math.min(42, Math.max(base[index] ?? 14, maxLen + 2));
    const col = sheet.getColumn(START + index);
    col.width = Math.max(col.width || 0, width);
  });
}

function estimateWrappedLines(text: string, columnWidth: number): number {
  const segments = text.split('\n');
  // Excel column width is measured in default-font character units.
  const charsPerLine = Math.max(1, Math.floor(columnWidth));
  let lines = 0;
  for (const segment of segments) {
    if (!segment.length) {
      lines += 1;
      continue;
    }
    lines += Math.ceil(segment.length / charsPerLine);
  }
  return Math.max(lines, 1);
}

function excelTableRowHeight(lineCount: number): number {
  return Math.min(
    409,
    Math.max(15, TABLE_ROW_PADDING + lineCount * TABLE_LINE_HEIGHT),
  );
}

function writeTable(
  sheet: Worksheet,
  startRow: number,
  headers: string[],
  rows: Array<Array<string | number>>,
  options?: {
    widths?: number[];
    stageColors?: Array<string | null | undefined>;
    footer?: boolean;
    stageColorMode?: 'full' | 'indicator';
    collapseColumnIndexes?: number[];
  },
): number {
  const colCount = Math.max(headers.length, 1);
  const endCol = START + colCount - 1;
  const colorMode = options?.stageColorMode ?? 'indicator';
  const displayRows = options?.collapseColumnIndexes?.length
    ? collapseRepeatedColumns(rows, options.collapseColumnIndexes)
    : rows;

  if (!displayRows.length) {
    sheet.mergeCells(startRow, START, startRow, Math.max(endCol, LAST));
    const empty = sheet.getCell(startRow, START);
    empty.value = 'No records for this section.';
    empty.font = {
      name: FONT,
      italic: true,
      size: 11,
      color: { argb: C.slate500 },
    };
    return startRow + 2;
  }

  fitWidths(sheet, headers, displayRows, options?.widths ?? []);

  for (let c = 0; c < colCount; c += 1) {
    const cell = sheet.getCell(startRow, START + c);
    cell.value = headers[c];
    cell.fill = solid(C.slate100);
    cell.font = {
      name: FONT,
      bold: true,
      size: 10,
      color: { argb: C.slate600 },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true,
    };
    cell.border = {
      top: thin(),
      left: thin(),
      right: thin(),
      bottom: thin(),
    };
  }
  sheet.getRow(startRow).height = 22;

  for (let r = 0; r < displayRows.length; r += 1) {
    const excelRow = startRow + 1 + r;
    const isFooter = Boolean(options?.footer && r === displayRows.length - 1);
    const stageColor = options?.stageColors?.[r];
    const rowFill = isFooter
      ? C.slate50
      : stageColor && colorMode === 'full'
        ? argbFromHex(stageColor)
        : C.white;
    const rowTextColor =
      !isFooter && stageColor && colorMode === 'full'
        ? argbFromHex(textOnStageColor(stageColor))
        : isFooter
          ? C.slate900
          : C.slate700;
    let maxLines = 1;
    for (let c = 0; c < colCount; c += 1) {
      const raw = displayRows[r]?.[c];
      const text = raw == null || raw === '' ? EMPTY : String(raw);
      const colWidth =
        sheet.getColumn(START + c).width ?? options?.widths?.[c] ?? 16;
      maxLines = Math.max(maxLines, estimateWrappedLines(text, colWidth));
      const cell = sheet.getCell(excelRow, START + c);
      cell.value = text;
      cell.fill = solid(rowFill);
      cell.font = {
        name: FONT,
        bold: isFooter || c === 0,
        size: TABLE_FONT_SIZE,
        color: { argb: rowTextColor },
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
          c === 0 && stageColor && colorMode === 'indicator'
            ? thick(argbFromHex(stageColor))
            : thin(),
      };
    }
    sheet.getRow(excelRow).height = excelTableRowHeight(maxLines);
  }

  return startRow + displayRows.length + 3;
}

type NativeAnchor = {
  nativeCol: number;
  nativeColOff: number;
  nativeRow: number;
  nativeRowOff: number;
};

function addPng(
  workbook: import('exceljs').Workbook,
  sheet: Worksheet,
  buffer: ArrayBuffer | null,
  anchor: NativeAnchor,
  width: number,
  height: number,
) {
  if (!buffer) return;
  const imageId = workbook.addImage({
    buffer: buffer as unknown as ArrayBuffer,
    extension: 'png',
  });
  sheet.addImage(imageId, {
    // Native anchors are EMU; ExcelJS' fractional `col`/`row` use a different
    // (much smaller) unit and would bunch the images together.
    tl: anchor as unknown as { col: number; row: number },
    ext: { width, height },
  });
}

/** ExcelJS row heights are points; image extents are pixels. */
const POINTS_PER_PIXEL = 0.75;
const EMU_PER_PIXEL = 9525;
/** Rows reserved for the chart band; their height is set once sized. */
const CHART_BAND_ROWS = 38;
/** Upper bound so pies stay readable without dominating the sheet. */
const CHART_MAX_WIDTH = 560;
/** All four overview pies share the same slot width and weight. */
const OVERVIEW_CHART_MAX_WIDTH = CHART_MAX_WIDTH;

type OverviewChart = {
  buffer: ArrayBuffer | null;
  sourceW: number;
  sourceH: number;
  /** Relative width when splitting the overview band (default 1). */
  weight?: number;
  maxWidth?: number;
};

type ReservedChartRow = {
  sheet: Worksheet;
  imageRow: number;
  charts: OverviewChart[];
};

const chartRatio = (chart: OverviewChart | undefined) =>
  chart?.buffer ? chart.sourceH / chart.sourceW : 1;

/** Excel renders a column of width `w` as `w * 7 + 5` pixels. */
function columnPixels(sheet: Worksheet, col: number) {
  return Math.floor((sheet.getColumn(col).width || 8.43) * 7) + 5;
}

/** Anchor for a pixel offset measured from the left edge of column B. */
function chartAnchor(
  sheet: Worksheet,
  x: number,
  row: number,
  y: number,
): NativeAnchor {
  let remaining = x;
  let col = START;
  while (col < KPI_LAST) {
    const width = columnPixels(sheet, col);
    if (remaining < width) break;
    remaining -= width;
    col += 1;
  }
  return {
    nativeCol: col - 1,
    nativeColOff: Math.round(remaining * EMU_PER_PIXEL),
    nativeRow: row - 1,
    nativeRowOff: Math.round(y * EMU_PER_PIXEL),
  };
}

/**
 * Reserves the overview chart band. Images are added later by
 * `placeReservedCharts`, once the tables have settled the column widths the
 * charts must fit into. Titles are drawn inside each image so the charts can
 * sit side by side instead of being spread across whole columns.
 */
function reserveOverviewCharts(
  sheet: Worksheet,
  row: number,
  charts: OverviewChart[],
): { nextRow: number; reserved: ReservedChartRow } {
  setupKpiColumns(sheet);
  const cells = charts.slice(0, CHART_COUNT);
  const lastRow = row + CHART_BAND_ROWS - 1;

  if (!cells.some((chart) => chart.buffer)) {
    const cell = sheet.getCell(row, START);
    cell.value = 'No chart data for this scope.';
    cell.font = {
      name: FONT,
      italic: true,
      size: 11,
      color: { argb: C.slate500 },
    };
    sheet.getRow(row).height = 20;
    return { nextRow: row + 2, reserved: { sheet, imageRow: row, charts: [] } };
  }

  paintRange(sheet, row, START, lastRow, KPI_LAST, { fill: C.white });
  paintRange(sheet, row, START, lastRow, START, {
    border: { left: thin(C.slate200) },
  });
  paintRange(sheet, row, KPI_LAST, lastRow, KPI_LAST, {
    border: { right: thin(C.slate200) },
  });

  return {
    nextRow: lastRow + 2,
    reserved: { sheet, imageRow: row, charts: cells },
  };
}

/** Sizes every reserved chart band to the final sheet width and adds images. */
function placeReservedCharts(
  workbook: import('exceljs').Workbook,
  reservations: ReservedChartRow[],
) {
  for (const { sheet, imageRow, charts } of reservations) {
    if (!charts.length) continue;
    const slotPadX = 2;
    const slotW = chartSlotPixelWidth(sheet);
    const innerW = Math.max(1, slotW - slotPadX * 2);
    const cap = charts[0]?.maxWidth ?? CHART_MAX_WIDTH;
    const unifiedDisplayW = Math.min(cap, innerW);
    const reference = charts.find((chart) => chart.buffer);
    const unifiedRatio = reference ? chartRatio(reference) : 1;
    const unifiedDisplayH =
      unifiedDisplayW > 0 ? unifiedDisplayW * unifiedRatio : unifiedDisplayW;
    const bandH = Math.max(unifiedDisplayH, unifiedDisplayW, 1);
    const rowPixels = bandH / CHART_BAND_ROWS;
    for (let r = 0; r < CHART_BAND_ROWS; r += 1) {
      sheet.getRow(imageRow + r).height = rowPixels * POINTS_PER_PIXEL;
    }

    charts.forEach((chart, index) => {
      if (!chart.buffer) return;
      if (unifiedDisplayW <= 0) return;
      const x = index * (unifiedDisplayW + OVERVIEW_CHART_GAP_PX);
      // Top-align with identical scale so every pie sits on the same row.
      const anchor = chartAnchor(sheet, x, imageRow, 0);
      addPng(
        workbook,
        sheet,
        chart.buffer,
        anchor,
        Math.round(unifiedDisplayW),
        Math.round(unifiedDisplayH),
      );
    });
  }
}

export async function exportPipelineXlsx(report: SalesPipelineReportData) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.meta.companyName
    ? `${report.meta.companyName.trim()} Business`
    : 'Selamnew Business';
  workbook.created = new Date();

  const { meta, summary } = report;
  const scopeLevel = meta.permissionScopeLevel;
  const visibility = reportTableVisibility(scopeLevel);
  const periodLabel = `${formatDate(meta.periodFrom)} – ${formatDate(meta.periodTo)}`;
  const scopeTitle = meta.reportKindLabel;
  const periodHeaderLines = buildExportPeriodHeaderLines(meta);

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

  const currencyCharts = currencyStageCharts(report.stages, CHART_CURRENCIES);
  const overviewChartSpecs = CHART_CURRENCIES.map((currency) => ({
    currency,
    achievement:
      summary.achievementByCurrency.find((row) => row.currency === currency) ??
      null,
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

  const overviewKpiCards = buildOverviewKpiCards(report);
  const logo = await loadTenantLogoPng(meta.logoUrl);
  const pipelineColorMode = meta.pipelineRowColorMode ?? 'full';

  const writeSheetChrome = (
    sheet: Worksheet,
    subtitle: string,
    withKpis: boolean,
    headerEndCol: number = withKpis ? KPI_LAST : LAST,
  ) => {
    setupSheet(sheet, Math.max(GRID, KPI_GRID, 10), Boolean(logo));
    if (withKpis) setupKpiColumns(sheet);
    const headerEndRow = writeHeader(
      workbook,
      sheet,
      scopeTitle,
      subtitle,
      periodLabel,
      meta.generatedAt,
      headerEndCol,
      logo,
      undefined,
      periodHeaderLines,
      meta.filterSummary,
    );
    let row = headerEndRow + 2;
    if (withKpis && includeExecutive) {
      row = writeKpiCards(sheet, row, overviewKpiCards);
    } else {
      row = 5;
    }
    return row;
  };

  const chartReservations: ReservedChartRow[] = [];

  const writeOverviewCharts = (sheet: Worksheet, row: number) => {
    if (!includeExecutive) return row;
    const { nextRow, reserved } = reserveOverviewCharts(sheet, row, [
      {
        buffer: achievementBuffers[0] ?? null,
        sourceW: overviewCardSize.width,
        sourceH: overviewCardSize.height,
        maxWidth: OVERVIEW_CHART_MAX_WIDTH,
      },
      {
        buffer: achievementBuffers[1] ?? null,
        sourceW: overviewCardSize.width,
        sourceH: overviewCardSize.height,
        maxWidth: OVERVIEW_CHART_MAX_WIDTH,
      },
      {
        buffer: stageBuffers[0] ?? null,
        sourceW: overviewCardSize.width,
        sourceH: overviewCardSize.height,
        maxWidth: OVERVIEW_CHART_MAX_WIDTH,
      },
      {
        buffer: stageBuffers[1] ?? null,
        sourceW: overviewCardSize.width,
        sourceH: overviewCardSize.height,
        maxWidth: OVERVIEW_CHART_MAX_WIDTH,
      },
    ]);
    chartReservations.push(reserved);
    return nextRow;
  };

  const writeBanneredTable = (
    sheet: Worksheet,
    row: number,
    banner: string,
    table: {
      headers: string[];
      rows: Array<Array<string | number>>;
      widths: number[];
      stageColors?: Array<string | null | undefined>;
    },
    options?: {
      footer?: boolean;
      stageColorMode?: 'full' | 'indicator';
      collapseColumnIndexes?: number[];
    },
  ) => {
    if (!table.headers.length || !table.rows.length) return row;
    const endCol = START + Math.max(table.headers.length, 1) - 1;
    for (let c = START; c <= endCol; c += 1) {
      const col = sheet.getColumn(c);
      col.width = Math.max(col.width || 0, 12);
    }
    row = writeSectionBanner(sheet, row, banner, endCol);
    return writeTable(sheet, row, table.headers, table.rows, {
      widths: table.widths,
      stageColors: table.stageColors,
      footer: options?.footer,
      stageColorMode: options?.stageColorMode,
      collapseColumnIndexes: options?.collapseColumnIndexes,
    });
  };

  const orgTeamsTable = includeOrgTeams
    ? buildOrgTeamsTable(report, 'xlsx')
    : null;
  const salesRepsTable = includeSalesReps
    ? buildSalesRepRows(report, 'xlsx')
    : null;
  const pipelineTable = includePipeline
    ? buildPipelineSheetTable(report, 'xlsx')
    : null;
  const inactiveOpportunitiesTable = includeInactiveOpportunities
    ? buildInactiveOpportunitiesSheetTable(report, 'xlsx')
    : null;

  const sheetHasBodyContent = (sheet: Worksheet) => {
    // Chrome uses rows 1-3 header; KPIs/charts/tables start at row 4+.
    let found = false;
    sheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
      if (rowNumber < 4) return;
      excelRow.eachCell({ includeEmpty: false }, () => {
        found = true;
      });
    });
    // Images count as content even without cell values in chart rows.
    if (!found && sheet.getImages().length > 0) found = true;
    return found;
  };

  const pruneEmptySheets = () => {
    const toRemove = workbook.worksheets
      .filter((sheet) => !sheetHasBodyContent(sheet))
      .map((sheet) => sheet.id);
    for (let i = toRemove.length - 1; i >= 0; i -= 1) {
      workbook.removeWorksheet(toRemove[i]!);
    }
  };

  // Same workbook structure for every access level; data is scoped upstream.
  {
    const sheet1 = workbook.addWorksheet('1. Executive Overview');
    let row = writeSheetChrome(
      sheet1,
      'Executive Command Center · Pipeline Overview',
      false,
      KPI_LAST,
    );
    setupKpiColumns(sheet1);
    if (includeExecutive) {
      row = writeKpiCards(sheet1, row, overviewKpiCards);
    }
    row = writeOverviewCharts(sheet1, row);

    const pipelineEndCol = pipelineTable?.headers.length
      ? START + pipelineTable.headers.length - 1
      : LAST;
    if (pipelineTable?.rows.length) {
      const sheet2 = workbook.addWorksheet('2. Total Pipeline');
      row = writeSheetChrome(
        sheet2,
        masterPipelineSheetTitle(),
        false,
        pipelineEndCol,
      );
      writeBanneredTable(sheet2, row, 'Total Pipeline', pipelineTable, {
        stageColorMode: pipelineColorMode,
      });
    }

    const inactiveEndCol = inactiveOpportunitiesTable?.headers.length
      ? START + inactiveOpportunitiesTable.headers.length - 1
      : LAST;
    if (inactiveOpportunitiesTable?.rows.length) {
      const inactiveSheet = workbook.addWorksheet('3. Inactive Opportunities');
      row = writeSheetChrome(
        inactiveSheet,
        'Inactive & Lost Opportunities',
        false,
        inactiveEndCol,
      );
      writeBanneredTable(
        inactiveSheet,
        row,
        'Inactive Opportunities',
        inactiveOpportunitiesTable,
        {
          stageColorMode: pipelineColorMode,
        },
      );
    }

    const orgSheetNeeded =
      Boolean(orgTeamsTable?.rows.length) ||
      Boolean(salesRepsTable?.rows.length) ||
      includeProductPortfolio;
    if (orgSheetNeeded) {
      const teamPerformanceSheet = meta.appliedTeamIds.length > 0;
      const productPortfolioTable = includeProductPortfolio
        ? buildProductPortfolioRows(report, 'xlsx')
        : null;
      const orgSheetEndCol = [
        orgTeamsTable,
        salesRepsTable,
        productPortfolioTable,
      ].reduce((max, table) => {
        if (!table?.headers.length) return max;
        return Math.max(max, START + table.headers.length - 1);
      }, LAST);
      const sheet3 = workbook.addWorksheet(
        teamPerformanceSheet ? '4. Team Performance' : '4. Org Performance',
      );
      row = writeSheetChrome(sheet3, '', false, orgSheetEndCol);
      if (orgTeamsTable?.rows.length) {
        const deptCol = orgTeamsTable.headers.findIndex((h) =>
          /department/i.test(h),
        );
        row = writeBanneredTable(
          sheet3,
          row,
          'Team Performance',
          orgTeamsTable,
          {
            collapseColumnIndexes: deptCol >= 0 ? [deptCol] : [0],
          },
        );
        row += 1;
      }
      if (salesRepsTable?.rows.length) {
        row = writeBanneredTable(
          sheet3,
          row,
          'Sales Representative Performance',
          salesRepsTable,
        );
        row += 1;
      }
      if (productPortfolioTable?.rows.length) {
        writeBanneredTable(
          sheet3,
          row,
          'Product Portfolio Allocation',
          productPortfolioTable,
        );
      }
    }
  }

  placeReservedCharts(workbook, chartReservations);
  pruneEmptySheets();

  // Ensure at least one sheet exists
  if (!workbook.worksheets.length) {
    const sheet = workbook.addWorksheet('1. Executive Overview');
    writeSheetChrome(sheet, 'Sales Pipeline Report', false);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    buildPipelineExportFilename(meta, 'xlsx'),
  );
}
