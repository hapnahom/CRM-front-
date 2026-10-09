'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Plus, GitBranch, Save, Trash2, Edit2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { SettingsListSectionSkeleton } from '@/components/loading/skeleton-screens';
import {
  useGetPlatformUsers,
  useGetRoleOptions,
} from '@/store/server/features/userManagement/queries';
import { formatUserName } from '@/lib/format-user-name';
import { usePipelineCustomFields } from '@/store/server/features/entity-fields/queries';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import {
  useApprovalWorkflows,
  useApprovalWorkflow,
  useCreateApprovalWorkflow,
  useUpdateApprovalWorkflow,
  useSetApprovalWorkflowActive,
  type ApprovalSubjectSource,
  type ApprovalSubjectRelation,
  type ApprovalStepMode,
  type ApprovalWorkflowEntityScope,
  type ApprovalWorkflowStepInput,
  type ApprovalWorkflowSummary,
  type ApprovalWorkflowTrigger,
  type ApprovalApproverType,
} from '@/store/server/features/pipeline/workflows';

type DraftStep = ApprovalWorkflowStepInput & { key: string };

const SUBJECT_SOURCE_LABELS: Record<ApprovalSubjectSource, string> = {
  record_owner: 'Record owner',
  record_creator: 'Record creator',
  user_field: 'User custom field',
  solution_assignees: 'Solution assignees',
  role: 'By role',
  specific_users: 'Specific users',
};

const TARGET_SUBJECT_SOURCE_LABELS: Partial<
  Record<ApprovalSubjectSource, string>
> = {
  record_owner: 'Submitting team',
  role: 'Role',
  specific_users: 'Named users',
};

const SUBJECT_RELATION_LABELS: Record<ApprovalSubjectRelation, string> = {
  self: 'Themselves',
  team_leader: 'Their team leader',
  department_manager: 'Their department manager',
  direct_manager: 'Their direct manager',
};

const TARGET_SUBJECT_RELATION_LABELS: Partial<
  Record<ApprovalSubjectRelation, string>
> = {
  self: 'Submitting user',
  team_leader: "Submitting team's lead",
  department_manager: "Submitting team's department lead",
  // No direct_manager — Targets follow team / department structure, not HR line manager.
};

const LEGACY_APPROVER_TO_SUBJECT: Record<
  ApprovalApproverType,
  {
    subjectSource: ApprovalSubjectSource;
    subjectRelation: ApprovalSubjectRelation;
  }
> = {
  specific_users: { subjectSource: 'specific_users', subjectRelation: 'self' },
  role: { subjectSource: 'role', subjectRelation: 'self' },
  record_owner: { subjectSource: 'record_owner', subjectRelation: 'self' },
  record_creator: { subjectSource: 'record_creator', subjectRelation: 'self' },
  creator_team_leader: {
    subjectSource: 'record_creator',
    subjectRelation: 'team_leader',
  },
  creator_department_manager: {
    subjectSource: 'record_creator',
    subjectRelation: 'department_manager',
  },
  creator_direct_manager: {
    subjectSource: 'record_creator',
    subjectRelation: 'direct_manager',
  },
  owner_team_leader: {
    subjectSource: 'record_owner',
    subjectRelation: 'team_leader',
  },
  owner_department_manager: {
    subjectSource: 'record_owner',
    subjectRelation: 'department_manager',
  },
  owner_direct_manager: {
    subjectSource: 'record_owner',
    subjectRelation: 'direct_manager',
  },
  user_field: { subjectSource: 'user_field', subjectRelation: 'self' },
  user_field_team_leader: {
    subjectSource: 'user_field',
    subjectRelation: 'team_leader',
  },
  user_field_department_manager: {
    subjectSource: 'user_field',
    subjectRelation: 'department_manager',
  },
  user_field_direct_manager: {
    subjectSource: 'user_field',
    subjectRelation: 'direct_manager',
  },
  solution_assignees: {
    subjectSource: 'solution_assignees',
    subjectRelation: 'self',
  },
  solution_assignee_team_leader: {
    subjectSource: 'solution_assignees',
    subjectRelation: 'team_leader',
  },
  solution_assignee_department_manager: {
    subjectSource: 'solution_assignees',
    subjectRelation: 'department_manager',
  },
  solution_assignee_direct_manager: {
    subjectSource: 'solution_assignees',
    subjectRelation: 'direct_manager',
  },
};

