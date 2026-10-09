import { tokens } from '@/lib/design-tokens';
import { formatCompactAmount } from '@/modules/sales-pipeline/report/format';
import type {
  PartnerReportChartPartner,
  PartnerReportStageSlice,
  PartnerReportTargetRow,
  PartnersReportData,
} from './types';

export type PartnerChartImage = {
  buffer: ArrayBuffer | null;
  width: number;
  height: number;
  partnerId?: string;
  partnerName?: string;
};

const PIE_SIZE = 220;
const PIE_RADIUS = 78;
const DEPTH = 14;
const CARD_PAD = 16;
const LEGEND_ROW = 18;
const HEADING_H = 36;

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

function canvasContext(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

function shade(hex: string, amount: number): string {
  const cleaned = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return hex;
  const num = Number.parseInt(cleaned, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount));
  const b = Math.min(255, Math.max(0, (num & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function ellipsePoint(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number,
) {
  return {
    x: cx + Math.cos(angle) * rx,
    y: cy + Math.sin(angle) * ry,
  };
}

function drawEllipseArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
) {
  const span = end - start;
  const steps = Math.max(8, Math.ceil((Math.abs(span) / Math.PI) * 24));
  for (let i = 1; i <= steps; i += 1) {
    const angle = start + (span * i) / steps;
    const point = ellipsePoint(cx, cy, rx, ry, angle);
    ctx.lineTo(point.x, point.y);
  }
}

function draw3dSlice(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  depth: number,
  start: number,
  end: number,
  color: string,
) {
  if (end <= start) return;

  // Draw visible side wall only for the lower half of the ellipse
  const wallStart = Math.max(start, 0);
  const wallEnd = Math.min(end, Math.PI);
  if (wallEnd > wallStart) {
    const startPt = ellipsePoint(cx, cy, rx, ry, wallStart);
    const endPt = ellipsePoint(cx, cy, rx, ry, wallEnd);
    ctx.beginPath();
    ctx.moveTo(startPt.x, startPt.y);
    drawEllipseArc(ctx, cx, cy, rx, ry, wallStart, wallEnd);
    ctx.lineTo(endPt.x, endPt.y + depth);
    drawEllipseArc(ctx, cx, cy + depth, rx, ry, wallEnd, wallStart);
    ctx.closePath();
    ctx.fillStyle = shade(color, -40);
    ctx.fill();
  }

  // Top elliptical face
  const origin = ellipsePoint(cx, cy, 0, 0, 0);
  const startTop = ellipsePoint(cx, cy, rx, ry, start);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(startTop.x, startTop.y);
  drawEllipseArc(ctx, cx, cy, rx, ry, start, end);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = shade(color, -20);
  ctx.lineWidth = 0.75;
  ctx.stroke();
}

function partnerPieCanvasSize(stageCount: number) {
  const legendH = Math.max(stageCount, 1) * LEGEND_ROW + 8;
  return {
    width: PIE_SIZE + 160,
    height: HEADING_H + PIE_SIZE + legendH + CARD_PAD,
  };
}

async function renderPartnerPiePng(
  partner: PartnerReportChartPartner,
): Promise<PartnerChartImage> {
  const size = partnerPieCanvasSize(partner.stages.length);
  const prepared = canvasContext(size.width, size.height);
  if (!prepared) {
    return {
      buffer: null,
      width: size.width,
      height: size.height,
      partnerId: partner.id,
      partnerName: partner.name,
    };
  }
  const { canvas, ctx } = prepared;
  const cx = PIE_SIZE / 2 + CARD_PAD;
  const cy = HEADING_H + PIE_SIZE / 2 + 4;
  const rx = PIE_RADIUS;
  const ry = PIE_RADIUS * 0.62;

  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(partner.name, size.width / 2, 24);

  const sliceWeight = (stage: PartnerReportStageSlice) =>
    stage.value > 0 ? stage.value : stage.count;
  const positive = partner.stages.filter((stage) => sliceWeight(stage) > 0);
  const total =
    positive.reduce((sum, stage) => sum + sliceWeight(stage), 0) ||
    partner.pipeline ||
    1;

  if (!positive.length) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = tokens.color.surfaceHover;
    ctx.fill();
  } else {
    // Draw back-to-front so the 3D wall reads correctly
    let angle = -Math.PI / 2;
    const slices = positive.map((stage) => {
      const sweep = (sliceWeight(stage) / total) * Math.PI * 2;
      const slice = {
        start: angle,
        end: angle + sweep,
        color: stage.color || tokens.color.brand,
      };
      angle += sweep;
      return slice;
    });
    for (const slice of slices) {
      draw3dSlice(
        ctx,
        cx,
        cy,
        rx,
        ry,
        DEPTH,
        slice.start,
        slice.end,
        slice.color,
      );
    }
  }

  // Center label
  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = '700 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatCompactAmount(partner.pipeline, ''), cx, cy + 4);

  // Legend under pie
  let legendY = HEADING_H + PIE_SIZE + 8;
  ctx.textAlign = 'left';
  ctx.font = '12px Inter, system-ui, sans-serif';
  for (const stage of partner.stages) {
    ctx.fillStyle = stage.color || tokens.color.textSubtle;
    ctx.fillRect(CARD_PAD, legendY - 10, 10, 10);
    ctx.fillStyle = tokens.color.textPrimary;
    const pct = Math.round(stage.share * 100);
    ctx.fillText(
      `${stage.label}  ${formatCompactAmount(stage.value, '')}  (${pct}%)`,
      CARD_PAD + 16,
      legendY,
    );
    legendY += LEGEND_ROW;
  }

  return {
    buffer: await toPng(canvas),
    width: size.width,
    height: size.height,
    partnerId: partner.id,
    partnerName: partner.name,
  };
}

export async function renderPartnerStageCharts(
  report: PartnersReportData,
): Promise<PartnerChartImage[]> {
  const images: PartnerChartImage[] = [];
  for (const partner of report.partnerCharts) {
    images.push(await renderPartnerPiePng(partner));
  }
  return images;
}

export async function renderTargetAchievementChartPng(
  rows: PartnerReportTargetRow[],
): Promise<PartnerChartImage> {
  const width = Math.max(560, 100 + rows.length * 90);
  const height = 320;
  const prepared = canvasContext(width, height);
  if (!prepared) return { buffer: null, width, height };
  const { canvas, ctx } = prepared;

  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Target vs Achievement', 16, 28);

  const chartTop = 56;
  const chartBottom = height - 64;
  const chartLeft = 48;
  const chartRight = width - 24;
  const maxValue =
    Math.max(
      ...rows.flatMap((row) => [row.target, row.pipeline, row.achievement]),
      1,
    ) * 1.15;

  const groupWidth = (chartRight - chartLeft) / Math.max(rows.length, 1);
  const barWidth = Math.min(20, groupWidth / 4);

  const series: Array<{
    key: 'target' | 'pipeline' | 'achievement';
    color: string;
    label: string;
  }> = [
    { key: 'target', color: '#0070C0', label: 'Target' },
    { key: 'pipeline', color: '#ED7D31', label: 'Pipeline' },
    { key: 'achievement', color: '#70AD47', label: 'Achievement' },
  ];

  rows.forEach((row, index) => {
    const groupX = chartLeft + index * groupWidth + groupWidth / 2;
    series.forEach((serie, serieIndex) => {
      const value = row[serie.key] || 0;
      const barH = (value / maxValue) * (chartBottom - chartTop);
      const x = groupX - (series.length * barWidth) / 2 + serieIndex * barWidth;
      ctx.fillStyle = serie.color;
      ctx.fillRect(x, chartBottom - barH, barWidth - 2, Math.max(barH, 0));

      // Value label above each bar
      ctx.fillStyle = tokens.color.textPrimary;
      ctx.font = '700 9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const labelY = Math.max(chartTop + 8, chartBottom - barH - 4);
      ctx.fillText(
        formatCompactAmount(value, ''),
        x + (barWidth - 2) / 2,
        labelY,
      );
    });
    ctx.fillStyle = tokens.color.textSubtle;
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = row.name.length > 12 ? `${row.name.slice(0, 11)}…` : row.name;
    ctx.fillText(label, groupX, chartBottom + 16);
  });

  // Legend
  let lx = 16;
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const serie of series) {
    ctx.fillStyle = serie.color;
    ctx.fillRect(lx, height - 28, 10, 10);
    ctx.fillStyle = tokens.color.textPrimary;
    ctx.fillText(serie.label, lx + 14, height - 19);
    lx += 90;
  }

  return { buffer: await toPng(canvas), width, height };
}

export function arrayBufferToDataUrl(
  buffer: ArrayBuffer,
  mime = 'image/png',
): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Exported for preview summaries */
export function stageSliceTotal(stages: PartnerReportStageSlice[]): number {
  return stages.reduce((sum, stage) => sum + stage.value, 0);
}
