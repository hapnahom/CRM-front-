'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EntityCustomFieldsForm,
  applyCustomFieldDefaults,
  customFieldValuesToPayload,
} from '@/components/pipeline/EntityCustomFieldsForm';
import {
  EntityAssignmentRolesFields,
  mapAssignmentsFromQuery,
  mergeRoleAssignmentValues,
  rolesNeedingAssignmentPrompt,
  validateRequiredRoleAssignments,
  type RoleAssignmentValue,
} from '@/components/pipeline/EntityAssignmentRolesFields';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';
import {
  checkStageTransition,
  type StageTransitionCheckResult,
} from '@/store/server/features/entity-fields/values';
import {
  preflightApprovalWorkflow,
  type ApprovalPreflightResult,
  type PipelineApprovalEntityType,
} from '@/store/server/features/pipeline/approvals';
import {
  usePipelineRoleAssignments,
  usePipelineRolesForStage,
  type PipelineRoleAssignmentEntityType,
} from '@/store/server/features/pipeline-roles/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { validateFields } from '@/modules/custom-fields/validation/engine';
import type { ValidationRule } from '@/modules/custom-fields/validation/types';
import {
  issuesToErrorMap,
  splitValidationIssues,
  validationSummaryFromIssues,
} from '@/lib/pipeline/validation-exception';
import { useDealDetail } from '@/store/server/features/deals/detail/queries';
import { useOpportunitySolutions } from '@/store/server/features/product-catalog/queries';
import {
  WonExactValueFields,
  buildWonExactValueDefaults,
  validateWonExactValueForm,
  type WonExactValueFormState,
} from '@/components/pipeline/WonExactValueFields';

export interface StageTransitionRequest {
  entityType: BackendEntityType;
  entityId: string;
  entityName?: string;
  stageId: string;
  stageName?: string;
  stageCategory?: 'open' | 'won' | 'lost' | 'inactive';
  requiresApproval?: boolean;
  hasApprover?: boolean;
  approvalStepCount?: number;
  approvalWorkflowId?: string | null;
  ownerUserId?: string | null;
}

/** Stable empty fallbacks — `?? []` inline in render recreates arrays every pass and can loop effects. */
const EMPTY_SOLUTIONS: OpportunitySolution[] = [];
const EMPTY_ARRAY: never[] = [];
const EMPTY_WON_EXACT_STATE: WonExactValueFormState = {
  exactValue: '',
  solutionExactAmounts: {},
};

interface StageTransitionModalProps {
  open: boolean;
  request: StageTransitionRequest | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    entityId: string;
    stageId: string;
    fieldValues: Array<{ entityFieldId: string; value: unknown }>;
    roleAssignments?: Array<{ roleId: string; userId: string }>;
    allowValidationException?: boolean;
    validationSummary?: string;
    validationExceptionFieldIds?: string[];
    exactValue?: number;
    solutionExactAmounts?: Array<{ solutionId: string; exactAmount: number }>;
  }) => void;
  isSubmitting?: boolean;
}

function valuesToRecord(
  rows: Array<{ entityFieldId: string; value: unknown }> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows ?? []) out[row.entityFieldId] = row.value;
  return out;
}

function exceptionWorkflowIdsFromFields(
  fields: StageTransitionCheckResult['fields'] | undefined,
): string[] {
  const ids = new Set<string>();
  for (const field of fields ?? []) {
    const settings = (field as { settings?: Record<string, unknown> }).settings;
    const id = settings?.exceptionApprovalWorkflowId;
    if (typeof id === 'string' && id.trim()) ids.add(id);
  }
  return Array.from(ids);
}

