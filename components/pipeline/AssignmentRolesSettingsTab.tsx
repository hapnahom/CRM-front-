'use client';

import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical, Plus, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  isSolutionRole,
  usePipelineRoles,
  fetchPipelineRoleUsage,
  type PipelineRoleAppliesTo,
  type PipelineRoleDto,
} from '@/store/server/features/pipeline-roles/queries';
import {
  useCreatePipelineRole,
  useDeletePipelineRole,
  useReorderPipelineRoles,
  useUpdatePipelineRole,
} from '@/store/server/features/pipeline-roles/mutations';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import {
  appliesToScopeLabel,
  appliesToScopeOptions,
  dealUiLabel,
  formatLeadDealUsageParts,
  isLeadsEnabled,
  leadDealRecordsPhrase,
} from '@/config/salesWorkflow';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import { SettingsRowActionsMenu } from '@/components/pipeline/SettingsRowActionsMenu';
import { STAGE_COLOR_PRESETS } from '@/lib/stage-presets';

export type AssignmentRoleStageRef = {
  id: string;
  name: string;
  color?: string | null;
};

type AssignmentRoleRowOptions = {
  showDragHandle?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  isDragging?: boolean;
  isDragOverlay?: boolean;
};

function stageDotColor(
  stage: { color?: string | null },
  index: number,
): string {
  return (
    stage.color ??
    STAGE_COLOR_PRESETS[index % STAGE_COLOR_PRESETS.length]!.color
  );
}

function StageSelectOption({
  stage,
  index,
}: {
  stage: { name: string; color?: string | null };
  index: number;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: stageDotColor(stage, index) }}
      />
      {stage.name}
    </span>
  );
}

type RoleFormState = {
  name: string;
  description: string;
  forSolutions: boolean;
  appliesTo: PipelineRoleAppliesTo;
  leadStageId: string;
  dealStageId: string;
  required: boolean;
  isPrimary: boolean;
  countsTowardTargetAchievement: boolean;
  multiSelect: boolean;
  exclusiveWithRoleIds: string[];
  active: boolean;
};

function emptyForm(leadStageId = '', dealStageId = ''): RoleFormState {
  return {
    name: '',
    description: '',
    forSolutions: false,
    appliesTo: isLeadsEnabled() ? 'BOTH' : 'DEAL',
    leadStageId,
    dealStageId,
    required: false,
    isPrimary: false,
    countsTowardTargetAchievement: false,
    multiSelect: true,
    exclusiveWithRoleIds: [],
    active: true,
  };
}

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: any } })?.response?.data;
  const message = data?.message;
  if (typeof message === 'string') return message || fallback;
  if (Array.isArray(message)) return message.join(', ') || fallback;
  if (
    message &&
    typeof message === 'object' &&
    typeof message.message === 'string'
  ) {
    return message.message;
  }
  return fallback;
}

function conflictPayload(err: unknown): {
  code?: string;
  leadCount: number;
  dealCount: number;
  solutionCount: number;
  assignmentCount: number;
  message: string;
} | null {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status !== 409) return null;
  const data = (err as { response?: { data?: any } })?.response?.data ?? {};
  const nested =
    typeof data.message === 'object' && data.message ? data.message : data;
  return {
    code: nested.code ?? data.code,
    leadCount: Number(nested.leadCount ?? data.leadCount ?? 0),
    dealCount: Number(nested.dealCount ?? data.dealCount ?? 0),
    solutionCount: Number(nested.solutionCount ?? data.solutionCount ?? 0),
    assignmentCount: Number(
      nested.assignmentCount ?? data.assignmentCount ?? 0,
    ),
    message: errorMessage(err, 'This role cannot be deleted.'),
  };
}

