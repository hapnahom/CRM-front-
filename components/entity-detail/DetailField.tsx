'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export function DetailField({
  label,
  value,
  isEditing,
  readOnly = false,
  children,
  className,
  span = 1,
}: {
  label: string;
  value: React.ReactNode;
  isEditing?: boolean;
  /** When true in edit mode, fields are visible but not editable. */
  readOnly?: boolean;
  children?: React.ReactNode;
  className?: string;
  span?: 1 | 2;
}) {
  return (
    <div
      className={cn('space-y-1.5', span === 2 && 'md:col-span-2', className)}
    >
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {isEditing && children ? (
        <fieldset
          disabled={readOnly}
          className={cn(
            'm-0 min-w-0 border-0 p-0',
            readOnly && '[&_*]:cursor-not-allowed [&_*]:opacity-90',
          )}
        >
          {children}
        </fieldset>
      ) : (
        <div className="min-h-9 text-sm leading-snug text-foreground">
          {value || '—'}
        </div>
      )}
    </div>
  );
}

export function DetailFieldGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
