'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TargetDetailsButton } from '@/components/sales-targeting/targetLayout';
import { HybridReconciliationSection } from '@/components/sales-targeting/HybridReconciliationSection';
import {
  HybridStrategicGapAccounting,
  resolveHybridModalMetrics,
} from '@/components/sales-targeting/HybridReconciliationSummary';
import {
  PrimaryButton,
  TARGETS_CARD_CLASS,
  TARGETS_KPI_LABEL_CLASS,
  TARGETS_KPI_VALUE_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUpsertStrategicTarget } from '@/store/server/features/salesTargeting/mutations';
import { useGetReconciliation } from '@/store/server/features/salesTargeting/queries';
import { cn } from '@/lib/utils';

type Props = {
  planId?: string | null;
  currencyId: string;
  currencyCode: string;
  strategicAmount: number;
  periodLabel: string;
  canEdit: boolean;
  horizon?: 'annual' | 'session';
  sessionId?: string | null;
  ensureHybridPlan: () => Promise<string | null>;
  onSaved?: () => void | Promise<void>;
  /** Hybrid: strategic target + gap. Bottom-to-Top: approved rollup only. */
  isHybrid?: boolean;
};

function statusBadgeClass(status: string) {
  if (status === 'FINALIZED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (status === 'RECONCILED') {
    return 'border-sky-200 bg-sky-50 text-sky-800';
  }
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

export function HybridCompanyStrategicDetailsModal({
  planId: planIdProp,
  currencyId,
  currencyCode,
  strategicAmount,
  periodLabel,
  canEdit,
  horizon = 'annual',
  sessionId = null,
  ensureHybridPlan,
  onSaved,
  isHybrid = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(planIdProp ?? '');
  const [amountDraft, setAmountDraft] = useState(String(strategicAmount || ''));
  const upsertStrategic = useUpsertStrategicTarget();

  const reconciliationEnabled = Boolean(open && planId && currencyId);

  const {
    data: reconciliation,
    isLoading: reconciliationLoading,
    refetch: refetchReconciliation,
  } = useGetReconciliation(
    planId,
    { currencyId, horizon, sessionId: sessionId ?? undefined },
    reconciliationEnabled,
    { refetchInterval: false },
  );

  const metrics = useMemo(
    () =>
      resolveHybridModalMetrics(
        reconciliation,
        Number(amountDraft) || strategicAmount,
      ),
    [reconciliation, amountDraft, strategicAmount],
  );

  const isReconciled = metrics.isReconciled;
  const approvedTeamCount = reconciliation?.bottomUpTeams?.length ?? 0;
  const statusLabel = (metrics.status ?? 'PENDING').replace(/_/g, ' ');

  useEffect(() => {
    if (planIdProp) setPlanId(planIdProp);
  }, [planIdProp]);

  useEffect(() => {
    if (open) {
      setAmountDraft(String(strategicAmount || ''));
    }
  }, [open, strategicAmount]);

  useEffect(() => {
    if (!open || planId) return;
    void ensureHybridPlan().then((id) => {
      if (id) setPlanId(id);
    });
  }, [open, planId, ensureHybridPlan]);

  useEffect(() => {
    if (!open || !planId) return;
    void refetchReconciliation();
  }, [open, planId, refetchReconciliation]);

  const saveStrategic = async () => {
    let targetPlanId = planId || planIdProp;
    if (!targetPlanId) {
      targetPlanId = (await ensureHybridPlan()) ?? '';
      if (!targetPlanId) return;
      setPlanId(targetPlanId);
    }
    try {
      await upsertStrategic.mutateAsync({
        planId: targetPlanId,
        currencyId,
        horizon,
        sessionId,
        amount: Number(amountDraft) || 0,
        description:
          horizon === 'session'
            ? 'Company strategic target (Period)'
            : 'Company strategic target (Annual)',
      });
      await refetchReconciliation();
      await onSaved?.();
      NotificationMessage.success({
        message: 'Strategic company target saved',
        description: formatCompactMoney(Number(amountDraft) || 0, currencyCode),
      });
    } catch {
      NotificationMessage.error({
        message: 'Could not save strategic target',
      });
    }
  };

  const modalTitle = isHybrid
    ? isReconciled
      ? 'Official company target'
      : 'Reconcile company target'
    : 'Company target proposals';

  const modalDescription = isHybrid
    ? isReconciled
      ? 'Reconciliation is complete. Finalize when you are ready to publish official allocations.'
      : 'Set the strategic target, then close the gap with company-approved team proposals.'
    : 'Company-approved team proposals that roll into the company target. Pending review stays in Requests.';

  return (
    <>
      <TargetDetailsButton onClick={() => setOpen(true)} label="Details" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="flex h-[min(88vh,52rem)] w-[calc(100vw-2rem)] max-w-[52rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[52rem]"
        >
          <DialogHeader className="shrink-0 gap-2 border-b border-border px-5 py-4 pr-14">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-[15px] font-semibold tracking-tight text-foreground">
                  {modalTitle}
                </DialogTitle>
                <DialogDescription className="text-[12px] leading-relaxed text-muted-foreground">
                  {modalDescription}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-6 border-border bg-surface-elevated px-2 text-[11px] font-medium text-muted-foreground"
                >
                  {periodLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-6 border-border bg-surface-elevated px-2 text-[11px] font-medium text-muted-foreground"
                >
                  {currencyCode}
                </Badge>
                {isHybrid ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-6 px-2 text-[11px] font-semibold capitalize',
                      statusBadgeClass(metrics.status),
                    )}
                  >
                    {statusLabel.toLowerCase()}
                  </Badge>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          <div className="shrink-0 space-y-3 border-b border-border bg-surface-elevated px-5 py-4">
            {isHybrid ? (
              <>
                {isHybrid && !isReconciled ? (
                  <div
                    className={cn(
                      TARGETS_CARD_CLASS,
                      'flex flex-wrap items-end gap-3 p-3.5',
                    )}
                  >
                    <div className="min-w-[220px] flex-1">
                      <Label
                        htmlFor="hybrid-modal-strategic"
                        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Strategic target
                      </Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="hybrid-modal-strategic"
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-9 pr-14"
                          value={amountDraft}
                          onChange={(e) => setAmountDraft(e.target.value)}
                          disabled={!canEdit}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-muted-foreground">
                          {currencyCode}
                        </span>
                      </div>
                    </div>
                    {canEdit ? (
                      <PrimaryButton
                        className="h-9 px-4"
                        disabled={upsertStrategic.isLoading || !amountDraft}
                        onClick={() => void saveStrategic()}
                      >
                        Save strategic
                      </PrimaryButton>
                    ) : null}
                  </div>
                ) : null}

                {planId && currencyId ? (
                  <HybridStrategicGapAccounting
                    variant="compact"
                    data={reconciliation}
                    currencyCode={currencyCode}
                    isLoading={reconciliationLoading}
                    strategicFallback={Number(amountDraft) || strategicAmount}
                  />
                ) : null}
              </>
            ) : (
              <div
                className={cn(
                  TARGETS_CARD_CLASS,
                  'grid gap-0 overflow-hidden sm:grid-cols-2',
                )}
              >
                <div className="px-4 py-3.5">
                  <p className={TARGETS_KPI_LABEL_CLASS}>Approved proposals</p>
                  <p className={cn('mt-2', TARGETS_KPI_VALUE_CLASS)}>
                    {formatCompactMoney(metrics.bottomUp, currencyCode)}
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    Company-approved team total
                  </p>
                </div>
                <div className="border-t border-border px-4 py-3.5 sm:border-l sm:border-t-0">
                  <p className={TARGETS_KPI_LABEL_CLASS}>Teams included</p>
                  <p className={cn('mt-2', TARGETS_KPI_VALUE_CLASS)}>
                    {approvedTeamCount}
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    Grouped by department below
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {planId && currencyId ? (
              <HybridReconciliationSection
                embedded
                canEdit={isHybrid ? canEdit : false}
                hybridStrategicMode={isHybrid}
                bottomToTopWorkflow={!isHybrid}
                planId={planId}
                currencyId={currencyId}
                currencyCode={currencyCode}
                horizon={horizon}
                sessionId={sessionId}
              />
            ) : (
              <div
                className={cn(
                  TARGETS_CARD_CLASS,
                  'px-5 py-10 text-center text-[13px] text-muted-foreground',
                )}
              >
                {isHybrid
                  ? 'Save the strategic target to load reconciliation for this Hybrid plan.'
                  : 'Select a plan to load company target proposals.'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
