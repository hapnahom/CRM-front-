import { tokens } from '@/lib/design-tokens';
import { formatTargetPercent } from '@/lib/target-format';
import { formatMoneyMap, formatMoneyMapValues } from './format';
import type {
  CurrencyAchievement,
  ProductPipelineRow,
  StageRow,
} from './types';

function canvasContext(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = tokens.color.surfaceCard;
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx, width, height };
}

function toPng(canvas: HTMLCanvasElement): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      void blob
        .arrayBuffer()
        .then(resolve)
        .catch(() => resolve(null));
    }, 'image/png');
  });
}

export function arrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/png;base64,${btoa(binary)}`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

type DonutSlice = {
  label: string;
  color: string;
  share: number;
  count: number;
  value: Record<string, number>;
};

function stageHasPipelineValue(stage: StageRow): boolean {
  return (
    stage.count > 0 || Object.values(stage.value).some((amount) => amount > 0)
  );
}

export function currencyStageCharts(
  stages: StageRow[],
  currencies: readonly string[] = ['ETB', 'USD'],
  options?: { includeEmptyStages?: boolean },
): Array<{
  currency: string;
  stages: StageRow[];
  totalLabel: string;
}> {
  const includeEmptyStages = options?.includeEmptyStages ?? true;
  const chartStages = includeEmptyStages
    ? stages
    : stages.filter(stageHasPipelineValue);
  const currencyList = [...currencies];
  // Always include any other currencies that appear in the data.
  for (const stage of chartStages) {
    for (const [code, amount] of Object.entries(stage.value)) {
      if (amount && !currencyList.includes(code)) currencyList.push(code);
    }
  }

  return currencyList.map((currency) => {
    const sliced = chartStages.map((stage) => {
      const amount = stage.value[currency] ?? 0;
      return {
        ...stage,
        count: stage.countByCurrency?.[currency] ?? 0,
        value: { [currency]: amount },
        share: 0,
      };
    });
    const total = sliced.reduce(
      (sum, stage) => sum + (stage.value[currency] ?? 0),
      0,
    );
    return {
      currency,
      stages: sliced.map((stage) => ({
        ...stage,
        share:
          total > 0
            ? Math.round(((stage.value[currency] ?? 0) / total) * 100)
            : 0,
      })),
      totalLabel: formatMoneyMap({ [currency]: total }, true),
    };
  });
}

export function currencyProductCharts(products: ProductPipelineRow[]): Array<{
  currency: string;
  stages: StageRow[];
  totalLabel: string;
}> {
  const currencies = new Set<string>();
  for (const product of products) {
    for (const [code, amount] of Object.entries(product.value)) {
      if (amount) currencies.add(code);
    }
  }
  return [...currencies].sort().map((currency) => {
    const sliced = products
      .map((product) => {
        const amount = product.value[currency] ?? 0;
        return {
          id: product.id,
          label: product.label,
          group: 'Deal' as const,
          count: product.countByCurrency?.[currency] ?? product.count,
          countByCurrency: {
            [currency]: product.countByCurrency?.[currency] ?? 0,
          },
          value: { [currency]: amount },
          share: 0,
          color: product.color,
          averageDaysInStage: null,
        };
      })
      .filter((row) => (row.value[currency] ?? 0) > 0);
    const total = sliced.reduce(
      (sum, row) => sum + (row.value[currency] ?? 0),
      0,
    );
    return {
      currency,
      stages: sliced.map((row) => ({
        ...row,
        share:
          total > 0
            ? Math.round(((row.value[currency] ?? 0) / total) * 100)
            : 0,
      })),
      totalLabel: formatMoneyMap({ [currency]: total }, true),
    };
  });
}

async function renderDonutFromSlices(
  slices: DonutSlice[],
  centerLabel: string,
  options?: {
    heading?: string;
    centerCaption?: string;
    /** `right` keeps the classic side legend; `bottom` keeps the pie square like target rings. */
    legendPosition?: 'right' | 'bottom';
    currency?: string;
    canvasSize?: { width: number; height: number };
  },
): Promise<ArrayBuffer | null> {
  const legendPosition = options?.legendPosition ?? 'right';
  if (legendPosition === 'bottom') {
    return renderDonutWithBottomLegend(slices, centerLabel, options);
  }

  const headingH = options?.heading ? 48 : 0;
  const width = 1100;
  const legendRows = Math.max(slices.length, 1);
  const height = Math.max(520, 80 + headingH + legendRows * 52);
  const prepared = canvasContext(width, height);
  if (!prepared) return null;
  const { canvas, ctx } = prepared;
  const cx = 250;
  const cy = headingH + (height - headingH) / 2;
  const radius = 196;
  const inner = 112;
  const total = slices.reduce(
    (sum, slice) =>
      sum +
      Object.values(slice.value).reduce(
        (innerSum, amount) => innerSum + amount,
        0,
      ),
    0,
  );

  if (options?.heading) {
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(options.heading, 36, 36);
  }

  let angle = DONUT_START_ANGLE;
  for (const slice of slices) {
    const weight = Object.values(slice.value).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const portion = total > 0 ? weight / total : 0;
    if (portion <= 0) continue;
    const next = angle + portion * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, next);
    ctx.closePath();
    ctx.fillStyle = slice.color || tokens.color.textSubtle;
    ctx.fill();
    angle = next;
  }
  if (!slices.length) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = tokens.color.surfaceHover;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = tokens.color.surfaceCard;
  ctx.fill();
  ctx.fillStyle = tokens.color.textMuted;
  ctx.font = '600 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options?.centerCaption ?? 'Total pipeline', cx, cy - 12);
  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.fillText(centerLabel, cx, cy + 24);

  const legendX = 500;
  const startY = 36 + headingH;
  slices.forEach((slice, index) => {
    const y = startY + index * 52;
    ctx.fillStyle = slice.color || tokens.color.textSubtle;
    ctx.fillRect(legendX, y + 8, 12, 12);
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    const title = wrapText(ctx, slice.label, 360);
    title.forEach((line, lineIndex) => {
      ctx.fillText(line, legendX + 24, y + 18 + lineIndex * 18);
    });
    ctx.fillStyle = tokens.color.textMuted;
    ctx.font = '500 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${slice.share}%`, width - 36, y + 18);
    ctx.textAlign = 'left';
    ctx.fillText(
      `${formatMoneyMap(slice.value, true)}  ·  ${slice.count} records`,
      legendX + 24,
      y + 40,
    );
  });

  return toPng(canvas);
}

