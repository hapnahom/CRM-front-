'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { sumValuesByCurrency } from '@/lib/pipeline/currency-totals';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import type {
  PipelineLead,
  PipelineStage,
} from '@/store/server/features/leads/pipeline/types';
import type { PipelineCustomerSummary } from '@/store/server/features/leads/pipeline/types';
import { LeadKanbanCard } from './LeadKanbanCard';
import { formatMoney, leadAgingLabel } from './leads-pipeline-utils';

const KANBAN_VIRTUAL_THRESHOLD = 15;
const KANBAN_CARD_ESTIMATE = 132;

interface LeadsKanbanColumnProps {
  stage: PipelineStage;
  stageIndex: number;
  columnLeads: PipelineLead[];
  customerById: Map<string, PipelineCustomerSummary>;
  stageById: Map<string, PipelineStage>;
  draggingLeadId: string | null;
  isDragOver: boolean;
  onOpenLead: (lead: PipelineLead) => void;
  onDragStart: (event: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragEnter: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent, stageId: string) => void;
}

export function LeadsKanbanColumn({
  stage,
  stageIndex,
  columnLeads,
  customerById,
  stageById,
  draggingLeadId,
  isDragOver,
  onOpenLead,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: LeadsKanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = pipelineStageAppearance(stage, stageIndex);
  const currencyTotals = sumValuesByCurrency(columnLeads);

  const virtualizer = useVirtualizer({
    count: columnLeads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => KANBAN_CARD_ESTIMATE,
    overscan: 4,
    enabled: columnLeads.length > KANBAN_VIRTUAL_THRESHOLD,
  });

  const handleDragStart = (event: React.DragEvent, leadId: string) => {
    const index = columnLeads.findIndex((lead) => lead.id === leadId);
    if (index >= 0 && columnLeads.length > KANBAN_VIRTUAL_THRESHOLD) {
      virtualizer.scrollToIndex(index, { align: 'auto' });
    }
    onDragStart(event, leadId);
  };

  const renderCard = (lead: PipelineLead) => (
    <LeadKanbanCard
      key={lead.id}
      lead={lead}
      customerById={customerById}
      stuckLabel={leadAgingLabel(lead, stageById)}
      isDragging={draggingLeadId === lead.id}
      onOpen={onOpenLead}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    />
  );

  return (
    <div
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col rounded-lg border transition-all duration-150',
        isDragOver && 'ring-2 ring-inset ring-blue-300/50 brightness-[0.985]',
      )}
      style={{
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
      }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, stage.id)}
    >
      <div className="border-b border-black/5 px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">{stage.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{columnLeads.length} leads</span>
          {currencyTotals.length > 0 ? (
            <>
              <span className="text-muted-foreground">·</span>
              {currencyTotals.map(({ currency, total }, idx) => (
                <span key={currency}>
                  {idx > 0 ? (
                    <span className="text-muted-foreground">{' · '}</span>
                  ) : null}
                  <span className="font-medium text-foreground">
                    {formatMoney(total, currency)}
                  </span>
                </span>
              ))}
            </>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-2 no-scrollbar"
      >
        {columnLeads.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-strong bg-surface-card/70 p-3 text-center text-xs text-muted-foreground">
            No leads in this stage
          </div>
        ) : columnLeads.length <= KANBAN_VIRTUAL_THRESHOLD ? (
          columnLeads.map((lead) => renderCard(lead))
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const lead = columnLeads[virtualRow.index]!;
              return (
                <div
                  key={lead.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-2"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {renderCard(lead)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
