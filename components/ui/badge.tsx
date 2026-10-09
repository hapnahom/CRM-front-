import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        deal: 'rounded-full border-[var(--stage-green-border)] bg-[var(--stage-green-bg)] text-[var(--pill-deal-text)] [a]:hover:opacity-90',
        lead: 'rounded-full border-[var(--stage-yellow-border)] bg-[var(--stage-yellow-bg)] text-[var(--pill-lead-text)] [a]:hover:opacity-90',
        success:
          'rounded-full border-[var(--stage-green-border)] bg-[var(--stage-green-bg)] text-[var(--pill-success-text)] [a]:hover:opacity-90',
        warning:
          'rounded-full border-[var(--stage-yellow-border)] bg-[var(--stage-yellow-bg)] text-[var(--pill-warning-text)] [a]:hover:opacity-90',
        danger:
          'rounded-full border-[var(--stage-red-border)] bg-[var(--stage-red-bg)] text-[var(--pill-danger-text)] [a]:hover:opacity-90',
        muted:
          'rounded-full border-[var(--stage-slate-border)] bg-[var(--stage-slate-bg)] text-[var(--color-text-muted)] [a]:hover:opacity-90',
        purple:
          'rounded-full border-[var(--stage-purple-border)] bg-[var(--stage-purple-bg)] text-[var(--pill-purple-text)] [a]:hover:opacity-90',
        brand:
          'rounded-full border-[var(--color-brand-border)] bg-[var(--color-brand-muted)] text-[var(--color-brand)] [a]:hover:opacity-90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
