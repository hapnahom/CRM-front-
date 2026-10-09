import { saveAs } from 'file-saver';
import type { jsPDF } from 'jspdf';
import type { ReportRecord, ReportSnapshot } from './mock-data';
import { REPORT_PERIODS, REPORT_PIPELINE_SCOPES } from './mock-data';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

type ExportContext = {
  snapshot: ReportSnapshot;
  periodLabel: string;
  scopeLabel: string;
};

function metaLines(ctx: ExportContext): string[] {
  return [
    'CRM Pipeline Report',
    `Period: ${ctx.periodLabel}`,
    `Pipeline: ${ctx.scopeLabel}`,
    `Currency: ${ctx.snapshot.currency}`,
    `Generated: ${new Date(ctx.snapshot.generatedAt).toLocaleString()}`,
  ];
}

function tableRows(records: ReportRecord[]) {
  return records.map((record) => [
    record.name,
    record.account,
    record.kind,
    record.pipeline,
    record.owner,
    record.team,
    record.stage,
    record.amount,
    record.age,
    record.status,
    `${record.probability}%`,
    record.lastActivity,
  ]);
}

const HEADERS = [
  'Record',
  'Account',
  'Type',
  'Pipeline',
  'Owner',
  'Team',
  'Stage',
  'Value',
  'Age in stage',
  'Status',
  'Probability',
  'Last activity',
];

function filenameBase(snapshot: ReportSnapshot): string {
  const period = snapshot.periodId.replace(/-/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  return `CRM_Report_${snapshot.currency}_${period}_${date}`;
}

export async function exportReportCsv(ctx: ExportContext): Promise<void> {
  const lines = [
    ...metaLines(ctx).map((line) => `"${line}"`),
    '',
    HEADERS.join(','),
    ...tableRows(ctx.snapshot.records).map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ),
  ];

  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  saveAs(blob, `${filenameBase(ctx.snapshot)}.csv`);
}

