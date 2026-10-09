'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GripVertical,
  Kanban,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LEAD_SETTINGS_STAGE_PRESETS } from '@/lib/stage-presets';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import type { CustomerJourneyStage } from '@/store/server/features/customers/types';
import { useGetJourneyStages } from '@/store/server/features/customers/queries';
import {
  useCreateJourneyStage,
  useDeleteJourneyStage,
  useReorderJourneyStages,
  useResetJourneyStages,
  useUpdateJourneyStage,
} from '@/store/server/features/customers/mutations';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import {
  SettingsListSectionSkeleton,
  SettingsListTableSkeleton,
} from '@/components/loading/skeleton-screens';
import {
  useCreateVector,
  useDeleteVector,
  useUpdateVector,
} from '@/store/server/features/vectors/mutations';
import type { Vector } from '@/store/server/features/vectors/types';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import { MultiEntitySelector } from '@/modules/product-catalog/components/MultiEntitySelector';

const COLOR_PRESETS = LEAD_SETTINGS_STAGE_PRESETS;
const STAGE_CARD_SHIFT = 68;

type SettingsTab = 'stages' | 'vectors';

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <span className={active ? 'text-brand' : 'text-muted-foreground'}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function formatLifecycleGroup(value?: string | null) {
  if (!value) return '';
  return value.replace(/_/g, ' ');
}

function StageCardContent({ stage }: { stage: CustomerJourneyStage }) {
  return (
    <>
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ background: stage.color ?? '#64748B' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm font-medium text-foreground">
            {stage.name}
          </strong>
          {stage.isTerminal ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              Terminal
            </span>
          ) : null}
          {stage.lifecycleGroup ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {formatLifecycleGroup(stage.lifecycleGroup)}
            </span>
          ) : null}
          {!stage.isActive ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              Inactive
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Order {stage.sortOrder}
          {stage.customerCount ? ` · ${stage.customerCount} customers` : ''}
          {stage.description ? ` · ${stage.description}` : ''}
        </p>
      </div>
    </>
  );
}

