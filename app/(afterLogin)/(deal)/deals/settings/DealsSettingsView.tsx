'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Check,
  Kanban,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { dealUiLabel } from '@/config/salesWorkflow';
import {
  DEALS_STAGE_COLOR_PRESETS,
  findStagePresetIndex,
} from '@/lib/stage-presets';
import { StagePresetSwatch } from '@/components/pipeline/StagePresetSwatch';
import {
  categoryToStageKind,
  stageKindToCategory,
  StageCategoryFields,
  type StageKind,
} from '@/components/pipeline/StageFinalizationFields';
import {
  useDealStages,
  usePipelineDeals,
} from '@/store/server/features/deals/pipeline/queries';
import {
  checkDealsUsingStage,
  useCreateDealStage,
  useDeleteDealStage,
  useReorderDealStages,
  useUpdateDealStage,
} from '@/store/server/features/deals/settings/mutations';
import type { PipelineStage } from '@/modules/pipeline/types';
import { StageApprovalFields } from '@/components/pipeline/StageApprovalFields';
import { StageExpirationFields } from '@/components/pipeline/StageExpirationFields';
import { StageMovementRulesCard } from '@/components/pipeline/StageMovementRulesCard';
import { CustomPipelineMetricsCard } from '@/components/pipeline/CustomPipelineMetricsCard';
import { SortableStageListItem } from '@/components/pipeline/SortableStageListItem';
import AccessGuard from '@/utils/permissionGuard';

const STAGE_COLOR_PRESETS = DEALS_STAGE_COLOR_PRESETS;

type Tab = 'stages';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'stages', label: 'Pipeline Stages', icon: <Kanban size={14} /> },
];

type DealsSettingsViewProps = {
  /** When true, hide the standalone page chrome (back button / title). */
  embedded?: boolean;
};