function supportsOrgRelation(source: ApprovalSubjectSource): boolean {
  return (
    source === 'record_owner' ||
    source === 'record_creator' ||
    source === 'user_field' ||
    source === 'solution_assignees'
  );
}

function isSingletonSubject(source: ApprovalSubjectSource): boolean {
  return source === 'record_owner' || source === 'record_creator';
}

function isMultiSubjectApprover(source: ApprovalSubjectSource): boolean {
  return (
    source === 'role' ||
    source === 'specific_users' ||
    source === 'user_field' ||
    source === 'solution_assignees'
  );
}

function emptyStep(
  index: number,
  options?: { forTargets?: boolean },
): DraftStep {
  const forTargets = options?.forTargets === true;
  if (forTargets) {
    const isFirst = index === 0;
    return {
      key: `step-${Date.now()}-${index}`,
      name: isFirst ? 'Department review' : 'Company review',
      mode: 'ANY',
      minimumCount: 1,
      subjectSource: isFirst ? 'record_owner' : 'specific_users',
      subjectRelation: isFirst ? 'department_manager' : 'self',
      subjectFieldId: undefined,
      targetUserIds: [],
      targetRoleId: undefined,
    };
  }
  return {
    key: `step-${Date.now()}-${index}`,
    name: index === 0 ? 'Initial Review' : `Approval Step ${index + 1}`,
    mode: 'ANY',
    minimumCount: 1,
    subjectSource: 'record_owner',
    subjectRelation: 'team_leader',
    subjectFieldId: undefined,
    targetUserIds: [],
    targetRoleId: undefined,
  };
}

function hydrateStepFromDef(
  s: {
    id?: string;
    name: string;
    mode: ApprovalStepMode;
    minimumCount?: number | null;
    approverType: ApprovalApproverType;
    subjectSource?: ApprovalSubjectSource;
    subjectRelation?: ApprovalSubjectRelation;
    subjectFieldId?: string | null;
    targetUserIds?: string[] | null;
    targetRoleId?: string | null;
  },
  idx: number,
): DraftStep {
  const fromLegacy = LEGACY_APPROVER_TO_SUBJECT[s.approverType] ?? {
    subjectSource: 'record_owner' as const,
    subjectRelation: 'team_leader' as const,
  };
  const subjectSource = s.subjectSource ?? fromLegacy.subjectSource;
  const subjectRelation = supportsOrgRelation(subjectSource)
    ? (s.subjectRelation ?? fromLegacy.subjectRelation)
    : 'self';
  const singleton = isSingletonSubject(subjectSource);
  return {
    key: s.id ?? `step-${idx}`,
    name: s.name,
    mode: singleton ? 'ANY' : s.mode,
    minimumCount: singleton ? 1 : (s.minimumCount ?? undefined),
    subjectSource,
    subjectRelation,
    subjectFieldId: s.subjectFieldId ?? undefined,
    targetUserIds: s.targetUserIds ?? [],
    targetRoleId: s.targetRoleId ?? undefined,
  };
}