/** Square pie/donut block — ring diameter stays fixed across exports. */
export const DONUT_PIE_SIZE = 560;
/** Shared canvas width — all four overview charts use the same dimensions for alignment. */
export const CHART_CANVAS_WIDTH = 680;
/** Target/achievement legend table width (centered within the shared canvas). */
const ACHIEVEMENT_SUMMARY_GRID_MAX_W = 460;
/** Pipeline stage pies use the same square block as target rings for equal export sizing. */
export const STAGE_PIE_CANVAS_W = CHART_CANVAS_WIDTH;
export const STAGE_PIE_CANVAS_H = DONUT_PIE_SIZE;
/** Matches target ring outer radius so all overview pies scale equally. */
export const OVERVIEW_PIE_RADIUS = 186;
export const OVERVIEW_PIE_INNER = 109;
/** Start at 3 o'clock so small slices sit on the right wing with room for labels. */
export const DONUT_START_ANGLE = 0;
const DONUT_LEGEND_ROW_H = 78;
export const CHART_HEADING_H = 44;
const STAGE_TABLE_HEADER_H = 62;
const STAGE_TABLE_ROW_H = 58;
const STAGE_CARD_PAD = 28;
const CHART_TABLE_INSET = 12;
const ACHIEVEMENT_SUMMARY_SECTION_HEADER_H = 36;
const ACHIEVEMENT_SUMMARY_ROW_H = 34;
const ACHIEVEMENT_SUMMARY_SECTION_GAP = 10;
const ACHIEVEMENT_SUMMARY_SECTION_H =
  ACHIEVEMENT_SUMMARY_SECTION_HEADER_H + ACHIEVEMENT_SUMMARY_ROW_H * 3;
export const ACHIEVEMENT_SUMMARY_GRID_H =
  ACHIEVEMENT_SUMMARY_SECTION_H * 2 + ACHIEVEMENT_SUMMARY_SECTION_GAP;
/** Slices at or above this share get an inside label; smaller ones use callout leaders. */
const STAGE_INSIDE_LABEL_THRESHOLD = 0.08;
const STAGE_LABEL_MIN_GAP = 24;
const STAGE_LABEL_STAGGER_X = 22;
const STAGE_LEADER_RADIAL = 18;
const STAGE_LEADER_H_INSET = 14;

export type ChartLegendRow = {
  label: string;
  value: string;
  color?: string;
};

export type AchievementSummaryMetric = {
  label: string;
  value: string;
  color: string;
};

export type AchievementSummarySection = {
  target: AchievementSummaryMetric;
  achieved: AchievementSummaryMetric;
  remaining: AchievementSummaryMetric;
};

export type AchievementSummaryGrid = {
  quarter: AchievementSummarySection;
  annual: AchievementSummarySection;
  quarterAchievementPct?: number | null;
  annualAchievementPct?: number | null;
};

export type AchievementSummaryTotals = {
  target: number;
  achieved: number;
  remaining: number;
  annualTarget?: number;
  annualAchieved?: number;
  annualRemaining?: number;
};

/**
 * Height of the heading + square pie block only (no legend). Exporters size the
 * ring from this so every pie stays the same diameter regardless of stage count.
 */
export function chartPieBlockHeight(options?: { heading?: boolean }) {
  return (options?.heading ? CHART_HEADING_H : 0) + DONUT_PIE_SIZE;
}

/**
 * Pixel size of a chart drawn as a square circle block with a legend beneath,
 * so exporters can scale it without distorting the circle.
 */
