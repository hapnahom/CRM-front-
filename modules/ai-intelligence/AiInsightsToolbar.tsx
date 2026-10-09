'use client';

import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AiInsightsToolbarProps = {
  title?: string;
  scopeLabel?: string;
  generatedAt?: string | null;
  isLoading?: boolean;
  onGenerate: () => void;
  generateLabel?: string;
  className?: string;
};

function formatGeneratedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AiInsightsToolbar({
  title = 'AI Insights',
  scopeLabel,
  generatedAt,
  isLoading,
  onGenerate,
  generateLabel = 'Generate insights',
  className,
}: AiInsightsToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-border pb-2',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="shrink-0 text-brand" aria-hidden />
          <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        </div>
        {scopeLabel || generatedAt ? (
          <p className="mt-1 text-[9.5px] font-medium text-muted-foreground">
            {scopeLabel ? `Scope: ${scopeLabel}` : null}
            {scopeLabel && generatedAt ? ' · ' : null}
            {generatedAt ? formatGeneratedAt(generatedAt) : null}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 gap-1.5 px-2.5 text-[10px]"
        onClick={onGenerate}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" aria-hidden />
        ) : (
          <RefreshCw size={12} aria-hidden />
        )}
        {generateLabel}
      </Button>
    </div>
  );
}
