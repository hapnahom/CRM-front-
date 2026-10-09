import type { jsPDF } from 'jspdf';
import { tokens } from '@/lib/design-tokens';
import type {
  GeneratedReport,
  ReportChart,
  ReportKpi,
  ReportSection,
} from './types';

const MARGIN = 40;
const BRAND = tokens.color.brand;
/** A4 landscape (pt). */
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const FOOTER_GUARD = 48;
const PAGE_TOP_Y = 64;

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

function arrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/png;base64,${btoa(binary)}`;
}

function buildFilename(name: string): string {
  const base = (name || 'CRM_Report')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
  const date = new Date().toISOString().slice(0, 10);
  return `${base || 'CRM_Report'}_${date}.pdf`;
}

class PdfWriter {
  doc: Doc;
  y = MARGIN;
  report: GeneratedReport;

  constructor(doc: Doc, report: GeneratedReport) {
    this.doc = doc;
    this.report = report;
  }

  get usable() {
    return PAGE_W - MARGIN * 2;
  }

  get atPageTop() {
    return this.y <= PAGE_TOP_Y + 2;
  }

  newPage() {
    this.doc.addPage();
    this.y = MARGIN;
    this.headerBar(true);
  }

  ensure(space: number) {
    if (this.y + space > PAGE_H - FOOTER_GUARD) this.newPage();
  }

  headerBar(continued = false) {
    this.doc.setFillColor(...hex(BRAND));
    this.doc.rect(0, 0, PAGE_W, 8, 'F');
    if (continued) {
      this.doc.setFontSize(8);
      this.doc.setTextColor(107, 114, 128);
      this.doc.text(this.report.name, MARGIN, 28);
      this.y = PAGE_TOP_Y;
    }
  }

  title(text: string, major = false) {
    if (major) {
      if (!this.atPageTop) this.newPage();
    } else {
      if (!this.atPageTop) this.y += 14;
      this.ensure(120);
    }
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(major ? 14 : 12);
    this.doc.setTextColor(17, 24, 39);
    this.doc.text(text, MARGIN, this.y);
    this.y += 8;
    this.doc.setFillColor(...hex(BRAND));
    this.doc.rect(MARGIN, this.y, 36, 2, 'F');
    this.y += 14;
  }

  muted(text: string) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(107, 114, 128);
    const lines = this.doc.splitTextToSize(text, this.usable);
    this.ensure(lines.length * 12 + 4);
    this.doc.text(lines, MARGIN, this.y);
    this.y += lines.length * 12 + 4;
  }

  /** Card grid matching on-screen Sales KPI cards (label · value · hint). */
  kpiCards(kpis: ReportKpi[]) {
    if (!kpis.length) {
      this.muted('No KPIs for this report.');
      return;
    }

    const gap = 10;
    const cols = Math.min(4, kpis.length);
    const cardW = (this.usable - gap * (cols - 1)) / cols;
    const padX = 10;
    const textW = cardW - padX * 2;

    const measureCard = (kpi: ReportKpi) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      const labelLines = this.doc.splitTextToSize(
        kpi.label.toUpperCase(),
        textW,
      ) as string[];
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      const valueLines = this.doc.splitTextToSize(kpi.value, textW) as string[];
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      const hintLines = kpi.hint
        ? (this.doc.splitTextToSize(kpi.hint, textW) as string[])
        : [];
      const h =
        4 + // accent bar
        10 +
        labelLines.length * 10 +
        4 +
        valueLines.length * 14 +
        (hintLines.length ? 4 + hintLines.length * 11 : 0) +
        12;
      return { labelLines, valueLines, hintLines, h };
    };

    const measured = kpis.map(measureCard);

    for (let i = 0; i < kpis.length; i += cols) {
      const row = kpis.slice(i, i + cols);
      const rowMeasured = measured.slice(i, i + cols);
      const rowH = Math.max(...rowMeasured.map((m) => m.h));
      this.ensure(rowH + 8);

      row.forEach((kpi, col) => {
        const x = MARGIN + col * (cardW + gap);
        const y = this.y;
        const m = rowMeasured[col]!;

        this.doc.setDrawColor(229, 231, 235);
        this.doc.setFillColor(255, 255, 255);
        this.doc.roundedRect(x, y, cardW, rowH, 3, 3, 'FD');

        this.doc.setFillColor(...hex(kpi.accentColor || BRAND));
        this.doc.rect(x, y, cardW, 4, 'F');

        let ty = y + 14;
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(156, 163, 175);
        this.doc.text(m.labelLines, x + padX, ty);
        ty += m.labelLines.length * 10 + 4;

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(12);
        this.doc.setTextColor(...hex(kpi.valueColor || '#111827'));
        this.doc.text(m.valueLines, x + padX, ty);
        ty += m.valueLines.length * 14;

        if (m.hintLines.length) {
          ty += 4;
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(8);
          this.doc.setTextColor(156, 163, 175);
          this.doc.text(m.hintLines, x + padX, ty);
        }
      });

      this.y += rowH + 12;
    }
  }

  table(
    headers: string[],
    rows: string[][],
    widths?: number[],
    cellColors?: Array<Array<string | undefined>>,
  ) {
    if (!rows.length) {
      this.muted('No records for this section.');
      return;
    }
    const cols = headers.length;
    const usable = this.usable;
    const colW = widths ?? headers.map(() => usable / cols);
    const minRowH = 16;
    const headerH = 16;
    const lineH = 10;
    const padY = 6;

    const wrapped = (cell: string, index: number) =>
      wrapPdfCell(this.doc, cell, colW[index]! - 8);

    const rowHeight = (row: string[]) => {
      const lines = Math.max(
        ...row.map((cell, index) => wrapped(cell, index).length),
        1,
      );
      return Math.max(minRowH, padY * 2 + lines * lineH);
    };

    const paintHeader = () => {
      this.doc.setFillColor(...hex(BRAND));
      this.doc.rect(MARGIN, this.y, usable, headerH, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      let x = MARGIN;
      headers.forEach((header, index) => {
        this.doc.text(header, x + 4, this.y + 11, {
          maxWidth: colW[index]! - 8,
        });
        x += colW[index]!;
      });
      this.y += headerH;
    };

    this.ensure(headerH + rowHeight(rows[0]!));
    paintHeader();

    rows.forEach((row, rowIndex) => {
      const rowH = rowHeight(row);
      if (this.y + rowH > PAGE_H - FOOTER_GUARD) {
        this.newPage();
        paintHeader();
      }
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(249, 250, 251);
        this.doc.rect(MARGIN, this.y, usable, rowH, 'F');
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      let x = MARGIN;
      row.forEach((cell, index) => {
        const cellColor = cellColors?.[rowIndex]?.[index];
        if (cellColor) {
          this.doc.setTextColor(...hex(cellColor));
          this.doc.setFont('helvetica', 'bold');
        } else {
          this.doc.setTextColor(55, 65, 81);
          this.doc.setFont('helvetica', 'normal');
        }
        const lines = wrapped(cell, index);
        this.doc.text(lines, x + 4, this.y + padY + lineH - 1);
        x += colW[index]!;
      });
      this.y += rowH;
    });
    this.y += 14;
  }

  async image(buffer: ArrayBuffer | null, w: number, h: number) {
    if (!buffer) return;
    this.ensure(h + 8);
    this.doc.addImage(
      arrayBufferToDataUrl(buffer),
      'PNG',
      MARGIN,
      this.y,
      w,
      h,
    );
    this.y += h + 12;
  }

  /** Place charts in one row (all four Sales donuts side by side). */
  async chartRow(
    items: Array<{ buffer: ArrayBuffer | null; heightHint: number }>,
    colsPerRow = 4,
  ) {
    if (!items.length) return;
    const cols = Math.min(colsPerRow, items.length);
    const gap = 10;
    const cellW = (this.usable - gap * (cols - 1)) / cols;

    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols);
      const rowH = Math.max(...row.map((item) => item.heightHint), 140);
      this.ensure(rowH + 10);
      const y = this.y;
      row.forEach((item, col) => {
        if (!item.buffer) return;
        const x = MARGIN + col * (cellW + gap);
        this.doc.addImage(
          arrayBufferToDataUrl(item.buffer),
          'PNG',
          x,
          y,
          cellW,
          rowH,
        );
      });
      this.y = y + rowH + 12;
    }
  }

  footer() {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
      this.doc.setPage(i);
      this.doc.setDrawColor(229, 231, 235);
      this.doc.line(MARGIN, PAGE_H - 32, PAGE_W - MARGIN, PAGE_H - 32);
      this.doc.setFontSize(8);
      this.doc.setTextColor(107, 114, 128);
      this.doc.text(this.report.name, MARGIN, PAGE_H - 18);
      this.doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 18, {
        align: 'right',
      });
    }
  }
}

function coverFilterText(report: GeneratedReport): string {
  const lines = report.filterTags.filter((tag) => !tag.startsWith('Period:'));
  return lines.join('\n') || 'None';
}

function cover(pdf: PdfWriter) {
  const { doc, report } = pdf;
  pdf.headerBar();
  pdf.y = 72;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...hex(BRAND));
  doc.text('CRM REPORTS', MARGIN, pdf.y + 16);
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  const titleLines = doc.splitTextToSize(report.name, pdf.usable);
  doc.text(titleLines, MARGIN, pdf.y + 40);
  pdf.y += 40 + titleLines.length * 24 + 12;
  pdf.muted('KPIs · Charts · Tables');
  pdf.y += 8;

  const facts: Array<[string, string]> = [
    ['Period', report.periodLabel || '—'],
    ['Generated', `${report.generatedAt} by ${report.generatedBy}`],
    ['Categories', report.categories.join(', ') || '—'],
    ['Filters', coverFilterText(report)],
  ];
  facts.forEach(([label, value]) => {
    pdf.ensure(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...hex(BRAND));
    doc.text(label.toUpperCase(), MARGIN, pdf.y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    const lines =
      label === 'Filters'
        ? wrapPdfCell(doc, value, pdf.usable)
        : (doc.splitTextToSize(value, pdf.usable) as string[]);
    doc.text(lines, MARGIN, pdf.y + 14);
    pdf.y += 14 + lines.length * 13 + 8;
  });
}

/** Shared with Excel export so Overview charts match the on-screen layout. */
export async function renderChartPng(
  chart: ReportChart,
): Promise<ArrayBuffer | null> {
  if (typeof document === 'undefined') return null;
  // Donut on top, legend underneath (same as generated report UI).
  const width = 280;
  const legendRows = Math.max(chart.slices.length, 1);
  const headerH = 36;
  const donutArea = 130;
  const legendH = legendRows * 16 + 12;
  const height = headerH + donutArea + legendH;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = tokens.color.surfaceCard;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#e5e7eb';
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.fillStyle = tokens.color.textPrimary;
  ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
  const title = chart.title || 'Chart';
  const titleMax = chart.subtitle ? width - 100 : width - 24;
  let titleDraw = title;
  while (titleDraw.length > 4 && ctx.measureText(titleDraw).width > titleMax) {
    titleDraw = `${titleDraw.slice(0, -2)}…`;
  }
  ctx.fillText(titleDraw, 10, 22);

  if (chart.subtitle) {
    ctx.font = 'bold 9px Helvetica, Arial, sans-serif';
    const badge = chart.subtitle;
    const tw = ctx.measureText(badge).width;
    const bx = width - 10 - tw - 10;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(bx, 8, tw + 10, 16);
    ctx.fillStyle = '#4b5563';
    ctx.fillText(badge, bx + 5, 19);
  }

  const cx = width / 2;
  const cy = headerH + donutArea / 2;
  const radius = 46;
  const inner = 26;
  let start = -Math.PI / 2;
  const slices = chart.slices.filter((s) => s.value > 0);
  const valueTotal = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  if (!slices.length) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = tokens.color.surfaceHover;
    ctx.fill();
  } else {
    for (const slice of slices) {
      const angle = (slice.value / valueTotal) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = slice.color || BRAND;
      ctx.fill();
      start += angle;
    }
  }

  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const centerLines = (chart.totalLabel || '—').split('\n').filter(Boolean);
  ctx.textAlign = 'center';
  centerLines.forEach((line, index) => {
    const isPrimary = index === 0;
    const y =
      cy + (index - (centerLines.length - 1) / 2) * (isPrimary ? 10 : 11);
    ctx.fillStyle = isPrimary
      ? tokens.color.textMuted
      : tokens.color.textPrimary;
    ctx.font = isPrimary
      ? 'bold 7px Helvetica, Arial, sans-serif'
      : index === 1
        ? 'bold 10px Helvetica, Arial, sans-serif'
        : 'bold 8px Helvetica, Arial, sans-serif';
    ctx.fillText(line, cx, y);
  });
  ctx.textAlign = 'left';

  let legendY = headerH + donutArea + 4;
  const lineH = 15;
  const maxLegendW = width - 24;
  for (const slice of chart.slices) {
    const amount = String(slice.amount ?? slice.value ?? '').trim();
    const hideShare =
      /\bdeal/i.test(amount) ||
      /remaining quota gap/i.test(slice.label) ||
      slice.share < 0;
    const line = hideShare
      ? `${slice.label} · ${amount}`
      : `${slice.label} · ${amount} · ${slice.share}%`;

    ctx.font = '10px Helvetica, Arial, sans-serif';
    let draw = line;
    while (draw.length > 4 && ctx.measureText(draw).width > maxLegendW - 14) {
      draw = `${draw.slice(0, -2)}…`;
    }
    const textW = ctx.measureText(draw).width;
    const rowW = 8 + textW; // dot gap + text
    const rowX = (width - rowW) / 2;

    ctx.beginPath();
    ctx.arc(rowX + 3.5, legendY + 3, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = slice.color || BRAND;
    ctx.fill();

    ctx.fillStyle = tokens.color.textPrimary;
    ctx.fillText(draw, rowX + 10, legendY + 6);
    legendY += lineH;
  }

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

function sectionCellColors(
  section: ReportSection,
): Array<Array<string | undefined>> {
  return section.rows.map((row) =>
    section.columns.map((col) => row.cellColors?.[col.id]),
  );
}

function sectionRows(section: ReportSection): string[][] {
  return section.rows.map((row) =>
    section.columns.map((col) => String(row.cells[col.id] ?? '—')),
  );
}

function wrapPdfCell(doc: jsPDF, text: string, maxWidth: number): string[] {
  const raw = String(text || '—');
  const lines: string[] = [];
  for (const paragraph of raw.split('\n')) {
    const wrapped = doc.splitTextToSize(
      paragraph.trim() || '—',
      Math.max(20, maxWidth),
    ) as string[];
    lines.push(...wrapped);
  }
  return lines.length ? lines : ['—'];
}

function evenWidths(count: number, usable: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(usable / count);
  const widths = Array.from({ length: count }, () => base);
  widths[widths.length - 1]! += usable - base * count;
  return widths;
}

async function buildGeneratedReportPdf(report: GeneratedReport): Promise<Doc> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  }) as Doc;
  const pdf = new PdfWriter(doc, report);

  const chartBuffers = await Promise.all(
    report.charts.map((chart) => renderChartPng(chart)),
  );

  cover(pdf);

  const hasOverview = report.kpis.length > 0 || report.charts.length > 0;

  if (hasOverview) {
    doc.addPage();
    pdf.y = MARGIN;
    pdf.headerBar(true);
    pdf.title('Overview', true);

    // Same filter chips as on-screen Overview.
    const filters = report.filterTags.filter((t) => !t.startsWith('Period:'));
    if (filters.length) {
      pdf.muted(filters.join(' · '));
    }

    pdf.kpiCards(report.kpis);

    if (report.charts.length) {
      if (!pdf.atPageTop) pdf.y += 8;
      await pdf.chartRow(
        report.charts.map((chart, i) => ({
          buffer: chartBuffers[i] ?? null,
          heightHint: Math.max(
            200,
            160 + Math.max(chart.slices.length, 1) * 14,
          ),
        })),
        Math.min(4, report.charts.length),
      );
    }
  }

  // Sections in the same order as on-screen (after removals / reorder).
  report.sections.forEach((section, index) => {
    pdf.title(`${index + 1}. ${section.title}`, true);
    if (section.description) pdf.muted(section.description);
    pdf.table(
      section.columns.map((c) => c.label),
      sectionRows(section),
      evenWidths(section.columns.length, pdf.usable),
      sectionCellColors(section),
    );
  });

  pdf.footer();
  return doc;
}

export async function exportGeneratedReportPdf(
  report: GeneratedReport,
): Promise<string> {
  const doc = await buildGeneratedReportPdf(report);
  const filename = buildFilename(report.name);
  doc.save(filename);
  return filename;
}

/**
 * Print the same PDF payload (report only — no app chrome / section sidebar).
 * Uses an off-screen iframe on this page (no new browser tab).
 */
export async function printGeneratedReportPdf(
  report: GeneratedReport,
): Promise<void> {
  const doc = await buildGeneratedReportPdf(report);
  doc.autoPrint();
  const url = doc.output('bloburl') as string;

  await new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Print report');
    // Full viewport, invisible — PDF viewers often ignore 0×0 frames.
    iframe.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;border:0;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(iframe);

    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      // Keep iframe while the print dialog is open; revoke later.
      window.setTimeout(() => {
        iframe.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
      if (error) {
        reject(error instanceof Error ? error : new Error('Print failed'));
      } else {
        resolve();
      }
    };

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        finish();
      } catch (error) {
        // autoPrint() in the PDF may still open the dialog without print().
        finish();
      }
    };

    iframe.onload = () => {
      window.setTimeout(triggerPrint, 500);
    };
    iframe.src = url;

    // Chromium often skips onload for application/pdf — retry once.
    window.setTimeout(() => {
      if (!settled) triggerPrint();
    }, 1800);
  });
}
