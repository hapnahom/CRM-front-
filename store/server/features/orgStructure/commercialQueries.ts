import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import { formatUserName } from '@/lib/format-user-name';
import { normalizeTeamTargetParentLevel } from '@/lib/teamTargetParent';
import type {
  CommercialTeamMember,
  SalesTeam,
} from '@/store/server/features/salesTargeting/types';
import type {
  CrmTeam,
  CrmTeamMember,
} from '@/store/server/features/teams/types';
import {
  fetchTeamMembers,
  fetchTeams,
} from '@/store/server/features/teams/queries';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }
  return failureCount < 3;
};

function toSalesTeam(team: CrmTeam): SalesTeam {
  return {
    id: team.id,
    name: team.name,
    parentDepartmentId: team.departmentId,
    parentDepartmentName: team.department?.name ?? '',
    targetParentLevel: normalizeTeamTargetParentLevel(team.targetParentLevel),
    teamLeadId: team.teamLeadId ?? null,
  };
}

function toCommercialMember(member: CrmTeamMember): CommercialTeamMember {
  const displayName = member.name?.trim() ?? '';
  const parts = displayName ? displayName.split(/\s+/) : [];
  return {
    id: member.id,
    selamnewId: member.selamnewId ?? undefined,
    firstName: parts[0],
    lastName: parts.length > 1 ? parts[parts.length - 1] : undefined,
    email: member.email ?? undefined,
  };
}

export const fetchCommercialTeams = async (): Promise<SalesTeam[]> => {
  const page = await fetchTeams({ pageSize: 500 });
  return page.data.map(toSalesTeam);
};

export const fetchMyTeam = async (): Promise<SalesTeam | null> => {
  try {
    const headers = await authHeaders();
    const team = (await crudRequest({
      url: `${CRM_URL}/teams/me`,
      method: 'GET',
      headers,
    })) as CrmTeam;
    return team?.id ? toSalesTeam(team) : null;
  } catch {
    return null;
  }
};

export const fetchMyTeamMembers = async (): Promise<CommercialTeamMember[]> => {
  const team = await fetchMyTeam();
  if (!team?.id) return [];
  const members = await fetchTeamMembers(team.id);
  return members.map(toCommercialMember);
};

export const fetchCommercialTeamMembers = async (
  teamId: string,
): Promise<CommercialTeamMember[]> => {
  const members = await fetchTeamMembers(teamId);
  return members.map(toCommercialMember);
};

/** @deprecated Use fetchCommercialTeams */
export const fetchSalesTeams = fetchCommercialTeams;

/** @deprecated Use fetchMyTeam */
export const fetchMySalesTeam = fetchMyTeam;

/** @deprecated Use fetchMyTeamMembers */
export const fetchMySalesTeamMembers = fetchMyTeamMembers;

/** @deprecated Use fetchCommercialTeamMembers */
export const fetchSalesTeamMembers = fetchCommercialTeamMembers;

/** @deprecated Use fetchCommercialTeams */
export const fetchPresalesTeams = fetchCommercialTeams;

/** @deprecated Use fetchCommercialTeamMembers */
export const fetchPresalesTeamMembers = fetchCommercialTeamMembers;

/** CRM users.id — only members with this can be assigned on leads/deals. */
export function commercialMemberAssignmentId(
  member: CommercialTeamMember,
): string {
  return member.id?.trim() ?? '';
}

/** @deprecated Use commercialMemberAssignmentId for lead/deal selects. */
export function commercialMemberId(member: CommercialTeamMember): string {
  return commercialMemberAssignmentId(member);
}

export function commercialMemberIsAssignable(
  member: CommercialTeamMember,
): boolean {
  return Boolean(commercialMemberAssignmentId(member));
}

export function commercialMemberLabel(member: CommercialTeamMember): string {
  return formatUserName(member, member.selamnewId || 'Unknown');
}

export const useGetCommercialTeams = (enabled = true) =>
  useQuery<SalesTeam[]>(['crm-teams-list'], fetchCommercialTeams, {
    enabled,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });

export const useGetMyTeam = (enabled = true) =>
  useQuery<SalesTeam | null>(['crm-my-team'], fetchMyTeam, {
    enabled,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });

export const useGetMyTeamMembers = (enabled = true) =>
  useQuery<CommercialTeamMember[]>(
    ['crm-my-team-members'],
    fetchMyTeamMembers,
    {
      enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetCommercialTeamMembers = (teamId?: string) =>
  useQuery<CommercialTeamMember[]>(
    ['crm-team-members', teamId],
    () => fetchCommercialTeamMembers(teamId!),
    {
      enabled: Boolean(teamId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

/** @deprecated Use useGetCommercialTeams */
export const useGetCommercialSalesTeams = useGetCommercialTeams;

/** @deprecated Use useGetMyTeam */
export const useGetMySalesTeam = useGetMyTeam;

/** @deprecated Use useGetMyTeamMembers */
export const useGetMySalesTeamMembers = useGetMyTeamMembers;

/** @deprecated Use useGetCommercialTeamMembers */
export const useGetCommercialSalesTeamMembers = useGetCommercialTeamMembers;

/** @deprecated Use useGetCommercialTeams */
export const useGetCommercialPresalesTeams = useGetCommercialTeams;

/** @deprecated Use useGetCommercialTeamMembers */
export const useGetCommercialPresalesTeamMembers = useGetCommercialTeamMembers;
