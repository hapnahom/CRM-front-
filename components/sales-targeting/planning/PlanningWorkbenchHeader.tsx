'use client';

import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TARGETS_PAGE_TITLE_CLASS } from '@/components/sales-targeting/ui-kit';
import {
  PLANNING_WORKBENCH_LABELS,
  PLANNING_WORKBENCH_TITLES,
  type PlanningWorkbenchView,
} from '@/components/sales-targeting/planning/planningTypes';

type WorkbenchOption = {
  id: PlanningWorkbenchView;
  label: string;
};

type Props = {
  options: WorkbenchOption[];
  activeView: PlanningWorkbenchView;
  onBack: () => void;
  onChangeView: (view: PlanningWorkbenchView) => void;
  /** Optional override for allocate workbench subtitle. */
  allocateDescription?: string;
};

export function PlanningWorkbenchHeader({
  options,
  activeView,
  onBack,
  onChangeView,
  allocateDescription,
}: Props) {
  const workbenchTabs = options.filter((option) => option.id !== 'org');
  const title = PLANNING_WORKBENCH_TITLES[activeView];

  const subtitle =
    activeView === 'allocate' ? (
      <>{allocateDescription?.trim() || 'Distribute company targets.'}</>
    ) : null;

  return (
    <div className="flex-shrink-0 border-b border-border bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title="Back to overview"
            aria-label="Back to overview"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 pb-0.5">
            <h1 className={TARGETS_PAGE_TITLE_CLASS}>{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {workbenchTabs.length > 1 ? (
          <div className="inline-flex items-center gap-0.5 pb-0.5">
            {workbenchTabs.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChangeView(option.id)}
                className={cn(
                  'inline-flex items-center whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[12px] font-medium transition-colors',
                  activeView === option.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {PLANNING_WORKBENCH_LABELS[
                  option.id as Exclude<PlanningWorkbenchView, 'org'>
                ] ?? option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
