'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { sumValuesByCurrency } from '@/lib/pipeline/currency-totals';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import type {
  PipelineCustomerSummary,
  PipelineDeal,
  PipelineStage,
} from '@/store/server/features/deals/pipeline/types';
import { DealKanbanCard } from './DealKanbanCard';
import { dealUiLabel } from '@/config/salesWorkflow';
import { dealAgingLabelForBoard, formatMoney } from './deals-pipeline-utils';

const KANBAN_VIRTUAL_THRESHOLD = 15;
const KANBAN_CARD_ESTIMATE = 132;

interface DealsKanbanColumnProps {
  stage: PipelineStage;
  stageIndex: number;
  columnDeals: PipelineDeal[];
  customerById: Map<string, PipelineCustomerSummary>;
  stageById: Map<string, PipelineStage>;
  draggingDealId: string | null;
  isDragOver: boolean;
  onOpenDeal: (deal: PipelineDeal) => void;
  onDragStart: (event: React.DragEvent, dealId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragEnter: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent, stageId: string) => void;
}

export function DealsKanbanColumn({
  stage,
  stageIndex,
  columnDeals,
  customerById,
  stageById,
  draggingDealId,
  isDragOver,
  onOpenDeal,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: DealsKanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = pipelineStageAppearance(stage, stageIndex);
  const currencyTotals = sumValuesByCurrency(columnDeals);

  const virtualizer = useVirtualizer({
    count: columnDeals.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => KANBAN_CARD_ESTIMATE,
    overscan: 4,
    enabled: columnDeals.length > KANBAN_VIRTUAL_THRESHOLD,
  });

  const handleDragStart = (event: React.DragEvent, dealId: string) => {
    const index = columnDeals.findIndex((deal) => deal.id === dealId);
    if (index >= 0 && columnDeals.length > KANBAN_VIRTUAL_THRESHOLD) {
      virtualizer.scrollToIndex(index, { align: 'auto' });
    }
    onDragStart(event, dealId);
  };

  const renderCard = (deal: PipelineDeal) => (
    <DealKanbanCard
      key={deal.id}
      deal={deal}
      customerById={customerById}
      stuckLabel={dealAgingLabelForBoard(deal, stageById)}
      isDragging={draggingDealId === deal.id}
      onOpen={onOpenDeal}
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
          <span>
            {columnDeals.length}{' '}
            {dealUiLabel({ plural: columnDeals.length !== 1, lowercase: true })}
          </span>
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
        {columnDeals.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-strong bg-surface-card/70 p-3 text-center text-xs text-muted-foreground">
            No deals in this stage
          </div>
        ) : columnDeals.length <= KANBAN_VIRTUAL_THRESHOLD ? (
          columnDeals.map((deal) => renderCard(deal))
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const deal = columnDeals[virtualRow.index]!;
              return (
                <div
                  key={deal.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-2"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {renderCard(deal)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
