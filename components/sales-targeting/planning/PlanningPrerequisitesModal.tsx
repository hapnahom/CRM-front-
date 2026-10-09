'use client';

import { Building2, CheckCircle2, Lock, Users } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  PlanningEligibilityEntity,
  PlanningEligibilityView,
} from '@/store/server/features/salesTargeting/types';
import type { PlanningWorkbenchView } from '@/components/sales-targeting/planning/planningTypes';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility: PlanningEligibilityView | null | undefined;
  onOpenWorkbench: (view: PlanningWorkbenchView) => void;
  /** Horizon the blocked scopes belong to, e.g. "Annual" or "Q2". */
  horizonLabel?: string | null;
};

function resolveActionLabel(allowedActions: string[]): string | null {
  if (allowedActions.includes('review')) return 'Review proposals';
  if (allowedActions.includes('propose')) return 'Open proposals';
  if (allowedActions.includes('allocate')) return 'Open allocation';
  if (allowedActions.length === 0) return null;
  return 'Open workbench';
}

function resolveWorkbench(allowedActions: string[]): PlanningWorkbenchView {
  if (allowedActions.includes('allocate')) return 'allocate';
  return 'requests';
}

function plural(count: number, singular: string, pluralLabel?: string) {
  return `${count} ${count === 1 ? singular : (pluralLabel ?? `${singular}s`)}`;
}

function BlockedRow({
  entity,
  onAction,
}: {
  entity: PlanningEligibilityEntity;
  onAction: (entity: PlanningEligibilityEntity) => void;
}) {
  const actionLabel = resolveActionLabel(entity.allowedActions);
  const Icon = entity.entityType === 'department' ? Building2 : Users;

  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
          'bg-surface-elevated text-muted-foreground',
        )}
      >
        <Icon size={15} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">
          {entity.entityName}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
          <Lock
            size={12}
            className="mt-[3px] shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <span>
            {entity.blockedReason ?? 'Not eligible to propose targets'}
          </span>
        </p>
      </div>
      <div className="shrink-0 self-center">
        {actionLabel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAction(entity)}
          >
            {actionLabel}
          </Button>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Waiting on upstream
          </span>
        )}
      </div>
    </li>
  );
}

function BlockedGroup({
  title,
  entities,
  onAction,
}: {
  title: string;
  entities: PlanningEligibilityEntity[];
  onAction: (entity: PlanningEligibilityEntity) => void;
}) {
  if (!entities.length) return null;
  return (
    <section>
      <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-muted-foreground">
          {entities.length}
        </span>
      </h4>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface-card">
        {entities.map((entity) => (
          <BlockedRow
            key={`${entity.entityType}:${entity.entityId}`}
            entity={entity}
            onAction={onAction}
          />
        ))}
      </ul>
    </section>
  );
}

export function PlanningPrerequisitesModal({
  open,
  onOpenChange,
  eligibility,
  onOpenWorkbench,
  horizonLabel,
}: Props) {
  const blocked = eligibility?.entities.filter((row) => !row.eligible) ?? [];
  const departments = blocked.filter((row) => row.entityType === 'department');
  const teams = blocked.filter((row) => row.entityType === 'team');

  const handleAction = (entity: PlanningEligibilityEntity) => {
    onOpenChange(false);
    onOpenWorkbench(resolveWorkbench(entity.allowedActions));
  };

  const summary = [
    departments.length ? plural(departments.length, 'department') : null,
    teams.length ? plural(teams.length, 'team') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6 pr-14">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Lock size={18} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold leading-snug text-foreground">
                Scopes not ready to propose
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                Bottom-up and hybrid plans allow proposals only from the main
                department. Other departments receive targets after company
                finalization.
              </DialogDescription>
              {(summary || horizonLabel) && eligibility ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  {horizonLabel ? (
                    <span className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {horizonLabel}
                    </span>
                  ) : null}
                  {summary ? (
                    <span className="text-[12px] text-muted-foreground">
                      {summary} blocked
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-surface-elevated/30 px-6 py-5">
          {!eligibility ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 3 }).map((unused, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-card px-4 py-3.5"
                >
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : blocked.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-card px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 size={20} aria-hidden />
              </span>
              <p className="text-sm font-medium text-foreground">
                Nothing is blocked
              </p>
              <p className="text-[12px] text-muted-foreground">
                All in-scope teams can propose (main department is configured).
              </p>
            </div>
          ) : (
            <>
              <BlockedGroup
                title="Departments"
                entities={departments}
                onAction={handleAction}
              />
              <BlockedGroup
                title="Teams"
                entities={teams}
                onAction={handleAction}
              />
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-surface-card px-6 py-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="h-8">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
