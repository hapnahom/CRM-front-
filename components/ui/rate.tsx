'use client';

import * as React from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RateProps {
  value?: number;
  onChange?: (value: number) => void;
  count?: number;
  allowHalf?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function Rate({
  value = 0,
  onChange,
  count = 5,
  allowHalf = false,
  disabled = false,
  className,
  style,
}: RateProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const displayValue = hoverValue ?? value;

  const handleClick = (index: number, isHalf: boolean) => {
    if (disabled || !onChange) return;
    onChange(isHalf && allowHalf ? index + 0.5 : index + 1);
  };

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      style={style}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: count }, (value, index) => {
        void value;
        const filled = displayValue >= index + 1;
        const halfFilled =
          allowHalf && displayValue >= index + 0.5 && displayValue < index + 1;

        return (
          <span key={index} className="relative inline-flex">
            {allowHalf && (
              <button
                type="button"
                disabled={disabled}
                className="absolute left-0 z-10 h-full w-1/2 cursor-pointer opacity-0"
                onMouseEnter={() => setHoverValue(index + 0.5)}
                onClick={() => handleClick(index, true)}
                aria-label={`${index + 0.5} stars`}
              />
            )}
            <button
              type="button"
              disabled={disabled}
              className={cn(
                'inline-flex cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              )}
              onMouseEnter={() => setHoverValue(index + 1)}
              onClick={() => handleClick(index, false)}
              aria-label={`${index + 1} stars`}
            >
              <Star
                className={cn(
                  'size-4 transition-colors',
                  filled || halfFilled
                    ? 'fill-[#fadb14] text-[#fadb14]'
                    : 'fill-transparent text-[#d9d9d9]',
                )}
              />
            </button>
          </span>
        );
      })}
    </div>
  );
}

export { Rate };
