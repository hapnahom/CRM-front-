import { useMutation, useQuery, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

export const APPROVAL_WORKFLOWS_URL = `${CRM_URL}/approval-workflows`;

export type ApprovalWorkflowEntityScope = 'LEAD' | 'DEAL' | 'TARGET' | 'ANY';
export type ApprovalWorkflowTrigger =
  | 'stage_approval'
  | 'rule_exception'
  | 'sales_target_approval';
export type ApprovalStepMode = 'ANY' | 'ALL' | 'MINIMUM_COUNT';

export type ApprovalSubjectSource =
  | 'record_owner'
  | 'record_creator'
  | 'user_field'
  | 'solution_assignees'
  | 'specific_users'
  | 'role';

export type ApprovalSubjectRelation =
  | 'self'
  | 'team_leader'
  | 'department_manager'
  | 'direct_manager';

/** Derived / legacy snapshot type (subjectSource × subjectRelation). */
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

export interface ApprovalWorkflowStepDef {
  id?: string;
  stepOrder?: number;
  name: string;
  mode: ApprovalStepMode;
  minimumCount?: number | null;
  approverType: ApprovalApproverType;
  subjectSource?: ApprovalSubjectSource;
  subjectRelation?: ApprovalSubjectRelation;
  subjectFieldId?: string | null;
  targetUserIds?: string[] | null;
  targetRoleId?: string | null;
}

export interface ApprovalWorkflowVersionDetail {
  id: string;
  versionNumber: number;
  steps: ApprovalWorkflowStepDef[];
}

export interface ApprovalWorkflowSummary {
  id: string;
  name: string;
  description?: string | null;
  entityScope: ApprovalWorkflowEntityScope;
  allowedTriggerTypes: ApprovalWorkflowTrigger[];
  isActive: boolean;
  currentVersionNumber: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalWorkflowDetail extends ApprovalWorkflowSummary {
  version: ApprovalWorkflowVersionDetail | null;
}

export interface ApprovalWorkflowStepInput {
  name: string;
  mode: ApprovalStepMode;
  minimumCount?: number;
  subjectSource: ApprovalSubjectSource;
  subjectRelation: ApprovalSubjectRelation;
  subjectFieldId?: string;
  /** Optional; server derives from subjectSource × subjectRelation. */
  approverType?: ApprovalApproverType;
  targetUserIds?: string[];
  targetRoleId?: string;
}

export interface CreateApprovalWorkflowInput {
  name: string;
  description?: string;
  entityScope?: ApprovalWorkflowEntityScope;
  allowedTriggerTypes?: ApprovalWorkflowTrigger[];
  isActive?: boolean;
  steps: ApprovalWorkflowStepInput[];
}

export type UpdateApprovalWorkflowInput = Partial<CreateApprovalWorkflowInput>;

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

export function useApprovalWorkflows(params?: {
  activeOnly?: boolean;
  enabled?: boolean;
}) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);

  return useQuery({
    queryKey: [
      'approval-workflows',
      tenantId,
      userId,
      params?.activeOnly ?? false,
    ],
    queryFn: async (): Promise<ApprovalWorkflowSummary[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: APPROVAL_WORKFLOWS_URL,
        method: 'GET',
        headers,
        params: params?.activeOnly ? { activeOnly: 'true' } : undefined,
      });
      return Array.isArray(response) ? response : [];
    },
    enabled: params?.enabled !== false && !!tenantId && !!userId,
  });
}

export function useApprovalWorkflow(
  id: string | null | undefined,
  enabled = true,
) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);

  return useQuery({
    queryKey: ['approval-workflow', tenantId, userId, id],
    queryFn: async (): Promise<ApprovalWorkflowDetail> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${APPROVAL_WORKFLOWS_URL}/${id}`,
        method: 'GET',
        headers,
      });
    },
    enabled: enabled && !!id && !!tenantId && !!userId,
  });
}

function invalidateWorkflowQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
  queryClient.invalidateQueries({ queryKey: ['approval-workflow'] });
}

export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateApprovalWorkflowInput) => {
      const headers = await authHeaders();
      return crudRequest({
        url: APPROVAL_WORKFLOWS_URL,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<ApprovalWorkflowDetail>;
    },
    onSuccess: () => invalidateWorkflowQueries(queryClient),
  });
}

export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      data: UpdateApprovalWorkflowInput;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${APPROVAL_WORKFLOWS_URL}/${payload.id}`,
        method: 'PATCH',
        headers,
        data: payload.data,
      }) as Promise<ApprovalWorkflowDetail>;
    },
    onSuccess: () => invalidateWorkflowQueries(queryClient),
  });
}

export function useSetApprovalWorkflowActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${APPROVAL_WORKFLOWS_URL}/${payload.id}/active`,
        method: 'PATCH',
        headers,
        data: { isActive: payload.isActive },
      }) as Promise<ApprovalWorkflowDetail>;
    },
    onSuccess: () => invalidateWorkflowQueries(queryClient),
  });
}
