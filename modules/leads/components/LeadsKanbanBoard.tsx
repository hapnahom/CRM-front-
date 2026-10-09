'use client';

import type { PipelinePagination } from '@/lib/pipeline/list-query';
import type {
  PipelineCustomerSummary,
  PipelineLead,
  PipelineStage,
} from '@/store/server/features/leads/pipeline/types';
import { LeadsKanbanColumn } from './LeadsKanbanColumn';

interface LeadsKanbanBoardProps {
  sortedStages: PipelineStage[];
  leadsByStageId: Map<string, PipelineLead[]>;
  customerById: Map<string, PipelineCustomerSummary>;
  stageById: Map<string, PipelineStage>;
  pagination?: PipelinePagination;
  draggingLeadId: string | null;
  dragOverStageId: string | null;
  onOpenLead: (lead: PipelineLead) => void;
  onDragStart: (event: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onDragOverStage: (event: React.DragEvent) => void;
  onDragEnterStage: (event: React.DragEvent, stageId: string) => void;
  onDragLeaveStage: (event: React.DragEvent) => void;
  onDropOnStage: (event: React.DragEvent, stageId: string) => void;
}

export function LeadsKanbanBoard({
  sortedStages,
  leadsByStageId,
  customerById,
  stageById,
  pagination,
  draggingLeadId,
  dragOverStageId,
  onOpenLead,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragEnterStage,
  onDragLeaveStage,
  onDropOnStage,
}: LeadsKanbanBoardProps) {
  return (
    <div className="min-h-[min(60vh,560px)] flex-1 overflow-x-auto overflow-y-hidden no-scrollbar">
      {pagination && pagination.totalItems > pagination.itemsPerPage ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Showing first {pagination.itemsPerPage} of {pagination.totalItems}{' '}
          leads. Refine filters or switch to list view for pagination.
        </p>
      ) : null}

      {sortedStages.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-card p-6 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">
              No pipeline stages configured.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add stages from Leads Settings before creating or moving leads.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-w-max gap-[10.5px] pb-[3.5px]">
          {sortedStages.map((stage, index) => (
            <LeadsKanbanColumn
              key={stage.id}
              stage={stage}
              stageIndex={index}
              columnLeads={leadsByStageId.get(stage.id) ?? []}
              customerById={customerById}
              stageById={stageById}
              draggingLeadId={draggingLeadId}
              isDragOver={dragOverStageId === stage.id}
              onOpenLead={onOpenLead}
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
