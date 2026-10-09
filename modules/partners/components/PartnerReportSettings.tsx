'use client';

import { useEffect, useState } from 'react';
import { Paintbrush, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  DEFAULT_PIPELINE_ROW_COLOR_MODE,
  loadPartnersPipelineRowColorMode,
  savePartnersPipelineRowColorMode,
  type PipelineRowColorMode,
} from '../report/preferences';

const COLOR_MODE_OPTIONS: Array<{
  value: PipelineRowColorMode;
  label: string;
  description: string;
  icon: typeof Paintbrush;
}> = [
  {
    value: 'full',
    label: 'Full row',
    description: 'Stage color on all columns except the partner name',
    icon: Paintbrush,
  },
  {
    value: 'indicator',
    label: 'Left indicator',
    description: 'Thick stage-color border on the left of each row',
    icon: PanelLeft,
  },
];

/** Partners report coloring — Settings → Partners. */
export function PartnerReportSettings() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);
  const [mode, setMode] = useState<PipelineRowColorMode>(
    DEFAULT_PIPELINE_ROW_COLOR_MODE,
  );

  useEffect(() => {
    if (!tenantId || !userId) return;
    setMode(loadPartnersPipelineRowColorMode(tenantId, userId));
  }, [tenantId, userId]);

  const handleChange = (next: PipelineRowColorMode) => {
    setMode(next);
    if (tenantId && userId) {
      savePartnersPipelineRowColorMode(tenantId, userId, next);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="m-0 text-[12px] font-semibold text-foreground">
          Partners report coloring
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Applies to both Partners pipeline sheets in PDF/Excel exports. Full
          row colors every cell except the first (partner) column.
        </p>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-2">
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
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-foreground">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
