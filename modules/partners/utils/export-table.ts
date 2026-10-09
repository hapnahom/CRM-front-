import { saveAs } from 'file-saver';

export type PartnerExportRow = Record<string, string | number>;

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function filenameBase(name: string): string {
  const base = name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${base || 'export'}_${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Generic table export for the Partners module: rows of label→value pairs.
 * Excel output uses ExcelJS; the PDF path mirrors the reports module layout.
 */
export async function exportPartnersTable(
  rows: PartnerExportRow[],
  name: string,
  format: 'xlsx' | 'pdf' | 'csv',
  metaLines: string[] = [],
): Promise<void> {
  if (!rows.length) throw new Error('Nothing to export');

  const headers = Object.keys(rows[0]);
  const base = filenameBase(name);

  if (format === 'csv') {
    const lines = [
      ...metaLines.map((line) => `"${line}"`),
      '',
      headers.join(','),
      ...rows.map((row) => headers.map((h) => csvCell(row[h] ?? '')).join(',')),
    ];
    saveAs(
      new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
      `${base}.csv`,
    );
    return;
  }

  if (format === 'xlsx') {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(name.slice(0, 30) || 'Export');
    if (metaLines.length) {
      const titleRow = sheet.addRow([metaLines[0]]);
      titleRow.font = { bold: true, size: 13 };
      metaLines.slice(1).forEach((line) => {
        sheet.addRow([line]).font = { color: { argb: 'FF64748B' } };
      });
      sheet.addRow([]);
    }

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED6925' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    rows.forEach((row) => {
      const added = sheet.addRow(headers.map((h) => row[h] ?? ''));
      added.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    sheet.columns.forEach((column, index) => {
      const longest = Math.max(
        headers[index]?.length ?? 10,
        ...rows.map((row) => String(row[headers[index]] ?? '').length),
      );
      column.width = Math.min(Math.max(longest + 4, 12), 42);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${base}.xlsx`,
    );
    return;
  }

  // PDF
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const colCount = headers.length;
  const colWidth = usableWidth / colCount;
  const rowHeight = 18;
  let y = margin;

  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(name, margin, y + 6);
  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  metaLines.forEach((line, index) => {
    doc.text(line, margin, y + index * 13);
  });
  y += metaLines.length * 13 + 10;

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

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
      paintHeader();
      return true;
    }
    return false;
  };

  paintHeader();
  rows.forEach((row, rowIndex) => {
    ensureSpace(rowHeight + 4);
    if (rowIndex % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, usableWidth, rowHeight, 'F');
    }
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(7);
    headers.forEach((header, index) => {
      doc.text(
        String(row[header] ?? ''),
        margin + index * colWidth + 3,
        y + 12,
        {
          maxWidth: colWidth - 6,
        },
      );
    });
    y += rowHeight;
  });

  doc.save(`${base}.pdf`);
}