export function legendChartSize(
  rowCount: number,
  options?: { heading?: boolean },
) {
  return {
    width: CHART_CANVAS_WIDTH,
    height:
      chartPieBlockHeight(options) +
      Math.max(1, rowCount) * DONUT_LEGEND_ROW_H +
      16,
  };
}

/** Size for stage breakdown cards (donut + labeled table). */
export function stageBreakdownCardSize(
  rowCount: number,
  options?: { heading?: boolean },
) {
  const tableH =
    STAGE_TABLE_HEADER_H + Math.max(1, rowCount) * STAGE_TABLE_ROW_H + 8;
  return {
    width: CHART_CANVAS_WIDTH,
    height: chartPieBlockHeight(options) + STAGE_CARD_PAD + tableH,
  };
}

/** Height of achievement ring/bar charts with the quarter/annual summary grid. */
export function achievementSummaryChartSize(options?: { heading?: boolean }) {
  return {
    width: CHART_CANVAS_WIDTH,
    height:
      chartPieBlockHeight(options) +
      STAGE_CARD_PAD +
      ACHIEVEMENT_SUMMARY_GRID_H,
  };
}

/** Equal card size for all four overview charts (achievement + stage). */
export function overviewChartCardSize(
  maxStageRows: number,
  options?: { heading?: boolean },
) {
  const withHeading = options?.heading ?? true;
  const stage = stageBreakdownCardSize(maxStageRows, { heading: withHeading });
  const achievement = achievementSummaryChartSize({ heading: withHeading });
  return {
    width: CHART_CANVAS_WIDTH,
    height: Math.max(stage.height, achievement.height),
  };
}

type StageArc = {
  slice: DonutSlice;
  start: number;
  end: number;
  mid: number;
  portion: number;
};

type StageSliceLabel = {
  arc: StageArc;
  label: string;
  anchorX: number;
  anchorY: number;
  textX: number;
  textY: number;
  useLeader: boolean;
  inside: boolean;
  align: CanvasTextAlign;
};

function resolveVerticalOverlaps(
  labels: StageSliceLabel[],
  minY: number,
  maxY: number,
  minGap: number,
) {
  if (labels.length <= 1) return;
  labels.sort((a, b) => a.textY - b.textY);
  for (let i = 1; i < labels.length; i += 1) {
    const gap = labels[i]!.textY - labels[i - 1]!.textY;
    if (gap < minGap) labels[i]!.textY = labels[i - 1]!.textY + minGap;
  }
  const overflow = labels[labels.length - 1]!.textY - maxY;
  if (overflow > 0) {
    for (const label of labels) label.textY -= overflow;
  }
  const underflow = minY - labels[0]!.textY;
  if (underflow > 0) {
    for (const label of labels) label.textY += underflow;
  }
  for (let i = labels.length - 2; i >= 0; i -= 1) {
    const gap = labels[i + 1]!.textY - labels[i]!.textY;
    if (gap < minGap) labels[i]!.textY = labels[i + 1]!.textY - minGap;
  }
  if (labels[0]!.textY < minY) {
    const shift = minY - labels[0]!.textY;
    for (const label of labels) label.textY += shift;
  }
}

function distributeSideLabels(
  labels: StageSliceLabel[],
  minBound: number,
  maxBound: number,
  minGap: number,
  width: number,
) {
  if (!labels.length) return;
  labels.sort((a, b) => a.arc.mid - b.arc.mid);
  const count = labels.length;
  const span = maxBound - minBound;
  const gap =
    count <= 1 ? minGap : Math.max(minGap, Math.min(32, span / (count - 1)));
  const stackSpan = gap * Math.max(count - 1, 0);
  const preferredAvg =
    labels.reduce((sum, label) => sum + label.textY, 0) / count;
  let start = count === 1 ? preferredAvg : preferredAvg - stackSpan / 2;
  start = Math.max(minBound, Math.min(maxBound - stackSpan, start));

  labels.forEach((label, index) => {
    label.textY = count === 1 ? preferredAvg : start + index * gap;
  });
  resolveVerticalOverlaps(labels, minBound, maxBound, minGap);

  labels.forEach((label, index) => {
    const depth = Math.floor(index / 2) % 3;
    const stagger = (index % 2) * STAGE_LABEL_STAGGER_X + depth * 8;
    if (label.align === 'left') label.textX = 18 + stagger;
    else if (label.align === 'right') label.textX = width - 18 - stagger;
  });
}

