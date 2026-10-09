'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Kanban, List as ListIcon, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PipelineStageFilter } from '@/components/pipeline/PipelineStageFilter';
import {
  usePipelineDeals,
  useDealStages,
} from '@/store/server/features/deals/pipeline/queries';
import { useChangeDealStage } from '@/store/server/features/deals/pipeline/mutations';
import type {
  PipelineCustomerSummary,
  PipelineDeal,
} from '@/store/server/features/deals/pipeline/types';
import {
  PipelineModuleDashboard,
  PipelineModuleDashboardProvider,
  useOptionalPipelineModuleDashboardContext,
} from '@/components/pipeline/PipelineModuleDashboard';
import {
  PIPELINE_KANBAN_PAGE_SIZE,
  PIPELINE_LIST_PAGE_SIZE,
} from '@/lib/pipeline/list-query';
import { PipelinePageContentSkeleton } from '@/components/loading/skeleton-screens';
import { DealsKanbanBoard } from '@/modules/deals/components/DealsKanbanBoard';
import { DealsListTable } from '@/modules/deals/components/DealsListTable';
import { CreateDealDialog } from '@/modules/deals/components/CreateDealDialog';
import { ImportButton } from '@/modules/imports/ImportWizard';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { groupDealsByStageId } from '@/modules/deals/components/deals-pipeline-utils';
import { useStageTransitionGate } from '@/hooks/useStageTransitionGate';
import { usePipelineListColumns } from '@/hooks/usePipelineListColumns';
import { PipelineListColumnSelector } from '@/components/pipeline/PipelineListColumnSelector';
import { usePipelineSettings } from '@/store/server/features/pipeline/settings';
import { usePipelineOrgListParams } from '@/modules/sales-pipeline/pipeline-filters';
import { toast } from 'sonner';
import { dealUiLabel } from '@/config/salesWorkflow';
import { comparePipelineDeals } from '@/lib/pipeline/compare-opportunities';
import { usePersistedSalesHubTabFilters } from '@/hooks/usePersistedSalesHubTabFilters';

export function DealsManagementPage({
  hideHeader = false,
}: {
  hideHeader?: boolean;
} = {}) {
  const existingDashboard = useOptionalPipelineModuleDashboardContext();
  if (existingDashboard) {
    return <DealsManagementPageContent hideHeader={hideHeader} />;
  }
  return (
    <PipelineModuleDashboardProvider module="deals">
      <DealsManagementPageContent hideHeader={hideHeader} />
    </PipelineModuleDashboardProvider>
  );
}

