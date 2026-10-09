'use client';

import {
  useVirtualizer,
  type VirtualizerOptions,
} from '@tanstack/react-virtual';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollAreaProps<T> {
  items: T[];
  estimateSize: number;
  overscan?: number;
  threshold?: number;
  className?: string;
  scrollClassName?: string;
  getItemKey?: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  virtualizerOptions?: Partial<
    Omit<
      VirtualizerOptions<HTMLDivElement, Element>,
      'count' | 'getScrollElement' | 'estimateSize'
    >
  >;
}

export function VirtualScrollArea<T>({
  items,
  estimateSize,
  overscan = 4,
  threshold = 15,
  className,
  scrollClassName,
  getItemKey,
  renderItem,
  emptyState = null,
  virtualizerOptions,
}: VirtualScrollAreaProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
    ...virtualizerOptions,
  });

  if (items.length === 0) {
    return <div className={className}>{emptyState}</div>;
  }

  if (items.length <= threshold) {
    return (
      <div className={cn('space-y-2', className)}>
        {items.map((item, index) => (
          <div key={getItemKey?.(item, index) ?? index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn('relative overflow-y-auto', scrollClassName, className)}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]!;
          const style: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          };

          return (
            <div
              key={getItemKey?.(item, virtualRow.index) ?? virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={style}
              className="pb-2"
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
