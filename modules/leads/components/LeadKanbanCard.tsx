'use client';

import { AlertTriangle, Calendar, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  PipelineCustomerSummary,
  PipelineLead,
} from '@/store/server/features/leads/pipeline/types';
import {
  kanbanTeamBadgeVariant,
  resolveLeadCustomerName,
  resolveLeadExpectedClose,
  resolveLeadQuarterLabel,
  resolveLeadTeamName,
} from '@/lib/leads/kanban-display';
import { formatDate, formatMoney } from './leads-pipeline-utils';

interface LeadKanbanCardProps {
  lead: PipelineLead;
  customerById: Map<string, PipelineCustomerSummary>;
  stuckLabel: string | null;
  isDragging: boolean;
  onOpen: (lead: PipelineLead) => void;
  onDragStart: (event: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
}

export function LeadKanbanCard({
  lead,
  customerById,
  stuckLabel,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: LeadKanbanCardProps) {
  const teamName = resolveLeadTeamName(lead);
  const expectedClose = resolveLeadExpectedClose(lead);
  const isLocked = Boolean(lead.pendingApproval);

  return (
    <Card
      size="sm"
      draggable={!isLocked}
      onDragStart={(e) => {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        onDragStart(e, lead.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'gap-0 border-border bg-white py-0 shadow-sm transition-all duration-150 data-[size=sm]:py-0 dark:bg-surface-card',
        isLocked
          ? 'cursor-not-allowed border-amber-200 bg-amber-50/40 opacity-90'
          : 'cursor-grab hover:border-brand',
        isDragging && 'scale-[0.97] cursor-grabbing opacity-40',
      )}
      onClick={() => onOpen(lead)}
      title={
        isLocked
          ? 'Locked pending approval — stage changes are disabled'
          : undefined
      }
    >
      <CardContent className="space-y-1.5 px-3 py-4">
        <div className="flex items-start gap-2">
          <Badge className="shrink-0 border-brand-hover bg-brand px-2 py-0.5 text-[11px] font-bold tracking-wide text-brand-foreground hover:bg-brand">
            {resolveLeadQuarterLabel(lead)}
          </Badge>
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
            {lead.name}
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
        </div>
        <p className="text-xs text-muted-foreground">
          {resolveLeadCustomerName(lead, customerById)}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            {formatMoney(lead.value, lead.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-0.5">
            <Calendar size={12} className="shrink-0" />
            {expectedClose ? formatDate(expectedClose) : '—'}
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