function DealsManagementPageContent({
  hideHeader = false,
}: {
  hideHeader?: boolean;
}) {
  const router = useRouter();

  const [{ search, stageFilter, viewMode }, setTabFilters] =
    usePersistedSalesHubTabFilters('deals', {
      search: '',
      stageFilter: 'all',
      viewMode: 'kanban',
    });
  const setSearch = useCallback(
    (value: string) => setTabFilters({ search: value }),
    [setTabFilters],
  );
  const setStageFilter = useCallback(
    (value: string) => setTabFilters({ stageFilter: value }),
    [setTabFilters],
  );
  const setViewMode = useCallback(
    (value: 'kanban' | 'list') => setTabFilters({ viewMode: value }),
    [setTabFilters],
  );
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listPage, setListPage] = useState(1);

  const orgParams = usePipelineOrgListParams();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setListPage(1);
  }, [
    debouncedSearch,
    stageFilter,
    viewMode,
    orgParams.departmentId,
    orgParams.teamId,
    orgParams.responsibleUserId,
    orgParams.currency,
    orgParams.sessionId,
    orgParams.sessionIds,
    orgParams.startDate,
    orgParams.endDate,
  ]);

  const dealsQuery = usePipelineDeals({
    page: viewMode === 'list' ? listPage : 1,
    pageSize:
      viewMode === 'list' ? PIPELINE_LIST_PAGE_SIZE : PIPELINE_KANBAN_PAGE_SIZE,
    search: debouncedSearch,
    ...(stageFilter !== 'all' ? { stageId: stageFilter } : {}),
    ...orgParams,
  });
  const stagesQuery = useDealStages();
  const changeStage = useChangeDealStage();
  const settingsQuery = usePipelineSettings('DEAL');
  const movementPolicy = settingsQuery.data?.movementPolicy ?? 'any';

  const pagination = dealsQuery.data?.pagination;

  const sortedStages = useMemo(
    () => [...(stagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [stagesQuery.data],
  );

  const stageById = useMemo(
    () => new Map(sortedStages.map((s) => [s.id, s])),
    [sortedStages],
  );

  const deals = useMemo(() => {
    const rows = dealsQuery.data?.data ?? [];
    if (viewMode !== 'list') return rows;
    return [...rows].sort((a, b) => comparePipelineDeals(a, b, stageById));
  }, [dealsQuery.data, stageById, viewMode]);

  const dealsByStageId = useMemo(() => groupDealsByStageId(deals), [deals]);

  const customerById = useMemo(
    () => new Map<string, PipelineCustomerSummary>(),
    [],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const dealIds = useMemo(() => deals.map((d) => d.id), [deals]);
  const listColumns = usePipelineListColumns({
    entity: 'deals',
    entityType: 'DEAL',
    entityLabel: 'Deal',
    entityDisplayLabel: dealUiLabel(),
    entityIds: dealIds,
    enabled: viewMode === 'list',
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2800);
    return () => clearTimeout(timer);
  }, [feedback]);

  const openDealDetail = (deal: PipelineDeal) => {
    router.push(`/deals/${deal.id}`);
  };

  const moveDealToStage = useCallback(
    (payload: {
      entityId: string;
      stageId: string;
      fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
      roleAssignments?: Array<{ roleId: string; userId: string }>;
      allowValidationException?: boolean;
      validationSummary?: string;
      validationExceptionFieldIds?: string[];
      exactValue?: number;
      solutionExactAmounts?: Array<{ solutionId: string; exactAmount: number }>;
    }) => {
      const deal = deals.find((d) => d.id === payload.entityId);
      if (!deal || deal.stageId === payload.stageId) return;
      const stage = stageById.get(payload.stageId);
      changeStage.mutate(
        {
          dealId: payload.entityId,
          stageId: payload.stageId,
          fieldValues: payload.fieldValues,
          roleAssignments: payload.roleAssignments,
          allowValidationException: payload.allowValidationException,
          validationSummary: payload.validationSummary,
          validationExceptionFieldIds: payload.validationExceptionFieldIds,
          exactValue: payload.exactValue,
          solutionExactAmounts: payload.solutionExactAmounts,
        },
        {
          onSuccess: () => {
            if (stage?.requiresApproval || payload.allowValidationException) {
              setFeedback({
                type: 'success',
                message: `${dealUiLabel()} moved and submitted for approval. It will stay pending until approved.`,
              });
            }
          },
          onError: (error: unknown) => {
            const err = error as {
              response?: { data?: { message?: string | string[] } };
              message?: string;
            };
            const message = err?.response?.data?.message;
            setFeedback({
              type: 'error',
              message: Array.isArray(message)
                ? message.join(', ')
                : message ||
                  err?.message ||
                  `Failed to move ${dealUiLabel({ lowercase: true })} to the new stage.`,
            });
          },
        },
      );
    },
    [deals, changeStage, stageById],
  );

  const { requestStageChange, stageTransitionModal } = useStageTransitionGate({
    entityType: 'DEAL',
    onTransition: moveDealToStage,
    isSubmitting: changeStage.isLoading,
    getEntityName: (id) => deals.find((d) => d.id === id)?.name,
    getStageName: (id) => stageById.get(id)?.name,
    getStageMeta: (id) => {
      const stage = stageById.get(id);
      return {
        requiresApproval: stage?.requiresApproval,
        approvalWorkflowId: stage?.approvalWorkflowId,
        category: stage?.category,
      };
    },
    movementPolicy,
    getStageOrder: (id) => stageById.get(id)?.order,
    getEntityStageId: (id) => deals.find((d) => d.id === id)?.stageId,
    getOwnerUserId: (id) =>
      deals.find((d) => d.id === id)?.responsibleUserId ?? null,
    isPendingApproval: (id) =>
      Boolean(deals.find((d) => d.id === id)?.pendingApproval),
  });

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (deal?.pendingApproval) {
      e.preventDefault();
      toast.error(
        `This ${dealUiLabel({ lowercase: true })} is locked pending approval and cannot change stages.`,
      );
      return;
    }
    e.dataTransfer.setData('application/deal-id', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingDealId(dealId);
  };

  const handleDragEnd = () => {
    setDraggingDealId(null);
    setDragOverStageId(null);
  };

  const handleDropOnStage = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/deal-id');
    setDraggingDealId(null);
    setDragOverStageId(null);
    if (!id) return;
    void requestStageChange(id, stageId);
  };

  const isPageLoading = dealsQuery.isLoading || stagesQuery.isLoading;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!hideHeader && (
        <div className="flex-shrink-0 border-b border-border bg-surface-card px-6 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                {dealUiLabel({ plural: true })}
              </h1>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface-card">
        {feedback && (
          <div
            className={cn(
              'mx-3 mt-3 rounded-md border px-3 py-2 text-sm sm:mx-5',
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700',
            )}
          >
            {feedback.message}
          </div>
        )}

        {dealsQuery.error ? (
          <div className="m-3 rounded-lg border border-red-200 bg-surface-card p-6 text-center text-sm text-red-600 sm:m-5">
            Failed to fetch {dealUiLabel({ plural: true, lowercase: true })}{' '}
            from the server. Please check your connection and try again.
          </div>
        ) : isPageLoading ? (
          <PipelinePageContentSkeleton
            view={viewMode === 'list' ? 'list' : 'kanban'}
          />
        ) : (
          <div className="flex min-h-full flex-1 flex-col p-[10.5px] sm:p-[17.5px]">
            <PipelineModuleDashboard>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex w-full flex-wrap items-end gap-2 sm:max-w-[640px]">
                  <div className="relative min-w-[200px] flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search ${dealUiLabel({ plural: true, lowercase: true })} by name or customer`}
                      className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] dark:bg-surface-card"
                    />
                  </div>
                  {viewMode === 'list' ? (
                    <PipelineStageFilter
                      stages={sortedStages.map((stage) => ({
                        id: stage.id,
                        name: stage.name,
                        color: stage.color,
                      }))}
                      value={stageFilter}
                      onChange={setStageFilter}
                      className="h-[31.5px] w-[180px] shrink-0 border-border bg-white text-[12.25px] dark:bg-surface-card"
                    />
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    role="group"
                    aria-label="Toggle view"
                    className="inline-flex h-[31.5px] items-center rounded-md border border-border bg-surface-card p-0.5"
                  >
                    <button
                      type="button"
                      aria-pressed={viewMode === 'kanban'}
                      onClick={() => setViewMode('kanban')}
                      className={cn(
                        'inline-flex h-[24.5px] items-center gap-1.5 rounded-[5px] px-2.5 text-[10.5px] font-medium transition-colors',
                        viewMode === 'kanban'
                          ? 'bg-brand-muted text-brand-hover'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Kanban size={14} />
                      Kanban
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewMode === 'list'}
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'inline-flex h-[24.5px] items-center gap-1.5 rounded-[5px] px-2.5 text-[10.5px] font-medium transition-colors',
                        viewMode === 'list'
                          ? 'bg-brand-muted text-brand-hover'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <ListIcon size={14} />
                      List
                    </button>
                  </div>
                  <AccessGuard permissions={[PERMISSIONS.CREATE_DEALS]}>
                    <ImportButton
                      kind="deal"
                      className="h-[31.5px] border-border bg-white text-[12.25px] text-foreground hover:bg-surface-elevated"
                    />
                  </AccessGuard>
                  <Button
                    type="button"
                    size="sm"
                    className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus size={14} className="mr-1.5" />
                    New {dealUiLabel()}
                  </Button>
                </div>
              </div>

              {viewMode === 'kanban' ? (
                <DealsKanbanBoard
                  sortedStages={sortedStages}
                  dealsByStageId={dealsByStageId}
                  customerById={customerById}
                  stageById={stageById}
                  pagination={pagination}
                  draggingDealId={draggingDealId}
                  dragOverStageId={dragOverStageId}
                  onOpenDeal={openDealDetail}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOverStage={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDragEnterStage={(e, stageId) => {
                    e.preventDefault();
                    setDragOverStageId(stageId);
                  }}
                  onDragLeaveStage={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStageId(null);
                    }
                  }}
                  onDropOnStage={handleDropOnStage}
                />
              ) : (
                <DealsListTable
                  deals={deals}
                  sortedStages={sortedStages}
                  stageById={stageById}
                  customerById={customerById}
                  columns={listColumns.visibleColumns}
                  customFieldValuesByEntityId={
                    listColumns.customFieldValuesByEntityId
                  }
                  pagination={pagination}
                  onPageChange={setListPage}
                  onOpenDeal={openDealDetail}
                  onConfigureColumns={() => setColumnsOpen(true)}
                />
              )}
            </PipelineModuleDashboard>
          </div>
        )}
      </div>

      <PipelineListColumnSelector
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        columns={listColumns.availableColumns}
        selected={listColumns.selectedColumnIds}
        onSave={listColumns.setColumns}
      />

      {createOpen ? (
        <CreateDealDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          sortedStages={sortedStages}
          onCreated={(result) => {
            setFeedback({
              type: 'success',
              message: result?.pendingApproval
                ? `${dealUiLabel()} created and submitted for approval.`
                : `${dealUiLabel()} created successfully.`,
            });
          }}
        />
      ) : null}
      {stageTransitionModal}
    </div>
  );
}

export default DealsManagementPage;