export function ApprovalWorkflowsSection() {
  const queryClient = useQueryClient();
  const { data: workflows = [], isLoading } = useApprovalWorkflows();
  const visibleWorkflows = workflows.filter(
    (wf) => wf.entityScope !== 'TARGET',
  );
  const createMutation = useCreateApprovalWorkflow();
  const updateMutation = useUpdateApprovalWorkflow();
  const setActiveMutation = useSetApprovalWorkflowActive();
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 500,
  });
  const { data: roleOptions = [] } = useGetRoleOptions();
  const { data: pipelineUserFields } = usePipelineCustomFields({
    fieldType: 'USER',
    active: true,
    pageSize: 200,
  });

  const userOptions = useMemo(() => {
    const items = platformUsersData?.data ?? [];
    return items.map((u) => ({
      id: u.id,
      label: formatUserName(u) || u.email || u.id,
    }));
  }, [platformUsersData]);

  const showAppliesTo = isLeadsEnabled();

  const userFieldOptions = useMemo(() => {
    const appliesSuffix = (appliesTo?: string | null) => {
      if (!showAppliesTo) return '';
      if (appliesTo === 'LEAD') return ' (Lead)';
      if (appliesTo === 'DEAL') return ` (${dealUiLabel()})`;
      return ` (Leads & ${dealUiLabel({ plural: true, lowercase: true })})`;
    };

    return (pipelineUserFields?.data ?? [])
      .map((field) => ({
        id: field.id,
        label: `${field.label}${appliesSuffix(field.appliesTo)}`,
        entityType:
          field.appliesTo === 'DEAL'
            ? 'DEAL'
            : field.appliesTo === 'LEAD'
              ? 'LEAD'
              : 'BOTH',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [pipelineUserFields?.data, showAppliesTo]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfScope, setWfScope] = useState<ApprovalWorkflowEntityScope>('ANY');
  const [wfTriggers, setWfTriggers] = useState<ApprovalWorkflowTrigger[]>([
    'stage_approval',
    'rule_exception',
  ]);
  const [wfSteps, setWfSteps] = useState<DraftStep[]>([emptyStep(0)]);

  const detailQuery = useApprovalWorkflow(
    editingId,
    isEditorOpen && !!editingId,
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setWfName('');
    setWfDesc('');
    setWfScope('ANY');
    setWfTriggers(['stage_approval', 'rule_exception']);
    setWfSteps([emptyStep(0)]);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (wf: ApprovalWorkflowSummary) => {
    setEditingId(wf.id);
    setWfName(wf.name);
    setWfDesc(wf.description ?? '');
    setWfScope(wf.entityScope === 'TARGET' ? 'ANY' : wf.entityScope);
    const pipelineTriggers = (wf.allowedTriggerTypes ?? []).filter(
      (trigger) => trigger !== 'sales_target_approval',
    );
    setWfTriggers(
      pipelineTriggers.length
        ? pipelineTriggers
        : ['stage_approval', 'rule_exception'],
    );
    setWfSteps([emptyStep(0)]);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    if (!editingId || !detailQuery.data?.version?.steps?.length) return;
    setWfSteps(
      detailQuery.data.version.steps.map((s, idx) =>
        hydrateStepFromDef(s, idx),
      ),
    );
  }, [editingId, detailQuery.data?.version?.id]);

  const handleToggleActive = async (wf: ApprovalWorkflowSummary) => {
    try {
      await setActiveMutation.mutateAsync({
        id: wf.id,
        isActive: !wf.isActive,
      });
      NotificationMessage.success({
        message: wf.isActive ? 'Workflow deactivated' : 'Workflow activated',
        description: `${wf.name} is now ${wf.isActive ? 'inactive' : 'active'}.`,
      });
      if (wf.entityScope === 'TARGET') {
        await queryClient.invalidateQueries({
          queryKey: ['sales-targeting-settings'],
        });
      }
    } catch (e: any) {
      NotificationMessage.error({
        message: 'Failed to update workflow',
        description: e?.message || 'Unexpected error',
      });
    }
  };

  const handleAddStep = () => {
    setWfSteps((prev) => [
      ...prev,
      emptyStep(prev.length, { forTargets: wfScope === 'TARGET' }),
    ]);
  };

  const handleUpdateStep = (index: number, partial: Partial<DraftStep>) => {
    setWfSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  };

  const handleSubjectSourceChange = (
    index: number,
    subjectSource: ApprovalSubjectSource,
  ) => {
    const singleton = isSingletonSubject(subjectSource);
    const canRelate = supportsOrgRelation(subjectSource);
    handleUpdateStep(index, {
      subjectSource,
      subjectRelation: canRelate
        ? wfScope === 'TARGET'
          ? 'department_manager'
          : 'team_leader'
        : 'self',
      subjectFieldId: undefined,
      targetUserIds: [],
      targetRoleId: undefined,
      mode: 'ANY',
      minimumCount: singleton ? 1 : undefined,
    });
  };

  const handleDeleteStep = (index: number) => {
    if (wfSteps.length <= 1) {
      NotificationMessage.error({
        message: 'Cannot remove step',
        description: 'An approval workflow must contain at least one step.',
      });
      return;
    }
    setWfSteps((prev) =>
      prev.filter((unusedStep, stepIndex) => stepIndex !== index),
    );
  };

  const handleSave = async () => {
    if (!wfName.trim()) {
      NotificationMessage.error({
        message: 'Validation error',
        description: 'Workflow name is required.',
      });
      return;
    }
    if (!wfTriggers.length) {
      NotificationMessage.error({
        message: 'Validation error',
        description: 'Select at least one approval trigger.',
      });
      return;
    }
    for (const step of wfSteps) {
      if (!step.name.trim()) {
        NotificationMessage.error({
          message: 'Validation error',
          description: 'Each step needs a name.',
        });
        return;
      }
      if (
        step.subjectSource === 'specific_users' &&
        !step.targetUserIds?.length
      ) {
        NotificationMessage.error({
          message: 'Validation error',
          description: `Step "${step.name}" needs at least one user.`,
        });
        return;
      }
      if (step.subjectSource === 'role' && !step.targetRoleId) {
        NotificationMessage.error({
          message: 'Validation error',
          description: `Step "${step.name}" needs a role.`,
        });
        return;
      }
      if (step.subjectSource === 'user_field' && !step.subjectFieldId) {
        NotificationMessage.error({
          message: 'Validation error',
          description: `Step "${step.name}" needs a USER custom field.`,
        });
        return;
      }
    }

    const steps: ApprovalWorkflowStepInput[] = wfSteps.map((s) => {
      const singleton = isSingletonSubject(s.subjectSource);
      const mode: ApprovalStepMode = singleton ? 'ANY' : s.mode;
      const relation = supportsOrgRelation(s.subjectSource)
        ? s.subjectRelation
        : 'self';
      return {
        name: s.name.trim(),
        mode,
        minimumCount: singleton
          ? 1
          : mode === 'MINIMUM_COUNT'
            ? (s.minimumCount ?? 1)
            : undefined,
        subjectSource: s.subjectSource,
        subjectRelation: relation,
        subjectFieldId:
          s.subjectSource === 'user_field' ? s.subjectFieldId : undefined,
        targetUserIds:
          s.subjectSource === 'specific_users' ? s.targetUserIds : undefined,
        targetRoleId: s.subjectSource === 'role' ? s.targetRoleId : undefined,
      };
    });

    const allowedTriggerTypes = wfTriggers.filter(
      (trigger) => trigger !== 'sales_target_approval',
    );
    const isTargetWorkflow = wfScope === 'TARGET';

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            name: wfName.trim(),
            description: wfDesc.trim() || undefined,
            entityScope:
              wfScope === 'TARGET' ? wfScope : showAppliesTo ? wfScope : 'ANY',
            allowedTriggerTypes,
            steps,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: wfName.trim(),
          description: wfDesc.trim() || undefined,
          entityScope:
            wfScope === 'TARGET' ? wfScope : showAppliesTo ? wfScope : 'ANY',
          allowedTriggerTypes,
          steps,
        });
      }

      if (editingId) {
        NotificationMessage.success({
          message: 'Workflow updated',
          description: isTargetWorkflow
            ? 'New version published for team target requests. In-flight requests keep their submitted version.'
            : 'A new version was published. In-flight requests keep their bound version.',
        });
      } else {
        NotificationMessage.success({
          message: 'Approval workflow created',
          description: isTargetWorkflow
            ? `${wfName.trim()} is live for team target requests.`
            : `${wfName.trim()} is ready to assign on stages and fields.`,
        });
      }
      setIsEditorOpen(false);
    } catch (e: any) {
      NotificationMessage.error({
        message: 'Failed to save workflow',
        description: e?.message || 'Unexpected error',
      });
    }
  };

  const saving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-brand" />
            <h3 className="m-0 text-sm font-semibold text-foreground">
              Approval workflows
            </h3>
            <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {visibleWorkflows.length}
            </span>
          </div>
          <p className="m-0 mt-1 text-[12px] text-muted-foreground">
            Create ordered approval routes for pipeline stages and rule
            exceptions. Target proposals are approved by the team leader,
            department manager, or a company target approver.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="h-8 gap-1.5 bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          <Plus size={14} /> Create workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="overflow-hidden">
          <SettingsListSectionSkeleton rows={4} />
        </div>
      ) : visibleWorkflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <GitBranch className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-semibold text-foreground">
            No workflows yet
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Create a workflow, then assign it on a pipeline stage or field
            exception.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleWorkflows.map((wf) => (
            <div
              key={wf.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="m-0 text-sm font-semibold text-foreground">
                        {wf.name}
                      </h4>
                      <Badge className="border border-border bg-surface-elevated text-[10px] font-medium text-muted-foreground">
                        v{wf.currentVersionNumber}
                      </Badge>
                    </div>
                    {wf.description ? (
                      <p className="m-0 mt-1 text-[12px] text-muted-foreground">
                        {wf.description}
                      </p>
                    ) : null}
                  </div>
                  <Switch
                    checked={wf.isActive}
                    onCheckedChange={() => handleToggleActive(wf)}
                    disabled={setActiveMutation.isLoading}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {showAppliesTo || wf.entityScope === 'TARGET' ? (
                    <Badge className="border border-border bg-surface-elevated text-[11px] font-medium text-muted-foreground">
                      Scope: {wf.entityScope}
                    </Badge>
                  ) : null}
                  {(wf.allowedTriggerTypes ?? [])
                    .filter((t) => t !== 'sales_target_approval')
                    .map((t) => (
                      <Badge
                        key={t}
                        className="border border-border bg-surface-elevated text-[11px] font-medium text-muted-foreground"
                      >
                        {t === 'stage_approval'
                          ? 'Stage approval'
                          : t === 'rule_exception'
                            ? 'Rule exception'
                            : t}
                      </Badge>
                    ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
                <span className="text-[11px] text-muted-foreground">
                  {wf.updatedAt
                    ? `Updated ${new Date(wf.updatedAt).toLocaleDateString()}`
                    : null}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(wf)}
                  className="h-7 gap-1 text-[11px]"
                >
                  <Edit2 size={12} /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-[16px] font-semibold text-foreground">
              {editingId ? 'Edit workflow' : 'Create workflow'}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              {editingId
                ? 'Saving steps publishes a new version.'
                : wfScope === 'TARGET'
                  ? 'Pick who must approve each step for sales target proposals.'
                  : 'Pick a subject on the record, then who relative to them must approve.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(60vh,520px)] space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Name</Label>
                <Input
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  placeholder="e.g. Stage gate approval"
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Description</Label>
                <Textarea
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  placeholder="Optional"
                  className="min-h-[64px] text-[13px]"
                />
              </div>
              <div
                className={
                  showAppliesTo || wfScope === 'TARGET'
                    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
                    : 'space-y-1.5'
                }
              >
                {showAppliesTo || wfScope === 'TARGET' ? (
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium">
                      Applies to
                    </Label>
                    <Select
                      value={wfScope}
                      onValueChange={(v: ApprovalWorkflowEntityScope) => {
                        if (v === 'TARGET') return;
                        setWfScope(v);
                      }}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {showAppliesTo || wfScope !== 'TARGET' ? (
                          <>
                            <SelectItem value="ANY">
                              {isLeadsEnabled()
                                ? 'Leads & deals'
                                : dealUiLabel({ plural: true })}
                            </SelectItem>
                            {showAppliesTo ? (
                              <>
                                <SelectItem value="LEAD">Leads only</SelectItem>
                                <SelectItem value="DEAL">Deals only</SelectItem>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[12px] font-medium">
                    Triggers
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                          aria-label="About triggers"
                        >
                          <Info size={13} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        Select where this workflow can be assigned: stage
                        changes and field exceptions.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex h-9 flex-nowrap items-center gap-4 overflow-x-auto rounded-md border border-border px-3">
                    {(
                      [
                        ['stage_approval', 'Stage change'],
                        ['rule_exception', 'Rule exception'],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={wfTriggers.includes(value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWfTriggers([...wfTriggers, value]);
                              return;
                            }
                            const next = wfTriggers.filter((t) => t !== value);
                            if (next.length === 0) return;
                            setWfTriggers(next);
                          }}
                          className="size-3.5 accent-brand"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="m-0 text-sm font-semibold">Steps</h4>
                  <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
                    Run in order · {wfSteps.length} step
                    {wfSteps.length === 1 ? '' : 's'}
                    {wfScope === 'TARGET'
                      ? ' · two steps = department then company'
                      : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddStep}
                  className="h-8 gap-1 text-[12px]"
                >
                  <Plus size={13} /> Add step
                </Button>
              </div>

              <div className="space-y-2.5">
                {wfSteps.map((step, sIdx) => (
                  <div
                    key={step.key}
                    className="rounded-xl border border-border bg-white p-3.5"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-semibold">
                        Step {sIdx + 1}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStep(sIdx)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[12px]">Step name</Label>
                        <Input
                          value={step.name}
                          onChange={(e) =>
                            handleUpdateStep(sIdx, { name: e.target.value })
                          }
                          className="h-8 text-[13px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-[12px]">
                          Subject
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                aria-label="About subject"
                              >
                                <Info size={13} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[260px]"
                            >
                              {wfScope === 'TARGET'
                                ? 'The user who created the target plan (record owner). Approver relations resolve from that person for their own team’s requests; other teams still route to their department manager.'
                                : 'Who on the lead/deal this step starts from. Manager relations are relative to these people.'}
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select
                          value={step.subjectSource}
                          onValueChange={(val: ApprovalSubjectSource) =>
                            handleSubjectSourceChange(sIdx, val)
                          }
                        >
                          <SelectTrigger className="h-8 text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(wfScope === 'TARGET'
                              ? (Object.keys(
                                  TARGET_SUBJECT_SOURCE_LABELS,
                                ) as ApprovalSubjectSource[])
                              : (Object.keys(
                                  SUBJECT_SOURCE_LABELS,
                                ) as ApprovalSubjectSource[])
                            ).map((key) => (
                              <SelectItem key={key} value={key}>
                                {wfScope === 'TARGET'
                                  ? (TARGET_SUBJECT_SOURCE_LABELS[key] ??
                                    SUBJECT_SOURCE_LABELS[key])
                                  : SUBJECT_SOURCE_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {supportsOrgRelation(step.subjectSource) ? (
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-[12px]">
                            {wfScope === 'TARGET' ? 'Approver' : 'Who approves'}
                            {wfScope === 'TARGET' ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                    aria-label="About approver"
                                  >
                                    <Info size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[280px]"
                                >
                                  Resolved from the submitting team only.
                                  Department lead means the manager of that
                                  team&apos;s department — not any other
                                  department lead.
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </Label>
                          <Select
                            value={step.subjectRelation}
                            onValueChange={(val: ApprovalSubjectRelation) =>
                              handleUpdateStep(sIdx, {
                                subjectRelation: val,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(wfScope === 'TARGET'
                                ? (Object.keys(
                                    TARGET_SUBJECT_RELATION_LABELS,
                                  ) as ApprovalSubjectRelation[])
                                : (Object.keys(
                                    SUBJECT_RELATION_LABELS,
                                  ) as ApprovalSubjectRelation[])
                              ).map((key) => (
                                <SelectItem key={key} value={key}>
                                  {wfScope === 'TARGET'
                                    ? (TARGET_SUBJECT_RELATION_LABELS[key] ??
                                      SUBJECT_RELATION_LABELS[key])
                                    : SUBJECT_RELATION_LABELS[key]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      {isMultiSubjectApprover(step.subjectSource) ? (
                        <div className="space-y-1.5">
                          <Label className="text-[12px]">Required</Label>
                          <Select
                            value={step.mode}
                            onValueChange={(val: ApprovalStepMode) =>
                              handleUpdateStep(sIdx, { mode: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ANY">
                                Any one approver
                              </SelectItem>
                              <SelectItem value="ALL">All approvers</SelectItem>
                              <SelectItem value="MINIMUM_COUNT">
                                Minimum count
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      {isMultiSubjectApprover(step.subjectSource) &&
                      step.mode === 'MINIMUM_COUNT' ? (
                        <div className="space-y-1.5">
                          <Label className="text-[12px]">Minimum count</Label>
                          <Input
                            type="number"
                            min={1}
                            value={step.minimumCount ?? 1}
                            onChange={(e) =>
                              handleUpdateStep(sIdx, {
                                minimumCount: Number(e.target.value) || 1,
                              })
                            }
                            className="h-8 text-[13px]"
                          />
                        </div>
                      ) : null}
                      {step.subjectSource === 'user_field' ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-[12px]">USER field</Label>
                          <Select
                            value={step.subjectFieldId ?? undefined}
                            onValueChange={(fieldId) =>
                              handleUpdateStep(sIdx, {
                                subjectFieldId: fieldId,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-full text-[12px]">
                              <SelectValue placeholder="Select USER field…" />
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              {userFieldOptions.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      {step.subjectSource === 'role' ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-[12px]">Role</Label>
                          <Select
                            value="__add__"
                            onValueChange={(roleId) => {
                              if (roleId === '__add__') return;
                              handleUpdateStep(sIdx, { targetRoleId: roleId });
                            }}
                          >
                            <SelectTrigger className="h-8 w-full text-[12px]">
                              <SelectValue placeholder="Add role…" />
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              {roleOptions.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {step.targetRoleId ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge
                                variant="brand"
                                className="h-6 gap-1 px-2.5 text-[11px] font-medium"
                              >
                                {roleOptions.find(
                                  (r) => r.id === step.targetRoleId,
                                )?.name ?? step.targetRoleId}
                                <button
                                  type="button"
                                  className="ml-0.5 text-brand/70 hover:text-destructive"
                                  onClick={() =>
                                    handleUpdateStep(sIdx, {
                                      targetRoleId: undefined,
                                    })
                                  }
                                >
                                  ×
                                </button>
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {step.subjectSource === 'specific_users' ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-[12px]">Users</Label>
                          <Select
                            value="__add__"
                            onValueChange={(userId) => {
                              if (userId === '__add__') return;
                              const current = step.targetUserIds ?? [];
                              if (current.includes(userId)) return;
                              handleUpdateStep(sIdx, {
                                targetUserIds: [...current, userId],
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-full text-[12px]">
                              <SelectValue placeholder="Add user…" />
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              {userOptions.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(step.targetUserIds ?? []).map((uid) => {
                              const label =
                                userOptions.find((u) => u.id === uid)?.label ??
                                uid;
                              return (
                                <Badge
                                  key={uid}
                                  variant="brand"
                                  className="h-6 gap-1 px-2.5 text-[11px] font-medium"
                                >
                                  {label}
                                  <button
                                    type="button"
                                    className="ml-0.5 text-brand/70 hover:text-destructive"
                                    onClick={() =>
                                      handleUpdateStep(sIdx, {
                                        targetUserIds: (
                                          step.targetUserIds ?? []
                                        ).filter((id) => id !== uid),
                                      })
                                    }
                                  >
                                    ×
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-border px-5 py-3">
            <Button
              variant="outline"
              onClick={() => setIsEditorOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (editingId != null && detailQuery.isLoading)}
              className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              <Save size={14} />
              {saving ? 'Saving…' : editingId ? 'Publish version' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
