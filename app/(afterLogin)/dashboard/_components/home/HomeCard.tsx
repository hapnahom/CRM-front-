import { cn } from '@/lib/utils';

/** Flat bordered card — matches the previous executive dashboard chrome (no shadow). */
export const HOME_CARD_CLASS =
  'rounded-xl border border-border bg-white p-4 sm:p-5';

export function HomeCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(HOME_CARD_CLASS, className)}>{children}</div>;
}