function layoutStageSliceLabels(
  arcs: StageArc[],
  cx: number,
  cy: number,
  radius: number,
  inner: number,
  width: number,
  headingH: number,
  pieAreaH: number,
): StageSliceLabel[] {
  const pieTop = headingH;
  const pieBottom = headingH + pieAreaH;
  const sideMinY = pieTop + 24;
  const sideMaxY = pieBottom - 24;
  const inside: StageSliceLabel[] = [];
  const left: StageSliceLabel[] = [];
  const right: StageSliceLabel[] = [];
  const midR = (radius + inner) / 2;

  for (const arc of arcs) {
    if (arc.slice.share <= 0) continue;
    const pct = Math.round(arc.portion * 100);
    const label = `${arc.slice.share || pct}%`;
    const cos = Math.cos(arc.mid);
    const sin = Math.sin(arc.mid);
    const anchorX = cx + cos * (radius + 2);
    const anchorY = cy + sin * (radius + 2);
    const arcWidth = arc.portion * Math.PI * 2 * midR;

    if (
      arc.portion >= STAGE_INSIDE_LABEL_THRESHOLD &&
      arcWidth >= label.length * 9
    ) {
      inside.push({
        arc,
        label,
        anchorX,
        anchorY,
        textX: cx + cos * midR,
        textY: cy + sin * midR,
        useLeader: false,
        inside: true,
        align: 'center',
      });
      continue;
    }

    const extendR = radius + 44;
    const textY = cy + sin * extendR;

    if (cos <= 0) {
      left.push({
        arc,
        label,
        anchorX,
        anchorY,
        textX: 18,
        textY,
        useLeader: true,
        inside: false,
        align: 'left',
      });
    } else {
      right.push({
        arc,
        label,
        anchorX,
        anchorY,
        textX: width - 18,
        textY,
        useLeader: true,
        inside: false,
        align: 'right',
      });
    }
  }

  distributeSideLabels(left, sideMinY, sideMaxY, STAGE_LABEL_MIN_GAP, width);
  distributeSideLabels(right, sideMinY, sideMaxY, STAGE_LABEL_MIN_GAP, width);

  return [...inside, ...left, ...right];
}

function drawBentStageLeader(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  textX: number,
  textY: number,
  align: CanvasTextAlign,
  midAngle: number,
) {
  const cos = Math.cos(midAngle);
  const sin = Math.sin(midAngle);
  const radialX = anchorX + cos * STAGE_LEADER_RADIAL;
  const radialY = anchorY + sin * STAGE_LEADER_RADIAL;
  const elbowX =
    align === 'left'
      ? textX + STAGE_LEADER_H_INSET
      : align === 'right'
        ? textX - STAGE_LEADER_H_INSET
        : textX;

  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.lineTo(radialX, radialY);
  ctx.lineTo(elbowX, radialY);
  ctx.lineTo(elbowX, textY);
  ctx.lineTo(textX, textY);
  ctx.stroke();
}

type StageTableLayout = {
  tableLeft: number;
  tableRight: number;
  tableWidth: number;
  colStage: number;
  colPct: number;
  colValue: number;
  colOpp: number;
  stageTextMax: number;
};

/** Fixed-width numeric columns so % and Value never overlap when right-aligned. */
function stageTableLayout(canvasWidth: number): StageTableLayout {
  const tableLeft = CHART_TABLE_INSET;
  const tableRight = canvasWidth - CHART_TABLE_INSET;
  const tableWidth = tableRight - tableLeft;
  const colGap = 20;
  const oppColW = 156;
  const valueColW = 168;
  const pctColW = 64;
  const pctValueGap = 14;
  const colOpp = tableRight - 8;
  const colValue = colOpp - oppColW - colGap;
  const colPct = colValue - valueColW - pctValueGap;
  const stageTextMax = Math.max(
    72,
    colPct - pctColW - colGap - (tableLeft + 14 + 22) - 12,
  );
  return {
    tableLeft,
    tableRight,
    tableWidth,
    colStage: tableLeft + 14,
    colPct,
    colValue,
    colOpp,
    stageTextMax,
  };
}

/** Legend text is sized for exports, where images scale well below 420px. */
function drawLegendRows(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  rows: ChartLegendRow[],
) {
  const inset = CHART_TABLE_INSET;
  rows.forEach((row, index) => {
    const y = top + index * DONUT_LEGEND_ROW_H;
    if (row.color) {
      ctx.fillStyle = row.color;
      ctx.fillRect(inset, y + 10, 20, 20);
    }
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '600 34px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, row.color ? inset + 30 : inset, y + 36);
    ctx.fillStyle = tokens.color.textMuted;
    ctx.font = '500 30px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.value, width - inset, y + 36);
  });
}

function drawAchievementSummarySectionVertical(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  top: number,
  header: string,
  section: AchievementSummarySection,
): number {
  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = '700 22px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(header, leftX + 4, top + 26);

  const rows = [section.target, section.achieved, section.remaining];
  const rowsTop = top + ACHIEVEMENT_SUMMARY_SECTION_HEADER_H;
  rows.forEach((row, index) => {
    const y = rowsTop + index * ACHIEVEMENT_SUMMARY_ROW_H + 24;
    ctx.fillStyle = row.color;
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, leftX + 4, y);
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.value, rightX - 4, y);
  });

  return top + ACHIEVEMENT_SUMMARY_SECTION_H;
}

function achievementSummaryGridBounds(canvasWidth: number) {
  const gridW = Math.min(
    ACHIEVEMENT_SUMMARY_GRID_MAX_W,
    canvasWidth - CHART_TABLE_INSET * 2,
  );
  const leftX = Math.round((canvasWidth - gridW) / 2);
  return { leftX, rightX: leftX + gridW, gridW };
}

