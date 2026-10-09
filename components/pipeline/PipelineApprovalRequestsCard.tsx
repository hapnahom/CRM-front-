'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  FileWarning,
  ShieldCheck,
  User2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  dealUiLabel,
  entityTypeBadgeLabel,
  pipelineEntityNoun,
} from '@/config/salesWorkflow';
import { EntityCustomFieldsForm } from '@/components/pipeline/EntityCustomFieldsForm';
import { useLeadDetail } from '@/store/server/features/leads/detail/queries';
import { useDealDetail } from '@/store/server/features/deals/detail/queries';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import { useEntityFieldValues } from '@/store/server/features/entity-fields/values';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { formatUserName } from '@/lib/format-user-name';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useApprovalRequestDeepLink } from '@/hooks/useApprovalRequestDeepLink';
import {
  useApprovePipelineRequest,
  useCancelPipelineRequest,
  usePipelineApprovalRequest,
  usePipelineApprovalRequests,
  useReassignPipelineApprovalStep,
  useRejectPipelineRequest,
  useResubmitPipelineRequest,
  type PipelineApprovalEntityType,
  type PipelineApprovalRequest,
  type PipelineApprovalTrigger,
} from '@/store/server/features/pipeline/approvals';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';
import { formatMoney } from '@/modules/leads/components/leads-pipeline-utils';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function triggerTone(trigger: PipelineApprovalTrigger) {
  if (trigger === 'stage_approval') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function fallbackUserLabel(
  userId: string | null | undefined,
  userMap: Map<string, { name?: string | null; email?: string | null }>,
) {
  if (!userId) return null;
  const user = userMap.get(userId);
  return user?.name || user?.email || null;
}

function assigneeDisplayLabel(
  assignee: { approverUserId: string; approverName?: string | null },
  userMap: Map<string, { name?: string | null; email?: string | null }>,
): string {
  const stored = assignee.approverName?.trim() || null;
  if (stored && !looksLikeUuid(stored)) return stored;
  return fallbackUserLabel(assignee.approverUserId, userMap) || 'Approver';
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (Array.isArray(value)) {
    const rendered = value
      .map((item) => formatDetailValue(item))
      .filter((item) => item !== '—');
    return rendered.length ? rendered.join(', ') : '—';
  }
  if (typeof value === 'object') {
    const maybeFile = value as { name?: unknown; url?: unknown };
    if (typeof maybeFile.name === 'string' && maybeFile.name.trim()) {
      return maybeFile.name;
    }
    if (typeof maybeFile.url === 'string' && maybeFile.url.trim()) {
      return maybeFile.url;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return '—';
}

function DetailItem({ label, value }: { label: string; value: unknown }) {
  const rendered = formatDetailValue(value);
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-foreground">{rendered}</p>
    </div>
  );
}

function userCanDecideRequest(
  request: PipelineApprovalRequest,
  userId: string | null | undefined,
): boolean {
  if (!userId || request.status !== 'pending') return false;
  const activeStep = request.steps?.find(
    (s) => s.stepOrder === request.currentStepOrder,
  );
  return (activeStep?.assignees ?? []).some(
    (a) => a.approverUserId === userId && a.status === 'pending',
  );
}

function isRequesterOf(
  request: PipelineApprovalRequest,
  userId: string | null | undefined,
): boolean {
  return !!userId && request.requesterUserId === userId;
}

function perspectiveBanner(
  request: PipelineApprovalRequest,
  userId: string | null | undefined,
): { title: string; detail: string; className: string } | null {
  if (userCanDecideRequest(request, userId)) {
    return {
      title: 'Action needed',
      detail:
        'You are an active-step approver. Review the request and approve or reject below.',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
    };
  }
  if (request.status === 'rejected') {
    return {
      title: 'Rejected',
      detail:
        request.decisionNote?.trim() ||
        'This approval request was rejected. Stage was not changed.',
      className: 'border-red-200 bg-red-50 text-red-950',
    };
  }
  if (request.status === 'cancelled') {
    return {
      title: 'Cancelled',
      detail:
        request.decisionNote?.trim() ||
        'This approval request was cancelled. Stage was not changed.',
      className: 'border-border bg-surface-elevated text-foreground',
    };
  }
  if (request.status === 'approved') {
    return {
      title: 'Approved',
      detail:
        'This approval request was fully approved and the stage move applied.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    };
  }
  if (isRequesterOf(request, userId) && request.status === 'pending') {
    return {
      title: 'Submitted / In progress',
      detail: `Waiting on step ${request.currentStepOrder} of ${request.totalSteps}. Full step history is shown below.`,
      className: 'border-sky-200 bg-sky-50 text-sky-950',
    };
  }
  if (request.status === 'pending') {
    return {
      title: 'In progress',
      detail: `Step ${request.currentStepOrder} of ${request.totalSteps} is awaiting the assigned approver(s).`,
      className: 'border-border bg-surface-elevated text-foreground',
    };
  }
  return null;
}

function ApprovalRequestRow({
  request,
  userMap,
  currentUserId,
  highlighted,
  onOpen,
}: {
  request: PipelineApprovalRequest;
  userMap: Map<string, { name?: string | null; email?: string | null }>;
  currentUserId?: string | null;
  highlighted?: boolean;
  onOpen: () => void;
}) {
  const primaryTrigger = request.triggerType;
  const canDecide = userCanDecideRequest(request, currentUserId);
  const isRequester = isRequesterOf(request, currentUserId);
  const statusBadge =
    request.status === 'rejected'
      ? {
          label: 'Rejected',
          className: 'border-red-200 bg-red-50 text-red-800',
        }
      : request.status === 'cancelled'
        ? {
            label: 'Cancelled',
            className:
              'border-border bg-surface-elevated text-muted-foreground',
          }
        : canDecide
          ? {
              label: 'Action needed',
              className: 'border-amber-200 bg-amber-50 text-amber-800',
            }
          : isRequester
            ? {
                label: 'Submitted',
                className:
                  'border-border bg-surface-elevated text-muted-foreground',
              }
            : {
                label: 'In progress',
                className:
                  'border-border bg-surface-elevated text-muted-foreground',
              };
  const requesterLabel =
    request.requesterName ||
    fallbackUserLabel(request.requesterUserId, userMap) ||
    'Unknown requester';
  return (
    <button
      type="button"
      data-approval-request-id={request.id}
      onClick={onOpen}
      className={cn(
        'w-full rounded-lg border bg-surface-elevated/70 px-2.5 py-2 text-left transition-all hover:border-brand/30 hover:bg-white hover:shadow-sm',
        highlighted
          ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-300/70'
          : 'border-border',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand">
          {primaryTrigger === 'rule_exception' ? (
            <FileWarning size={13} />
          ) : (
            <ShieldCheck size={13} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {request.entityName}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  'border px-1.5 py-0 text-[9px] font-medium leading-4',
                  statusBadge.className,
                )}
              >
                {statusBadge.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'border px-1.5 py-0 text-[9px] font-medium leading-4',
                  triggerTone(primaryTrigger),
                )}
              >
                {primaryTrigger === 'stage_approval' ? 'Stage' : 'Exception'}
              </Badge>
            </div>
          </div>

          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="truncate">
              {request.currentStageName ||
                request.previousStageName ||
                'Current stage'}
            </span>
            <ArrowRight size={10} className="shrink-0" />
            <span className="truncate font-medium text-foreground">
              {request.pendingTargetStageName ||
                request.requestedStageName ||
                'Requested stage'}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1 truncate">
              <User2 size={10} className="shrink-0" />
              <span className="truncate">{requesterLabel}</span>
            </span>
            <span className="shrink-0 text-border">·</span>
            <span className="shrink-0">
              Step {request.currentStepOrder}/{request.totalSteps}
            </span>
            <span className="shrink-0 text-border">·</span>
            <span className="flex shrink-0 items-center gap-1">
              <Clock3 size={10} className="shrink-0" />
              {formatRelativeTime(request.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ApprovalRequestDetailModal({
  request,
  userMap,
  currentUserId,
  open,
  busy,
  onOpenChange,
  onApprove,
  onReject,
  onCancel,
  onResubmit,
  onReassign,
}: {
  request: PipelineApprovalRequest | null;
  userMap: Map<string, { name?: string | null; email?: string | null }>;
  currentUserId?: string | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (decisionNote?: string) => void;
  onReject: (decisionNote?: string) => void;
  onCancel: (reason?: string) => void;
  onResubmit: (note?: string) => void;
  onReassign: (payload: {
    stepId: string;
    toApproverUserId: string;
    fromApproverUserId?: string;
    toApproverName?: string;
  }) => void;
}) {
  const [decisionNote, setDecisionNote] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');
  const canDecide = request
    ? userCanDecideRequest(request, currentUserId)
    : false;
  const isRequester = request ? isRequesterOf(request, currentUserId) : false;
  const canCancel =
    !!request &&
    request.status === 'pending' &&
    (isRequester ||
      AccessGuard.checkAnyAccess({
        permissions: [PERMISSIONS.EDIT_SETTINGS],
      }));
  const canReassign =
    !!request &&
    request.status === 'pending' &&
    AccessGuard.checkAnyAccess({
      permissions: [PERMISSIONS.EDIT_SETTINGS],
    });
  const activeStep = request?.steps?.find(
    (s) => s.stepOrder === request.currentStepOrder,
  );
  const pendingAssignees = (activeStep?.assignees ?? []).filter(
    (a) => a.status === 'pending',
  );

  const reasonTitle = useMemo(() => {
    if (!request) return 'Approval request';
    if (request.triggerType === 'stage_approval')
      return 'Stage approval required';
    if (request.triggerType === 'rule_exception')
      return 'Validation exception request';
    return 'Approval request';
  }, [request]);

  const entityType = (request?.entityType ?? 'LEAD') as BackendEntityType;
  const entityId = open && request ? request.entityId : '';
  const leadDetailQuery = useLeadDetail(entityType === 'LEAD' ? entityId : '');
  const dealDetailQuery = useDealDetail(entityType === 'DEAL' ? entityId : '');
  const detail =
    entityType === 'LEAD' ? leadDetailQuery.data : dealDetailQuery.data;
  const stageId = detail?.stageId ?? null;
  const fieldValuesQuery = useEntityFieldValues(
    entityType,
    open && request ? request.entityId : null,
  );
  const stageFieldsQuery = useFieldsForStage(entityType, open ? stageId : null);
  const stageFields = useMemo(
    () =>
      (stageFieldsQuery.data ?? []).map((field) => ({
        ...apiResponseToConfig(field),
        readOnly: true,
      })),
    [stageFieldsQuery.data],
  );
  const customValues = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const row of fieldValuesQuery.data ?? []) {
      out[row.entityFieldId] = row.value;
    }
    return out;
  }, [fieldValuesQuery.data]);

  if (!request) return null;
  const requesterLabel =
    request.requesterName ||
    fallbackUserLabel(request.requesterUserId, userMap) ||
    'Unknown requester';
  const rejectedByLabel =
    request.rejectedByName ||
    fallbackUserLabel(request.rejectedByUserId, userMap) ||
    'Unknown reviewer';

  const detailLoading =
    entityType === 'LEAD'
      ? leadDetailQuery.isLoading
      : dealDetailQuery.isLoading;
  const detailError =
    entityType === 'LEAD' ? leadDetailQuery.isError : dealDetailQuery.isError;
  const leadDetail = entityType === 'LEAD' ? leadDetailQuery.data : null;
  const dealDetail = entityType === 'DEAL' ? dealDetailQuery.data : null;
  const hasPendingLock = Boolean(
    leadDetail?.pendingApproval || dealDetail?.pendingApproval,
  );
  const canResubmit =
    isRequester &&
    (request.status === 'rejected' || request.status === 'cancelled') &&
    !detailError &&
    // Stage move may already have created/reactivated a pending lock — avoid
    // a confusing second resubmit until that one is decided or cancelled.
    !hasPendingLock;

  const contactName = (
    contact?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null,
  ) => {
    if (!contact) return null;
    const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
    return name || contact.email || null;
  };

  const leadStandardDetails = leadDetail
    ? [
        { label: 'Name', value: leadDetail.name },
        { label: 'Customer', value: leadDetail.customer?.accountName },
        { label: 'Contact', value: contactName(leadDetail.contact) },
        { label: 'Email', value: leadDetail.contact?.email },
        { label: 'Phone', value: leadDetail.contact?.phoneNumber },
        {
          label: 'Value',
          value: formatMoney(
            Number(leadDetail.value) || 0,
            leadDetail.currency || 'ETB',
          ),
        },
        { label: 'Currency', value: leadDetail.currency },
        {
          label: 'Expected close',
          value: leadDetail.expectedClose
            ? String(leadDetail.expectedClose).split('T')[0]
            : null,
        },
        { label: 'Stage', value: leadDetail.stage?.name },
        { label: 'Status', value: leadDetail.status },
        {
          label: 'Responsible',
          value:
            leadDetail.responsibleUser?.name ??
            leadDetail.responsibleUser?.email,
        },
        {
          label: 'Observers',
          value: Array.isArray(leadDetail.observers)
            ? leadDetail.observers
                .map(
                  (o: { name?: string | null; email?: string | null }) =>
                    o.name ?? o.email ?? '',
                )
                .filter(Boolean)
                .join(', ') || null
            : null,
        },
        { label: 'Current state', value: leadDetail.currentState },
        { label: 'Next step', value: leadDetail.nextStep },
        { label: 'Description', value: leadDetail.description },
      ]
    : [];
  const dealStandardDetails = dealDetail
    ? [
        { label: 'Name', value: dealDetail.name },
        { label: 'Customer', value: dealDetail.customer?.accountName },
        { label: 'Contact', value: contactName(dealDetail.contact) },
        { label: 'Email', value: dealDetail.contact?.email },
        { label: 'Phone', value: dealDetail.contact?.phoneNumber },
        {
          label: 'Value',
          value: formatMoney(
            Number(dealDetail.value) || 0,
            dealDetail.currency || 'ETB',
          ),
        },
        { label: 'Currency', value: dealDetail.currency },
        {
          label: 'Expected close',
          value: dealDetail.expectedClose
            ? String(dealDetail.expectedClose).split('T')[0]
            : null,
        },
        { label: 'Stage', value: dealDetail.stage?.name },
        { label: 'Status', value: dealDetail.status },
        {
          label: 'Responsible',
          value:
            dealDetail.responsibleUser?.name ??
            dealDetail.responsibleUser?.email,
        },
        {
          label: 'Observers',
          value: Array.isArray(dealDetail.observers)
            ? dealDetail.observers
                .map(
                  (o: { name?: string | null; email?: string | null }) =>
                    o.name ?? o.email ?? '',
                )
                .filter(Boolean)
                .join(', ') || null
            : null,
        },
        { label: 'Description', value: dealDetail.description },
      ]
    : [];
  const standardDetails =
    entityType === 'LEAD' ? leadStandardDetails : dealStandardDetails;

  const footerHint = (() => {
    if (canDecide) return null;

    const closedStatus =
      request.status === 'rejected' || request.status === 'cancelled'
        ? request.status
        : null;

    if (closedStatus) {
      const targetLabel =
        request.pendingTargetStageName || request.requestedStageName || null;
      const recordLabel = pipelineEntityNoun(
        entityType === 'LEAD' ? 'LEAD' : 'DEAL',
        { lowercase: true },
      );

      if (hasPendingLock) {
        return closedStatus === 'rejected'
          ? `Rejected by ${rejectedByLabel}. This ${recordLabel} already has another approval request pending${
              targetLabel ? ` (toward “${targetLabel}”)` : ''
            }, so you cannot resubmit this one. Open the pending request to approve, reject, or cancel it first.`
          : `This request was cancelled. This ${recordLabel} already has another approval request pending${
              targetLabel ? ` (toward “${targetLabel}”)` : ''
            }, so you cannot resubmit this one. Open the pending request to approve, reject, or cancel it first.`;
      }

      if (!isRequester) {
        return closedStatus === 'rejected'
          ? `Rejected by ${rejectedByLabel}. Only the original requester can resubmit.`
          : 'This request was cancelled. Only the original requester can resubmit.';
      }

      return closedStatus === 'rejected'
        ? `Rejected by ${rejectedByLabel}. You can resubmit to reopen approval for ${
            targetLabel ? `“${targetLabel}”` : 'the same target'
          }.`
        : `This request was cancelled. You can resubmit to reopen approval for ${
            targetLabel ? `“${targetLabel}”` : 'the same target'
          }.`;
    }

    if (request.status === 'approved') {
      return 'This request is fully approved. No further action is required.';
    }
    if (isRequesterOf(request, currentUserId)) {
      return 'You submitted this request. Approve/reject is only available to the assigned approver for the active step.';
    }
    return 'You can review progress here. Approve/reject is only available to the assigned active-step approver.';
  })();

  const banner = (() => {
    const base = request ? perspectiveBanner(request, currentUserId) : null;
    if (
      !base ||
      !hasPendingLock ||
      (request.status !== 'rejected' && request.status !== 'cancelled')
    ) {
      return base;
    }
    const recordLabel = pipelineEntityNoun(
      entityType === 'LEAD' ? 'LEAD' : 'DEAL',
      { lowercase: true },
    );
    return {
      ...base,
      detail: `${base.detail} A newer pending approval already locks this ${recordLabel}, so resubmit is unavailable until that request is decided or cancelled.`,
    };
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy && !nextOpen) {
          setDecisionNote('');
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
              <ClipboardCheck size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-[16px]">
                {request.entityName}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {reasonTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          className="space-y-5 overflow-y-auto px-6 py-5 scrollbar-hide"
          style={{ maxHeight: 'calc(88vh - 160px)' }}
        >
          {banner ? (
            <div
              className={cn('rounded-xl border px-4 py-3', banner.className)}
            >
              <p className="text-sm font-semibold">{banner.title}</p>
              <p className="mt-1 text-xs opacity-90">{banner.detail}</p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Request type
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'border text-[10px] font-medium',
                    triggerTone(request.triggerType),
                  )}
                >
                  {request.triggerType === 'stage_approval'
                    ? 'Stage approval'
                    : 'Validation exception'}
                </Badge>
                {request.workflowName ? (
                  <Badge
                    variant="outline"
                    className="border text-[10px] font-medium"
                  >
                    {request.workflowName}
                    {request.workflowVersionNumber != null
                      ? ` v${request.workflowVersionNumber}`
                      : ''}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Requested at
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatDateTime(request.createdAt)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatRelativeTime(request.createdAt)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stage transition
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-muted-foreground">
                {request.previousStageName || 'Current stage'}
              </span>
              <ArrowRight
                size={16}
                className="shrink-0 text-muted-foreground"
              />
              <span className="rounded-lg border border-brand/25 bg-brand-muted/35 px-3 py-2 font-medium text-foreground">
                {request.requestedStageName || 'Requested stage'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Entity
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {entityTypeBadgeLabel(request.entityType) || dealUiLabel()}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Requested by
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {requesterLabel}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Approval progress
            </p>
            <p className="mt-2 text-sm text-foreground">
              Step {request.currentStepOrder} of {request.totalSteps}
            </p>
            <div className="mt-3 space-y-2">
              {request.steps.map((step) => {
                const assigneeLabels = (step.assignees ?? [])
                  .map((a) => assigneeDisplayLabel(a, userMap))
                  .filter(Boolean);
                const isActive =
                  request.status === 'pending' &&
                  step.stepOrder === request.currentStepOrder;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-start justify-between gap-3 rounded-lg border bg-white px-3 py-2.5',
                      isActive
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-border',
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {step.stepOrder}.{' '}
                        {step.stepName ||
                          assigneeLabels.join(', ') ||
                          `Step ${step.stepOrder}`}
                      </p>
                      {assigneeLabels.length ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Assignees: {assigneeLabels.join(', ')}
                          {step.mode ? ` · ${step.mode}` : ''}
                        </p>
                      ) : null}
                      {step.decidedByUserId ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Decided by{' '}
                          {step.decidedByName ||
                            fallbackUserLabel(step.decidedByUserId, userMap) ||
                            step.decidedByUserId}
                          {step.decidedAt
                            ? ` on ${formatDateTime(step.decidedAt)}`
                            : ''}
                        </p>
                      ) : null}
                      {step.decisionNote ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Note: {step.decisionNote}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {step.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
            {request.status === 'rejected' ? (
              <p className="mt-3 text-xs text-red-700">
                Rejected by {rejectedByLabel}.
              </p>
            ) : null}
          </div>

          {request.validationSummary ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Validation details
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                {request.validationSummary}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Record details
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review the record information before approving or rejecting this
                request.
              </p>
            </div>

            {detailLoading ? (
              <div className="rounded-xl border border-border bg-surface-elevated px-4 py-6 text-center text-sm text-muted-foreground">
                Loading record details…
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                This{' '}
                {pipelineEntityNoun(entityType === 'LEAD' ? 'LEAD' : 'DEAL', {
                  lowercase: true,
                })}{' '}
                no longer exists (or you can&apos;t access it), so the request
                can&apos;t be resubmitted. Start a new stage move from an active
                record instead.
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {standardDetails.map((item) => (
                    <DetailItem
                      key={item.label}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Custom fields
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Includes the custom values currently stored on this
                      record.
                    </p>
                  </div>

                  {stageFieldsQuery.isLoading && stageId ? (
                    <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4 text-sm text-muted-foreground">
                      Loading custom fields…
                    </div>
                  ) : stageFields.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4 text-sm text-muted-foreground">
                      No custom field values were added to this record.
                    </div>
                  ) : (
                    <EntityCustomFieldsForm
                      fields={stageFields}
                      values={customValues}
                      onChange={() => undefined}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {canDecide || canCancel || canResubmit ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {canDecide ? 'Decision note' : 'Optional note'}
              </p>
              <Textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  canDecide
                    ? 'Add an optional note for the requester'
                    : canResubmit
                      ? 'Optional note for the resubmitted request'
                      : 'Optional cancellation reason'
                }
                className="min-h-[96px] border-border bg-surface-card text-sm"
                disabled={busy}
              />
            </div>
          ) : null}

          {canReassign && activeStep ? (
            <div className="space-y-2 rounded-xl border border-border bg-surface-elevated px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reassign active step
              </p>
              <p className="text-xs text-muted-foreground">
                Replace a pending assignee on step {activeStep.stepOrder}{' '}
                without changing past decisions.
              </p>
              <Select
                value={reassignUserId}
                onValueChange={setReassignUserId}
                disabled={busy}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select new approver" />
                </SelectTrigger>
                <SelectContent>
                  {[...userMap.entries()].map(([id, user]) => (
                    <SelectItem key={id} value={id}>
                      {user.name || user.email || id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !reassignUserId}
                onClick={() => {
                  if (!reassignUserId || !activeStep) return;
                  const selected = userMap.get(reassignUserId);
                  onReassign({
                    stepId: activeStep.id,
                    toApproverUserId: reassignUserId,
                    fromApproverUserId: pendingAssignees[0]?.approverUserId,
                    toApproverName:
                      selected?.name || selected?.email || undefined,
                  });
                  setReassignUserId('');
                }}
              >
                Reassign step
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {canCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-border"
                  onClick={() =>
                    onCancel(decisionNote.trim() || 'Cancelled by requester')
                  }
                  disabled={busy}
                >
                  Cancel request
                </Button>
              ) : null}
              {canResubmit ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-sky-200 text-sky-800 hover:bg-sky-50"
                  onClick={() => onResubmit(decisionNote.trim() || undefined)}
                  disabled={busy}
                >
                  Resubmit request
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {canDecide ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => onReject(decisionNote.trim() || undefined)}
                    disabled={busy}
                  >
                    <X size={14} className="mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                    onClick={() => onApprove(decisionNote.trim() || undefined)}
                    disabled={busy}
                  >
                    <Check size={14} className="mr-1.5" />
                    Approve
                  </Button>
                </>
              ) : !canCancel && !canResubmit ? (
                <p className="w-full max-w-md text-center text-xs leading-relaxed text-muted-foreground sm:text-right">
                  {footerHint}
                </p>
              ) : null}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PipelineApprovalRequestsCardProps {
  entityType: PipelineApprovalEntityType;
  className?: string;
  /** When false, only deep-link auto-open modal is rendered (detail pages). */
  showList?: boolean;
}

export function PipelineApprovalRequestsCard({
  entityType,
  className,
  showList = true,
}: PipelineApprovalRequestsCardProps) {
  const currentUserId = useAuthenticationStore((s) => s.userId);
  const { approvalRequestId, clearApprovalRequestId } =
    useApprovalRequestDeepLink();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<PipelineApprovalRequest | null>(null);
  const handledFocusRef = useRef<string | null>(null);

  const requestsQuery = usePipelineApprovalRequests({
    entityType,
    enabled: showList,
  });
  const focusedQuery = usePipelineApprovalRequest(approvalRequestId, {
    enabled: !!approvalRequestId,
  });
  const approve = useApprovePipelineRequest();
  const reject = useRejectPipelineRequest();
  const cancel = useCancelPipelineRequest();
  const resubmit = useResubmitPipelineRequest();
  const reassign = useReassignPipelineApprovalStep();
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const requests = useMemo(
    () => requestsQuery.data ?? [],
    [requestsQuery.data],
  );
  const actionableCount = useMemo(
    () => requests.filter((r) => userCanDecideRequest(r, currentUserId)).length,
    [requests, currentUserId],
  );
  const busy =
    approve.isLoading ||
    reject.isLoading ||
    cancel.isLoading ||
    resubmit.isLoading ||
    reassign.isLoading;
  const entityLabel = pipelineEntityNoun(entityType, {
    plural: true,
    lowercase: true,
  });
  const userMap = useMemo(
    () =>
      new Map(
        (platformUsersData?.data ?? []).map((user) => [
          user.id,
          {
            name: formatUserName(user) || null,
            email: user.email ?? null,
          },
        ]),
      ),
    [platformUsersData?.data],
  );

  useEffect(() => {
    if (!approvalRequestId) {
      handledFocusRef.current = null;
      return;
    }
    if (handledFocusRef.current === approvalRequestId) return;

    const fromList = requests.find((r) => r.id === approvalRequestId);
    const fromFetch =
      focusedQuery.data && focusedQuery.data.id === approvalRequestId
        ? focusedQuery.data
        : null;
    const target = fromList ?? fromFetch;
    if (!target) {
      if (focusedQuery.isError) {
        handledFocusRef.current = approvalRequestId;
      }
      return;
    }
    if (target.entityType !== entityType) return;

    handledFocusRef.current = approvalRequestId;
    setSelectedRequest(target);
    setHighlightedId(target.id);

    if (showList && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const timer = window.setTimeout(() => setHighlightedId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [
    approvalRequestId,
    entityType,
    focusedQuery.data,
    focusedQuery.isError,
    requests,
    showList,
  ]);

  function closeSelected(open: boolean) {
    if (open) return;
    setSelectedRequest(null);
    if (approvalRequestId) clearApprovalRequestId();
  }

  return (
    <>
      {showList ? (
        <div
          ref={cardRef}
          className={cn(
            'flex h-[18rem] w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]',
            highlightedId
              ? 'border-amber-400 ring-2 ring-amber-300/60'
              : 'border-border',
            className,
          )}
        >
          <div className="flex h-full min-h-0 flex-col gap-1 p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ClipboardCheck size={15} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-foreground">
                  Approval requests
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {requests.length
                    ? `${actionableCount} need your action · ${requests.length} total`
                    : `No pending ${entityLabel}`}
                </p>
              </div>
              {requests.length ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  {requests.length}
                </span>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide">
              {requestsQuery.isError ? (
                <div className="flex flex-1 items-center justify-center py-6 text-center text-[10.5px] text-red-600">
                  Unable to load approval requests.
                </div>
              ) : requestsQuery.isLoading ? (
                <div className="flex flex-1 items-center justify-center py-6 text-center text-[10.5px] text-muted-foreground">
                  Loading…
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-6 text-center text-[10.5px] text-muted-foreground">
                  You have no pending approval requests.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {requests.map((request) => (
                    <ApprovalRequestRow
                      key={request.id}
                      request={request}
                      userMap={userMap}
                      currentUserId={currentUserId}
                      highlighted={highlightedId === request.id}
                      onOpen={() => setSelectedRequest(request)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ApprovalRequestDetailModal
        request={selectedRequest}
        userMap={userMap}
        currentUserId={currentUserId}
        open={!!selectedRequest}
        busy={busy}
        onOpenChange={closeSelected}
        onApprove={(decisionNote) => {
          if (!selectedRequest) return;
          approve.mutate(
            { id: selectedRequest.id, decisionNote },
            {
              onSuccess: () => {
                setSelectedRequest(null);
                if (approvalRequestId) clearApprovalRequestId();
              },
            },
          );
        }}
        onReject={(decisionNote) => {
          if (!selectedRequest) return;
          reject.mutate(
            { id: selectedRequest.id, decisionNote },
            {
              onSuccess: () => {
                setSelectedRequest(null);
                if (approvalRequestId) clearApprovalRequestId();
              },
            },
          );
        }}
        onCancel={(reason) => {
          if (!selectedRequest) return;
          cancel.mutate(
            { id: selectedRequest.id, reason },
            {
              onSuccess: () => {
                setSelectedRequest(null);
                if (approvalRequestId) clearApprovalRequestId();
              },
            },
          );
        }}
        onResubmit={(note) => {
          if (!selectedRequest) return;
          resubmit.mutate(
            { id: selectedRequest.id, note },
            {
              onSuccess: (created) => {
                const next =
                  created && typeof created === 'object' && 'id' in created
                    ? (created as PipelineApprovalRequest)
                    : null;
                setSelectedRequest(next);
                if (approvalRequestId) clearApprovalRequestId();
              },
            },
          );
        }}
        onReassign={(payload) => {
          if (!selectedRequest) return;
          reassign.mutate(
            {
              id: selectedRequest.id,
              stepId: payload.stepId,
              toApproverUserId: payload.toApproverUserId,
              fromApproverUserId: payload.fromApproverUserId,
              toApproverName: payload.toApproverName,
            },
            {
              onSuccess: (updated) => {
                if (updated && typeof updated === 'object' && 'id' in updated) {
                  setSelectedRequest(updated as PipelineApprovalRequest);
                }
              },
            },
          );
        }}
      />
    </>
  );
}

/** Modal-only host for Lead/Deal detail pages deep-linked from notifications/activity. */
export function ApprovalRequestDeepLinkHost({
  entityType,
}: {
  entityType: PipelineApprovalEntityType;
}) {
  return (
    <PipelineApprovalRequestsCard entityType={entityType} showList={false} />
  );
}