export default function DealsSettingsView({
  embedded = false,
}: DealsSettingsViewProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Tab>('stages');
  const canEditStageSettings = AccessGuard.checkAccess({
    permissions: ['edit-settings'],
  });

  const stagesQuery = useDealStages();
  const dealsQuery = usePipelineDeals();

  const createDealStage = useCreateDealStage();
  const updateDealStage = useUpdateDealStage();
  const deleteDealStage = useDeleteDealStage();
  const reorderDealStages = useReorderDealStages();

  const stages = useMemo(
    () => [...(stagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [stagesQuery.data],
  );
  const deals = useMemo(() => dealsQuery.data?.data ?? [], [dealsQuery.data]);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isStageConfigEditing, setIsStageConfigEditing] = useState(false);
  const [stageConfigDraft, setStageConfigDraft] = useState<{
    name: string;
    presetIndex: number;
    placementAfterStageId: string;
    stageKind: StageKind;
    requiresApproval: boolean;
    approvalWorkflowId: string | null;
    expirationDays: number | null;
    expirationAction: 'mark_expired' | 'move_to_lost' | null;
    expirationLostStageId: string | null;
  } | null>(null);
  const [stageDetailsFeedback, setStageDetailsFeedback] = useState<
    string | null
  >(null);
  const [deleteStageDialogOpen, setDeleteStageDialogOpen] = useState(false);
  const [deleteStageHasDeals, setDeleteStageHasDeals] = useState(false);
  const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStagePresetIndex, setNewStagePresetIndex] = useState('1');
  const [newStagePlacement, setNewStagePlacement] = useState('end');
  const [newStageKind, setNewStageKind] = useState<StageKind>('open');
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
  const [activeDragStageId, setActiveDragStageId] = useState<string | null>(
    null,
  );
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null);
  const [confirmReorderDialogOpen, setConfirmReorderDialogOpen] =
    useState(false);
  const [pendingStageOrderIds, setPendingStageOrderIds] = useState<
    string[] | null
  >(null);
  const [pendingMovedStageName, setPendingMovedStageName] = useState<
    string | null
  >(null);

  const selectedAddStagePreset =
    STAGE_COLOR_PRESETS[Number(newStagePresetIndex)] ?? STAGE_COLOR_PRESETS[0]!;

  const orderedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages],
  );

  const selectedStage =
    orderedStages.find((s) => s.id === selectedStageId) ??
    orderedStages[0] ??
    null;

  const selectedStagePresetIndex = selectedStage
    ? findStagePresetIndex(
        selectedStage.color,
        selectedStage.borderColor,
        STAGE_COLOR_PRESETS,
      )
    : -1;

  const stageDealCountById = useMemo(() => {
    const fromDeals = new Map<string, number>();
    for (const deal of deals) {
      if (deal.stageId)
        fromDeals.set(deal.stageId, (fromDeals.get(deal.stageId) ?? 0) + 1);
    }
    const map = new Map<string, number>();
    for (const stage of stages) {
      const apiCount = (stage as { dealsCount?: number }).dealsCount;
      map.set(stage.id, apiCount ?? fromDeals.get(stage.id) ?? 0);
    }
    return map;
  }, [stages, deals]);

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
    setStageDetailsFeedback(null);
  }, [selectedStageId]);

  const canReorderStages = orderedStages.length > 1 && canEditStageSettings;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeDragStage = activeDragStageId
    ? (orderedStages.find((stage) => stage.id === activeDragStageId) ?? null)
    : null;

  const handleStageDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragStageId(String(event.active.id));
    const width = event.active.rect.current.initial?.width;
    setDragOverlayWidth(width ?? null);
  }, []);

  const handleStageDragCancel = useCallback(() => {
    setActiveDragStageId(null);
    setDragOverlayWidth(null);
  }, []);

  const handleStageDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragStageId(null);
      setDragOverlayWidth(null);

      if (!over || active.id === over.id || !canReorderStages) return;

      const ids = orderedStages.map((stage) => stage.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const next = arrayMove(ids, oldIndex, newIndex);
      const movedStage = orderedStages.find(
        (stage) => stage.id === String(active.id),
      );
      setPendingStageOrderIds(next);
      setPendingMovedStageName(movedStage?.name ?? null);
      setConfirmReorderDialogOpen(true);
    },
    [canReorderStages, orderedStages],
  );

  const beginStageEdit = () => {
    if (!selectedStage || !canEditStageSettings) return;
    const currentIdx = orderedStages.findIndex(
      (s) => s.id === selectedStage.id,
    );
    setStageConfigDraft({
      name: selectedStage.name,
      presetIndex: selectedStagePresetIndex,
      placementAfterStageId:
        currentIdx === 0 ? '' : (orderedStages[currentIdx - 1]?.id ?? ''),
      stageKind: categoryToStageKind(selectedStage.category),
      requiresApproval: selectedStage.requiresApproval ?? false,
      approvalWorkflowId: selectedStage.approvalWorkflowId ?? null,
      expirationDays: selectedStage.expirationDays ?? null,
      expirationAction: selectedStage.expirationAction ?? null,
      expirationLostStageId: selectedStage.expirationLostStageId ?? null,
    });
    setIsStageConfigEditing(true);
    setStageDetailsFeedback(null);
  };

  const cancelStageEdit = () => {
    setIsStageConfigEditing(false);
    setStageConfigDraft(null);
    setStageDetailsFeedback(null);
  };

  const confirmStageEdit = () => {
    if (!selectedStage || !stageConfigDraft) return;
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
      stageConfigDraft.expirationAction === 'move_to_lost' &&
      stageConfigDraft.expirationDays &&
      !stageConfigDraft.expirationLostStageId
    ) {
      setStageDetailsFeedback(
        'Select a Lost stage for automatic expiration movement.',
      );
      return;
    }
    const nextName = stageConfigDraft.name.trim() || selectedStage.name;
    updateStage(selectedStage.id, {
      name: nextName,
      category: stageKindToCategory(stageConfigDraft.stageKind),
      requiresApproval: stageConfigDraft.requiresApproval,
      approvalWorkflowId: stageConfigDraft.approvalWorkflowId,
      expirationDays: stageConfigDraft.expirationDays,
      expirationAction: stageConfigDraft.expirationAction,
      expirationLostStageId: stageConfigDraft.expirationLostStageId,
    });
    if (stageConfigDraft.presetIndex >= 0) {
      setPreset(selectedStage.id, stageConfigDraft.presetIndex);
    }
    const currentIds = orderedStages.map((s) => s.id);
    const withoutCurrent = currentIds.filter((id) => id !== selectedStage.id);
    const insertAt =
      stageConfigDraft.placementAfterStageId === ''
        ? 0
        : withoutCurrent.indexOf(stageConfigDraft.placementAfterStageId) + 1;
    const newOrder = [...withoutCurrent];
    newOrder.splice(insertAt, 0, selectedStage.id);
    if (currentIds.join(',') !== newOrder.join(','))
      reorderStagesByIds(newOrder);
    setIsStageConfigEditing(false);
    setStageDetailsFeedback('Stage updated.');
  };

  const selectedStagePositionLabel = useMemo(() => {
    if (!selectedStage) return '';
    const idx = orderedStages.findIndex((s) => s.id === selectedStage.id);
    if (idx === 0) return '1st — Beginning';
    const prev = orderedStages[idx - 1];
    const pos = idx + 1;
    const suffix = pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
    return prev ? `${pos}${suffix} — After "${prev.name}"` : `${pos}${suffix}`;
  }, [orderedStages, selectedStage]);

  const updateStage = (stageId: string, updates: Partial<PipelineStage>) => {
    updateDealStage.mutate({ id: stageId, data: updates });
  };

  const setPreset = (stageId: string, presetIndex: number) => {
    const preset = STAGE_COLOR_PRESETS[presetIndex];
    if (!preset) return;
    updateStage(stageId, {
      color: preset.color,
      borderColor: preset.borderColor,
    });
  };

  const reorderStagesByIds = (orderedIds: string[]) => {
    reorderDealStages.mutate(orderedIds);
  };

  const openAddStageDialog = () => {
    setNewStageName('');
    setNewStagePresetIndex('1');
    setNewStagePlacement('end');
    setNewStageKind('open');
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

    createDealStage.mutate(
      {
        name: stageName,
        category: stageKindToCategory(newStageKind),
        order,
        color: preset.color,
        borderColor: preset.borderColor,
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

  const deleteStage = async (stageId: string) => {
    if (stages.length <= 1) return;
    const dealsInStage = await checkDealsUsingStage(stageId);
    if (dealsInStage > 0) {
      setStageDetailsFeedback(
        `Cannot delete this stage while it still contains ${dealUiLabel({ plural: true, lowercase: true })}.`,
      );
      return;
    }
    deleteDealStage.mutate(stageId, {
      onSuccess: () => setStageDetailsFeedback(null),
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        embedded ? 'min-h-0' : 'h-full overflow-hidden',
      )}
    >
      {!embedded ? (
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/deals')}
                title={`Back to ${dealUiLabel({ plural: true })}`}
              >
                <ArrowLeft size={16} />
              </Button>
              <div>
                <h1 className="text-[20px] font-semibold text-foreground">
                  {dealUiLabel({ plural: true })} Settings
                </h1>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6">
            <div className="overflow-x-auto">
              <div
                role="tablist"
                aria-label={`${dealUiLabel({ plural: true })} settings sections`}
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
      ) : null}

      <div
        className={cn(
          embedded
            ? 'bg-transparent p-0'
            : 'flex-1 overflow-hidden bg-surface-card p-3 sm:p-5',
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
                <div className="flex flex-col gap-2">
                  <StageMovementRulesCard entityType="DEAL" />
                  <CustomPipelineMetricsCard />
                </div>
                <div className="flex items-start gap-5">
                  <div className="flex w-[260px] shrink-0 flex-col gap-1.5">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragStart={handleStageDragStart}
                      onDragCancel={handleStageDragCancel}
                      onDragEnd={handleStageDragEnd}
                    >
                      <SortableContext
                        items={orderedStages.map((stage) => stage.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedStages.map((stage) => (
                          <SortableStageListItem
                            key={stage.id}
                            stage={stage}
                            isSelected={selectedStage?.id === stage.id}
                            dealCount={stageDealCountById.get(stage.id) ?? 0}
                            onSelect={() => setSelectedStageId(stage.id)}
                            canDrag={canReorderStages}
                          />
                        ))}
                      </SortableContext>
                      <DragOverlay
                        dropAnimation={{ duration: 200, easing: 'ease' }}
                      >
                        {activeDragStage ? (
                          <div
                            style={
                              dragOverlayWidth
                                ? { width: dragOverlayWidth }
                                : undefined
                            }
                          >
                            <SortableStageListItem
                              stage={activeDragStage}
                              isSelected={
                                selectedStage?.id === activeDragStage.id
                              }
                              dealCount={
                                stageDealCountById.get(activeDragStage.id) ?? 0
                              }
                              onSelect={() => undefined}
                              canDrag
                              isDragOverlay
                            />
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                    <button
                      type="button"
                      onClick={openAddStageDialog}
                      className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border-strong py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated hover:text-foreground"
                    >
                      <Plus size={13} /> Add Stage
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
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
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {isStageConfigEditing ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[13px]"
                                  onClick={cancelStageEdit}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1.5 bg-brand text-[13px] text-brand-foreground hover:bg-brand-hover"
                                  onClick={confirmStageEdit}
                                >
                                  <Check size={14} />
                                  Confirm
                                </Button>
                              </>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="size-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEditStageSettings ? (
                                    <>
                                      <DropdownMenuItem
                                        onClick={beginStageEdit}
                                      >
                                        <Pencil size={14} />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  ) : null}
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={async () => {
                                      if (!selectedStage) return;
                                      const dealsInStage =
                                        await checkDealsUsingStage(
                                          selectedStage.id,
                                        );
                                      setDeleteStageHasDeals(dealsInStage > 0);
                                      setDeleteStageDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>

                        <div className="space-y-5 p-5">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Stage Name
                            </label>
                            {isStageConfigEditing ? (
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
                                className="h-9 border-border bg-surface-card text-sm"
                              />
                            ) : (
                              <p className="text-sm font-medium text-foreground">
                                {selectedStage.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedStagePresetIndex < 0 &&
                              selectedStage.color ? (
                                <span title="Current color">
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
                                </span>
                              ) : null}
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
                            {isStageConfigEditing ? (
                              <Select
                                value={
                                  stageConfigDraft?.placementAfterStageId ||
                                  '__first__'
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
                              >
                                <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                            ) : (
                              <p className="text-sm font-medium text-foreground">
                                {selectedStagePositionLabel}
                              </p>
                            )}
                          </div>

                          <StageCategoryFields
                            stageKind={
                              stageConfigDraft?.stageKind ??
                              categoryToStageKind(selectedStage.category)
                            }
                            onStageKindChange={(value) =>
                              setStageConfigDraft((prev) =>
                                prev ? { ...prev, stageKind: value } : prev,
                              )
                            }
                            readOnly={!isStageConfigEditing}
                          />

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
                            entityScope="DEAL"
                            readOnly={!isStageConfigEditing}
                          />

                          <StageExpirationFields
                            disabled={!canEditStageSettings}
                            readOnly={!isStageConfigEditing}
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
                    open={confirmReorderDialogOpen}
                    onOpenChange={(open) => {
                      setConfirmReorderDialogOpen(open);
                      if (!open) setPendingStageOrderIds(null);
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {pendingMovedStageName
                            ? `Move "${pendingMovedStageName}" to this position?`
                            : 'Confirm stage reorder'}
                        </DialogTitle>
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
                    open={deleteStageDialogOpen}
                    onOpenChange={setDeleteStageDialogOpen}
                  >
                    <DialogContent>
                      {deleteStageHasDeals ? (
                        <>
                          <DialogHeader>
                            <DialogTitle>
                              Cannot delete —{' '}
                              {dealUiLabel({ plural: true, lowercase: true })}{' '}
                              still in this stage
                            </DialogTitle>
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
                            <DialogTitle>
                              Delete
                              {selectedStage
                                ? ` "${selectedStage.name}"`
                                : ' stage'}
                              ?
                            </DialogTitle>
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
                    open={addStageDialogOpen}
                    onOpenChange={setAddStageDialogOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Stage</DialogTitle>
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
                            <SelectTrigger className="h-9 w-full border-border bg-surface-card">
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
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                            <SelectTrigger className="h-9 w-full border-border bg-surface-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
                        <StageCategoryFields
                          stageKind={newStageKind}
                          onStageKindChange={setNewStageKind}
                        />
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
                          entityScope="DEAL"
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
