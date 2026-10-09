'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetTargetRequestHistory } from '@/store/server/features/salesTargeting/queries';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { RequestHistoryTimeline } from '@/components/sales-targeting/planning/RequestHistoryTimeline';
import {
  TARGETS_CARD_CLASS,
  RequestHistoryTimelineSkeleton,
} from '@/components/sales-targeting/ui-kit';
import type { TargetPlanningMetrics } from '@/store/server/features/salesTargeting/types';
import { PlanningStatusText } from '@/components/sales-targeting/planning/planningStatusDisplay';

function statusForDisplay(status?: string | null) {
  if (!status) return null;
  return status as TargetPlanningMetrics['requestStatus'];
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId?: string;
  metrics?: TargetPlanningMetrics | null;
  currencyCode: string;
  onOpenRequests?: () => void;
};

function MetricRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function RequestReviewModal({
  open,
  onOpenChange,
  planId,
  metrics,
  currencyCode,
  onOpenRequests,
}: Props) {
  const requestId = metrics?.requestId ?? null;
  const { data: history, isLoading } = useGetTargetRequestHistory(
    planId,
    requestId,
    open && Boolean(planId && requestId),
  );

  const title = metrics?.scopeName ?? history?.teamName ?? 'Target proposal';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Proposal review with supporting forecast and revision history.
          </DialogDescription>
          {metrics?.requestStatus ? (
            <PlanningStatusText
              status={statusForDisplay(metrics.requestStatus)}
            />
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={TARGETS_CARD_CLASS + ' mb-4 px-4 py-3'}>
            <MetricRow
              label="Current proposal"
              value={
                metrics?.proposedTarget != null
                  ? formatCompactMoney(metrics.proposedTarget, currencyCode)
                  : history?.currentAmount != null
                    ? formatCompactMoney(history.currentAmount, currencyCode)
                    : null
              }
            />
            <MetricRow
              label="Original proposal"
              value={
                metrics?.originalProposal != null
                  ? formatCompactMoney(metrics.originalProposal, currencyCode)
                  : history?.originalAmount != null
                    ? formatCompactMoney(history.originalAmount, currencyCode)
                    : null
              }
            />
            <MetricRow
              label="Reviewed amount"
              value={
                metrics?.reviewedTarget != null
                  ? formatCompactMoney(metrics.reviewedTarget, currencyCode)
                  : null
              }
            />
            <MetricRow
              label="Official target"
              value={
                metrics?.officialTarget != null
                  ? formatCompactMoney(metrics.officialTarget, currencyCode)
                  : null
              }
            />
            <MetricRow
              label="Forecast (live)"
              value={
                metrics?.currentForecast != null
                  ? formatCompactMoney(metrics.currentForecast, currencyCode)
                  : null
              }
            />
            <MetricRow
              label="Forecast at submission"
              value={
                metrics?.forecastAtProposal != null
                  ? formatCompactMoney(metrics.forecastAtProposal, currencyCode)
                  : history?.forecastAtSubmission != null
                    ? formatCompactMoney(
                        history.forecastAtSubmission,
                        currencyCode,
                      )
                    : null
              }
            />
          </div>

          {onOpenRequests &&
          metrics?.requestStatus &&
          (metrics.requestStatus === 'PENDING_DEPARTMENT' ||
            metrics.requestStatus === 'PENDING_COMPANY' ||
            metrics.requestStatus === 'PENDING_RECONCILIATION') ? (
            <Button
              type="button"
              size="sm"
              className="mb-4 w-full"
              onClick={() => {
                onOpenChange(false);
                onOpenRequests();
              }}
            >
              Open in proposals to approve or modify
            </Button>
          ) : null}

          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Request history
            </h3>
            {isLoading ? (
              <RequestHistoryTimelineSkeleton items={3} />
            ) : (
              <RequestHistoryTimeline
                events={[...(history?.timeline ?? [])].sort(
                  (a, b) =>
                    new Date(b.occurredAt).getTime() -
                    new Date(a.occurredAt).getTime(),
                )}
                currencyCode={currencyCode}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use RequestReviewModal */
export const RequestReviewDrawer = RequestReviewModal;
