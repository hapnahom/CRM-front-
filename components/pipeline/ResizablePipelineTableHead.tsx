'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { clampColumnWidth } from '@/lib/pipeline/table-column-widths';

type ResizablePipelineTableHeadProps = {
  columnId: string;
  width: number;
  onResize: (columnId: string, width: number) => void;
  className?: string;
  align?: 'left' | 'right';
  children: React.ReactNode;
};

export function ResizablePipelineTableHead({
  columnId,
  width,
  onResize,
  className,
  align = 'left',
  children,
}: ResizablePipelineTableHeadProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      startXRef.current = event.clientX;
      startWidthRef.current = width;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        onResize(columnId, clampColumnWidth(startWidthRef.current + delta));
      };

      const onPointerUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [columnId, onResize, width],
  );

  return (
    <th
      className={cn(
        'relative min-h-12 px-4 py-3 align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground',
        align === 'right' && 'text-right',
        className,
      )}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className={cn('truncate pr-2', align === 'right' && 'text-right')}>
        {children}
      </div>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        onPointerDown={onPointerDown}
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-brand/20 active:bg-brand/30"
      />
    </th>
  );
}

type ResizableNativeTableHeadProps = {
  columnId: string;
  width: number;
  onResize: (columnId: string, width: number) => void;
  className?: string;
  align?: 'left' | 'right';
  children: React.ReactNode;
};

/** Same resize behavior for native `<table>` cells (e.g. sales pipeline dashboard). */
export function ResizableNativeTableHead({
  columnId,
  width,
  onResize,
  className,
  align = 'left',
  children,
}: ResizableNativeTableHeadProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      startXRef.current = event.clientX;
      startWidthRef.current = width;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        onResize(columnId, clampColumnWidth(startWidthRef.current + delta));
      };

      const onPointerUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [columnId, onResize, width],
  );

  return (
    <th
      className={cn(
        'relative px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:pl-0',
        align === 'right' && 'text-right',
        className,
      )}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className={cn('truncate pr-2', align === 'right' && 'text-right')}>
        {children}
      </div>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        onPointerDown={onPointerDown}
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-brand/20 active:bg-brand/30"
      />
    </th>
  );
}

export function pipelineTableCellStyle(width: number): React.CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

export function isWrappableCustomFieldType(fieldType?: string): boolean {
  return (
    fieldType === 'STRING' ||
    fieldType === 'ADDRESS' ||
    fieldType === 'LINK' ||
    fieldType === 'COMPOSITE'
  );
}
