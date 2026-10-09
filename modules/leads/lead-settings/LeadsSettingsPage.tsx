'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Kanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  useLeadStages,
  usePipelineLeads,
} from '@/store/server/features/leads/pipeline/queries';
import {
  useCreateLeadStage,
  useDeleteLeadStage,
  useReorderLeadStages,
  useUpdateLeadStage,
} from '@/store/server/features/leads/settings/mutations';
import type { PipelineStage } from '@/modules/pipeline/types';
import {
  findStagePresetIndex,
  LEAD_SETTINGS_STAGE_PRESETS,
} from '@/lib/stage-presets';
import { StagePresetSwatch } from '@/components/pipeline/StagePresetSwatch';
import { StageApprovalFields } from '@/components/pipeline/StageApprovalFields';
import { StageExpirationFields } from '@/components/pipeline/StageExpirationFields';
import AccessGuard from '@/utils/permissionGuard';
import { StageMovementRulesCard } from '@/components/pipeline/StageMovementRulesCard';

const STAGE_COLOR_PRESETS = LEAD_SETTINGS_STAGE_PRESETS;

type Tab = 'stages';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'stages', label: 'Pipeline Stages', icon: <Kanban size={14} /> },
];

/** Conversion → won; lost finalization → lost; otherwise open. */
function leadStageCategoryFromFlags(
  isConversion: boolean,
  isLost: boolean,
): PipelineStage['category'] {
  if (isLost) return 'lost';
  if (isConversion) return 'won';
  return 'open';
}

type LeadsSettingsPageProps = {
  /** When true, hide the standalone page chrome (back button / title). */
  embedded?: boolean;
};

