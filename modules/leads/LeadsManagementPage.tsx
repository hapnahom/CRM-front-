'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Kanban, List as ListIcon, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  usePipelineLeads,
  useLeadStages,
} from '@/store/server/features/leads/pipeline/queries';
import { useChangeLeadStage } from '@/store/server/features/leads/pipeline/mutations';
import type {
  PipelineCustomerSummary,
  PipelineLead,
} from '@/store/server/features/leads/pipeline/types';
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
import { LeadsKanbanBoard } from '@/modules/leads/components/LeadsKanbanBoard';
import { LeadsListTable } from '@/modules/leads/components/LeadsListTable';
import { CreateLeadDialog } from '@/modules/leads/components/CreateLeadDialog';
import { ImportButton } from '@/modules/imports/ImportWizard';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import { ConvertLeadModal } from '@/modules/leads/components/ConvertLeadModal';
import { groupLeadsByStageId } from '@/modules/leads/components/leads-pipeline-utils';
import { useStageTransitionGate } from '@/hooks/useStageTransitionGate';
import { usePipelineListColumns } from '@/hooks/usePipelineListColumns';
import { PipelineListColumnSelector } from '@/components/pipeline/PipelineListColumnSelector';
import { usePipelineSettings } from '@/store/server/features/pipeline/settings';
import { usePipelineOrgListParams } from '@/modules/sales-pipeline/pipeline-filters';
import { toast } from 'sonner';
import { usePersistedSalesHubTabFilters } from '@/hooks/usePersistedSalesHubTabFilters';

export function LeadsManagementPage({
  hideHeader = false,
}: {
  hideHeader?: boolean;
} = {}) {
  const existingDashboard = useOptionalPipelineModuleDashboardContext();
  if (existingDashboard) {
    return <LeadsManagementPageContent hideHeader={hideHeader} />;
  }
  return (
    <PipelineModuleDashboardProvider module="leads">
      <LeadsManagementPageContent hideHeader={hideHeader} />
    </PipelineModuleDashboardProvider>
  );
}