export function CustomersSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('stages');
  const canEdit = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.EDIT_SETTINGS],
  });

  const stagesQuery = useGetJourneyStages();
  const createStage = useCreateJourneyStage();
  const updateStage = useUpdateJourneyStage();
  const deleteStage = useDeleteJourneyStage();
  const reorderStages = useReorderJourneyStages();
  const resetStages = useResetJourneyStages();
  const vectorsQuery = useGetVectors();
  const createVector = useCreateVector();
  const updateVector = useUpdateVector();
  const deleteVector = useDeleteVector();

  const orderedStages = useMemo(
    () =>
      [...(stagesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [stagesQuery.data],
  );
  const vectors = vectorsQuery.data?.data ?? [];
  const lifecycleGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: string[] = [];
    for (const stage of orderedStages) {
      const group = stage.lifecycleGroup?.trim();
      if (!group || seen.has(group)) continue;
      seen.add(group);
      groups.push(group);
    }
    return groups;
  }, [orderedStages]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dragPointerY, setDragPointerY] = useState<number | null>(null);
  const [listLeft, setListLeft] = useState(0);
  const [listWidth, setListWidth] = useState(0);
  const dropTargetIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerJourneyStage | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState<string>(COLOR_PRESETS[0].color);
  const [draftDescription, setDraftDescription] = useState('');
  const [draftActive, setDraftActive] = useState(true);
  const [draftTerminal, setDraftTerminal] = useState(false);
  const [draftLifecycleGroup, setDraftLifecycleGroup] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CustomerJourneyStage | null>(
    null,
  );
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const [vectorFormOpen, setVectorFormOpen] = useState(false);
  const [editingVector, setEditingVector] = useState<Vector | null>(null);
  const [vectorName, setVectorName] = useState('');
  const [vectorDescription, setVectorDescription] = useState('');
  const [vectorTeamIds, setVectorTeamIds] = useState<string[]>([]);
  const [vectorDelete, setVectorDelete] = useState<Vector | null>(null);

  const teamsQuery = useGetCrmTeams({ enabled: true });
  const teams = teamsQuery.data?.data ?? [];

  const selected =
    orderedStages.find((s) => s.id === (selectedId ?? orderedStages[0]?.id)) ??
    null;
  const draggedStage =
    orderedStages.find((stage) => stage.id === draggedId) ?? null;

  useEffect(() => {
    dropTargetIdRef.current = dropTargetId;
  }, [dropTargetId]);

  useEffect(() => {
    if (!draggedId) return;
    const onMouseMove = (event: MouseEvent) => setDragPointerY(event.clientY);
    const onMouseUp = () => {
      const target = dropTargetIdRef.current;
      if (canEdit && target && target !== draggedId) {
        const ids = orderedStages.map((s) => s.id);
        const from = ids.indexOf(draggedId);
        const to = ids.indexOf(target);
        if (from >= 0 && to >= 0) {
          const next = [...ids];
          const [moved] = next.splice(from, 1);
          if (moved) {
            next.splice(to, 0, moved);
            reorderStages.mutate(next, {
              onSuccess: () => toast.success('Stage order updated.'),
              onError: () => toast.error('Could not reorder stages.'),
            });
          }
        }
      }
      setDraggedId(null);
      setDropTargetId(null);
      setDragPointerY(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggedId, orderedStages, reorderStages, canEdit]);

  const openCreate = () => {
    setEditing(null);
    setDraftName('');
    setDraftColor(COLOR_PRESETS[0].color);
    setDraftDescription('');
    setDraftActive(true);
    setDraftTerminal(false);
    setDraftLifecycleGroup(orderedStages[0]?.lifecycleGroup ?? '');
    setFormOpen(true);
  };

  const openEdit = (stage: CustomerJourneyStage) => {
    setEditing(stage);
    setDraftName(stage.name);
    setDraftColor(stage.color ?? COLOR_PRESETS[0].color);
    setDraftDescription(stage.description ?? '');
    setDraftActive(stage.isActive);
    setDraftTerminal(stage.isTerminal);
    setDraftLifecycleGroup(stage.lifecycleGroup ?? '');
    setFormOpen(true);
  };

  const saveStage = () => {
    const name = draftName.trim();
    if (name.length < 2) {
      toast.error('Stage name must be at least 2 characters.');
      return;
    }
    const payload = {
      name,
      color: draftColor,
      description: draftDescription.trim() || undefined,
      isActive: draftActive,
      isTerminal: draftTerminal,
      lifecycleGroup: draftLifecycleGroup.trim() || undefined,
    };
    if (editing) {
      updateStage.mutate(
        { id: editing.id, payload },
        {
          onSuccess: () => {
            setFormOpen(false);
            toast.success('Stage updated.');
          },
          onError: (error: unknown) => {
            const message =
              (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Could not update stage.';
            toast.error(
              typeof message === 'string' ? message : 'Could not update stage.',
            );
          },
        },
      );
      return;
    }
    createStage.mutate(payload, {
      onSuccess: () => {
        setFormOpen(false);
        toast.success('Stage created.');
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Could not create stage.';
        toast.error(
          typeof message === 'string' ? message : 'Could not create stage.',
        );
      },
    });
  };

  const startDrag = (stageId: string, clientY: number) => {
    if (!canEdit) return;
    const rect = listRef.current?.getBoundingClientRect();
    if (rect) {
      setListLeft(rect.left);
      setListWidth(rect.width);
    }
    setDraggedId(stageId);
    setDropTargetId(stageId);
    setDragPointerY(clientY);
  };

  return (
    <div className="flex min-h-0 flex-col bg-white">
      <div className="mb-3 flex justify-end">
        <AccessGuard permissions={[PERMISSIONS.EDIT_SETTINGS]}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-border bg-white hover:bg-surface-elevated"
            onClick={() => setResetConfirmOpen(true)}
          >
            <RotateCcw size={14} className="mr-1.5" />
            Reset defaults
          </Button>
        </AccessGuard>
      </div>

      <div className="flex-shrink-0 border-b border-border bg-white px-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          <TabButton
            active={tab === 'stages'}
            label="Journey Stages"
            icon={<Kanban size={14} />}
            onClick={() => setTab('stages')}
          />
          <TabButton
            active={tab === 'vectors'}
            label="Vectors"
            icon={<Waypoints size={14} />}
            onClick={() => setTab('vectors')}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white px-0 py-4">
        {tab === 'stages' ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Stages</h2>
                <AccessGuard permissions={[PERMISSIONS.EDIT_SETTINGS]}>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover"
                    onClick={openCreate}
                  >
                    <Plus size={13} className="mr-1.5" />
                    Add Stage
                  </Button>
                </AccessGuard>
              </div>
              {stagesQuery.isLoading ? (
                <SettingsListSectionSkeleton rows={5} />
              ) : stagesQuery.isError ? (
                <p className="text-sm text-destructive">
                  Could not load stages.
                </p>
              ) : (
                <ul ref={listRef} className="m-0 list-none space-y-2 p-0">
                  {orderedStages.map((stage) => (
                    <li
                      key={stage.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-3',
                        selected?.id === stage.id && 'border-brand',
                        dropTargetId === stage.id &&
                          draggedId &&
                          'border-brand',
                      )}
                      style={{
                        transform:
                          draggedId && dropTargetId === stage.id
                            ? `translateY(${STAGE_CARD_SHIFT / 8}px)`
                            : undefined,
                      }}
                      onClick={() => setSelectedId(stage.id)}
                      onMouseEnter={() =>
                        draggedId && setDropTargetId(stage.id)
                      }
                    >
                      <span
                        className={cn(
                          'cursor-grab text-muted-foreground',
                          !canEdit && 'cursor-default opacity-40',
                        )}
                        onMouseDown={(e) => startDrag(stage.id, e.clientY)}
                      >
                        <GripVertical size={16} />
                      </span>
                      <StageCardContent stage={stage} />
                      <AccessGuard permissions={[PERMISSIONS.EDIT_SETTINGS]}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(stage);
                          }}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(stage);
                          }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </AccessGuard>
                    </li>
                  ))}
                </ul>
              )}
              {draggedStage && dragPointerY != null ? (
                <div
                  className="pointer-events-none fixed z-50 rounded-lg border border-brand bg-white px-3 py-3 shadow-lg"
                  style={{
                    left: listLeft,
                    width: listWidth || undefined,
                    top: dragPointerY - 28,
                    transform: 'rotate(2deg)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical size={16} className="text-brand" />
                    <StageCardContent stage={draggedStage} />
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-border bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-brand" />
                <h2 className="text-sm font-semibold">Stage details</h2>
              </div>
              {selected ? (
                <div className="space-y-3 text-sm">
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-muted-foreground">
                    {selected.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.customerCount} customer
                    {selected.customerCount === 1 ? '' : 's'} in this stage
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a stage to inspect it.
                </p>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Vectors</h2>
              <AccessGuard permissions={[PERMISSIONS.EDIT_SETTINGS]}>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover"
                  onClick={() => {
                    setEditingVector(null);
                    setVectorName('');
                    setVectorDescription('');
                    setVectorTeamIds([]);
                    setVectorFormOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-1.5" />
                  Add Vector
                </Button>
              </AccessGuard>
            </div>
            {vectorsQuery.isLoading ? (
              <div className="overflow-hidden p-4">
                <SettingsListTableSkeleton rows={5} />
              </div>
            ) : vectorsQuery.isError ? (
              <p className="px-5 py-6 text-sm text-destructive">
                Could not load vectors.
              </p>
            ) : vectors.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No vectors yet.
              </p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-elevated">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Vector
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Description
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Customers
                      </th>
                      <th className="w-[100px] px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {vectors.map((vector) => (
                      <tr
                        key={vector.id}
                        className="border-t border-border/60 hover:bg-surface-elevated/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 place-items-center rounded-lg bg-brand-muted text-brand">
                              <Waypoints size={14} />
                            </span>
                            <span className="font-medium text-foreground">
                              {vector.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {vector.description || '—'}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-foreground">
                          {vector.customerCount ?? 0}
                        </td>
                        <td className="px-5 py-3.5">
                          <AccessGuard
                            permissions={[PERMISSIONS.EDIT_SETTINGS]}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                aria-label="Edit vector"
                                onClick={() => {
                                  setEditingVector(vector);
                                  setVectorName(vector.name);
                                  setVectorDescription(
                                    vector.description ?? '',
                                  );
                                  setVectorTeamIds(
                                    vector.teamIds ??
                                      vector.teams?.map((team) => team.id) ??
                                      [],
                                  );
                                  setVectorFormOpen(true);
                                }}
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                aria-label="Delete vector"
                                onClick={() => setVectorDelete(vector)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </AccessGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit journey stage' : 'Add journey stage'}
            </DialogTitle>
            <DialogDescription>
              Stages appear on the customer journey tracker and dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => setDraftColor(preset.color)}
                    className={cn(
                      'size-7 rounded-md border-2',
                      draftColor === preset.color
                        ? 'scale-110 border-foreground'
                        : 'border-transparent',
                    )}
                    style={{ background: preset.color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lifecycle group</Label>
              <Input
                value={draftLifecycleGroup}
                onChange={(e) => setDraftLifecycleGroup(e.target.value)}
                list="journey-lifecycle-groups"
                placeholder="Type or pick a group"
                className="h-9"
              />
              <datalist id="journey-lifecycle-groups">
                {lifecycleGroups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Stored on this stage and used by dashboard KPIs. Pick an
                existing group or enter a new one.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Active</p>
              <Switch checked={draftActive} onCheckedChange={setDraftActive} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Terminal</p>
              <Switch
                checked={draftTerminal}
                onCheckedChange={setDraftTerminal}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={saveStage}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset defaults</DialogTitle>
            <DialogDescription>
              Restore the default journey stages (Prospect through Churned).
              Custom stages that still have customers assigned are kept. Vectors
              are not changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={resetStages.isLoading}
              onClick={() =>
                resetStages.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Journey stages reset to defaults.');
                    setResetConfirmOpen(false);
                  },
                  onError: () => toast.error('Could not reset defaults.'),
                })
              }
            >
              {resetStages.isLoading ? 'Resetting…' : 'Reset defaults'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete stage</DialogTitle>
            <DialogDescription>
              Delete “{deleteTarget?.name}”? Customers in this stage will have
              no stage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              onClick={() => {
                if (!deleteTarget) return;
                deleteStage.mutate(deleteTarget.id, {
                  onSuccess: () => {
                    toast.success('Stage deleted.');
                    setDeleteTarget(null);
                    setSelectedId(null);
                  },
                  onError: (error: unknown) => {
                    const message =
                      (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? 'Could not delete stage.';
                    toast.error(
                      typeof message === 'string'
                        ? message
                        : 'Could not delete stage.',
                    );
                  },
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vectorFormOpen} onOpenChange={setVectorFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVector ? 'Edit vector' : 'Add vector'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                className="h-9"
                value={vectorName}
                onChange={(e) => setVectorName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                className="h-9"
                value={vectorDescription}
                onChange={(e) => setVectorDescription(e.target.value)}
                placeholder="Description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Teams <span className="text-muted-foreground">(optional)</span>
              </Label>
              <MultiEntitySelector
                items={teams}
                value={vectorTeamIds}
                onChange={setVectorTeamIds}
                placeholder="Select teams…"
                searchPlaceholder="Search teams…"
                emptyLabel="No teams found"
                activeOnly={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={() => {
                const name = vectorName.trim();
                if (!name) {
                  toast.error('Vector name is required.');
                  return;
                }
                const payload = {
                  name,
                  description: vectorDescription.trim() || undefined,
                  teamIds: vectorTeamIds,
                };
                if (editingVector) {
                  updateVector.mutate(
                    { id: editingVector.id, payload },
                    {
                      onSuccess: () => {
                        toast.success('Vector updated.');
                        setVectorFormOpen(false);
                      },
                      onError: () => toast.error('Could not update vector.'),
                    },
                  );
                  return;
                }
                createVector.mutate(payload, {
                  onSuccess: () => {
                    toast.success('Vector created.');
                    setVectorFormOpen(false);
                  },
                  onError: () => toast.error('Could not create vector.'),
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(vectorDelete)}
        onOpenChange={(open) => !open && setVectorDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete vector</DialogTitle>
            <DialogDescription>
              Delete “{vectorDelete?.name}”? Customers using this vector will
              have no vector.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              onClick={() => {
                if (!vectorDelete) return;
                deleteVector.mutate(vectorDelete.id, {
                  onSuccess: () => {
                    toast.success('Vector deleted.');
                    setVectorDelete(null);
                  },
                  onError: (error: unknown) => {
                    const message =
                      (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? 'Could not delete vector.';
                    toast.error(
                      typeof message === 'string'
                        ? message
                        : 'Could not delete vector.',
                    );
                  },
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
