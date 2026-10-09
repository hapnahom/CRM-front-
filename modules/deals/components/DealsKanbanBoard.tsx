'use client';

import type { PipelinePagination } from '@/lib/pipeline/list-query';
import type {
  PipelineCustomerSummary,
  PipelineDeal,
  PipelineStage,
} from '@/store/server/features/deals/pipeline/types';
import { DealsKanbanColumn } from './DealsKanbanColumn';
import { dealUiLabel } from '@/config/salesWorkflow';

interface DealsKanbanBoardProps {
  sortedStages: PipelineStage[];
  dealsByStageId: Map<string, PipelineDeal[]>;
  customerById: Map<string, PipelineCustomerSummary>;
  stageById: Map<string, PipelineStage>;
  pagination?: PipelinePagination;
  draggingDealId: string | null;
  dragOverStageId: string | null;
  onOpenDeal: (deal: PipelineDeal) => void;
  onDragStart: (event: React.DragEvent, dealId: string) => void;
  onDragEnd: () => void;
  onDragOverStage: (event: React.DragEvent) => void;
  onDragEnterStage: (event: React.DragEvent, stageId: string) => void;
  onDragLeaveStage: (event: React.DragEvent) => void;
  onDropOnStage: (event: React.DragEvent, stageId: string) => void;
}

export function DealsKanbanBoard({
  sortedStages,
  dealsByStageId,
  customerById,
  stageById,
  pagination,
  draggingDealId,
  dragOverStageId,
  onOpenDeal,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragEnterStage,
  onDragLeaveStage,
  onDropOnStage,
}: DealsKanbanBoardProps) {
  return (
    <div className="min-h-[min(60vh,560px)] flex-1 overflow-x-auto overflow-y-hidden no-scrollbar">
      {pagination && pagination.totalItems > pagination.itemsPerPage ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Showing first {pagination.itemsPerPage} of {pagination.totalItems}{' '}
          deals. Refine filters or switch to list view for pagination.
        </p>
      ) : null}

      {sortedStages.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-card p-6 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">
              No pipeline stages configured.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add stages from {dealUiLabel({ plural: true })} Settings before
              creating or moving{' '}
              {dealUiLabel({ plural: true, lowercase: true })}.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-w-max gap-[10.5px] pb-[3.5px]">
          {sortedStages.map((stage, index) => (
            <DealsKanbanColumn
              key={stage.id}
              stage={stage}
              stageIndex={index}
              columnDeals={dealsByStageId.get(stage.id) ?? []}
              customerById={customerById}
              stageById={stageById}
              draggingDealId={draggingDealId}
              isDragOver={dragOverStageId === stage.id}
              onOpenDeal={onOpenDeal}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOverStage}
              onDragEnter={(event) => onDragEnterStage(event, stage.id)}
              onDragLeave={onDragLeaveStage}
              onDrop={onDropOnStage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
