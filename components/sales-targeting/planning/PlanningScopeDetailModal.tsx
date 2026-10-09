'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlanningScopeSummary } from '@/components/sales-targeting/planning/PlanningScopeSummary';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { cn } from '@/lib/utils';
import {
  resolvePlanningScopeName,
  type PlanningPersonProfile,
} from '@/components/sales-targeting/planning/planningPersonProfiles';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: TargetPlanningHierarchyNode | null;
  currencyCode: string;
  profiles?: Map<string, PlanningPersonProfile>;
  showRequestsAction?: boolean;
  onOpenRequests?: () => void;
  method?: string | null;
  className?: string;
};

export function PlanningScopeDetailModal({
  open,
  onOpenChange,
  node,
  currencyCode,
  profiles = new Map(),
  showRequestsAction,
  onOpenRequests,
  method,
  className,
}: Props) {
  const title = node
    ? resolvePlanningScopeName(node, profiles)
    : 'Scope details';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-h-[85vh] overflow-y-auto sm:max-w-lg', className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Planning metrics for this scope.
          </DialogDescription>
        </DialogHeader>
        {node ? (
          <PlanningScopeSummary
            node={node}
            currencyCode={currencyCode}
            profiles={profiles}
            method={method}
            showRequestsAction={showRequestsAction}
            onOpenRequests={() => {
              onOpenChange(false);
              onOpenRequests?.();
            }}
            embedded
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
