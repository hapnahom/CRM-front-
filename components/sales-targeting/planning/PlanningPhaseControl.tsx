'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useUpdatePlanningPhase } from '@/store/server/features/salesTargeting/mutations';
import type { SalesTargetPlanningPhase } from '@/store/server/features/salesTargeting/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { cn } from '@/lib/utils';

const PHASE_LABELS: Record<SalesTargetPlanningPhase, string> = {
  NOT_STARTED: 'Not started',
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RECONCILIATION: 'Reconciliation',
  FINALIZING: 'Finalizing',
  FINALIZED: 'Finalized',
  LOCKED: 'Locked',
};

function phaseDotClass(phase: SalesTargetPlanningPhase): string {
  switch (phase) {
    case 'IN_PROGRESS':
    case 'OPEN':
    case 'RECONCILIATION':
    case 'FINALIZING':
      return 'bg-emerald-500';
    case 'FINALIZED':
    case 'LOCKED':
      return 'bg-brand';
    default:
      return 'bg-muted-foreground/40';
  }
}

type Props = {
  planId: string;
  planningPhase: SalesTargetPlanningPhase;
  allowedTransitions: SalesTargetPlanningPhase[];
  planStatus?: string | null;
  canManage?: boolean;
  className?: string;
};

function isPlanningPhaseEditable(planStatus?: string | null): boolean {
  const status = planStatus?.trim().toLowerCase();
  return status === 'draft' || status === '' || status == null;
}

function readOnlyPhaseHint(planStatus?: string | null): string | null {
  const status = planStatus?.trim().toLowerCase();
  if (status === 'published') {
    return 'Planning phase is fixed after the plan is published (company finalize).';
  }
  if (status === 'locked' || status === 'archived') {
    return 'Planning phase cannot be changed on a locked or archived plan.';
  }
  return null;
}

export function PlanningPhaseControl({
  planId,
  planningPhase,
  allowedTransitions,
  planStatus,
  canManage = false,
  className,
}: Props) {
  const updatePhase = useUpdatePlanningPhase();
  const phaseEditable = isPlanningPhaseEditable(planStatus);
  const readOnlyHint = readOnlyPhaseHint(planStatus);
  const canEditPhase =
    canManage && phaseEditable && allowedTransitions.length > 0;

  const options = useMemo(
    () =>
      canEditPhase
        ? [
            planningPhase,
            ...allowedTransitions.filter((p) => p !== planningPhase),
          ]
        : [planningPhase],
    [planningPhase, allowedTransitions, canEditPhase],
  );

  const handleAdvance = async (next: SalesTargetPlanningPhase) => {
    if (next === planningPhase) return;
    try {
      await updatePhase.mutateAsync({ planId, planningPhase: next });
      NotificationMessage.success({
        message: `Planning phase updated to ${PHASE_LABELS[next]}`,
      });
    } catch (error) {
      NotificationMessage.error({
        message:
          error instanceof Error
            ? error.message
            : 'Could not update planning phase',
      });
    }
  };

  const phaseLabel = PHASE_LABELS[planningPhase] ?? planningPhase;

  return (
    <div className={cn('flex flex-col items-end gap-1.5', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Planning phase
      </span>
      {!canEditPhase ? (
        <span
          className="inline-flex h-9 max-w-[220px] items-center gap-2 rounded-lg border border-border bg-surface-card px-3 text-[12px] font-medium text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
          title={readOnlyHint ?? undefined}
        >
          <span
            className={cn(
              'size-2 shrink-0 rounded-full',
              phaseDotClass(planningPhase),
            )}
            aria-hidden
          />
          <span className="truncate">{phaseLabel}</span>
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Select
            value={planningPhase}
            onValueChange={(value) =>
              void handleAdvance(value as SalesTargetPlanningPhase)
            }
            disabled={updatePhase.isLoading}
          >
            <SelectTrigger className="h-9 w-[172px] gap-2 rounded-lg border-border bg-surface-card px-3 text-[12px] font-medium shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  phaseDotClass(planningPhase),
                )}
                aria-hidden
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((phase) => (
                <SelectItem key={phase} value={phase} className="text-[12px]">
                  {PHASE_LABELS[phase]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updatePhase.isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      )}
    </div>
  );
}