export function AssignmentRolesSettingsTab() {
  const showAppliesTo = isLeadsEnabled();
  const rolesQuery = usePipelineRoles();
  const leadStagesQuery = useLeadStages();
  const dealStagesQuery = useDealStages();
  const createRole = useCreatePipelineRole();
  const updateRole = useUpdatePipelineRole();
  const deleteRole = useDeletePipelineRole();
  const reorderRoles = useReorderPipelineRoles();

  const leadStages = useMemo(
    () => [...(leadStagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [leadStagesQuery.data],
  );
  const dealStages = useMemo(
    () => [...(dealStagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [dealStagesQuery.data],
  );

  const roles = useMemo(
    () =>
      [...(rolesQuery.data ?? [])].sort(
        (a, b) =>
          a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
      ),
    [rolesQuery.data],
  );

  const leadStageNameById = useMemo(
    () => new Map(leadStages.map((s) => [s.id, s.name])),
    [leadStages],
  );
  const dealStageNameById = useMemo(
    () => new Map(dealStages.map((s) => [s.id, s.name])),
    [dealStages],
  );

  const defaultLeadStageId = leadStages[0]?.id ?? '';
  const defaultDealStageId = dealStages[0]?.id ?? '';

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<RoleFormState>(
    emptyForm(defaultLeadStageId, defaultDealStageId),
  );
  const [editingRole, setEditingRole] = useState<PipelineRoleDto | null>(null);
  const [deletingRole, setDeletingRole] = useState<PipelineRoleDto | null>(
    null,
  );
  const [deleteUsage, setDeleteUsage] = useState<{
    leadCount: number;
    dealCount: number;
    solutionCount: number;
    assignmentCount: number;
  } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isSaving =
    createRole.isLoading ||
    updateRole.isLoading ||
    deleteRole.isLoading ||
    reorderRoles.isLoading;

  const solutionRoles = useMemo(
    () => roles.filter((role) => isSolutionRole(role)),
    [roles],
  );

  const needsLeadStage =
    showAppliesTo &&
    !form.forSolutions &&
    (form.appliesTo === 'LEAD' || form.appliesTo === 'BOTH');
  const needsDealStage =
    !form.forSolutions &&
    (showAppliesTo
      ? form.appliesTo === 'DEAL' || form.appliesTo === 'BOTH'
      : true);

  const resetDialogs = () => {
    setForm(emptyForm(defaultLeadStageId, defaultDealStageId));
    setEditingRole(null);
    setDeletingRole(null);
    setDeleteUsage(null);
    setUsageLoading(false);
    setError(null);
  };

  const openCreate = () => {
    resetDialogs();
    setForm(emptyForm(defaultLeadStageId, defaultDealStageId));
    setAddOpen(true);
  };

  const openEdit = (role: PipelineRoleDto) => {
    setError(null);
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      forSolutions: isSolutionRole(role),
      appliesTo: role.appliesTo ?? 'BOTH',
      leadStageId: role.leadStageId ?? defaultLeadStageId,
      dealStageId: role.dealStageId ?? defaultDealStageId,
      required: role.required,
      isPrimary: role.isPrimary,
      countsTowardTargetAchievement:
        role.countsTowardTargetAchievement ?? false,
      multiSelect: role.multiSelect !== false,
      exclusiveWithRoleIds: role.exclusiveWithRoleIds ?? [],
      active: role.active,
    });
    setEditOpen(true);
  };

  const openDelete = async (role: PipelineRoleDto) => {
    setError(null);
    setDeleteUsage(null);
    setDeletingRole(role);
    setDeleteOpen(true);
    if (role.isPrimary) return;
    setUsageLoading(true);
    try {
      const usage = await fetchPipelineRoleUsage(role.id);
      if (usage.assignmentCount > 0 || usage.solutionCount > 0) {
        setDeleteUsage(usage);
      } else {
        setDeleteUsage(null);
      }
    } catch (err) {
      setError(errorMessage(err, 'Unable to check role usage.'));
    } finally {
      setUsageLoading(false);
    }
  };

  const buildPayload = () => {
    const name = form.name.trim();
    if (!name) {
      setError('Role name is required.');
      return null;
    }
    if (needsLeadStage && !form.leadStageId) {
      setError('Lead stage is required.'); // only when leads enabled
      return null;
    }
    if (needsDealStage && !form.dealStageId) {
      setError(`${dealUiLabel()} stage is required.`);
      return null;
    }
    if (form.forSolutions) {
      return {
        name,
        usageContext: 'SOLUTION' as const,
        description: form.description.trim() || null,
        required: form.required,
        multiSelect: form.multiSelect,
        exclusiveWithRoleIds: form.exclusiveWithRoleIds,
        active: form.active,
      };
    }

    return {
      name,
      usageContext: 'ENTITY' as const,
      appliesTo: showAppliesTo ? form.appliesTo : 'DEAL',
      leadStageId: needsLeadStage ? form.leadStageId : null,
      dealStageId: needsDealStage ? form.dealStageId : null,
      description: form.description.trim() || null,
      required: form.isPrimary ? true : form.required,
      isPrimary: form.isPrimary,
      countsTowardTargetAchievement: form.isPrimary
        ? true
        : form.countsTowardTargetAchievement,
      active: form.active,
    };
  };

  const toggleExclusive = (roleId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      exclusiveWithRoleIds: checked
        ? [...new Set([...prev.exclusiveWithRoleIds, roleId])]
        : prev.exclusiveWithRoleIds.filter((id) => id !== roleId),
    }));
  };

  const exclusiveOptions = (currentRoleId?: string) =>
    solutionRoles.filter((role) => role.id !== currentRoleId);

  const selectedLeadStage = leadStages.find((s) => s.id === form.leadStageId);
  const selectedLeadStageIndex = leadStages.findIndex(
    (s) => s.id === form.leadStageId,
  );
  const selectedDealStage = dealStages.find((s) => s.id === form.dealStageId);
  const selectedDealStageIndex = dealStages.findIndex(
    (s) => s.id === form.dealStageId,
  );

  const handleCreate = async () => {
    const payload = buildPayload();
    if (!payload) return;
    try {
      setError(null);
      await createRole.mutateAsync(payload);
      setAddOpen(false);
      resetDialogs();
    } catch (err) {
      setError(errorMessage(err, 'Failed to create role.'));
    }
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    const payload = buildPayload();
    if (!payload) return;
    try {
      setError(null);
      await updateRole.mutateAsync({ id: editingRole.id, data: payload });
      setEditOpen(false);
      resetDialogs();
    } catch (err) {
      setError(errorMessage(err, 'Failed to update role.'));
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    if (deletingRole.isPrimary) {
      setError(
        'Cannot delete the primary role. Mark another role as primary (Account Executive) first.',
      );
      return;
    }
    try {
      setError(null);
      const needsUnlink =
        Boolean(deleteUsage) &&
        ((deleteUsage?.assignmentCount ?? 0) > 0 ||
          (deleteUsage?.solutionCount ?? 0) > 0);
      await deleteRole.mutateAsync({
        id: deletingRole.id,
        confirmUnlink: needsUnlink,
      });
      setDeleteOpen(false);
      resetDialogs();
    } catch (err) {
      const conflict = conflictPayload(err);
      if (conflict?.code === 'PRIMARY_ROLE') {
        setError(conflict.message);
        return;
      }
      if (conflict?.code === 'ROLE_IN_USE') {
        setDeleteUsage({
          leadCount: conflict.leadCount,
          dealCount: conflict.dealCount,
          solutionCount: conflict.solutionCount,
          assignmentCount: conflict.assignmentCount,
        });
        setError(null);
        return;
      }
      setError(errorMessage(err, 'Failed to delete role.'));
    }
  };

  const roleFormFields = (currentRoleId?: string) => (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-foreground">
            Use for solutions
          </p>
          <p className="text-[11px] text-muted-foreground">
            When enabled, this role appears in the add-solution modal instead of
            lead/deal create and stage forms.
          </p>
        </div>
        <Switch
          checked={form.forSolutions}
          disabled={Boolean(editingRole)}
          onCheckedChange={(checked) =>
            setForm((p) => ({
              ...p,
              forSolutions: checked,
              isPrimary: checked ? false : p.isPrimary,
            }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role-name">Name</Label>
        <Input
          id="role-name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Account Executive"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role-description">Description</Label>
        <Textarea
          id="role-description"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          placeholder="Optional helper text for your team"
          className="min-h-[80px] resize-none border-border"
        />
      </div>
      {!form.forSolutions && showAppliesTo ? (
        <div className="space-y-1.5">
          <Label>Applies to</Label>
          <Select
            value={form.appliesTo}
            onValueChange={(value) =>
              setForm((p) => ({
                ...p,
                appliesTo: value as PipelineRoleAppliesTo,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {appliesToScopeOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {needsLeadStage ? (
        <div className="space-y-1.5">
          <Label>Lead stage</Label>
          <Select
            value={form.leadStageId || undefined}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, leadStageId: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select lead stage">
                {selectedLeadStage ? (
                  <StageSelectOption
                    stage={selectedLeadStage}
                    index={Math.max(0, selectedLeadStageIndex)}
                  />
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className="w-[var(--radix-select-trigger-width)]"
              position="popper"
              sideOffset={4}
              align="start"
            >
              {leadStages.map((stage, index) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <StageSelectOption stage={stage} index={index} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {needsDealStage ? (
        <div className="space-y-1.5">
          <Label>{dealUiLabel()} stage</Label>
          <Select
            value={form.dealStageId || undefined}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, dealStageId: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={`Select ${dealUiLabel({ lowercase: true })} stage`}
              >
                {selectedDealStage ? (
                  <StageSelectOption
                    stage={selectedDealStage}
                    index={Math.max(0, selectedDealStageIndex)}
                  />
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className="w-[var(--radix-select-trigger-width)]"
              position="popper"
              sideOffset={4}
              align="start"
            >
              {dealStages.map((stage, index) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <StageSelectOption stage={stage} index={index} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {!form.forSolutions ? (
        <p className="text-[11px] text-muted-foreground">
          Required from this stage onwards (and at all later open/won stages).
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Shown in the add-solution modal and solution reports.
        </p>
      )}
      {!form.forSolutions ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-foreground">
              Primary (Account Executive)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Maps to the lead/deal owner. Only one primary role is allowed.
            </p>
          </div>
          <Switch
            checked={form.isPrimary}
            onCheckedChange={(checked) =>
              setForm((p) => ({
                ...p,
                isPrimary: checked,
                required: checked ? true : p.required,
                countsTowardTargetAchievement: checked
                  ? true
                  : p.countsTowardTargetAchievement,
              }))
            }
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-foreground">Required</p>
          <p className="text-[11px] text-muted-foreground">
            {form.forSolutions
              ? 'Must be assigned when adding a solution.'
              : 'Must be assigned before create or stage move completes.'}
          </p>
        </div>
        <Switch
          checked={form.required || (!form.forSolutions && form.isPrimary)}
          disabled={!form.forSolutions && form.isPrimary}
          onCheckedChange={(checked) =>
            setForm((p) => ({ ...p, required: checked }))
          }
        />
      </div>
      {form.forSolutions ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-foreground">
              Allow multiple users
            </p>
            <p className="text-[11px] text-muted-foreground">
              When off, only one user can be assigned to this role per solution.
            </p>
          </div>
          <Switch
            checked={form.multiSelect}
            onCheckedChange={(checked) =>
              setForm((p) => ({ ...p, multiSelect: checked }))
            }
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-foreground">
              Count toward target achievement
            </p>
            <p className="text-[11px] text-muted-foreground">
              On won deals, credit the assignee with the full exact deal value
              (same as USER custom fields). Always on for the primary role.
            </p>
          </div>
          <Switch
            checked={form.isPrimary || form.countsTowardTargetAchievement}
            disabled={form.isPrimary}
            onCheckedChange={(checked) =>
              setForm((p) => ({
                ...p,
                countsTowardTargetAchievement: checked,
              }))
            }
          />
        </div>
      )}
      {form.forSolutions && exclusiveOptions(currentRoleId).length > 0 ? (
        <div className="space-y-2">
          <Label>Mutually exclusive with</Label>
          <div className="flex flex-wrap gap-2">
            {exclusiveOptions(currentRoleId).map((role) => {
              const checked = form.exclusiveWithRoleIds.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleExclusive(role.id, !checked)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    checked
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {role.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-foreground">Active</p>
          <p className="text-[11px] text-muted-foreground">
            Inactive roles are hidden from create and stage forms.
          </p>
        </div>
        <Switch
          checked={form.active}
          onCheckedChange={(checked) =>
            setForm((p) => ({ ...p, active: checked }))
          }
        />
      </div>
      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
    </>
  );

  const canConfigureEntityRoles =
    leadStages.length > 0 || dealStages.length > 0;

  const activeDragRole = useMemo(
    () => roles.find((role) => role.id === activeDragId) ?? null,
    [activeDragId, roles],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    const width = event.active.rect.current.initial?.width;
    setDragOverlayWidth(width ?? null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setDragOverlayWidth(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      setDragOverlayWidth(null);

      if (!over || active.id === over.id) return;

      const oldIndex = roles.findIndex((role) => role.id === active.id);
      const newIndex = roles.findIndex((role) => role.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(roles, oldIndex, newIndex);
      reorderRoles.mutate(reordered.map((role) => role.id));
    },
    [reorderRoles, roles],
  );

  const renderRoleRow = (
    role: PipelineRoleDto,
    options?: AssignmentRoleRowOptions,
  ) => {
    const isSolution = isSolutionRole(role);
    const stageBits: string[] = [];
    if (showAppliesTo && role.leadStageId) {
      stageBits.push(`Lead: ${leadStageNameById.get(role.leadStageId) ?? '—'}`);
    }
    if (role.dealStageId) {
      stageBits.push(
        `${dealUiLabel()}: ${dealStageNameById.get(role.dealStageId) ?? '—'}`,
      );
    }

    return (
      <div
        ref={options?.sortableRef}
        style={options?.sortableStyle}
        className={cn(
          'grid items-center gap-3 border-b border-border px-4 py-3 last:border-b-0',
          showAppliesTo
            ? options?.showDragHandle
              ? 'grid-cols-[auto_2fr_0.9fr_1fr_1.2fr_1fr_auto]'
              : 'grid-cols-[2fr_0.9fr_1fr_1.2fr_1fr_auto]'
            : options?.showDragHandle
              ? 'grid-cols-[auto_2fr_0.9fr_1.2fr_1fr_auto]'
              : 'grid-cols-[2fr_0.9fr_1.2fr_1fr_auto]',
          !role.active &&
            !options?.isDragging &&
            !options?.isDragOverlay &&
            'opacity-60',
          options?.isDragging &&
            'border border-dashed border-brand/30 bg-brand-muted/20 [&>*]:invisible',
          options?.isDragOverlay &&
            'cursor-grabbing bg-surface-card shadow-lg ring-1 ring-brand/30',
        )}
      >
        {options?.showDragHandle ? (
          options.isDragOverlay ? (
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground"
              aria-hidden
            >
              <GripVertical size={14} />
            </span>
          ) : (
            <button
              type="button"
              className="inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label={`Drag to reorder ${role.name}`}
              {...options.dragHandleProps?.attributes}
              {...options.dragHandleProps?.listeners}
            >
              <GripVertical size={14} />
            </button>
          )
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {role.name}
            </p>
            {role.isPrimary ? (
              <Star
                size={12}
                className="shrink-0 fill-amber-400 text-amber-500"
              />
            ) : null}
            {role.required ? (
              <span className="text-[10px] font-semibold text-destructive">
                *
              </span>
            ) : null}
          </div>
          {role.description ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {role.description}
            </p>
          ) : null}
        </div>
        <span className="text-[12px] text-muted-foreground">
          {isSolution
            ? 'Solutions'
            : showAppliesTo
              ? 'Leads & deals'
              : dealUiLabel({ plural: true })}
        </span>
        {showAppliesTo ? (
          <span className="text-[12px] text-muted-foreground">
            {isSolution ? '—' : appliesToScopeLabel(role.appliesTo ?? 'BOTH')}
          </span>
        ) : null}
        <span className="truncate text-[12px] text-muted-foreground">
          {isSolution
            ? role.multiSelect === false
              ? 'Single user'
              : 'Multiple users'
            : stageBits.join(' · ') || '—'}
        </span>
        <div className="flex flex-wrap gap-1">
          {isSolution ? (
            <Badge variant="secondary" className="text-[10px] px-2 py-0">
              Solution
            </Badge>
          ) : null}
          {role.isPrimary ? (
            <Badge variant="success" className="text-[10px] px-2 py-0">
              Primary
            </Badge>
          ) : null}
          {role.required ? (
            <Badge variant="danger" className="text-[10px] px-2 py-0">
              Required
            </Badge>
          ) : null}
          {role.isPrimary || role.countsTowardTargetAchievement ? (
            <Badge variant="brand" className="text-[10px] px-2 py-0">
              Target credit
            </Badge>
          ) : null}
          <Badge variant="muted" className="text-[10px] px-2 py-0">
            {role.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {!options?.isDragOverlay ? (
          <div className="relative z-10 flex w-10 shrink-0 items-center justify-end">
            <SettingsRowActionsMenu
              onEdit={() => openEdit(role)}
              onDelete={() => openDelete(role)}
              deleteDisabled={role.isPrimary}
              deleteDisabledReason="Primary role cannot be deleted"
            />
          </div>
        ) : (
          <span className="w-10" aria-hidden />
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Assignment Roles
          </h2>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand-hover"
          onClick={openCreate}
        >
          <Plus size={14} className="mr-1.5" />
          Add Role
        </Button>
      </div>

      {!canConfigureEntityRoles ? (
        <p className="mt-4 text-[13px] text-muted-foreground">
          Add at least one lead or deal pipeline stage to configure lead/deal
          assignment roles. Solution roles can still be added anytime.
        </p>
      ) : null}
      {rolesQuery.isLoading ? (
        <p className="mt-4 text-[13px] text-muted-foreground">Loading roles…</p>
      ) : roles.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Users className="mb-2 text-muted-foreground" size={22} />
          <p className="text-[13px] font-medium text-foreground">
            No assignment roles yet
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <div
            className={cn(
              'grid gap-3 border-b border-border bg-surface-elevated/50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
              showAppliesTo
                ? 'grid-cols-[auto_2fr_0.9fr_1fr_1.2fr_1fr_auto]'
                : 'grid-cols-[auto_2fr_0.9fr_1.2fr_1fr_auto]',
            )}
          >
            <span className="w-7" aria-hidden />
            <span>Role</span>
            <span>Used for</span>
            {showAppliesTo ? <span>Applies to</span> : null}
            <span>Details</span>
            <span>Flags</span>
            <span className="w-10 text-right"> </span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={roles.map((role) => role.id)}
              strategy={verticalListSortingStrategy}
            >
              {roles.map((role) => (
                <SortableAssignmentRoleRow
                  key={role.id}
                  role={role}
                  renderRoleRow={renderRoleRow}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
              {activeDragRole ? (
                <div
                  style={
                    dragOverlayWidth ? { width: dragOverlayWidth } : undefined
                  }
                >
                  {renderRoleRow(activeDragRole, {
                    showDragHandle: true,
                    isDragOverlay: true,
                  })}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add assignment role</DialogTitle>
            <DialogDescription>
              {showAppliesTo
                ? 'Shared across leads and deals based on Applies to.'
                : `Configure who is assigned on ${dealUiLabel({ plural: true, lowercase: true })} forms and stage moves.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">{roleFormFields()}</div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={handleCreate}
              disabled={
                isSaving || (!form.forSolutions && !canConfigureEntityRoles)
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit assignment role</DialogTitle>
            <DialogDescription>
              Changes apply immediately to new creates, stage moves, and
              solutions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {roleFormFields(editingRole?.id)}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={handleUpdate}
              disabled={isSaving}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) resetDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete assignment role</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {deletingRole?.isPrimary ? (
                  <p>
                    “{deletingRole.name}” is the primary role (Account
                    Executive). Mark another role as primary before deleting
                    this one.{' '}
                    {isLeadsEnabled()
                      ? 'Leads and deals use this role as their owner.'
                      : `${dealUiLabel({ plural: true })} use this role as their owner.`}
                  </p>
                ) : usageLoading ? (
                  <p>Checking where this role is used…</p>
                ) : deleteUsage ? (
                  <>
                    <p>
                      This assignment role is currently attached to{' '}
                      {[
                        ...formatLeadDealUsageParts(
                          deleteUsage.leadCount,
                          deleteUsage.dealCount,
                        ),
                        deleteUsage.solutionCount > 0
                          ? `${deleteUsage.solutionCount} solution assignment(s)`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' / ') || 'related records'}
                      .
                    </p>
                    <p>
                      Deleting it will permanently unlink these role
                      assignments. The {leadDealRecordsPhrase()} themselves will
                      remain intact and free to be reassigned.
                    </p>
                  </>
                ) : (
                  <p>
                    {deletingRole
                      ? `Delete “${deletingRole.name}”? This role is not currently assigned on any ${
                          isLeadsEnabled()
                            ? 'lead, deal, or solution'
                            : `${dealUiLabel({ lowercase: true })} or solution`
                        }.`
                      : 'Delete this role?'}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-[12px] text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                isSaving || usageLoading || Boolean(deletingRole?.isPrimary)
              }
            >
              {deleteUsage ? 'Delete & unlink' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableAssignmentRoleRow({
  role,
  renderRoleRow,
}: {
  role: PipelineRoleDto;
  renderRoleRow: (
    role: PipelineRoleDto,
    options?: AssignmentRoleRowOptions,
  ) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id });

  const translateY = transform?.y ?? 0;

  return renderRoleRow(role, {
    showDragHandle: true,
    dragHandleProps: { attributes, listeners },
    sortableRef: setNodeRef,
    sortableStyle: {
      transform: translateY ? `translate3d(0, ${translateY}px, 0)` : undefined,
      transition,
    },
    isDragging,
  });
}
