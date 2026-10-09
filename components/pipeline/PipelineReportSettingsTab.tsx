'use client';

import { useEffect, useState } from 'react';
import { Paintbrush, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  DEFAULT_PIPELINE_ROW_COLOR_MODE,
  loadPipelineRowColorMode,
  savePipelineRowColorMode,
  type PipelineRowColorMode,
} from '@/modules/sales-pipeline/report/preferences';

const COLOR_MODE_OPTIONS: Array<{
  value: PipelineRowColorMode;
  label: string;
  icon: typeof Paintbrush;
}> = [
  {
    value: 'full',
    label: 'Full row',
    icon: Paintbrush,
  },
  {
    value: 'indicator',
    label: 'Left indicator',
    icon: PanelLeft,
  },
];

export function PipelineReportSettingsTab() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);
  const [mode, setMode] = useState<PipelineRowColorMode>(
    DEFAULT_PIPELINE_ROW_COLOR_MODE,
  );

  useEffect(() => {
    if (!tenantId || !userId) return;
    setMode(loadPipelineRowColorMode(tenantId, userId));
  }, [tenantId, userId]);

  const handleChange = (next: PipelineRowColorMode) => {
    setMode(next);
    if (tenantId && userId) {
      savePipelineRowColorMode(tenantId, userId, next);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-card px-5 py-4">
        <h3 className="text-[13px] font-semibold text-foreground">
          Pipeline sheet coloring
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Applies to Opportunities Total Pipeline sheet coloring in PDF/Excel
          exports.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {COLOR_MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange(option.value)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                  active
                    ? 'border-brand bg-brand/5 ring-1 ring-brand/20'
                    : 'border-border bg-white hover:bg-accent/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                    active
                      ? 'bg-brand text-white'
                      : 'bg-surface-elevated text-muted-foreground',
                  )}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 text-[12px] font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