function ApprovalRequirementsPanel({
  title,
  preflight,
  loading,
}: {
  title: string;
  preflight: ApprovalPreflightResult | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-muted-foreground">
        Checking approval requirements…
      </div>
    );
  }
  if (!preflight) return null;

  if (
    preflight.bypassApproval ||
    preflight.priorRequestState === 'already_approved'
  ) {
    return (
      <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <p className="m-0 font-semibold">{title}</p>
        <p className="m-0">
          {preflight.summary ||
            `Already Approved - Ready to Move${
              preflight.priorRequestLabel
                ? ` (${preflight.priorRequestLabel})`
                : ''
            }.`}
        </p>
      </div>
    );
  }

  if (preflight.canCreate) {
    const isReactivate =
      preflight.priorRequestState === 'reactivate_cancelled' ||
      preflight.priorRequestState === 'reactivate_rejected';
    return (
      <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <p className="m-0 font-semibold">{title}</p>
        {preflight.ownerUserName ? (
          <p className="m-0">Record owner: {preflight.ownerUserName}</p>
        ) : null}
        <p className="m-0">
          {preflight.summary ||
            (isReactivate && preflight.priorRequestLabel
              ? `Re-activating existing approval request for ${preflight.priorRequestLabel}.`
              : `Workflow "${preflight.workflowName}" is ready to request approval.`)}
        </p>
        <ul className="m-0 list-disc space-y-1 pl-4">
          {preflight.steps.map((step) => {
            const names =
              step.assignees
                .map((a) => a.userName || 'Approver')
                .filter(Boolean)
                .join(', ') || 'Approver';
            return (
              <li key={`${step.stepOrder}-${step.stepName}`}>
                Step {step.stepOrder}: {step.stepName} — {names} (
                {step.approverLabel})
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const issues = [
    ...(preflight.workflowIssue ? [preflight.workflowIssue] : []),
    ...preflight.steps
      .filter((s) => s.status === 'blocked' && s.issue)
      .map((s) => s.issue!),
  ].filter(
    (issue, index, all) =>
      all.findIndex((item) => item.message === issue.message) === index,
  );

  // Prefer structured issues; skip summary when it merely repeats the first issue.
  const summary =
    preflight.summary &&
    !issues.some((issue) => issue.message === preflight.summary)
      ? preflight.summary
      : null;

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="m-0 font-semibold">{title}</p>
      {preflight.ownerUserName ? (
        <p className="m-0">Record owner: {preflight.ownerUserName}</p>
      ) : null}
      {summary ? <p className="m-0">{summary}</p> : null}
      {!summary && !issues.length ? (
        <p className="m-0">
          Workflow &quot;{preflight.workflowName}&quot; cannot start approval
          for this record yet.
        </p>
      ) : null}
      {issues.map((issue) => (
        <div key={issue.code + issue.message} className="space-y-1">
          <p className="m-0 font-medium">{issue.message}</p>
          {issue.remediation?.length ? (
            <ul className="m-0 list-disc space-y-0.5 pl-4">
              {issue.remediation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StageTransitionModal({
  open,
  request,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: StageTransitionModalProps) {
  const { tenantId } = useAuthenticationStore();
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState<StageTransitionCheckResult | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exceptionPrompt, setExceptionPrompt] = useState<string | null>(null);
  const [stagePreflight, setStagePreflight] =
    useState<ApprovalPreflightResult | null>(null);
  const [exceptionPreflight, setExceptionPreflight] =
    useState<ApprovalPreflightResult | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentValue[]>(
    [],
  );
  const [roleError, setRoleError] = useState<string | null>(null);
  const [showRoleErrors, setShowRoleErrors] = useState(false);
  const [wonExactState, setWonExactState] = useState<WonExactValueFormState>({
    exactValue: '',
    solutionExactAmounts: {},
  });
  const [wonExactErrors, setWonExactErrors] = useState<{
    exactValue?: string;
    solutions?: Record<string, string>;
  }>({});

  const roleEntityType: PipelineRoleAssignmentEntityType =
    request?.entityType === 'DEAL' ? 'DEAL' : 'LEAD';
  const approvalEntityType: PipelineApprovalEntityType =
    request?.entityType === 'DEAL' ? 'DEAL' : 'LEAD';

  const isDealWonTransition =
    request?.entityType === 'DEAL' && request?.stageCategory === 'won';
  const dealDetailQuery = useDealDetail(
    isDealWonTransition && open ? (request?.entityId ?? '') : '',
    { enabled: Boolean(open && isDealWonTransition && request?.entityId) },
  );
  const solutionsQuery = useOpportunitySolutions(
    'deal',
    isDealWonTransition && open ? request?.entityId : undefined,
  );
  const dealSolutions = useMemo(
    () => solutionsQuery.data ?? EMPTY_SOLUTIONS,
    [solutionsQuery.data],
  );

  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const users = useMemo(
    () => platformUsersData?.data ?? EMPTY_ARRAY,
    [platformUsersData?.data],
  );
  const rolesForStageQuery = usePipelineRolesForStage(
    roleEntityType,
    request?.stageId,
    { enabled: Boolean(open && request?.stageId) },
  );
  const rolesForStage = useMemo(
    () => rolesForStageQuery.data ?? EMPTY_ARRAY,
    [rolesForStageQuery.data],
  );
  const roleAssignmentsQuery = usePipelineRoleAssignments(
    roleEntityType,
    open ? (request?.entityId ?? null) : null,
    { enabled: Boolean(open && request?.entityId) },
  );
  const storedRoleAssignments = useMemo(
    () => mapAssignmentsFromQuery(roleAssignmentsQuery.data),
    [roleAssignmentsQuery.data],
  );
  const rolesToPrompt = useMemo(
    () =>
      rolesNeedingAssignmentPrompt(
        rolesForStage,
        mergeRoleAssignmentValues(storedRoleAssignments, roleAssignments),
      ),
    [rolesForStage, storedRoleAssignments, roleAssignments],
  );
  const roleIdsToPrompt = useMemo(
    () => rolesToPrompt.map((role) => role.id),
    [rolesToPrompt],
  );

  useEffect(() => {
    if (!open) {
      setRoleAssignments((current) => (current.length === 0 ? current : []));
      setRoleError(null);
      setShowRoleErrors(false);
      setWonExactErrors((current) =>
        !current.exactValue && !current.solutions ? current : {},
      );
      setWonExactState((current) =>
        current.exactValue === '' &&
        Object.keys(current.solutionExactAmounts).length === 0
          ? current
          : EMPTY_WON_EXACT_STATE,
      );
    }
  }, [open]);

  useEffect(() => {
    if (!open || !request?.entityId || roleAssignmentsQuery.isLoading) return;
    const next = mapAssignmentsFromQuery(roleAssignmentsQuery.data);
    setRoleAssignments((current) => {
      if (JSON.stringify(current) === JSON.stringify(next)) {
        return current;
      }
      return next;
    });
  }, [
    open,
    request?.entityId,
    roleAssignmentsQuery.data,
    roleAssignmentsQuery.isLoading,
  ]);

  useEffect(() => {
    if (!open || !isDealWonTransition || !dealDetailQuery.data) return;
    const nextDefaults = buildWonExactValueDefaults(
      dealDetailQuery.data,
      dealSolutions,
    );
    setWonExactState((current) => {
      if (
        current.exactValue === nextDefaults.exactValue &&
        JSON.stringify(current.solutionExactAmounts) ===
          JSON.stringify(nextDefaults.solutionExactAmounts)
      ) {
        return current;
      }
      return nextDefaults;
    });
  }, [open, isDealWonTransition, dealDetailQuery.data, dealSolutions]);

  useEffect(() => {
    if (!open || !request || !tenantId) return;

    let cancelled = false;
    setLoading(true);
    setPreflightLoading(true);
    setLoadError(null);
    setErrors({});
    setExceptionPrompt(null);
    setStagePreflight(null);
    setExceptionPreflight(null);

    const fieldCheck = checkStageTransition(tenantId, {
      entityType: request.entityType,
      entityId: request.entityId,
      stageId: request.stageId,
    });

    const stageApprovalCheck =
      request.requiresApproval && request.approvalWorkflowId
        ? preflightApprovalWorkflow(request.approvalWorkflowId, {
            entityType: approvalEntityType,
            entityId: request.entityId,
            ownerUserId: request.ownerUserId,
            triggerType: 'stage_approval',
            pendingTargetStageId: request.stageId,
          })
        : Promise.resolve(null);

    Promise.all([fieldCheck, stageApprovalCheck])
      .then(([result, stageReady]) => {
        if (cancelled) return;
        setCheck(result);
        setValues(
          applyCustomFieldDefaults(
            valuesToRecord(result.values),
            result.fields.map(apiResponseToConfig),
          ),
        );
        setStagePreflight(stageReady);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { message?: string };
        setLoadError(e?.message || 'Failed to load stage requirements.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setPreflightLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, request, tenantId]);

  const fields = useMemo(() => {
    const all = (check?.fields ?? []).map(apiResponseToConfig);
    // Prompt only unfilled cumulative fields (and any with validation errors).
    // Already-filled fields from earlier stages are omitted.
    const unfilledIds = check?.unfilledFieldIds;
    if (!unfilledIds) return all;
    const promptIds = new Set([
      ...unfilledIds,
      ...(check?.errors ?? []).map((issue) => issue.entityFieldId),
    ]);
    return all.filter((field) => promptIds.has(field.id));
  }, [check]);
  const checkRuleIssues = useMemo(
    () => check?.errors.filter((issue) => issue.code === 'RULE_FAILED') ?? [],
    [check],
  );
  // Prefer live form values (incl. defaultValue prefills) over the initial
  // server check so a prefilled default does not keep the "required" banner.
  const hasRequiredIssues = useMemo(() => {
    if (!fields.length) {
      return check?.errors.some((issue) => issue.code === 'REQUIRED') ?? false;
    }
    return validateFields(
      fields.map((f) => ({
        id: f.id,
        label: f.label,
        required: f.required,
        type: f.type,
        validationRules: (f.validation.rules ?? []) as ValidationRule[],
        settings: f.settings as unknown as Record<string, unknown>,
      })),
      values,
    ).some((issue) => issue.code === 'REQUIRED');
  }, [fields, values, check?.errors]);
  const hasUnfilledPromptFields = fields.length > 0;
  const hasRuleIssues = checkRuleIssues.length > 0 || !!exceptionPrompt;

  // When exception prompt appears, preflight exception workflow(s).
  useEffect(() => {
    if (!open || !request || !tenantId || !exceptionPrompt) {
      setExceptionPreflight((current) => (current == null ? current : null));
      return;
    }
    const workflowIds = exceptionWorkflowIdsFromFields(check?.fields);
    const exceptionFieldIds = Array.from(
      new Set([
        ...checkRuleIssues
          .map((issue) => issue.entityFieldId)
          .filter((value): value is string => Boolean(value)),
        ...Object.keys(errors),
      ]),
    );
    if (!workflowIds.length) {
      setExceptionPreflight({
        canCreate: false,
        workflowId: '',
        workflowName: 'Exception approval',
        versionNumber: 0,
        summary:
          'A validation exception was requested but no exception approval workflow is assigned on the failing field(s).',
        steps: [],
        workflowIssue: {
          code: 'EXCEPTION_WORKFLOW_MISSING',
          message:
            'No exception approval workflow is configured on the failing custom field(s).',
          remediation: [
            'Ask an admin to assign an exception approval workflow on those fields in settings.',
          ],
        },
      });
      return;
    }

    let cancelled = false;
    setPreflightLoading(true);
    Promise.all(
      workflowIds.map((id) =>
        preflightApprovalWorkflow(id, {
          entityType: approvalEntityType,
          entityId: request.entityId,
          ownerUserId: request.ownerUserId,
          triggerType: 'rule_exception',
          pendingTargetStageId: request.stageId,
          exceptionFieldIds,
        }),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const blocked = results.find((r) => !r.canCreate && !r.bypassApproval);
        const bypass = results.find((r) => r.bypassApproval);
        setExceptionPreflight(bypass ?? blocked ?? results[0] ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { message?: string };
        setExceptionPreflight({
          canCreate: false,
          workflowId: workflowIds[0] ?? '',
          workflowName: 'Exception approval',
          versionNumber: 0,
          summary:
            e?.message || 'Could not check exception approval readiness.',
          steps: [],
          workflowIssue: {
            code: 'PREFLIGHT_FAILED',
            message:
              e?.message || 'Could not check exception approval readiness.',
            remediation: ['Retry the stage move, or contact an administrator.'],
          },
        });
      })
      .finally(() => {
        if (!cancelled) setPreflightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    request,
    tenantId,
    exceptionPrompt,
    check?.fields,
    checkRuleIssues,
    errors,
  ]);

  const stageBypassApproval = Boolean(stagePreflight?.bypassApproval);
  const exceptionBypassApproval = Boolean(exceptionPreflight?.bypassApproval);

  const approvalCopy = useMemo(() => {
    if (stageBypassApproval && !hasRuleIssues) {
      return (
        stagePreflight?.summary ||
        'Already Approved - Ready to Move. Confirm to complete the stage change now.'
      );
    }
    if (request?.requiresApproval && hasRuleIssues) {
      return 'This move needs approval for two reasons: the destination stage requires approval, and one or more custom-field values do not satisfy their validation rules.';
    }
    if (request?.requiresApproval && !stageBypassApproval) {
      return 'This move needs approval because the destination stage is configured to require approval.';
    }
    if (hasRuleIssues && exceptionBypassApproval) {
      return (
        exceptionPreflight?.summary ||
        'This rule exception was already approved. Confirm to persist the field values and continue.'
      );
    }
    if (hasRuleIssues) {
      return 'This move does not need stage approval, but one or more custom-field values do not satisfy their validation rules. You can fix them or continue with an exception for approval.';
    }
    if (hasRequiredIssues) {
      return 'Complete the required custom fields below before this stage change can continue.';
    }
    if (hasUnfilledPromptFields) {
      return 'Review the custom fields below. Optional fields can be left blank, but you will be asked again on later stages until they are filled.';
    }
    return null;
  }, [
    hasRequiredIssues,
    hasRuleIssues,
    hasUnfilledPromptFields,
    request?.requiresApproval,
    stageBypassApproval,
    exceptionBypassApproval,
    stagePreflight?.summary,
    exceptionPreflight?.summary,
  ]);

  const stageApprovalBlocked =
    Boolean(request?.requiresApproval) &&
    !stageBypassApproval &&
    (preflightLoading || (stagePreflight != null && !stagePreflight.canCreate));

  const exceptionApprovalBlocked =
    Boolean(exceptionPrompt) &&
    !exceptionBypassApproval &&
    (preflightLoading ||
      (exceptionPreflight != null && !exceptionPreflight.canCreate));

  const confirmDisabled =
    loading ||
    !!loadError ||
    isSubmitting ||
    stageApprovalBlocked ||
    (Boolean(exceptionPrompt) && exceptionApprovalBlocked);

  const submit = async (opts?: { allowValidationException?: boolean }) => {
    if (!request || !tenantId) return;
    setShowRoleErrors(true);

    const clientIssues = validateFields(
      fields.map((f) => ({
        id: f.id,
        label: f.label,
        required: f.required,
        type: f.type,
        validationRules: (f.validation.rules ?? []) as ValidationRule[],
        settings: f.settings as unknown as Record<string, unknown>,
      })),
      values,
    );
    const { required, ruleFailed } = splitValidationIssues(clientIssues);

    if (required.length) {
      setErrors(issuesToErrorMap(required));
      setExceptionPrompt(null);
      return;
    }

    const mergedRoleAssignments = mergeRoleAssignmentValues(
      storedRoleAssignments,
      roleAssignments,
    );
    const roleValidationError = validateRequiredRoleAssignments(
      rolesForStage,
      mergedRoleAssignments,
    );
    if (roleValidationError) {
      setRoleError(roleValidationError);
      return;
    }
    setRoleError(null);

    let exactValuePayload: number | undefined;
    let solutionExactAmountsPayload:
      | Array<{ solutionId: string; exactAmount: number }>
      | undefined;
    if (isDealWonTransition) {
      const wonErrors = validateWonExactValueForm(wonExactState, dealSolutions);
      if (wonErrors.exactValue || wonErrors.solutions) {
        setWonExactErrors(wonErrors);
        return;
      }
      setWonExactErrors({});
      exactValuePayload = Number(wonExactState.exactValue);
      solutionExactAmountsPayload = dealSolutions.map((solution) => ({
        solutionId: solution.id,
        exactAmount: Number(wonExactState.solutionExactAmounts[solution.id]),
      }));
    }

    if (ruleFailed.length && !opts?.allowValidationException) {
      setErrors(issuesToErrorMap(ruleFailed));
      setExceptionPrompt(validationSummaryFromIssues(ruleFailed));
      return;
    }

    if (request.requiresApproval && request.hasApprover === false) {
      setLoadError(
        'This stage has no configured approver. Ask an admin to set one in settings.',
      );
      return;
    }

    if (
      request.requiresApproval &&
      stagePreflight &&
      !stagePreflight.canCreate
    ) {
      return;
    }

    if (
      opts?.allowValidationException &&
      exceptionPreflight &&
      !exceptionPreflight.canCreate
    ) {
      return;
    }

    const fieldValues = customFieldValuesToPayload(values);
    const allowValidationException = Boolean(opts?.allowValidationException);

    try {
      const serverCheck = await checkStageTransition(tenantId, {
        entityType: request.entityType,
        entityId: request.entityId,
        stageId: request.stageId,
        fieldValues,
      });

      const serverRequired = serverCheck.errors.filter(
        (e) => e.code === 'REQUIRED',
      );
      const serverRules = serverCheck.errors.filter(
        (e) => e.code === 'RULE_FAILED',
      );

      if (serverRequired.length) {
        const next: Record<string, string> = {};
        for (const issue of serverRequired) {
          next[issue.entityFieldId] = issue.message;
        }
        setErrors(next);
        setCheck(serverCheck);
        return;
      }

      if (serverRules.length && !allowValidationException) {
        const next: Record<string, string> = {};
        for (const issue of serverRules) {
          next[issue.entityFieldId] = issue.message;
        }
        setErrors(next);
        setExceptionPrompt(serverRules.map((e) => e.message).join('; '));
        setCheck(serverCheck);
        return;
      }

      onConfirm({
        entityId: request.entityId,
        stageId: request.stageId,
        fieldValues,
        roleAssignments: roleIdsToPrompt.length
          ? mergeRoleAssignmentValues(storedRoleAssignments, roleAssignments)
          : undefined,
        allowValidationException:
          allowValidationException || serverRules.length > 0 || undefined,
        validationSummary:
          allowValidationException || serverRules.length
            ? exceptionPrompt ||
              serverRules.map((e) => e.message).join('; ') ||
              undefined
            : undefined,
        validationExceptionFieldIds:
          allowValidationException || serverRules.length
            ? Array.from(
                new Set(
                  serverRules
                    .map((issue) => issue.entityFieldId)
                    .filter((value): value is string => Boolean(value)),
                ),
              )
            : undefined,
        exactValue: exactValuePayload,
        solutionExactAmounts: solutionExactAmountsPayload,
      });
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: {
            message?: string;
            errors?: Array<{ entityFieldId: string; message: string }>;
          };
        };
        message?: string;
      };
      const apiErrors = e?.response?.data?.errors;
      if (apiErrors?.length) {
        const next: Record<string, string> = {};
        for (const issue of apiErrors)
          next[issue.entityFieldId] = issue.message;
        setErrors(next);
      } else {
        setLoadError(
          e?.response?.data?.message ||
            e?.message ||
            'Validation failed. Please check the fields and try again.',
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-visible sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Complete fields for {request?.stageName || 'new stage'}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto scrollbar-hide py-1">
          {request?.entityName ? (
            <p className="text-xs text-muted-foreground">
              Moving{' '}
              <span className="font-medium text-foreground">
                {request.entityName}
              </span>{' '}
              to {request.stageName || 'this stage'} may require additional
              action before the stage change can continue.
            </p>
          ) : null}

          {approvalCopy ? (
            <p
              className={
                stageBypassApproval || exceptionBypassApproval
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900'
                  : request?.requiresApproval || hasRuleIssues
                    ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
                    : 'rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-muted-foreground'
              }
            >
              {approvalCopy}
              {request?.requiresApproval &&
              !stageBypassApproval &&
              stagePreflight?.priorRequestState !== 'reactivate_cancelled' &&
              stagePreflight?.priorRequestState !== 'reactivate_rejected' ? (
                <>
                  {' '}
                  If submitted, the record stays on the current stage until the
                  approval chain finishes
                  {request.approvalStepCount && request.approvalStepCount > 1
                    ? ` (${request.approvalStepCount} ordered steps).`
                    : '.'}
                </>
              ) : null}
            </p>
          ) : null}

          {request?.requiresApproval ? (
            <ApprovalRequirementsPanel
              title={`Approval requirements · ${
                stagePreflight?.workflowName ?? 'Stage workflow'
              }`}
              preflight={stagePreflight}
              loading={preflightLoading && !stagePreflight}
            />
          ) : null}

          {exceptionPrompt ? (
            <ApprovalRequirementsPanel
              title={`Exception approval · ${
                exceptionPreflight?.workflowName ?? 'Rule exception'
              }`}
              preflight={exceptionPreflight}
              loading={preflightLoading && !exceptionPreflight}
            />
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading required fields…
            </p>
          ) : loadError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {loadError}
            </p>
          ) : (
            <>
              {roleIdsToPrompt.length > 0 ? (
                <div className="space-y-2">
                  <EntityAssignmentRolesFields
                    entityType={roleEntityType}
                    stageId={request?.stageId}
                    users={users}
                    value={roleAssignments}
                    roleIdsToShow={roleIdsToPrompt}
                    onChange={(next) => {
                      setRoleAssignments(next);
                      setRoleError(null);
                    }}
                    showRequiredErrors={showRoleErrors}
                  />
                </div>
              ) : null}
              {roleError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {roleError}
                </p>
              ) : null}
              {isDealWonTransition && dealDetailQuery.data ? (
                <WonExactValueFields
                  currency={dealDetailQuery.data.currency}
                  estimatedValue={Number(dealDetailQuery.data.value) || 0}
                  solutions={dealSolutions}
                  state={wonExactState}
                  onChange={(next) => {
                    setWonExactState(next);
                    setWonExactErrors({});
                  }}
                  errors={wonExactErrors}
                />
              ) : null}
              <EntityCustomFieldsForm
                fields={fields}
                values={values}
                errors={errors}
                onChange={(fieldId, value) => {
                  setValues((prev) => ({ ...prev, [fieldId]: value }));
                  setErrors((prev) => {
                    if (!prev[fieldId]) return prev;
                    const next = { ...prev };
                    delete next[fieldId];
                    return next;
                  });
                }}
              />
            </>
          )}

          {exceptionPrompt ? (
            <p
              className={
                exceptionBypassApproval
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900'
                  : 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
              }
            >
              {exceptionBypassApproval
                ? 'Custom-field rules still fail validation, but an approved exception already covers these values. Continue to persist them and proceed.'
                : 'One or more custom-field validation rules are still failing. You can fix the values, or use Continue with Exception to request approval for the validation override.'}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {exceptionPrompt ? (
            <Button
              type="button"
              variant="outline"
              className={
                exceptionBypassApproval
                  ? 'border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                  : 'border-amber-300 text-amber-800 hover:bg-amber-50'
              }
              onClick={() => void submit({ allowValidationException: true })}
              disabled={confirmDisabled}
            >
              {isSubmitting
                ? 'Saving…'
                : exceptionBypassApproval
                  ? 'Continue (already approved)'
                  : 'Continue with Exception'}
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={() => void submit()}
            disabled={confirmDisabled || !!exceptionPrompt}
            title={
              stageApprovalBlocked
                ? 'Resolve approval requirements before submitting'
                : undefined
            }
          >
            {isSubmitting
              ? 'Saving…'
              : stageBypassApproval
                ? 'Save & move'
                : request?.requiresApproval
                  ? 'Save & submit for approval'
                  : 'Save & move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
