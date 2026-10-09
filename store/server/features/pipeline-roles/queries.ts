import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  authHeaders,
  PIPELINE_ROLES_URL,
  retryUnlessUnauthorized,
} from './api';

export type PipelineRoleAppliesTo = 'LEAD' | 'DEAL' | 'BOTH';
export type PipelineRoleAssignmentEntityType = 'LEAD' | 'DEAL';
export type PipelineRoleUsageContext = 'ENTITY' | 'SOLUTION';

export interface PipelineRoleDto {
  id: string;
  name: string;
  description?: string | null;
  usageContext?: PipelineRoleUsageContext;
  appliesTo: PipelineRoleAppliesTo;
  leadStageId?: string | null;
  dealStageId?: string | null;
  required: boolean;
  isPrimary: boolean;
  countsTowardTargetAchievement?: boolean;
  multiSelect?: boolean;
  exclusiveWithRoleIds?: string[];
  active: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export function isSolutionRole(role: PipelineRoleDto): boolean {
  return role.usageContext === 'SOLUTION';
}

export function isEntityRole(role: PipelineRoleDto): boolean {
  return role.usageContext !== 'SOLUTION';
}

export interface PipelineRoleUsageDto {
  leadCount: number;
  dealCount: number;
  solutionCount: number;
  assignmentCount: number;
}

export async function fetchPipelineRoleUsage(
  id: string,
): Promise<PipelineRoleUsageDto> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${PIPELINE_ROLES_URL}/${id}/usage`,
    method: 'GET',
    headers,
  }) as Promise<PipelineRoleUsageDto>;
}

export interface PipelineRoleAssignmentDto {
  id: string;
  entityType: PipelineRoleAssignmentEntityType;
  entityId: string;
  roleId: string;
  userId: string;
  roleName?: string;
  isPrimary?: boolean;
}

function asArray<T>(response: unknown): T[] {
  return Array.isArray(response) ? (response as T[]) : [];
}

export function usePipelineRoles(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-roles', tenantId],
    queryFn: async (): Promise<PipelineRoleDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: PIPELINE_ROLES_URL,
        method: 'GET',
        headers,
      });
      return asArray<PipelineRoleDto>(response);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePipelineRolesForStage(
  entityType: PipelineRoleAssignmentEntityType,
  stageId: string | null | undefined,
  options?: { enabled?: boolean; mode?: 'transition' | 'detail' },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;
  const mode = options?.mode ?? 'transition';

  return useQuery({
    queryKey: ['pipeline-roles-for-stage', entityType, stageId, tenantId, mode],
    queryFn: async (): Promise<PipelineRoleDto[]> => {
      const headers = await authHeaders();
      const modeQuery = mode === 'detail' ? '&mode=detail' : '';
      const response = await crudRequest({
        url: `${PIPELINE_ROLES_URL}/for-stage?entityType=${entityType}&stageId=${stageId}${modeQuery}`,
        method: 'GET',
        headers,
      });
      return asArray<PipelineRoleDto>(response);
    },
    enabled: Boolean(tenantId && stageId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePipelineRoleAssignments(
  entityType: PipelineRoleAssignmentEntityType,
  entityId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-role-assignments', entityType, entityId, tenantId],
    queryFn: async (): Promise<PipelineRoleAssignmentDto[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${PIPELINE_ROLES_URL}/assignments?entityType=${entityType}&entityId=${entityId}`,
        method: 'GET',
        headers,
      });
      return asArray<PipelineRoleAssignmentDto>(response);
    },
    enabled: Boolean(tenantId && entityId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useActiveSolutionRoles(options?: { enabled?: boolean }) {
  const query = usePipelineRoles(options);
  const roles = [...(query.data ?? [])]
    .filter((role) => role.active !== false && isSolutionRole(role))
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
  return { ...query, data: roles };
}

export async function fetchPipelineRoleAssignments(
  entityType: PipelineRoleAssignmentEntityType,
  entityId: string,
): Promise<PipelineRoleAssignmentDto[]> {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: `${PIPELINE_ROLES_URL}/assignments?entityType=${entityType}&entityId=${entityId}`,
    method: 'GET',
    headers,
  });
  return asArray<PipelineRoleAssignmentDto>(response);
}

export async function fetchPipelineRolesForStage(
  entityType: PipelineRoleAssignmentEntityType,
  stageId: string,
  mode: 'transition' | 'detail' = 'transition',
): Promise<PipelineRoleDto[]> {
  const headers = await authHeaders();
  const modeQuery = mode === 'detail' ? '&mode=detail' : '';
  const response = await crudRequest({
    url: `${PIPELINE_ROLES_URL}/for-stage?entityType=${entityType}&stageId=${stageId}${modeQuery}`,
    method: 'GET',
    headers,
  });
  return asArray<PipelineRoleDto>(response);
}
