import { useMutation, useQuery, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

export const PIPELINE_APPROVAL_URL = `${CRM_URL}/pipeline/approval-requests`;
export const PIPELINE_URL = `${CRM_URL}/pipeline`;

export type PipelineApprovalEntityType = 'LEAD' | 'DEAL';
export type PipelineApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'cancelled';
export type PipelineApprovalTrigger = 'stage_approval' | 'rule_exception';
export type ApprovalStepMode = 'ANY' | 'ALL' | 'MINIMUM_COUNT';
export type ApprovalApproverType =
  | 'specific_users'
  | 'role'
  | 'record_owner'
  | 'record_creator'
  | 'creator_team_leader'
  | 'creator_department_manager'
  | 'creator_direct_manager'
  | 'owner_team_leader'
  | 'owner_department_manager'
  | 'owner_direct_manager'
  | 'user_field'
  | 'user_field_team_leader'
  | 'user_field_department_manager'
  | 'user_field_direct_manager'
  | 'solution_assignees'
  | 'solution_assignee_team_leader'
  | 'solution_assignee_department_manager'
  | 'solution_assignee_direct_manager';

export interface ApprovalPreflightIssue {
  code: string;
  message: string;
  remediation: string[];
}

export interface ApprovalPreflightAssignee {
  userId: string;
  userName?: string | null;
}

export interface ApprovalPreflightStep {
  stepOrder: number;
  stepName: string;
  approverType: ApprovalApproverType | string;
  subjectSource?: string;
  subjectRelation?: string;
  subjectFieldId?: string | null;
  approverLabel: string;
  status: 'ok' | 'blocked';
  assignees: ApprovalPreflightAssignee[];
  issue: ApprovalPreflightIssue | null;
}

export interface ApprovalPreflightResult {
  canCreate: boolean;
  workflowId: string;
  workflowName: string;
  versionNumber: number;
  summary?: string | null;
  ownerUserId?: string | null;
  ownerUserName?: string | null;
  steps: ApprovalPreflightStep[];
  workflowIssue?: ApprovalPreflightIssue | null;
  priorRequestState?:
    | 'none'
    | 'already_approved'
    | 'reactivate_cancelled'
    | 'reactivate_rejected';
  priorRequestId?: string | null;
  priorRequestLabel?: string | null;
  bypassApproval?: boolean;
}

export async function preflightApprovalWorkflow(
  workflowId: string,
  body: {
    entityType: PipelineApprovalEntityType;
    entityId: string;
    ownerUserId?: string | null;
    triggerType: PipelineApprovalTrigger;
    pendingTargetStageId?: string | null;
    exceptionFieldIds?: string[];
  },
): Promise<ApprovalPreflightResult> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${PIPELINE_URL}/approval-workflows/${workflowId}/preflight`,
    method: 'POST',
    headers,
    data: {
      entityType: body.entityType,
      entityId: body.entityId,
      triggerType: body.triggerType,
      ...(body.ownerUserId ? { ownerUserId: body.ownerUserId } : {}),
      ...(body.pendingTargetStageId
        ? { pendingTargetStageId: body.pendingTargetStageId }
        : {}),
      ...(body.exceptionFieldIds?.length
        ? { exceptionFieldIds: body.exceptionFieldIds }
        : {}),
    },
  });
}

export interface PipelineApprovalAssignee {
  id: string;
  stepId: string;
  approverUserId: string;
  approverName?: string | null;
  sourceApproverType: ApprovalApproverType;
  status: PipelineApprovalStatus;
  decisionNote?: string | null;
  decidedAt?: string | null;
}

export interface PipelineApprovalStep {
  id: string;
  requestId: string;
  stepOrder: number;
  stepName?: string | null;
  mode: ApprovalStepMode;
  minimumCount?: number | null;
  status: PipelineApprovalStatus;
  decisionNote?: string | null;
  decidedByUserId?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  assignees: PipelineApprovalAssignee[];
}

export interface PipelineApprovalRequest {
  id: string;
  entityType: PipelineApprovalEntityType;
  entityId: string;
  entityName: string;
  workflowId?: string | null;
  workflowVersionId?: string | null;
  workflowName?: string | null;
  workflowVersionNumber?: number | null;
  triggerType: PipelineApprovalTrigger;
  currentStageId?: string | null;
  currentStageName?: string | null;
  pendingTargetStageId?: string | null;
  pendingTargetStageName?: string | null;
  /** Compatibility aliases */
  requestedStageId?: string | null;
  requestedStageName?: string | null;
  previousStageId?: string | null;
  previousStageName?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  currentApproverUserId?: string | null;
  currentApproverName?: string | null;
  requesterUserId?: string | null;
  requesterName?: string | null;
  status: PipelineApprovalStatus;
  validationSummary?: string | null;
  ruleExceptionPayload?: unknown;
  decisionNote?: string | null;
  currentStepOrder: number;
  totalSteps: number;
  rejectedByUserId?: string | null;
  rejectedByName?: string | null;
  decidedAt?: string | null;
  steps: PipelineApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    updatedBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export function usePipelineApprovalRequests(params?: {
  entityType?: PipelineApprovalEntityType;
  status?: PipelineApprovalStatus;
  enabled?: boolean;
}) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);

  return useQuery({
    queryKey: [
      'pipeline-approval-requests',
      tenantId,
      userId,
      params?.entityType,
      params?.status ?? 'pending',
    ],
    queryFn: async (): Promise<PipelineApprovalRequest[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: PIPELINE_APPROVAL_URL,
        method: 'GET',
        headers,
        params: {
          ...(params?.entityType ? { entityType: params.entityType } : {}),
          status: params?.status ?? 'pending',
        },
      });
      return Array.isArray(response) ? response : [];
    },
    enabled: params?.enabled !== false && !!tenantId && !!userId,
    refetchInterval: 30_000,
  });
}

export function usePipelineApprovalRequest(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);
  const enabled = options?.enabled !== false && !!id && !!tenantId && !!userId;

  return useQuery({
    queryKey: ['pipeline-approval-request', tenantId, userId, id],
    queryFn: async (): Promise<PipelineApprovalRequest> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_APPROVAL_URL}/${id}`,
        method: 'GET',
        headers,
      });
    },
    enabled,
    retry: false,
  });
}

function invalidateApprovalQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['pipeline-approval-requests'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-approval-request'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
  queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
  queryClient.invalidateQueries({ queryKey: ['deal-stages'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-module-dashboard'] });
}

export function useApprovePipelineRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; decisionNote?: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_APPROVAL_URL}/${payload.id}/approve`,
        method: 'PATCH',
        headers,
        data: { decisionNote: payload.decisionNote },
      });
    },
    onSuccess: () => invalidateApprovalQueries(queryClient),
  });
}

export function useRejectPipelineRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; decisionNote?: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_APPROVAL_URL}/${payload.id}/reject`,
        method: 'PATCH',
        headers,
        data: { decisionNote: payload.decisionNote },
      });
    },
    onSuccess: () => invalidateApprovalQueries(queryClient),
  });
}

export function useCancelPipelineRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; reason?: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_APPROVAL_URL}/${payload.id}/cancel`,
        method: 'POST',
        headers,
        data: { reason: payload.reason },
      });
    },
    onSuccess: () => invalidateApprovalQueries(queryClient),
  });
}

export function useResubmitPipelineRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; note?: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_APPROVAL_URL}/${payload.id}/resubmit`,
        method: 'POST',
        headers,
        data: { note: payload.note },
      });
    },
    onSuccess: () => invalidateApprovalQueries(queryClient),
  });
}

export function useReassignPipelineApprovalStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      stepId: string;
      toApproverUserId: string;
      fromApproverUserId?: string;
      toApproverName?: string;
      note?: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_APPROVAL_URL}/${payload.id}/steps/${payload.stepId}/reassign`,
        method: 'PATCH',
        headers,
        data: {
          toApproverUserId: payload.toApproverUserId,
          fromApproverUserId: payload.fromApproverUserId,
          toApproverName: payload.toApproverName,
          note: payload.note,
        },
      });
    },
    onSuccess: () => invalidateApprovalQueries(queryClient),
  });
}
