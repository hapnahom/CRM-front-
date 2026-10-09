import { cn } from '@/lib/utils';

export function StagePresetSwatch({
  color,
  borderColor,
  className,
  selected = false,
}: {
  color: string;
  borderColor: string;
  className?: string;
  selected?: boolean;
}) {
  return (
    <span
      className={cn(
        'box-border inline-block aspect-square shrink-0 rounded-full border-2',
        selected && 'ring-2 ring-foreground ring-offset-1',
        className,
      )}
      style={{
        backgroundColor: color,
        borderColor: borderColor,
      }}
    />
  );
}