/** Quarter/annual target summary beneath achievement rings — vertical label/value rows. */
function drawAchievementSummaryGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  grid: AchievementSummaryGrid,
) {
  const { leftX, rightX, gridW } = achievementSummaryGridBounds(width);

  ctx.strokeStyle = tokens.color.borderDefault;
  ctx.lineWidth = 1;
  ctx.strokeRect(leftX, top, gridW, ACHIEVEMENT_SUMMARY_GRID_H);

  const quarterHeader = formatAchievementSectionHeader(
    'Quarter',
    grid.quarterAchievementPct,
  );
  const afterQuarter = drawAchievementSummarySectionVertical(
    ctx,
    leftX,
    rightX,
    top,
    quarterHeader,
    grid.quarter,
  );

  const dividerY = afterQuarter + ACHIEVEMENT_SUMMARY_SECTION_GAP / 2;
  ctx.beginPath();
  ctx.moveTo(leftX, dividerY);
  ctx.lineTo(rightX, dividerY);
  ctx.stroke();

  const annualHeader = formatAchievementSectionHeader(
    'Annual',
    grid.annualAchievementPct,
  );
  drawAchievementSummarySectionVertical(
    ctx,
    leftX,
    rightX,
    afterQuarter + ACHIEVEMENT_SUMMARY_SECTION_GAP,
    annualHeader,
    grid.annual,
  );
}

function drawDonutSlice(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
  color: string,
  gap = 0.03,
) {
  const a0 = startAngle + gap / 2;
  const a1 = endAngle - gap / 2;
  if (a1 <= a0) return;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, a0, a1, false);
  ctx.arc(cx, cy, innerR, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Square pie with gaps, external % labels, and a stage table underneath. */
async function renderDonutWithBottomLegend(
  slices: DonutSlice[],
  centerLabel: string,
  options?: {
    heading?: string;
    centerCaption?: string;
    currency?: string;
    canvasSize?: { width: number; height: number };
  },
): Promise<ArrayBuffer | null> {
  const headingH = options?.heading ? CHART_HEADING_H : 0;
  const pieAreaH = DONUT_PIE_SIZE;
  const natural = stageBreakdownCardSize(slices.length, {
    heading: Boolean(options?.heading),
  });
  const width = options?.canvasSize?.width ?? natural.width;
  const height = options?.canvasSize?.height ?? natural.height;
  const prepared = canvasContext(width, height);
  if (!prepared) return null;
  const { canvas, ctx } = prepared;

  const currencyCode =
    options?.currency || Object.keys(slices[0]?.value ?? {})[0] || '';

  const cx = width / 2;
  const cy = headingH + pieAreaH / 2;
  const radius = OVERVIEW_PIE_RADIUS;
  const inner = OVERVIEW_PIE_INNER;
  const total = slices.reduce(
    (sum, slice) =>
      sum +
      Object.values(slice.value).reduce(
        (innerSum, amount) => innerSum + amount,
        0,
      ),
    0,
  );

  if (options?.heading) {
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.heading, cx, 28);
  }

  const positive = slices.filter((slice) => {
    const weight = Object.values(slice.value).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    return weight > 0 && slice.share > 0;
  });

  let angle = DONUT_START_ANGLE;
  const arcs: Array<{
    slice: DonutSlice;
    start: number;
    end: number;
    mid: number;
    portion: number;
  }> = [];

  if (!positive.length) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = tokens.color.surfaceHover;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = tokens.color.surfaceCard;
    ctx.fill();
  } else {
    for (const slice of positive) {
      const weight = Object.values(slice.value).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const portion = total > 0 ? weight / total : 0;
      const next = angle + portion * Math.PI * 2;
      drawDonutSlice(
        ctx,
        cx,
        cy,
        radius,
        inner,
        angle,
        next,
        slice.color || tokens.color.textSubtle,
      );
      arcs.push({
        slice,
        start: angle,
        end: next,
        mid: (angle + next) / 2,
        portion,
      });
      angle = next;
    }
  }

  ctx.fillStyle = tokens.color.textMuted;
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options?.centerCaption ?? 'By stage', cx, cy - 10);
  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = '700 22px Inter, system-ui, sans-serif';
  ctx.fillText(centerLabel, cx, cy + 16);

  const sliceLabels = layoutStageSliceLabels(
    arcs,
    cx,
    cy,
    radius,
    inner,
    width,
    headingH,
    pieAreaH,
  );
  for (const item of sliceLabels) {
    if (item.useLeader) {
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      drawBentStageLeader(
        ctx,
        item.anchorX,
        item.anchorY,
        item.textX,
        item.textY,
        item.align,
        item.arc.mid,
      );
    }

    ctx.fillStyle = item.inside
      ? '#FFFFFF'
      : item.arc.slice.color || tokens.color.textPrimary;
    ctx.font = '700 15px Inter, system-ui, sans-serif';
    ctx.textAlign = item.align;
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, item.textX, item.textY);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Stage table — full canvas width with evenly spaced columns.
  const tableTop = headingH + pieAreaH + STAGE_CARD_PAD;
  const {
    tableLeft,
    tableRight,
    tableWidth,
    colStage,
    colPct,
    colValue,
    colOpp,
    stageTextMax,
  } = stageTableLayout(width);

  ctx.fillStyle = '#E8EEF7';
  ctx.fillRect(tableLeft, tableTop, tableWidth, STAGE_TABLE_HEADER_H);
  ctx.fillStyle = '#1E3A5F';
  ctx.font = '700 26px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Stage', colStage + 18, tableTop + 38);
  ctx.textAlign = 'right';
  ctx.fillText('%', colPct, tableTop + 38);
  ctx.fillText(
    currencyCode ? `Value (${currencyCode})` : 'Value',
    colValue,
    tableTop + 38,
  );
  ctx.fillText('Opportunities', colOpp, tableTop + 38);

  slices.forEach((slice, index) => {
    const y = tableTop + STAGE_TABLE_HEADER_H + index * STAGE_TABLE_ROW_H;
    if (index > 0) {
      ctx.strokeStyle = tokens.color.borderDefault;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableLeft, y);
      ctx.lineTo(tableRight, y);
      ctx.stroke();
    }

    const color = slice.color || tokens.color.textSubtle;
    ctx.beginPath();
    ctx.arc(colStage + 6, y + STAGE_TABLE_ROW_H / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    const stageLabel =
      wrapText(ctx, slice.label, stageTextMax)[0] || slice.label;
    ctx.fillText(stageLabel, colStage + 22, y + 36);

    ctx.fillStyle = tokens.color.textMuted;
    ctx.font = '500 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${slice.share}%`, colPct, y + 36);
    ctx.fillText(formatMoneyMapValues(slice.value, true), colValue, y + 36);
    ctx.fillText(String(slice.count), colOpp, y + 36);
  });

  return toPng(canvas);
}

