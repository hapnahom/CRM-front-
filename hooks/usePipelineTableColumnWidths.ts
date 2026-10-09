'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PipelineListColumnId } from '@/lib/pipeline/list-columns';
import {
  clampColumnWidth,
  getDefaultColumnWidth,
  loadPipelineTableColumnWidths,
  resolveColumnWidths,
  savePipelineTableColumnWidths,
  type PipelineTableWidthStoreId,
} from '@/lib/pipeline/table-column-widths';

export function usePipelineTableColumnWidths(
  entity: PipelineTableWidthStoreId,
  columnIds: PipelineListColumnId[],
) {
  const columnIdsKey = columnIds.join('|');
  const [storedWidths, setStoredWidths] = useState<Record<string, number>>(
    () => loadPipelineTableColumnWidths(entity) ?? {},
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    setStoredWidths(loadPipelineTableColumnWidths(entity) ?? {});
    setHydrated(true);
  }, [entity, hydrated]);

  const columnWidths = useMemo(
    () => resolveColumnWidths(columnIds, storedWidths),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnIdsKey, storedWidths],
  );

  const setColumnWidth = useCallback(
    (columnId: PipelineListColumnId, width: number) => {
      const nextWidth = clampColumnWidth(width);
      setStoredWidths((prev) => {
        const next = { ...prev, [columnId]: nextWidth };
        savePipelineTableColumnWidths(entity, next);
        return next;
      });
    },
    [entity],
  );

  const getWidth = useCallback(
    (columnId: PipelineListColumnId) =>
      columnWidths[columnId] ?? getDefaultColumnWidth(columnId),
    [columnWidths],
  );

  return {
    columnWidths,
    setColumnWidth,
    getWidth,
    hydrated,
  };
}
