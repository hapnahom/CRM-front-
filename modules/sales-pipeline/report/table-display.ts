/**
 * Blank repeated values in grouped columns (e.g. department on consecutive rows).
 * Shared by PDF and Excel exporters — visual grouping without merged cells.
 */
export function collapseRepeatedColumns(
  rows: Array<Array<string | number>>,
  columnIndexes: number[],
): Array<Array<string | number>> {
  const indexes = new Set(columnIndexes);
  const lastByCol = new Map<number, string>();
  return rows.map((row) =>
    row.map((cell, colIndex) => {
      if (!indexes.has(colIndex)) return cell;
      const text = String(cell ?? '');
      if (text.startsWith('🏢') || /subtotal/i.test(text)) {
        lastByCol.delete(colIndex);
        return cell;
      }
      if (lastByCol.get(colIndex) === text) return '';
      lastByCol.set(colIndex, text);
      return cell;
    }),
  );
}