export async function renderDonutPng(
  stages: StageRow[],
  centerLabel: string,
  options?: {
    heading?: string;
    sliceBy?: 'count' | 'value';
    centerCaption?: string;
    legendPosition?: 'right' | 'bottom';
    /** When true, keep zero-value stages in the table (donut still skips them). */
    includeZeroSlices?: boolean;
    currency?: string;
    canvasSize?: { width: number; height: number };
  },
): Promise<ArrayBuffer | null> {
  const includeZero =
    options?.includeZeroSlices ?? options?.legendPosition === 'bottom';
  const slices = stages
    .filter((stage) => {
      if (includeZero) return true;
      if (options?.sliceBy === 'value') {
        return Object.values(stage.value).some((amount) => amount > 0);
      }
      return stage.count > 0;
    })
    .map((stage) => ({
      label: stage.label,
      color: stage.color,
      share: stage.share,
      count: stage.count,
      value: stage.value,
    }));
  return renderDonutFromSlices(slices, centerLabel, {
    heading: options?.heading,
    centerCaption: options?.centerCaption,
    legendPosition: options?.legendPosition,
    currency: options?.currency,
    canvasSize: options?.canvasSize,
  });
}

type AchievementChartRenderOptions = {
  heading?: string;
  subtitle?: string;
  legendRows?: ChartLegendRow[];
  achievementSummary?: AchievementSummaryGrid;
  canvasSize?: { width: number; height: number };
};

function achievementChartNaturalSize(options?: AchievementChartRenderOptions) {
  const headingH = options?.heading ? CHART_HEADING_H : 0;
  if (options?.achievementSummary) {
    return achievementSummaryChartSize({ heading: Boolean(options?.heading) });
  }
  const legendRows = options?.legendRows ?? [];
  if (legendRows.length) {
    return legendChartSize(legendRows.length, {
      heading: Boolean(options?.heading),
    });
  }
  return { width: CHART_CANVAS_WIDTH, height: headingH + DONUT_PIE_SIZE };
}

export async function renderTargetRingPng(
  percent: number | null,
  label: string,
  options?: AchievementChartRenderOptions,
): Promise<ArrayBuffer | null> {
  const headingH = options?.heading ? CHART_HEADING_H : 0;
  const legendRows = options?.legendRows ?? [];
  const natural = achievementChartNaturalSize(options);
  const width = options?.canvasSize?.width ?? CHART_CANVAS_WIDTH;
  const height = options?.canvasSize?.height ?? natural.height;
  const prepared = canvasContext(width, height);
  if (!prepared) return null;
  const { canvas, ctx } = prepared;
  const cx = width / 2;
  const cy = headingH + DONUT_PIE_SIZE / 2;
  const radius = OVERVIEW_PIE_RADIUS - 18;
  const value = Math.max(0, Math.min(percent ?? 0, 100));

  if (options?.heading) {
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.heading, cx, 28);
  }

  ctx.lineWidth = 26;
  ctx.strokeStyle = tokens.color.borderDefault;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = tokens.color.success;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius,
    -Math.PI / 2,
    -Math.PI / 2 + (value / 100) * Math.PI * 2,
  );
  ctx.stroke();
  ctx.fillStyle = tokens.color.textPrimary;
  ctx.textAlign = 'center';
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  ctx.fillText(
    percent == null ? '—' : formatTargetPercent(percent),
    cx,
    cy + 6,
  );
  ctx.fillStyle = tokens.color.textMuted;
  ctx.font = '600 16px Inter, system-ui, sans-serif';
  ctx.fillText(label, cx, cy + 38);
  if (options?.subtitle) {
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillText(options.subtitle, cx, cy + 58);
  }
  if (options?.achievementSummary) {
    drawAchievementSummaryGrid(
      ctx,
      width,
      headingH + DONUT_PIE_SIZE + STAGE_CARD_PAD,
      options.achievementSummary,
    );
  } else if (legendRows.length) {
    drawLegendRows(
      ctx,
      width,
      headingH + DONUT_PIE_SIZE + STAGE_CARD_PAD,
      legendRows,
    );
  }
  return toPng(canvas);
}