function LeadsManagementPageContent({
  hideHeader = false,
}: {
  hideHeader?: boolean;
}) {
  const router = useRouter();

  const [{ search, viewMode }, setTabFilters] = usePersistedSalesHubTabFilters(
    'leads',
    {
      search: '',
      viewMode: 'list',
    },
  );
  const setSearch = useCallback(
    (value: string) => setTabFilters({ search: value }),
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

  const leadsQuery = usePipelineLeads({
    page: viewMode === 'list' ? listPage : 1,
    pageSize:
      viewMode === 'list' ? PIPELINE_LIST_PAGE_SIZE : PIPELINE_KANBAN_PAGE_SIZE,
    search: debouncedSearch,
    ...orgParams,
  });
  const stagesQuery = useLeadStages();
  const changeStage = useChangeLeadStage();
  const settingsQuery = usePipelineSettings('LEAD');
  const movementPolicy = settingsQuery.data?.movementPolicy ?? 'any';

  const leads = useMemo(() => leadsQuery.data?.data ?? [], [leadsQuery.data]);
  const pagination = leadsQuery.data?.pagination;

  const sortedStages = useMemo(
    () => [...(stagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [stagesQuery.data],
  );

  const leadsByStageId = useMemo(() => groupLeadsByStageId(leads), [leads]);

  const stageById = useMemo(
    () => new Map(sortedStages.map((s) => [s.id, s])),
    [sortedStages],
  );

  const customerById = useMemo(
    () => new Map<string, PipelineCustomerSummary>(),
    [],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<PipelineLead | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const listColumns = usePipelineListColumns({
    entity: 'leads',
    entityType: 'LEAD',
    entityLabel: 'Lead',
    entityIds: leadIds,
    enabled: viewMode === 'list',
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2800);
    return () => clearTimeout(timer);
  }, [feedback]);

  const openLeadDetail = (lead: PipelineLead) => {
    router.push(`/leads/${lead.id}`);
  };

  const isLeadConverted = useCallback((lead: PipelineLead) => {
    return Boolean(lead.convertedAt || lead.convertedDealId);
  }, []);

  const moveLeadToStage = useCallback(
    (payload: {
      entityId: string;
      stageId: string;
      fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
      roleAssignments?: Array<{ roleId: string; userId: string }>;
      allowValidationException?: boolean;
      validationSummary?: string;
      validationExceptionFieldIds?: string[];
    }) => {
      const lead = leads.find((l) => l.id === payload.entityId);
      if (!lead || lead.stageId === payload.stageId) return;
      const stage = stageById.get(payload.stageId);
      if (stage?.isConversion && !isLeadConverted(lead)) {
        if (lead.pendingApproval) {
          toast.error(
            'This lead is locked pending approval and cannot be converted.',
          );
          return;
        }
        setConvertLead(lead);
        return;
      }
      changeStage.mutate(
        {
          leadId: payload.entityId,
          stageId: payload.stageId,
          fieldValues: payload.fieldValues,
          roleAssignments: payload.roleAssignments,
          allowValidationException: payload.allowValidationException,
          validationSummary: payload.validationSummary,
          validationExceptionFieldIds: payload.validationExceptionFieldIds,
        },
        {
          onSuccess: () => {
            if (stage?.requiresApproval || payload.allowValidationException) {
              setFeedback({
                type: 'success',
                message:
                  'Lead moved and submitted for approval. It will stay pending until approved.',
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
                  'Failed to move lead. Please try again.',
            });
          },
        },
      );
    },
    [leads, changeStage, stageById, isLeadConverted],
  );

  const { requestStageChange, stageTransitionModal } = useStageTransitionGate({
    entityType: 'LEAD',
    onTransition: moveLeadToStage,
    isSubmitting: changeStage.isLoading,
    getEntityName: (id) => leads.find((l) => l.id === id)?.name,
    getStageName: (id) => stageById.get(id)?.name,
    getStageMeta: (id) => {
      const stage = stageById.get(id);
      return {
        requiresApproval: stage?.requiresApproval,
        approvalWorkflowId: stage?.approvalWorkflowId,
      };
    },
    movementPolicy,
    getStageOrder: (id) => stageById.get(id)?.order,
    getEntityStageId: (id) => leads.find((l) => l.id === id)?.stageId,
    getOwnerUserId: (id) =>
      leads.find((l) => l.id === id)?.responsibleUserId ?? null,
    isPendingApproval: (id) =>
      Boolean(leads.find((l) => l.id === id)?.pendingApproval),
  });

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead?.pendingApproval) {
      e.preventDefault();
      toast.error(
        'This lead is locked pending approval and cannot change stages.',
      );
      return;
    }
    e.dataTransfer.setData('application/lead-id', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggingLeadId(null);
    setDragOverStageId(null);
  };

  const handleDropOnStage = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/lead-id');
    setDraggingLeadId(null);
    setDragOverStageId(null);
    if (!id) return;
    void requestStageChange(id, stageId);
  };

  const isPageLoading = leadsQuery.isLoading || stagesQuery.isLoading;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!hideHeader && (
        <div className="flex-shrink-0 border-b border-border bg-surface-card px-6 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                Leads
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

        {leadsQuery.error ? (
          <div className="m-3 rounded-lg border border-red-200 bg-surface-card p-6 text-center text-sm text-red-600 sm:m-5">
            Failed to fetch leads from the server. Please check your connection
            and try again.
          </div>
        ) : isPageLoading ? (
          <PipelinePageContentSkeleton
            view={viewMode === 'list' ? 'list' : 'kanban'}
          />
        ) : (
          <div className="flex min-h-full flex-1 flex-col p-[10.5px] sm:p-[17.5px]">
            <PipelineModuleDashboard>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="relative w-full min-w-[200px] sm:max-w-[320px]">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search leads by name or customer"
                    className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] dark:bg-surface-card"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    role="group"
                    aria-label="Toggle view"
                    className="inline-flex h-[31.5px] items-center rounded-md border border-border bg-surface-card p-0.5"
                  >
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
                  </div>
                  <AccessGuard permissions={[PERMISSIONS.CREATE_LEADS]}>
                    <ImportButton
                      kind="lead"
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
                    New Lead
                  </Button>
                </div>
              </div>

              {viewMode === 'kanban' ? (
                <LeadsKanbanBoard
                  sortedStages={sortedStages}
                  leadsByStageId={leadsByStageId}
                  customerById={customerById}
                  stageById={stageById}
                  pagination={pagination}
                  draggingLeadId={draggingLeadId}
                  dragOverStageId={dragOverStageId}
                  onOpenLead={openLeadDetail}
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
                <LeadsListTable
                  leads={leads}
                  sortedStages={sortedStages}
                  stageById={stageById}
                  customerById={customerById}
                  columns={listColumns.visibleColumns}
                  customFieldValuesByEntityId={
                    listColumns.customFieldValuesByEntityId
                  }
                  pagination={pagination}
                  onPageChange={setListPage}
                  onOpenLead={openLeadDetail}
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
        <CreateLeadDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          sortedStages={sortedStages}
          onCreated={(result) => {
            setFeedback({
              type: 'success',
              message: result?.pendingApproval
                ? 'Lead created and submitted for approval.'
                : 'Lead created successfully.',
            });
          }}
        />
      ) : null}
      {convertLead ? (
        <ConvertLeadModal
          open={Boolean(convertLead)}
          onOpenChange={(open) => {
            if (!open) setConvertLead(null);
          }}
          lead={convertLead}
          onConverted={(result) => {
            setConvertLead(null);
            setFeedback({
              type: 'success',
              message: `Lead converted. Deal created successfully.`,
            });
            if (result?.dealId) {
              router.push(`/deals/${result.dealId}`);
            }
          }}
        />
      ) : null}
      {stageTransitionModal}
    </div>
  );
}

export default LeadsManagementPage;
