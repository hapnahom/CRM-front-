'use client';

import { AlertTriangle, Calendar, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isLeadsEnabled } from '@/config/salesWorkflow';
import type {
  PipelineCustomerSummary,
  PipelineDeal,
} from '@/store/server/features/deals/pipeline/types';
import {
  kanbanTeamBadgeVariant,
  resolveDealCustomerName,
  resolveDealExpectedClose,
  resolveDealQuarterLabel,
  resolveDealTeamName,
} from '@/lib/deals/kanban-display';
import { formatMoney } from './deals-pipeline-utils';

interface DealKanbanCardProps {
  deal: PipelineDeal;
  customerById: Map<string, PipelineCustomerSummary>;
  stuckLabel: string | null;
  isDragging: boolean;
  onOpen: (deal: PipelineDeal) => void;
  onDragStart: (event: React.DragEvent, dealId: string) => void;
  onDragEnd: () => void;
}

export function DealKanbanCard({
  deal,
  customerById,
  stuckLabel,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: DealKanbanCardProps) {
  const teamName = resolveDealTeamName(deal);
  const isLocked = Boolean(deal.pendingApproval);

  return (
    <Card
      size="sm"
      draggable={!isLocked}
      onDragStart={(e) => {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        onDragStart(e, deal.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'gap-0 border-border bg-white py-0 shadow-sm transition-all duration-150 data-[size=sm]:py-0 dark:bg-surface-card',
        isLocked
          ? 'cursor-not-allowed border-amber-200 bg-amber-50/40 opacity-90'
          : 'cursor-grab hover:border-brand',
        isDragging && 'scale-[0.97] cursor-grabbing opacity-40',
      )}
      onClick={() => onOpen(deal)}
      title={
        isLocked
          ? 'Locked pending approval — stage changes are disabled'
          : undefined
      }
    >
      <CardContent className="space-y-1.5 px-3 py-4">
        <div className="flex items-start gap-2">
          <Badge className="shrink-0 border-brand-hover bg-brand px-2 py-0.5 text-[11px] font-bold tracking-wide text-brand-foreground hover:bg-brand">
            {resolveDealQuarterLabel(deal)}
          </Badge>
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
            {deal.name}
          </p>
          {isLocked ? (
            <Lock
              size={13}
              className="mt-0.5 shrink-0 text-amber-700"
              aria-label="Locked pending approval"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={kanbanTeamBadgeVariant(teamName)}
            className="text-[10px] font-medium"
          >
            {teamName}
          </Badge>
          {isLocked ? (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-[10px] font-medium text-amber-800"
            >
              Pending approval
            </Badge>
          ) : null}
          {isLeadsEnabled() && deal.createdFromLead ? (
            <Badge
              variant="outline"
              className="border-violet-200 bg-violet-50 text-[10px] font-medium text-violet-800"
            >
              From lead
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {resolveDealCustomerName(deal, customerById)}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            {formatMoney(deal.value, deal.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-0.5">
            <Calendar size={12} className="shrink-0" />
            {resolveDealExpectedClose(deal)}
          </span>
          {stuckLabel ? (
            <Badge variant="warning" className="shrink-0 text-[10px]">
              <AlertTriangle className="mr-0.5 size-3" />
              {stuckLabel}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