/** Side-by-side bars when achievement exceeds target (pie/ring cannot show >100% clearly). */
export async function renderTargetBarPng(
  percent: number | null,
  label: string,
  options?: AchievementChartRenderOptions,
): Promise<ArrayBuffer | null> {
  const headingH = options?.heading ? CHART_HEADING_H : 0;
  const legendRows = options?.legendRows ?? [];
  const natural = achievementChartNaturalSize(options);
  const width = options?.canvasSize?.width ?? CHART_CANVAS_WIDTH;
  const height = options?.canvasSize?.height ?? natural.height;
  const prepared = canvasContext(width, height);
  if (!prepared) return null;
  const { canvas, ctx } = prepared;
  const achieved = Math.max(0, percent ?? 0);
  const target = 100;
  const maxValue = Math.max(achieved, target, 1);
  const heroTop = headingH + 48;
  const barLabelY = headingH + 92;
  const chartTop = headingH + 108;
  const chartBottom = headingH + DONUT_PIE_SIZE - 48;
  const chartH = chartBottom - chartTop;
  const barW = 72;
  const gap = 48;
  const pairW = barW * 2 + gap;
  const startX = (width - pairW) / 2;

  if (options?.heading) {
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.heading, width / 2, 28);
  }

  const drawBar = (x: number, value: number, fill: string, caption: string) => {
    const barH = Math.round((value / maxValue) * chartH);
    const y = chartBottom - barH;
    ctx.fillStyle = tokens.color.surfaceHover;
    ctx.fillRect(x, chartTop, barW, chartH);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatTargetPercent(value), x + barW / 2, barLabelY);
    ctx.fillStyle = tokens.color.textMuted;
    ctx.font = '600 15px Inter, system-ui, sans-serif';
    ctx.fillText(caption, x + barW / 2, chartBottom + 28);
  };

  ctx.fillStyle = tokens.color.textPrimary;
  ctx.textAlign = 'center';
  ctx.font = '700 26px Inter, system-ui, sans-serif';
  ctx.fillText(
    percent == null ? '—' : formatTargetPercent(percent),
    width / 2,
    heroTop,
  );
  ctx.fillStyle = tokens.color.textMuted;
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.fillText(label, width / 2, heroTop + 22);
  if (options?.subtitle) {
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillText(options.subtitle, width / 2, chartBottom + 52);
  }

  drawBar(startX, target, tokens.color.borderDefault, 'Target');
  drawBar(startX + barW + gap, achieved, tokens.color.success, 'Achieved');

  ctx.strokeStyle = tokens.color.borderDefault;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX - 16, chartBottom);
  ctx.lineTo(startX + pairW + 16, chartBottom);
  ctx.stroke();

  if (options?.achievementSummary) {
    drawAchievementSummaryGrid(
      ctx,
      width,
      headingH + DONUT_PIE_SIZE + STAGE_CARD_PAD,
      options.achievementSummary,
    );
  } else if (legendRows.length) {
    drawLegendRows(
      ctx,
      width,
      headingH + DONUT_PIE_SIZE + STAGE_CARD_PAD,
      legendRows,
    );
  }

  return toPng(canvas);
}

/** Ring when at/under target; bar chart when overachieving. */
export async function renderAchievementChartPng(
  percent: number | null,
  label: string,
  options?: AchievementChartRenderOptions,
): Promise<ArrayBuffer | null> {
  if (percent != null && percent > 100) {
    return renderTargetBarPng(percent, label, options);
  }
  return renderTargetRingPng(percent, label, options);
}

export function achievementChartHeading(
  periodLabel: string,
  currency: string,
): string {
  const fiscalYear = periodLabel
    .replace(/\s*[·\-–—]\s*[Qq]\d.*$/i, '')
    .replace(/\s+[Qq]\d+.*$/i, '')
    .trim();
  return `${fiscalYear} — ${currency}`;
}

function formatAchievementSectionHeader(
  label: string,
  pct?: number | null,
): string {
  if (pct == null || !Number.isFinite(pct)) return label;
  return `${label} · ${formatTargetPercent(pct)}`;
}

