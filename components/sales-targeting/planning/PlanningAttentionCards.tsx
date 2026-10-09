'use client';

import { AlertTriangle, ChevronRight, Users } from 'lucide-react';
import { TARGETS_CARD_CLASS } from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { cn } from '@/lib/utils';
import type { PlanningWorkbenchView } from '@/components/sales-targeting/planning/planningTypes';

type AttentionTone = 'primary' | 'warning';

type AttentionItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  workbench: PlanningWorkbenchView;
  tone: AttentionTone;
};

type Props = {
  pendingRequestCount: number;
  showProposalsWorkbench: boolean;
  showApproverInbox: boolean;
  showReconcileWorkbench: boolean;
  ownPersonNode?: TargetPlanningHierarchyNode | null;
  hybridGap?: number | null;
  currencyCode: string;
  onOpenWorkbench: (view: PlanningWorkbenchView) => void;
};

const TONE_ICON_CLASS: Record<AttentionTone, string> = {
  primary: 'bg-brand/10 text-brand',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
};

/**
 * Only things that need the viewer to act. Standing workbench shortcuts live
 * on the horizon cards so nothing is duplicated.
 */
export function PlanningAttentionCards({
  pendingRequestCount,
  showProposalsWorkbench,
  showApproverInbox,
  showReconcileWorkbench,
  ownPersonNode,
  hybridGap,
  currencyCode,
  onOpenWorkbench,
}: Props) {
  const needsOwnProposal =
    ownPersonNode &&
    (!ownPersonNode.requestStatus ||
      ownPersonNode.requestStatus === 'DRAFT' ||
      ownPersonNode.requestStatus === 'TEAM_REJECTED');

  const items: AttentionItem[] = [];

  if (showApproverInbox && pendingRequestCount > 0) {
    items.push({
      id: 'pending-requests',
      icon: <Users size={16} />,
      title: `${pendingRequestCount} proposal${pendingRequestCount === 1 ? '' : 's'} awaiting your review`,
      description: 'Review and approve team submissions',
      workbench: 'requests',
      tone: 'primary',
    });
  }

  if (showProposalsWorkbench && needsOwnProposal) {
    items.push({
      id: 'own-proposal',
      icon: <Users size={16} />,
      title: 'Submit your target proposal',
      description:
        'Forecast opportunities and submit your individual target for review',
      workbench: 'requests',
      tone: 'primary',
    });
  }

  if (
    showReconcileWorkbench &&
    hybridGap != null &&
    Math.abs(hybridGap) > 0.009
  ) {
    items.push({
      id: 'reconcile-gap',
      icon: <AlertTriangle size={16} />,
      title: 'Reconciliation needed',
      description: `Gap of ${formatCompactMoney(Math.abs(hybridGap), currencyCode)} between bottom-up and the strategic target`,
      workbench: 'reconcile',
      tone: 'warning',
    });
  }

  if (!items.length) return null;

  return (
    <section
      aria-label="Needs your attention"
      className={cn(TARGETS_CARD_CLASS, 'divide-y divide-border/70')}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpenWorkbench(item.workbench)}
          className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-surface-elevated/50"
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              TONE_ICON_CLASS[item.tone],
            )}
          >
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold leading-snug text-foreground">
              {item.title}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
              {item.description}
            </span>
          </span>
          <ChevronRight
            size={16}
            className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </button>
      ))}
    </section>
  );
}
