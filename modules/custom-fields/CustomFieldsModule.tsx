'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { Plus, Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import { FIELD_TYPE_DEFINITIONS, createDefaultFieldConfig } from './constants';
import {
  ConfiguredFieldCard,
  SortableConfiguredFieldCard,
} from './components/ConfiguredFieldCard';
import { FieldConfigurationModal } from './components/FieldConfigurationModal';
import { EmptyState } from './components/EmptyState';
import type {
  CustomFieldConfig,
  StageRef,
  UserRef,
  TeamRef,
  DepartmentRef,
  CurrencyRef,
} from './types';
import { usePipelineCustomFields } from '@/store/server/features/entity-fields/queries';
import { fetchEntityFieldUsage } from '@/store/server/features/entity-fields/queries';
import {
  useCreateEntityField,
  useUpdateEntityField,
  useDeleteEntityField,
  useActivateEntityField,
  useReorderEntityFields,
} from '@/store/server/features/entity-fields/mutations';
import {
  apiResponseToConfig,
  configToCreateRequest,
  configToUpdateRequest,
} from '@/store/server/features/entity-fields/mappers';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { useGetEnabledCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import {
  appliesToScopeLabel,
  dealUiLabel,
  formatLeadDealUsageParts,
  isLeadsEnabled,
  leadDealRecordsPhrase,
} from '@/config/salesWorkflow';

interface CustomFieldsModuleProps {
  leadStages: StageRef[];
  dealStages: StageRef[];
  availableUsers?: UserRef[];
  availableTeams?: TeamRef[];
  availableDepartments?: DepartmentRef[];
}

export function CustomFieldsModule({
  leadStages,
  dealStages,
  availableUsers: propUsers,
  availableTeams: propTeams,
  availableDepartments: propDepartments,
}: CustomFieldsModuleProps) {
  const fieldsQuery = usePipelineCustomFields();
  const createField = useCreateEntityField();
  const updateField = useUpdateEntityField();
  const deleteField = useDeleteEntityField();
  const activateField = useActivateEntityField();
  const reorderFields = useReorderEntityFields();

  const platformUsersQuery = useGetPlatformUsers({ pageSize: 1000 });
  const teamsQuery = useGetCrmTeams({ enabled: true });
  const departmentsQuery = useGetDepartments();
  const currenciesQuery = useGetEnabledCurrencies();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldConfig | null>(
    null,
  );
  const [isNewField, setIsNewField] = useState(false);
  const [deletingField, setDeletingField] = useState<CustomFieldConfig | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUsage, setDeleteUsage] = useState<{
    leadCount: number;
    dealCount: number;
    partnerCount: number;
    valueCount: number;
  } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<CustomFieldConfig | null>(
    null,
  );
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updateUsage, setUpdateUsage] = useState<{
    leadCount: number;
    dealCount: number;
    partnerCount: number;
    valueCount: number;
  } | null>(null);
  const [updateUsageLoading, setUpdateUsageLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [editFieldUsage, setEditFieldUsage] = useState<{
    valueCount: number;
  } | null>(null);
  const [editOriginalField, setEditOriginalField] =
    useState<CustomFieldConfig | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null);
  const tenantId = useAuthenticationStore((s) => s.tenantId);

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

  const fields: CustomFieldConfig[] = useMemo(() => {
    const raw = fieldsQuery.data?.data ?? [];
    return raw.map((f) => apiResponseToConfig(f));
  }, [fieldsQuery.data]);

  const availableUsers: UserRef[] = useMemo(() => {
    if (propUsers && propUsers.length > 0) return propUsers;
    const raw = platformUsersQuery.data?.data ?? [];
    return raw.map((u: any) => ({
      id: u.id,
      name: formatUserName(u, ''),
      email: u.email ?? '',
      avatar: u.avatarUrl ?? null,
    }));
  }, [propUsers, platformUsersQuery.data]);

  const availableTeams: TeamRef[] = useMemo(() => {
    if (propTeams && propTeams.length > 0) return propTeams;
    const raw = teamsQuery.data?.data ?? [];
    return raw.map((t: any) => ({
      id: t.id,
      name: t.name,
      department: t.department?.name,
      memberCount: t.memberCount,
    }));
  }, [propTeams, teamsQuery.data]);

  const availableDepartments: DepartmentRef[] = useMemo(() => {
    if (propDepartments && propDepartments.length > 0) return propDepartments;
    const payload = departmentsQuery.data;
    const raw = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    return raw
      .map((d: any) => ({
        id: d?.id,
        name: d?.name,
      }))
      .filter((d: DepartmentRef) => Boolean(d.id && d.name));
  }, [propDepartments, departmentsQuery.data]);

  const availableCurrencies: CurrencyRef[] = useMemo(() => {
    const raw = currenciesQuery.data ?? [];
    return raw.map((c: any) => ({
      code: c.name,
      name: c.description ?? '',
    }));
  }, [currenciesQuery.data]);

  const filteredFields = useMemo(() => {
    let result = isLeadsEnabled()
      ? [...fields]
      : fields.filter((field) => field.appliesTo !== 'LEAD');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.label.toLowerCase().includes(q) || f.type.toLowerCase().includes(q),
      );
    }
    if (activeFilters.size > 0) {
      if (activeFilters.has('required'))
        result = result.filter((f) => f.required);
      if (activeFilters.has('optional'))
        result = result.filter((f) => !f.required);
      if (activeFilters.has('active')) result = result.filter((f) => f.active);
      if (activeFilters.has('inactive'))
        result = result.filter((f) => !f.active);
      for (const ft of FIELD_TYPE_DEFINITIONS) {
        if (activeFilters.has(ft.type)) {
          result = result.filter((f) => f.type === ft.type);
        }
      }
    }
    return result.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [fields, searchQuery, activeFilters]);

  const toggleFilter = useCallback((key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters(new Set());
    setSearchQuery('');
  }, []);

  const hasFilters = searchQuery.trim() !== '' || activeFilters.size > 0;
  const canReorder = !hasFilters && filteredFields.length > 1;

  const allFieldsSorted = useMemo(
    () => [...fields].sort((a, b) => a.displayOrder - b.displayOrder),
    [fields],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const openCreate = () => {
    setEditOriginalField(null);
    setEditFieldUsage(null);
    const newField = {
      ...createDefaultFieldConfig('text', {
        appliesTo: isLeadsEnabled() ? 'BOTH' : 'DEAL',
        leadStageId: defaultLeadStageId,
        dealStageId: defaultDealStageId,
      }),
      id: '',
      createdAt: '',
      updatedAt: '',
    } as CustomFieldConfig;
    setEditingField(newField);
    setIsNewField(true);
    setConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setConfigModalOpen(false);
    setEditingField(null);
    setEditOriginalField(null);
    setEditFieldUsage(null);
    setIsNewField(false);
  };

  const submitFieldUpdate = async (
    config: CustomFieldConfig,
    confirmUpdate = false,
  ) => {
    await updateField.mutateAsync({
      id: config.id,
      data: configToUpdateRequest(config),
      confirmUpdate,
    });
    closeConfigModal();
    setUpdateConfirmOpen(false);
    setPendingUpdate(null);
    setUpdateUsage(null);
    setUpdateError(null);
  };

  const handleSaveField = async (config: CustomFieldConfig) => {
    if (isNewField) {
      createField.mutate(configToCreateRequest(config), {
        onSuccess: closeConfigModal,
      });
      return;
    }

    const original = fields.find((f) => f.id === config.id) ?? editingField;
    const stageChanged =
      Boolean(original) &&
      (original!.leadStageId !== config.leadStageId ||
        original!.dealStageId !== config.dealStageId ||
        original!.appliesTo !== config.appliesTo);

    if (!stageChanged) {
      try {
        await submitFieldUpdate(config, false);
      } catch (err) {
        const conflict = fieldConflictPayload(err);
        if (conflict?.code === 'FIELD_STRUCTURE_LOCKED') {
          return;
        }
        if (conflict?.code === 'FIELD_STAGE_CHANGE_REQUIRES_CONFIRM') {
          setPendingUpdate(config);
          setUpdateUsage({
            leadCount: conflict.leadCount,
            dealCount: conflict.dealCount,
            partnerCount: conflict.partnerCount,
            valueCount: conflict.valueCount,
          });
          setUpdateConfirmOpen(true);
        }
      }
      return;
    }

    if (!tenantId) {
      setUpdateError('Tenant ID not found');
      setPendingUpdate(config);
      setUpdateConfirmOpen(true);
      return;
    }

    setUpdateUsageLoading(true);
    setUpdateError(null);
    try {
      const usage = await fetchEntityFieldUsage(tenantId, config.id);
      if (usage.valueCount > 0) {
        setPendingUpdate(config);
        setUpdateUsage(usage);
        setUpdateConfirmOpen(true);
        return;
      }
      await submitFieldUpdate(config, false);
    } catch (err) {
      const conflict = fieldConflictPayload(err);
      if (conflict?.code === 'FIELD_STAGE_CHANGE_REQUIRES_CONFIRM') {
        setPendingUpdate(config);
        setUpdateUsage({
          leadCount: conflict.leadCount,
          dealCount: conflict.dealCount,
          partnerCount: conflict.partnerCount,
          valueCount: conflict.valueCount,
        });
        setUpdateConfirmOpen(true);
        return;
      }
      setPendingUpdate(config);
      setUpdateError('Unable to check field usage.');
      setUpdateConfirmOpen(true);
    } finally {
      setUpdateUsageLoading(false);
    }
  };

  const confirmUpdateField = async () => {
    if (!pendingUpdate) return;
    try {
      setUpdateError(null);
      await submitFieldUpdate(pendingUpdate, true);
    } catch (err) {
      const conflict = fieldConflictPayload(err);
      setUpdateError(conflict?.message ?? 'Failed to update field.');
    }
  };

  const isSavingField = createField.isLoading || updateField.isLoading;

  const handleEdit = async (field: CustomFieldConfig) => {
    setEditingField(field);
    setEditOriginalField({ ...field });
    setEditFieldUsage(null);
    setIsNewField(false);
    setConfigModalOpen(true);

    if (!tenantId) return;
    try {
      const usage = await fetchEntityFieldUsage(tenantId, field.id);
      setEditFieldUsage(usage);
    } catch {
      setEditFieldUsage(null);
    }
  };

  const resetDeleteDialog = () => {
    setDeletingField(null);
    setDeleteUsage(null);
    setUsageLoading(false);
    setDeleteError(null);
  };

  const handleDelete = async (field: CustomFieldConfig) => {
    resetDeleteDialog();
    setDeletingField(field);
    setDeleteOpen(true);
    if (!tenantId) {
      setDeleteError('Tenant ID not found');
      return;
    }
    setUsageLoading(true);
    try {
      const usage = await fetchEntityFieldUsage(tenantId, field.id);
      if (usage.valueCount > 0) {
        setDeleteUsage(usage);
      } else {
        setDeleteUsage(null);
      }
    } catch {
      setDeleteError('Unable to check field usage.');
    } finally {
      setUsageLoading(false);
    }
  };

  const confirmDeleteField = async () => {
    if (!deletingField) return;
    try {
      setDeleteError(null);
      const needsUnlink =
        Boolean(deleteUsage) && (deleteUsage?.valueCount ?? 0) > 0;
      await deleteField.mutateAsync({
        id: deletingField.id,
        confirmUnlink: needsUnlink,
      });
      setDeleteOpen(false);
      resetDeleteDialog();
    } catch (err) {
      const conflict = fieldConflictPayload(err);
      if (conflict?.code === 'FIELD_IN_USE') {
        setDeleteUsage({
          leadCount: conflict.leadCount,
          dealCount: conflict.dealCount,
          partnerCount: conflict.partnerCount,
          valueCount: conflict.valueCount,
        });
        setDeleteError(null);
        return;
      }
      setDeleteError(conflict?.message ?? 'Failed to delete field.');
    }
  };

  const handleToggleActive = (field: CustomFieldConfig) => {
    activateField.mutate({ id: field.id, active: !field.active });
  };

  const getFieldCardProps = useCallback(
    (field: CustomFieldConfig) => {
      const stageBits: string[] = [];
      if (isLeadsEnabled() && field.leadStageId) {
        stageBits.push(
          `Lead: ${leadStageNameById.get(field.leadStageId) ?? '—'}`,
        );
      }
      if (field.dealStageId) {
        stageBits.push(
          `${dealUiLabel()}: ${dealStageNameById.get(field.dealStageId) ?? '—'}`,
        );
      }

      return {
        field,
        stageName: stageBits.join(' · ') || '—',
        appliesToLabel: appliesToScopeLabel(field.appliesTo),
        stageColor:
          leadStages.find((s) => s.id === field.leadStageId)?.color ??
          dealStages.find((s) => s.id === field.dealStageId)?.color,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggleActive: handleToggleActive,
      };
    },
    [
      dealStageNameById,
      dealStages,
      handleDelete,
      handleEdit,
      handleToggleActive,
      leadStageNameById,
      leadStages,
    ],
  );

  const activeDragField = useMemo(
    () => filteredFields.find((field) => field.id === activeDragId) ?? null,
    [activeDragId, filteredFields],
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

      if (!over || active.id === over.id || !canReorder) return;

      const visibleFields = filteredFields;
      const oldIndex = visibleFields.findIndex((f) => f.id === active.id);
      const newIndex = visibleFields.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reorderedVisible = arrayMove(visibleFields, oldIndex, newIndex);
      const visibleIdSet = new Set(visibleFields.map((f) => f.id));
      let visibleIdx = 0;
      const newFullOrder = allFieldsSorted.map((field) => {
        if (visibleIdSet.has(field.id)) {
          return reorderedVisible[visibleIdx++];
        }
        return field;
      });

      reorderFields.mutate(newFullOrder.map((field) => field.id));
    },
    [allFieldsSorted, canReorder, filteredFields, reorderFields],
  );

  const isLoading = fieldsQuery.isLoading;

  const statusFilters = [
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'required', label: 'Required' },
    { key: 'optional', label: 'Optional' },
  ];

  const typeFilters = FIELD_TYPE_DEFINITIONS.map((ft) => ({
    key: ft.type,
    label: ft.label,
    color: ft.color,
  }));

  return (
    <div className="flex flex-col gap-0 h-full">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {fields.length} field{fields.length !== 1 ? 's' : ''} configured
            {filteredFields.length !== fields.length && (
              <span className="ml-1 text-muted-foreground/60">
                · {filteredFields.length} shown
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields…"
              className="h-8 border-border bg-surface-card pl-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs',
              (showFilters || activeFilters.size > 0) &&
                'border-brand/40 bg-brand-muted text-brand',
            )}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={13} />
            Filter
            {activeFilters.size > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
                {activeFilters.size}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover text-xs font-semibold"
            onClick={openCreate}
          >
            <Plus size={14} />
            Create Custom Field
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-3 rounded-xl border border-border bg-surface-card px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X size={11} />
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleFilter(opt.key)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  activeFilters.has(opt.key)
                    ? 'border-brand bg-brand-muted text-brand'
                    : 'border-border text-muted-foreground hover:border-brand/30 hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Field Type
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {typeFilters.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleFilter(opt.key)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  activeFilters.has(opt.key)
                    ? 'border-brand bg-brand-muted text-brand'
                    : 'border-border text-muted-foreground hover:border-brand/30 hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <FieldListSkeleton />
        ) : filteredFields.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onCreateField={openCreate}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
            {hasFilters && (
              <div className="border-b border-border bg-surface-page/40 px-4 py-2 text-[11px] text-muted-foreground">
                Clear search and filters to reorder fields.
              </div>
            )}
            <div
              className={cn(
                'grid items-center gap-4 border-b border-border bg-surface-page/60 px-4 py-2.5',
                canReorder
                  ? 'grid-cols-[auto_2fr_0.9fr_1fr_1fr_1fr_auto]'
                  : 'grid-cols-[2fr_0.9fr_1fr_1fr_1fr_auto]',
              )}
            >
              {canReorder && <span className="w-7" aria-hidden />}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Field
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Applies to
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stages
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <span className="w-[72px]" />
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
                items={filteredFields.map((field) => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y divide-border">
                  {filteredFields.map((field) => {
                    const cardProps = getFieldCardProps(field);

                    return canReorder ? (
                      <SortableConfiguredFieldCard
                        key={field.id}
                        {...cardProps}
                      />
                    ) : (
                      <ConfiguredFieldCard key={field.id} {...cardProps} />
                    );
                  })}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                {activeDragField ? (
                  <div
                    style={
                      dragOverlayWidth ? { width: dragOverlayWidth } : undefined
                    }
                  >
                    <ConfiguredFieldCard
                      {...getFieldCardProps(activeDragField)}
                      showDragHandle
                      isDragOverlay
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      <FieldConfigurationModal
        open={configModalOpen}
        onOpenChange={(open) => {
          if (!open && isSavingField) return;
          setConfigModalOpen(open);
          if (!open) {
            closeConfigModal();
          }
        }}
        field={editingField}
        leadStages={leadStages}
        dealStages={dealStages}
        availableUsers={availableUsers}
        availableTeams={availableTeams}
        availableDepartments={availableDepartments}
        availableCurrencies={availableCurrencies}
        onSave={handleSaveField}
        isNew={isNewField}
        isSaving={isSavingField}
        hasStoredValues={(editFieldUsage?.valueCount ?? 0) > 0}
        originalField={editOriginalField}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) resetDeleteDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete custom field</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {usageLoading ? (
                  <p>Checking where this field has stored values…</p>
                ) : deleteUsage ? (
                  <>
                    <p>
                      This custom field contains values across{' '}
                      {[
                        ...formatLeadDealUsageParts(
                          deleteUsage.leadCount,
                          deleteUsage.dealCount,
                        ),
                        deleteUsage.partnerCount > 0
                          ? `${deleteUsage.partnerCount} partner(s)`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' / ') || `${deleteUsage.valueCount} record(s)`}
                      .
                    </p>
                    <p>
                      Deleting it will permanently clear all stored values for
                      this field. The {leadDealRecordsPhrase()} themselves will
                      remain intact.
                    </p>
                  </>
                ) : (
                  <p>
                    {deletingField
                      ? `Delete “${deletingField.label}”? This field has no stored values on ${leadDealRecordsPhrase()}.`
                      : 'Delete this custom field?'}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-[12px] text-destructive">{deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteField.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteField()}
              disabled={deleteField.isLoading || usageLoading}
            >
              {deleteUsage ? 'Delete & clear values' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={updateConfirmOpen}
        onOpenChange={(open) => {
          setUpdateConfirmOpen(open);
          if (!open) {
            setPendingUpdate(null);
            setUpdateUsage(null);
            setUpdateError(null);
            setUpdateUsageLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm field stage change</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {updateUsageLoading ? (
                  <p>Checking where this field has stored values…</p>
                ) : updateUsage ? (
                  <>
                    <p>
                      This custom field already has values on{' '}
                      {[
                        ...formatLeadDealUsageParts(
                          updateUsage.leadCount,
                          updateUsage.dealCount,
                        ),
                        updateUsage.partnerCount > 0
                          ? `${updateUsage.partnerCount} partner(s)`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' / ') || `${updateUsage.valueCount} record(s)`}
                      .
                    </p>
                    <p>
                      Changing the{' '}
                      {isLeadsEnabled()
                        ? 'lead/deal stage'
                        : `${dealUiLabel({ lowercase: true })} stage`}{' '}
                      (or applies-to) will change when this field appears on
                      those records. Existing values are kept, but stage
                      prompting and validation will follow the new
                      configuration.
                    </p>
                  </>
                ) : (
                  <p>
                    {pendingUpdate
                      ? `Save changes to “${pendingUpdate.label}”?`
                      : 'Save these field changes?'}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {updateError ? (
            <p className="text-[12px] text-destructive">{updateError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUpdateConfirmOpen(false)}
              disabled={updateField.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={() => void confirmUpdateField()}
              disabled={
                updateField.isLoading ||
                updateUsageLoading ||
                !pendingUpdate ||
                !updateUsage
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type FieldConflictPayload = {
  code?: string;
  message?: string;
  leadCount?: number;
  dealCount?: number;
  partnerCount?: number;
  valueCount?: number;
};

function fieldConflictPayload(err: unknown): FieldConflictPayload | null {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.message && typeof record.message === 'object') {
    return record.message as FieldConflictPayload;
  }
  return record as FieldConflictPayload;
}

function FieldListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <div className="grid grid-cols-[2fr_0.9fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border bg-surface-page/60 px-4 py-2.5">
        {['Field', 'Type', 'Applies to', 'Stages', 'Status', ''].map(
          (col, i) => (
            <span
              key={i}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {col}
            </span>
          ),
        )}
      </div>
      <div className="divide-y divide-border">
        {[...Array(4)].map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_0.9fr_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3.5 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-2.5 w-20 rounded bg-muted" />
              </div>
            </div>
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-5 w-14 rounded-full bg-muted" />
            <div className="flex gap-1">
              <div className="h-7 w-7 rounded bg-muted" />
              <div className="h-7 w-7 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