function achievementSummaryMetric(
  label: string,
  amount: number,
  color: string,
  money: (value: number) => string,
): AchievementSummaryMetric {
  return { label, value: money(amount), color };
}

function achievementSummarySection(
  totals: AchievementSummaryTotals,
  money: (value: number) => string,
  annual = false,
): AchievementSummarySection {
  const targetColor = tokens.color.textMuted;
  const achievedColor = tokens.color.success;
  const remainingColor = tokens.color.brand;
  const target = annual ? (totals.annualTarget ?? 0) : totals.target;
  const achieved = annual ? (totals.annualAchieved ?? 0) : totals.achieved;
  const remaining = annual
    ? (totals.annualRemaining ??
      Math.max(0, (totals.annualTarget ?? 0) - (totals.annualAchieved ?? 0)))
    : totals.remaining;

  return {
    target: achievementSummaryMetric('Target', target, targetColor, money),
    achieved: achievementSummaryMetric(
      'Achievement',
      achieved,
      achievedColor,
      money,
    ),
    remaining: achievementSummaryMetric(
      'Remaining',
      remaining,
      remainingColor,
      money,
    ),
  };
}

/** Quarter/annual summary grid beneath achievement rings in PDF and Excel exports. */
export function buildAchievementSummaryGrid(
  currency: string,
  totals: AchievementSummaryTotals,
  options?: {
    quarterAchievementPct?: number | null;
    annualAchievementPct?: number | null;
  },
): AchievementSummaryGrid {
  const money = (amount: number) =>
    formatMoneyMap({ [currency]: amount }, true);
  const annualTarget = totals.annualTarget ?? 0;
  const annualAchieved = totals.annualAchieved ?? 0;
  return {
    quarter: achievementSummarySection(totals, money),
    annual: achievementSummarySection(totals, money, true),
    quarterAchievementPct: options?.quarterAchievementPct ?? null,
    annualAchievementPct:
      options?.annualAchievementPct ??
      (annualTarget > 0 ? (annualAchieved / annualTarget) * 100 : null),
  };
}

export function achievementSummaryFromRow(
  currency: string,
  achievement?: Pick<
    CurrencyAchievement,
    | 'target'
    | 'achieved'
    | 'remaining'
    | 'achievementPct'
    | 'annualTarget'
    | 'annualAchieved'
    | 'annualRemaining'
    | 'annualAchievementPct'
  > | null,
): AchievementSummaryGrid {
  return buildAchievementSummaryGrid(
    currency,
    {
      target: achievement?.target ?? 0,
      achieved: achievement?.achieved ?? 0,
      remaining: achievement?.remaining ?? 0,
      annualTarget: achievement?.annualTarget,
      annualAchieved: achievement?.annualAchieved,
      annualRemaining: achievement?.annualRemaining,
    },
    {
      quarterAchievementPct: achievement?.achievementPct ?? null,
      annualAchievementPct: achievement?.annualAchievementPct ?? null,
    },
  );
}

/** @deprecated Use buildAchievementSummaryGrid for export charts. */
export function achievementLegendRows(
  currency: string,
  totals: AchievementSummaryTotals,
): ChartLegendRow[] {
  const money = (amount: number) =>
    formatMoneyMap({ [currency]: amount }, true);
  const rows: ChartLegendRow[] = [
    {
      label: 'Target',
      value: money(totals.target),
      color: tokens.color.borderDefault,
    },
    {
      label: 'Achieved',
      value: money(totals.achieved),
      color: tokens.color.success,
    },
    {
      label: 'Remaining',
      value: money(totals.remaining),
      color: tokens.color.brand,
    },
  ];
  const hasAnnual =
    (totals.annualTarget ?? 0) > 0 ||
    (totals.annualAchieved ?? 0) > 0 ||
    (totals.annualRemaining ?? 0) > 0;
  if (hasAnnual) {
    rows.push(
      {
        label: 'Annual Target',
        value: money(totals.annualTarget ?? 0),
        color: tokens.color.borderDefault,
      },
      {
        label: 'Annual Achieved',
        value: money(totals.annualAchieved ?? 0),
        color: tokens.color.success,
      },
      {
        label: 'Annual Remaining',
        value: money(
          totals.annualRemaining ??
            Math.max(
              0,
              (totals.annualTarget ?? 0) - (totals.annualAchieved ?? 0),
            ),
        ),
        color: tokens.color.brand,
      },
    );
  }
  return rows;
}

export async function renderCurrencyAchievementCharts(
  rows: CurrencyAchievement[],
): Promise<ArrayBuffer[]> {
  const buffers = await Promise.all(
    rows.map((row) =>
      renderAchievementChartPng(row.achievementPct, 'Achievement', {
        heading: row.currency,
        subtitle: `${formatMoneyMap({ [row.currency]: row.achieved }, true)} / ${formatMoneyMap({ [row.currency]: row.target }, true)}`,
      }),
    ),
  );
  return buffers.filter((buffer): buffer is ArrayBuffer => Boolean(buffer));
}