export async function exportReportExcel(ctx: ExportContext): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CRM';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 24 },
  ];
  summary.addRows([
    { metric: 'Report', value: 'CRM Pipeline Report' },
    { metric: 'Period', value: ctx.periodLabel },
    { metric: 'Pipeline', value: ctx.scopeLabel },
    { metric: 'Currency', value: ctx.snapshot.currency },
    {
      metric: 'Generated',
      value: new Date(ctx.snapshot.generatedAt).toLocaleString(),
    },
    { metric: 'Pipeline value', value: ctx.snapshot.kpis.pipelineValue },
    { metric: 'Won revenue', value: ctx.snapshot.kpis.wonRevenue },
    {
      metric: 'Target achievement',
      value: `${ctx.snapshot.kpis.targetPercent}%`,
    },
    { metric: 'Achieved', value: ctx.snapshot.kpis.achieved },
    { metric: 'Target', value: ctx.snapshot.kpis.target },
    { metric: 'Remaining', value: ctx.snapshot.kpis.remaining },
    { metric: 'Win rate', value: ctx.snapshot.kpis.winRate },
    { metric: 'Avg deal size', value: ctx.snapshot.kpis.avgDealSize },
  ]);
  summary.getRow(1).font = { bold: true };

  const stages = workbook.addWorksheet('Pipeline composition');
  stages.columns = [
    { header: 'Stage', key: 'stage', width: 20 },
    { header: 'Group', key: 'group', width: 12 },
    { header: 'Amount', key: 'amount', width: 16 },
    { header: 'Share %', key: 'share', width: 12 },
    { header: 'Records', key: 'count', width: 12 },
  ];
  ctx.snapshot.stages.forEach((stage) => {
    stages.addRow({
      stage: stage.label,
      group: stage.group,
      amount: stage.amount,
      share: stage.share,
      count: stage.count,
    });
  });
  stages.getRow(1).font = { bold: true };

  const teams = workbook.addWorksheet('Team targets');
  teams.columns = [
    { header: 'Team', key: 'name', width: 28 },
    { header: 'Achieved', key: 'achieved', width: 16 },
    { header: 'Target', key: 'target', width: 16 },
    { header: 'Progress %', key: 'percent', width: 14 },
    { header: 'Trend', key: 'trend', width: 12 },
  ];
  ctx.snapshot.teamTargets.forEach((team) => {
    teams.addRow({
      name: team.name,
      achieved: team.achieved,
      target: team.target,
      percent: team.percent,
      trend: team.trend,
    });
  });
  teams.getRow(1).font = { bold: true };

  const records = workbook.addWorksheet('High-value pipeline');
  records.columns = HEADERS.map((header, index) => ({
    header,
    key: `c${index}`,
    width: index === 0 || index === 1 ? 28 : 14,
  }));
  tableRows(ctx.snapshot.records).forEach((row) => {
    const entry: Record<string, string> = {};
    row.forEach((cell, index) => {
      entry[`c${index}`] = String(cell);
    });
    records.addRow(entry);
  });
  records.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase(ctx.snapshot)}.xlsx`,
  );
}

function drawPdfTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: string[][],
) {
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const colCount = headers.length;
  const colWidth = usableWidth / colCount;
  const rowHeight = 18;
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const paintHeader = () => {
    doc.setFillColor(237, 105, 37);
    doc.rect(margin, y, usableWidth, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    headers.forEach((header, index) => {
      doc.text(header, margin + index * colWidth + 3, y + 12, {
        maxWidth: colWidth - 6,
      });
    });
    y += rowHeight;
  };

  paintHeader();

  rows.forEach((row, rowIndex) => {
    if (ensureSpace(rowHeight + 4)) {
      paintHeader();
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, usableWidth, rowHeight, 'F');
    }

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(7);
    row.forEach((cell, index) => {
      doc.text(String(cell), margin + index * colWidth + 3, y + 12, {
        maxWidth: colWidth - 6,
      });
    });
    y += rowHeight;
  });
}

export async function exportReportPdf(ctx: ExportContext): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;

  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text('CRM Pipeline Report', margin, 40);

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  metaLines(ctx)
    .slice(1)
    .forEach((line, index) => {
      doc.text(line, margin, 58 + index * 14);
    });

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Overall target achievement', margin, 130);
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `${ctx.snapshot.kpis.targetPercent}% · Achieved ${ctx.snapshot.kpis.achieved} of ${ctx.snapshot.kpis.target} · Remaining ${ctx.snapshot.kpis.remaining}`,
    margin,
    146,
  );

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Key metrics', margin, 172);
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(
    `Pipeline ${ctx.snapshot.kpis.pipelineValue}  ·  Won ${ctx.snapshot.kpis.wonRevenue}  ·  Win rate ${ctx.snapshot.kpis.winRate}  ·  Avg deal ${ctx.snapshot.kpis.avgDealSize}`,
    margin,
    188,
  );

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('High-value leads & deals', margin, 214);

  const compactHeaders = [
    'Record',
    'Account',
    'Type',
    'Owner',
    'Stage',
    'Value',
    'Status',
  ];
  const compactRows = ctx.snapshot.records.map((record) => [
    record.name,
    record.account,
    record.kind,
    record.owner,
    record.stage,
    record.amount,
    record.status,
  ]);

  drawPdfTable(doc, 228, compactHeaders, compactRows);
  doc.save(`${filenameBase(ctx.snapshot)}.pdf`);
}

export function resolveExportLabels(snapshot: ReportSnapshot) {
  const period =
    REPORT_PERIODS.find((item) => item.id === snapshot.periodId)?.label ??
    snapshot.periodId;
  const scope =
    REPORT_PIPELINE_SCOPES.find((item) => item.id === snapshot.scope)?.label ??
    snapshot.scope;
  return { periodLabel: period, scopeLabel: scope };
}

export async function exportReport(
  format: ExportFormat,
  snapshot: ReportSnapshot,
): Promise<void> {
  const labels = resolveExportLabels(snapshot);
  const ctx: ExportContext = { snapshot, ...labels };

  if (format === 'csv') {
    await exportReportCsv(ctx);
    return;
  }
  if (format === 'xlsx') {
    await exportReportExcel(ctx);
    return;
  }
  await exportReportPdf(ctx);
}
