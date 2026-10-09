'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MAX_PIPELINE_LIST_CELL_VALUES } from '@/lib/pipeline/list-columns';
import { cn } from '@/lib/utils';

type TruncatedValueListProps = {
  values: string[];
  max?: number;
  className?: string;
};

export function TruncatedValueList({
  values,
  max = MAX_PIPELINE_LIST_CELL_VALUES,
  className,
}: TruncatedValueListProps) {
  const items = values.map((value) => value.trim()).filter(Boolean);
  if (!items.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const visible = items.slice(0, max);
  const remaining = items.slice(max);

  return (
    <ul className={cn('space-y-0.5 text-sm text-foreground', className)}>
      {visible.map((value, index) => (
        <li key={`${value}-${index}`} className="truncate" title={value}>
          {value}
        </li>
      ))}
      {remaining.length > 0 ? (
        <li>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                +{remaining.length} more
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-56 p-2"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                All {items.length} values
              </p>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                {items.map((value, index) => (
                  <li
                    key={`${value}-${index}`}
                    className="truncate rounded px-1 py-0.5 text-[12px] text-foreground"
                    title={value}
                  >
                    {value}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </li>
      ) : null}
    </ul>
  );
}
