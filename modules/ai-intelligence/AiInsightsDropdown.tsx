'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AiInsightsResponse } from '@/store/server/features/ai-intelligence/types';
import {
  AI_INSIGHTS_SCROLLBAR_CLASS,
  AiInsightsEmptyState,
  AiInsightsScrollList,
  AiInsightsUnavailableState,
} from './AiInsightCard';

type AiInsightsDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Trigger already wired with onClick / pressed state by the parent. */
  trigger: ReactNode;
  title: string;
  isLoading: boolean;
  /** True when the generate mutation failed (network / CRM 429, etc.). */
  isError?: boolean;
  result: AiInsightsResponse | null;
  /** Fired once each time the panel opens — generate fresh insights. Also used for Retry. */
  onOpenGenerate: () => void;
  analyzingMessage: string;
  emptyMessage: string;
};

type PanelCoords = {
  top: number;
  left: number;
  width: number;
};

const PANEL_WIDTH = 360;
const PANEL_GAP = 8;
const VIEWPORT_PAD = 12;

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

function isNestedOverlayTarget(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  if (!el) return false;
  return Boolean(
    el.closest('[data-slot="dialog-content"]') ||
      el.closest('[data-slot="dialog-overlay"]') ||
      el.closest('[data-ai-insights-panel]') ||
      el.closest('[data-slot="select-content"]') ||
      el.closest('[data-slot="dropdown-menu-content"]'),
  );
}

function computeCoords(trigger: DOMRect): PanelCoords {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
  let left = trigger.right - width;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - width - VIEWPORT_PAD),
  );
  return { top: trigger.bottom + PANEL_GAP, left, width };
}

/**
 * Anchored AI Insights panel immediately below the trigger.
 * Fixed portal — no blur overlay, brand glow border only.
 */
export function AiInsightsDropdown({
  open,
  onOpenChange,
  trigger,
  title,
  isLoading,
  isError = false,
  result,
  onOpenGenerate,
  analyzingMessage,
  emptyMessage,
}: AiInsightsDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const sawLoadingRef = useRef(false);
  const onOpenGenerateRef = useRef(onOpenGenerate);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const [awaitingFresh, setAwaitingFresh] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onOpenGenerateRef.current = onOpenGenerate;
  }, [onOpenGenerate]);

  const updateCoords = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    setCoords(computeCoords(el.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setAwaitingFresh(true);
      sawLoadingRef.current = false;
      onOpenGenerateRef.current();
    }
    if (!open) {
      setAwaitingFresh(false);
      sawLoadingRef.current = false;
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!awaitingFresh) return;
    if (isLoading) {
      sawLoadingRef.current = true;
      return;
    }
    if (sawLoadingRef.current || isError) {
      setAwaitingFresh(false);
    }
  }, [awaitingFresh, isLoading, isError]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (rootRef.current?.contains(target as Node)) return;
      if (panelRef.current?.contains(target as Node)) return;
      if (isNestedOverlayTarget(target)) return;
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    // Defer so the opening click does not immediately dismiss the panel.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
    }, 0);

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  const showAnalyzing = isLoading || awaitingFresh;
  const showUnavailable =
    !showAnalyzing && (isError || result?.emptyReason === 'ai_unavailable');
  const showEmpty =
    !showAnalyzing &&
    !showUnavailable &&
    result !== null &&
    result.insights.length === 0;
  const showList =
    !showAnalyzing && !showUnavailable && Boolean(result?.insights.length);

  const panel =
    mounted && open && coords
      ? createPortal(
          <div
            ref={panelRef}
            data-ai-insights-panel
            role="dialog"
            aria-label={title}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            className={cn(
              'z-50 flex max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-xl bg-surface-card text-foreground',
              'border border-brand/50',
              'shadow-[0_0_0_1px_rgba(237,105,37,0.12),0_0_8px_0_rgba(237,105,37,0.18)]',
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-brand/20 px-3.5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles
                    size={14}
                    className="shrink-0 text-brand"
                    aria-hidden
                  />
                  <h3 className="text-[13px] font-semibold text-foreground">
                    {title}
                  </h3>
                </div>
                {result?.scope.label && !showAnalyzing ? (
                  <p className="mt-1 text-[9.5px] font-medium text-muted-foreground">
                    Scope: {result.scope.label}
                    {result.generatedAt
                      ? ` · ${formatGeneratedAt(result.generatedAt)}`
                      : ''}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
                aria-label="Close AI Insight"
              >
                <X size={14} />
              </Button>
            </div>

            <div
              className={cn(
                'min-h-0 flex-1 px-3.5 py-3',
                AI_INSIGHTS_SCROLLBAR_CLASS,
              )}
            >
              {showAnalyzing ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Loader2
                    size={20}
                    className="animate-spin text-brand"
                    aria-hidden
                  />
                  <AiInsightsEmptyState message={analyzingMessage} compact />
                </div>
              ) : null}

              {showUnavailable ? (
                <AiInsightsUnavailableState
                  onRetry={onOpenGenerate}
                  isLoading={isLoading}
                  retryLabel="Regenerate Insights"
                  compact
                />
              ) : null}

              {showList && result ? (
                <AiInsightsScrollList insights={result.insights} />
              ) : null}

              {showEmpty ? (
                <AiInsightsEmptyState message={emptyMessage} compact />
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      {trigger}
      {panel}
    </div>
  );
}