export function LeadsSettingsPage({
  embedded = false,
}: LeadsSettingsPageProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Tab>('stages');
  const canEditStageSettings = AccessGuard.checkAccess({
    permissions: ['edit-settings'],
  });
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(
    null,
  );
  const [dragPointer, setDragPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [confirmReorderDialogOpen, setConfirmReorderDialogOpen] =
    useState(false);
  const [pendingStageOrderIds, setPendingStageOrderIds] = useState<
    string[] | null
  >(null);
  const [pendingMovedStageName, setPendingMovedStageName] = useState<
    string | null
  >(null);
  const [stageDetailsFeedback, setStageDetailsFeedback] = useState<
    string | null
  >(null);
  const [isStageConfigEditing, setIsStageConfigEditing] = useState(false);
  const [deleteStageDialogOpen, setDeleteStageDialogOpen] = useState(false);
  const [deleteStageHasLeads, setDeleteStageHasLeads] = useState(false);
  const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStagePresetIndex, setNewStagePresetIndex] = useState('1');
  const [newStagePlacement, setNewStagePlacement] = useState('end');
  const [newStageIsConversion, setNewStageIsConversion] = useState(false);
  const [newStageIsLost, setNewStageIsLost] = useState(false);
  const [newStageRequiresApproval, setNewStageRequiresApproval] =
    useState(false);
  const [newStageApprovalWorkflowId, setNewStageApprovalWorkflowId] = useState<
    string | null
  >(null);
  const [newStageExpirationDays, setNewStageExpirationDays] = useState<
    number | null
  >(null);
  const [newStageExpirationAction, setNewStageExpirationAction] = useState<
    'mark_expired' | 'move_to_lost' | null
  >(null);
  const [newStageExpirationLostStageId, setNewStageExpirationLostStageId] =
    useState<string | null>(null);
  const [stageConfigDraft, setStageConfigDraft] = useState<{
    name: string;
    presetIndex: number;
    placementAfterStageId: string;
    isConversion: boolean;
    isLost: boolean;
    requiresApproval: boolean;
    approvalWorkflowId: string | null;
    expirationDays: number | null;
    expirationAction: 'mark_expired' | 'move_to_lost' | null;
    expirationLostStageId: string | null;
  } | null>(null);
  const dropTargetStageIdRef = useRef<string | null>(null);

  const stagesQuery = useLeadStages();
  const leadsQuery = usePipelineLeads();

  const createLeadStage = useCreateLeadStage();
  const updateLeadStage = useUpdateLeadStage();
  const deleteLeadStage = useDeleteLeadStage();
  const reorderLeadStages = useReorderLeadStages();

  const stages = useMemo(
    () => [...(stagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [stagesQuery.data],
  );
  const leads = useMemo(() => leadsQuery.data?.data ?? [], [leadsQuery.data]);

  useEffect(() => {
    if (orderedStages.length === 0) {
      setSelectedStageId(null);
      return;
    }
    if (
      !selectedStageId ||
      !orderedStages.some((s) => s.id === selectedStageId)
    ) {
      setSelectedStageId(orderedStages[1]?.id ?? orderedStages[0]?.id ?? null);
    }
  }, [selectedStageId, stages]);

  useEffect(() => {
    setIsStageConfigEditing(false);
    setStageConfigDraft(null);
  }, [selectedStageId]);

  useEffect(() => {
    if (!draggedStageId) {
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }
    document.documentElement.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [draggedStageId]);

  useEffect(() => {
    dropTargetStageIdRef.current = dropTargetStageId;
  }, [dropTargetStageId]);

  useEffect(() => {
    if (!draggedStageId) return;
    const onMouseMove = (event: MouseEvent) =>
      setDragPointer({ x: event.clientX, y: event.clientY });
    const onMouseUp = () => {
      const target = dropTargetStageIdRef.current;
      if (target && target !== draggedStageId) {
        handleStageDrop(target);
        return;
      }
      setDraggedStageId(null);
      setDropTargetStageId(null);
      setDragPointer(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggedStageId]);

  const reorderStagesByIds = (orderedIds: string[]) =>
    reorderLeadStages.mutate(orderedIds);
  const updateStage = (stageId: string, updates: Partial<PipelineStage>) =>
    updateLeadStage.mutate({ id: stageId, data: updates });

  const handleStageDragStart = (
    stageId: string,
    pointer: { x: number; y: number },
  ) => {
    setDraggedStageId(stageId);
    setDropTargetStageId(stageId);
    setDragPointer(pointer);
  };

  const handleStageDrop = (targetStageId: string) => {
    if (!draggedStageId || draggedStageId === targetStageId) return;
    const ids = orderedStages.map((s) => s.id);
    const from = ids.indexOf(draggedStageId);
    const to = ids.indexOf(targetStageId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    const movedStage = orderedStages.find((stage) => stage.id === moved);
    setPendingStageOrderIds(next);
    setPendingMovedStageName(movedStage?.name ?? null);
    setConfirmReorderDialogOpen(true);
    setDraggedStageId(null);
    setDropTargetStageId(null);
    setDragPointer(null);
  };

  const handleStageDragOverCard = (targetStageId: string) => {
    if (!draggedStageId) return;
    setDropTargetStageId(targetStageId);
  };

  const setPreset = (stageId: string, presetIndex: number) => {
    const preset = STAGE_COLOR_PRESETS[presetIndex];
    if (!preset) return;
    updateStage(stageId, {
      color: preset.color,
      borderColor: preset.borderColor,
    });
  };

  const openAddStageDialog = () => {
    setNewStageName('');
    setNewStagePresetIndex('1');
    setNewStagePlacement('end');
    setNewStageIsConversion(false);
    setNewStageIsLost(false);
    setNewStageRequiresApproval(false);
    setNewStageApprovalWorkflowId(null);
    setNewStageExpirationDays(null);
    setNewStageExpirationAction(null);
    setNewStageExpirationLostStageId(null);
    setAddStageDialogOpen(true);
  };

  const addNewStage = () => {
    const preset =
      STAGE_COLOR_PRESETS[Number(newStagePresetIndex)] ??
      STAGE_COLOR_PRESETS[1]!;
    const stageName = newStageName.trim() || 'New Stage';
    const order =
      newStagePlacement === 'start'
        ? 0
        : newStagePlacement === 'end'
          ? orderedStages.length
          : orderedStages.findIndex((stage) => stage.id === newStagePlacement) +
            1;

    createLeadStage.mutate(
      {
        name: stageName,
        order,
        color: preset.color,
        borderColor: preset.borderColor,
        category: leadStageCategoryFromFlags(
          newStageIsConversion,
          newStageIsLost,
        ),
        isConversion: newStageIsConversion && !newStageIsLost,
        requiresApproval: newStageRequiresApproval,
        approvalWorkflowId: newStageApprovalWorkflowId,
        expirationDays: newStageExpirationDays,
        expirationAction: newStageExpirationAction,
        expirationLostStageId: newStageExpirationLostStageId,
      },
      {
        onSuccess: (created: { id?: string }) => {
          if (created?.id) setSelectedStageId(created.id);
          setAddStageDialogOpen(false);
        },
      },
    );
  };

  const deleteStage = (stageId: string) => {
    if (stages.length <= 1) return;
    if (leads.some((lead) => lead.stageId === stageId)) {
      setStageDetailsFeedback(
        'Cannot delete this stage while it still contains leads.',
      );
      return;
    }
    deleteLeadStage.mutate(stageId, {
      onSuccess: () => setStageDetailsFeedback(null),
    });
  };

  const orderedStages = [...stages].sort((a, b) => a.order - b.order);
  const draggedStageIndex = draggedStageId
    ? orderedStages.findIndex((s) => s.id === draggedStageId)
    : -1;
  const dropTargetStageIndex = dropTargetStageId
    ? orderedStages.findIndex((s) => s.id === dropTargetStageId)
    : -1;
  const selectedStage =
    orderedStages.find((s) => s.id === selectedStageId) ?? orderedStages[0];
  const draggedStage =
    orderedStages.find((s) => s.id === draggedStageId) ?? null;
  const selectedStageLeads = selectedStage
    ? leads.filter((lead) => lead.stageId === selectedStage.id)
    : [];
  const selectedStageHasLeads = selectedStageLeads.length > 0;
  const selectedStagePresetIndex = selectedStage
    ? findStagePresetIndex(
        selectedStage.color,
        selectedStage.borderColor,
        STAGE_COLOR_PRESETS,
      )
    : -1;
  const stageLeadCountById = new Map<string, number>();
  for (const lead of leads) {
    stageLeadCountById.set(
      lead.stageId,
      (stageLeadCountById.get(lead.stageId) ?? 0) + 1,
    );
  }
  const selectedAddStagePreset =
    STAGE_COLOR_PRESETS[Number(newStagePresetIndex)] ?? STAGE_COLOR_PRESETS[0]!;

  return (
    <div
      className={cn(
        'flex flex-col',
        embedded ? 'min-h-0' : 'h-full overflow-hidden',
      )}
    >
      <div className="flex-shrink-0 border-b border-border bg-white">
        {!embedded ? (
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/leads')}
                title="Back to Leads"
              >
                <ArrowLeft size={16} />
              </Button>
              <div>
                <h1 className="text-[20px] font-semibold text-foreground">
                  Leads Settings
                </h1>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Configure lead pipeline stages and interaction types
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className={embedded ? 'px-0' : 'px-4 sm:px-6'}>
          <div className="overflow-x-auto">
            <div
              role="tablist"
              aria-label="Leads settings sections"
              className="flex min-w-max items-center gap-1"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                    activeSection === tab.id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          embedded
            ? 'bg-transparent p-0 pt-4'
            : 'flex-1 overflow-hidden bg-[#f8f9fb] p-3 sm:p-5',
        )}
      >
        <div
          className={cn(
            embedded ? undefined : 'h-full overflow-y-auto no-scrollbar',
          )}
        >
          <div className="w-full pb-4">
            {activeSection === 'stages' && (
              <div className="flex flex-col gap-4">
                <StageMovementRulesCard entityType="LEAD" />
                <div className="flex gap-5 items-start">
                  <div className="w-[260px] shrink-0 flex flex-col gap-1.5">
                    {orderedStages.map((stage, idx) => {
                      const isSelected = selectedStage?.id === stage.id;
                      const isDraggedCard = draggedStageId === stage.id;
                      const shouldShiftUp =
                        draggedStageIndex >= 0 &&
                        dropTargetStageIndex >= 0 &&
                        draggedStageIndex < dropTargetStageIndex &&
                        idx > draggedStageIndex &&
                        idx <= dropTargetStageIndex;
                      const shouldShiftDown =
                        draggedStageIndex >= 0 &&
                        dropTargetStageIndex >= 0 &&
                        draggedStageIndex > dropTargetStageIndex &&
                        idx >= dropTargetStageIndex &&
                        idx < draggedStageIndex;
                      const shiftY = shouldShiftUp
                        ? -50
                        : shouldShiftDown
                          ? 50
                          : 0;
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => setSelectedStageId(stage.id)}
                          onMouseEnter={() => handleStageDragOverCard(stage.id)}
                          className={cn(
                            'group relative flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transform-gpu transition-[transform,background-color,border-color,opacity] duration-200 ease-out',
                            isSelected
                              ? 'border-brand bg-brand-muted'
                              : 'border-border bg-surface-card hover:border-[#c7d4e8] hover:bg-surface-elevated',
                            isDraggedCard && 'opacity-0',
                            dropTargetStageId === stage.id &&
                              draggedStageId !== stage.id
                              ? 'ring-2 ring-[#f5d4c0]'
                              : '',
                          )}
                          style={{
                            transform:
                              shiftY !== 0
                                ? `translateY(${shiftY}px)`
                                : undefined,
                          }}
                        >
                          <span
                            role="button"
                            tabIndex={-1}
                            aria-label="Drag stage to reorder"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleStageDragStart(stage.id, {
                                x: event.clientX,
                                y: event.clientY,
                              });
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className={cn(
                              'shrink-0 inline-flex h-5 w-5 items-center justify-center rounded cursor-grab hover:bg-[#e9ecef]',
                              isDraggedCard && 'cursor-grabbing',
                            )}
                          >
                            <GripVertical
                              size={13}
                              className={cn(
                                draggedStageId
                                  ? 'text-brand animate-pulse'
                                  : 'text-[#c4c7d4]',
                              )}
                            />
                          </span>
                          <StagePresetSwatch
                            color={stage.color ?? '#7c3aed'}
                            borderColor={stage.borderColor ?? '#5b21b6'}
                            className="h-2.5 w-2.5"
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                            {stage.name}
                          </span>
                          {stage.isConversion && (
                            <span className="shrink-0 rounded bg-brand-muted px-1.5 py-0.5 text-[9px] font-semibold text-brand">
                              Conversion
                            </span>
                          )}
                          {stage.category === 'lost' && (
                            <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                              Lost
                            </span>
                          )}
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {stageLeadCountById.get(stage.id) ?? 0}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={openAddStageDialog}
                      className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border-strong py-2.5 text-[13px] font-medium text-muted-foreground hover:border-[#b0b8c5] hover:bg-surface-elevated hover:text-muted-foreground transition-colors"
                    >
                      <Plus size={13} /> Add Stage
                    </button>
                    {draggedStage && dragPointer && (
                      <div
                        className="pointer-events-none fixed z-50 w-[240px] rounded-lg border border-[#93c5fd] bg-surface-card px-3 py-2.5 shadow-xl"
                        style={{
                          left: dragPointer.x - 120,
                          top: dragPointer.y - 22,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <GripVertical
                            size={13}
                            className="shrink-0 text-brand"
                          />
                          <StagePresetSwatch
                            color={draggedStage.color ?? '#7c3aed'}
                            borderColor={draggedStage.borderColor ?? '#5b21b6'}
                            className="h-2.5 w-2.5"
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                            {draggedStage.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {selectedStage ? (
                      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
                        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                          <StagePresetSwatch
                            color={selectedStage.color ?? '#7c3aed'}
                            borderColor={
                              selectedStage.borderColor ??
                              selectedStage.color ??
                              '#5b21b6'
                            }
                            className="h-3 w-3"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[13px] font-semibold text-foreground">
                              {selectedStage.name}
                            </h3>
                            <p className="text-xs capitalize text-muted-foreground">
                              {selectedStage.category} stage
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-8 gap-1.5 text-[13px]',
                                isStageConfigEditing
                                  ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                  : 'border-border text-muted-foreground hover:bg-muted hover:text-[#1f2937]',
                              )}
                              onClick={() => {
                                if (!selectedStage) return;
                                if (!isStageConfigEditing) {
                                  if (!canEditStageSettings) return;
                                  const currentIdx = orderedStages.findIndex(
                                    (s) => s.id === selectedStage.id,
                                  );
                                  setStageConfigDraft({
                                    name: selectedStage.name,
                                    presetIndex: selectedStagePresetIndex,
                                    placementAfterStageId:
                                      currentIdx === 0
                                        ? ''
                                        : (orderedStages[currentIdx - 1]?.id ??
                                          ''),
                                    isConversion:
                                      selectedStage.isConversion ?? false,
                                    isLost: selectedStage.category === 'lost',
                                    requiresApproval:
                                      selectedStage.requiresApproval ?? false,
                                    approvalWorkflowId:
                                      selectedStage.approvalWorkflowId ?? null,
                                    expirationDays:
                                      selectedStage.expirationDays ?? null,
                                    expirationAction:
                                      selectedStage.expirationAction ?? null,
                                    expirationLostStageId:
                                      selectedStage.expirationLostStageId ??
                                      null,
                                  });
                                  setIsStageConfigEditing(true);
                                  return;
                                }
                                if (!stageConfigDraft) return;
                                if (
                                  stageConfigDraft.requiresApproval &&
                                  !stageConfigDraft.approvalWorkflowId
                                ) {
                                  setStageDetailsFeedback(
                                    'Select an approval workflow when the stage requires approval.',
                                  );
                                  return;
                                }
                                if (
                                  stageConfigDraft.expirationAction ===
                                    'move_to_lost' &&
                                  stageConfigDraft.expirationDays &&
                                  !stageConfigDraft.expirationLostStageId
                                ) {
                                  setStageDetailsFeedback(
                                    'Select a Lost stage for automatic expiration movement.',
                                  );
                                  return;
                                }
                                const nextName =
                                  stageConfigDraft.name.trim() ||
                                  selectedStage.name;
                                const isLost = stageConfigDraft.isLost;
                                const isConversion =
                                  stageConfigDraft.isConversion && !isLost;
                                updateStage(selectedStage.id, {
                                  name: nextName,
                                  category: leadStageCategoryFromFlags(
                                    isConversion,
                                    isLost,
                                  ),
                                  isConversion,
                                  requiresApproval:
                                    stageConfigDraft.requiresApproval,
                                  approvalWorkflowId:
                                    stageConfigDraft.approvalWorkflowId,
                                  expirationDays:
                                    stageConfigDraft.expirationDays,
                                  expirationAction:
                                    stageConfigDraft.expirationAction,
                                  expirationLostStageId:
                                    stageConfigDraft.expirationLostStageId,
                                });
                                if (stageConfigDraft.presetIndex >= 0) {
                                  setPreset(
                                    selectedStage.id,
                                    stageConfigDraft.presetIndex,
                                  );
                                }
                                const currentIds = orderedStages.map(
                                  (s) => s.id,
                                );
                                const withoutCurrent = currentIds.filter(
                                  (id) => id !== selectedStage.id,
                                );
                                const insertAt =
                                  stageConfigDraft.placementAfterStageId === ''
                                    ? 0
                                    : withoutCurrent.indexOf(
                                        stageConfigDraft.placementAfterStageId,
                                      ) + 1;
                                const newOrder = [...withoutCurrent];
                                newOrder.splice(insertAt, 0, selectedStage.id);
                                if (currentIds.join(',') !== newOrder.join(','))
                                  reorderStagesByIds(newOrder);
                                setIsStageConfigEditing(false);
                                setStageDetailsFeedback('Stage updated.');
                              }}
                            >
                              {isStageConfigEditing ? (
                                <Check size={14} />
                              ) : (
                                <Pencil size={14} />
                              )}
                              {isStageConfigEditing ? 'Confirm' : 'Edit'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                setDeleteStageHasLeads(selectedStageHasLeads);
                                setDeleteStageDialogOpen(true);
                              }}
                              title="Delete stage"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </div>
                        <div className="p-5 space-y-5">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Stage Name
                            </label>
                            <Input
                              value={
                                stageConfigDraft?.name ?? selectedStage.name
                              }
                              onChange={(event) =>
                                setStageConfigDraft((prev) =>
                                  prev
                                    ? { ...prev, name: event.target.value }
                                    : prev,
                                )
                              }
                              disabled={!isStageConfigEditing}
                              className="h-9 border-border bg-surface-card text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Color
                            </label>
                            {selectedStagePresetIndex < 0 &&
                            selectedStage.color ? (
                              <div className="flex items-center gap-2 pb-1">
                                <StagePresetSwatch
                                  color={selectedStage.color}
                                  borderColor={
                                    selectedStage.borderColor ??
                                    selectedStage.color
                                  }
                                  selected={
                                    !isStageConfigEditing ||
                                    (stageConfigDraft?.presetIndex ?? -1) < 0
                                  }
                                  className="h-6 w-6"
                                />
                                <span className="text-sm font-medium text-foreground">
                                  Current color
                                </span>
                              </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              {STAGE_COLOR_PRESETS.map((preset, index) => {
                                const activeIdx = isStageConfigEditing
                                  ? (stageConfigDraft?.presetIndex ?? -1)
                                  : selectedStagePresetIndex;
                                return (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    title={preset.label}
                                    disabled={!isStageConfigEditing}
                                    className={cn(
                                      'inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0',
                                      isStageConfigEditing
                                        ? 'cursor-pointer'
                                        : 'cursor-default',
                                    )}
                                    onClick={() =>
                                      setStageConfigDraft((prev) =>
                                        prev
                                          ? { ...prev, presetIndex: index }
                                          : prev,
                                      )
                                    }
                                  >
                                    <StagePresetSwatch
                                      color={preset.color}
                                      borderColor={preset.borderColor}
                                      selected={
                                        activeIdx >= 0 && activeIdx === index
                                      }
                                      className="h-6 w-6"
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Position in Pipeline
                            </label>
                            <Select
                              value={
                                stageConfigDraft
                                  ? stageConfigDraft.placementAfterStageId ||
                                    '__first__'
                                  : orderedStages.findIndex(
                                        (s) => s.id === selectedStage.id,
                                      ) === 0
                                    ? '__first__'
                                    : (orderedStages[
                                        orderedStages.findIndex(
                                          (s) => s.id === selectedStage.id,
                                        ) - 1
                                      ]?.id ?? '__first__')
                              }
                              onValueChange={(value) =>
                                setStageConfigDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        placementAfterStageId:
                                          value === '__first__' ? '' : value,
                                      }
                                    : prev,
                                )
                              }
                              disabled={!isStageConfigEditing}
                            >
                              <SelectTrigger className="h-9 border-border bg-surface-card text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__first__">
                                  1st — Beginning
                                </SelectItem>
                                {orderedStages
                                  .filter((s) => s.id !== selectedStage.id)
                                  .map((s, i) => {
                                    const pos = i + 2;
                                    const suffix =
                                      pos === 2
                                        ? 'nd'
                                        : pos === 3
                                          ? 'rd'
                                          : 'th';
                                    return (
                                      <SelectItem key={s.id} value={s.id}>
                                        {pos}
                                        {suffix} — After &quot;{s.name}&quot;
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="rounded-lg border border-border bg-surface-elevated px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Conversion Stage
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Leads in this stage can be converted into
                                  deals
                                </p>
                              </div>
                              <Switch
                                checked={
                                  stageConfigDraft?.isConversion ??
                                  selectedStage.isConversion ??
                                  false
                                }
                                onCheckedChange={(value) =>
                                  setStageConfigDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          isConversion: value,
                                          isLost: value ? false : prev.isLost,
                                        }
                                      : prev,
                                  )
                                }
                                disabled={!isStageConfigEditing}
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border border-border bg-surface-elevated px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Lost Stage
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Treat this as a finalization stage for lost
                                  leads. Leads here are excluded from
                                  open-pipeline reports.
                                </p>
                              </div>
                              <Switch
                                checked={
                                  stageConfigDraft?.isLost ??
                                  selectedStage.category === 'lost'
                                }
                                onCheckedChange={(value) =>
                                  setStageConfigDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          isLost: value,
                                          isConversion: value
                                            ? false
                                            : prev.isConversion,
                                        }
                                      : prev,
                                  )
                                }
                                disabled={!isStageConfigEditing}
                              />
                            </div>
                          </div>

                          <StageApprovalFields
                            requiresApproval={
                              stageConfigDraft?.requiresApproval ??
                              selectedStage.requiresApproval ??
                              false
                            }
                            approvalWorkflowId={
                              stageConfigDraft
                                ? stageConfigDraft.approvalWorkflowId
                                : (selectedStage.approvalWorkflowId ?? null)
                            }
                            onRequiresApprovalChange={(value) =>
                              setStageConfigDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      requiresApproval: value,
                                      approvalWorkflowId: value
                                        ? prev.approvalWorkflowId
                                        : null,
                                    }
                                  : prev,
                              )
                            }
                            onApprovalWorkflowIdChange={(value) =>
                              setStageConfigDraft((prev) =>
                                prev
                                  ? { ...prev, approvalWorkflowId: value }
                                  : prev,
                              )
                            }
                            entityScope="LEAD"
                            disabled={!isStageConfigEditing}
                          />

                          <StageExpirationFields
                            disabled={
                              !isStageConfigEditing || !canEditStageSettings
                            }
                            lostStages={orderedStages
                              .filter(
                                (s) =>
                                  s.category === 'lost' &&
                                  s.id !== selectedStage.id,
                              )
                              .map((s) => ({ id: s.id, name: s.name }))}
                            value={
                              isStageConfigEditing && stageConfigDraft
                                ? {
                                    expirationDays:
                                      stageConfigDraft.expirationDays,
                                    expirationAction:
                                      stageConfigDraft.expirationAction,
                                    expirationLostStageId:
                                      stageConfigDraft.expirationLostStageId,
                                  }
                                : {
                                    expirationDays:
                                      selectedStage.expirationDays ?? null,
                                    expirationAction:
                                      selectedStage.expirationAction ?? null,
                                    expirationLostStageId:
                                      selectedStage.expirationLostStageId ??
                                      null,
                                  }
                            }
                            onChange={(next) =>
                              setStageConfigDraft((prev) =>
                                prev ? { ...prev, ...next } : prev,
                              )
                            }
                          />

                          {stageDetailsFeedback && (
                            <p className="text-xs text-brand">
                              {stageDetailsFeedback}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-surface-card text-sm text-muted-foreground">
                        Select a stage to configure it
                      </div>
                    )}
                  </div>

                  <Dialog
                    open={deleteStageDialogOpen}
                    onOpenChange={setDeleteStageDialogOpen}
                  >
                    <DialogContent>
                      {deleteStageHasLeads ? (
                        <>
                          <DialogHeader>
                            <DialogTitle>Cannot delete stage</DialogTitle>
                            <DialogDescription>
                              This stage has leads assigned to it. Move or
                              remove those leads first, then try deleting the
                              stage again.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteStageDialogOpen(false)}
                            >
                              Close
                            </Button>
                          </DialogFooter>
                        </>
                      ) : (
                        <>
                          <DialogHeader>
                            <DialogTitle>Delete stage?</DialogTitle>
                            <DialogDescription>
                              This action will permanently remove
                              {selectedStage
                                ? ` "${selectedStage.name}"`
                                : ' this stage'}{' '}
                              from the pipeline.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteStageDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-red-600 text-brand-foreground hover:bg-red-700"
                              onClick={() => {
                                if (selectedStage)
                                  deleteStage(selectedStage.id);
                                setDeleteStageDialogOpen(false);
                              }}
                            >
                              Delete Stage
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={confirmReorderDialogOpen}
                    onOpenChange={(open) => {
                      setConfirmReorderDialogOpen(open);
                      if (!open) setPendingStageOrderIds(null);
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm stage reorder</DialogTitle>
                        <DialogDescription>
                          {pendingMovedStageName
                            ? `Apply the new position for "${pendingMovedStageName}"?`
                            : 'Apply the new pipeline stage order you just dropped?'}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            document.body.style.cursor = '';
                            setPendingStageOrderIds(null);
                            setPendingMovedStageName(null);
                            setConfirmReorderDialogOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-brand text-brand-foreground hover:bg-brand-hover"
                          onClick={() => {
                            document.body.style.cursor = '';
                            if (pendingStageOrderIds)
                              reorderStagesByIds(pendingStageOrderIds);
                            setPendingStageOrderIds(null);
                            setPendingMovedStageName(null);
                            setConfirmReorderDialogOpen(false);
                          }}
                        >
                          Confirm
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={addStageDialogOpen}
                    onOpenChange={setAddStageDialogOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Stage</DialogTitle>
                        <DialogDescription>
                          Set the stage name, color, and where it should fit in
                          the pipeline.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Stage Name
                          </label>
                          <Input
                            value={newStageName}
                            onChange={(event) =>
                              setNewStageName(event.target.value)
                            }
                            placeholder="Enter stage name"
                            className="h-9 border-border bg-surface-card text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Color
                          </label>
                          <Select
                            value={newStagePresetIndex}
                            onValueChange={setNewStagePresetIndex}
                          >
                            <SelectTrigger className="h-9 border-border bg-surface-card">
                              <SelectValue placeholder="Select color">
                                <span className="inline-flex items-center gap-2">
                                  <StagePresetSwatch
                                    color={selectedAddStagePreset.color}
                                    borderColor={
                                      selectedAddStagePreset.borderColor
                                    }
                                    className="h-3.5 w-3.5"
                                  />
                                  {selectedAddStagePreset.label}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {STAGE_COLOR_PRESETS.map((preset, index) => (
                                <SelectItem
                                  key={preset.label}
                                  value={String(index)}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <StagePresetSwatch
                                      color={preset.color}
                                      borderColor={preset.borderColor}
                                      className="h-3.5 w-3.5"
                                    />
                                    {preset.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Placement in Pipeline
                          </label>
                          <Select
                            value={newStagePlacement}
                            onValueChange={setNewStagePlacement}
                          >
                            <SelectTrigger className="h-9 border-border bg-surface-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="start">
                                At the beginning
                              </SelectItem>
                              <SelectItem value="end">At the end</SelectItem>
                              {orderedStages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  After {stage.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-elevated px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Conversion Stage
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Leads in this stage can be converted into deals
                              </p>
                            </div>
                            <Switch
                              checked={newStageIsConversion}
                              onCheckedChange={(value) => {
                                setNewStageIsConversion(value);
                                if (value) setNewStageIsLost(false);
                              }}
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-elevated px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Lost Stage
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Finalization stage for lost leads. Excluded from
                                open-pipeline reports.
                              </p>
                            </div>
                            <Switch
                              checked={newStageIsLost}
                              onCheckedChange={(value) => {
                                setNewStageIsLost(value);
                                if (value) setNewStageIsConversion(false);
                              }}
                            />
                          </div>
                        </div>
                        <StageApprovalFields
                          requiresApproval={newStageRequiresApproval}
                          approvalWorkflowId={newStageApprovalWorkflowId}
                          onRequiresApprovalChange={(value) => {
                            setNewStageRequiresApproval(value);
                            if (!value) setNewStageApprovalWorkflowId(null);
                          }}
                          onApprovalWorkflowIdChange={
                            setNewStageApprovalWorkflowId
                          }
                          entityScope="LEAD"
                        />
                        <StageExpirationFields
                          lostStages={orderedStages
                            .filter((s) => s.category === 'lost')
                            .map((s) => ({ id: s.id, name: s.name }))}
                          value={{
                            expirationDays: newStageExpirationDays,
                            expirationAction: newStageExpirationAction,
                            expirationLostStageId:
                              newStageExpirationLostStageId,
                          }}
                          onChange={(next) => {
                            setNewStageExpirationDays(next.expirationDays);
                            setNewStageExpirationAction(next.expirationAction);
                            setNewStageExpirationLostStageId(
                              next.expirationLostStageId,
                            );
                          }}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setAddStageDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-brand text-brand-foreground hover:bg-brand-hover"
                          onClick={addNewStage}
                          disabled={
                            newStageRequiresApproval &&
                            !newStageApprovalWorkflowId
                          }
                        >
                          Add Stage
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
