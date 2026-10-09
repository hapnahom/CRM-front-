import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { authHeaders, retryUnlessUnauthorized } from './api';

export interface FilterTreeMember {
  id: string;
  name: string | null;
  selamnewId: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface FilterTreeTeam {
  id: string;
  name: string;
  targetParentLevel: 'company' | 'department';
  teamLeadId?: string | null;
  members: FilterTreeMember[];
}

export interface FilterTreeDepartment {
  id: string;
  name: string;
  managerId?: string | null;
  teams: FilterTreeTeam[];
}

export type FilterTreeNode =
  | { kind: 'department'; id: string; name: string; teams: FilterTreeTeam[] }
  | {
      kind: 'team';
      id: string;
      name: string;
      targetParentLevel: 'company' | 'department';
      members: FilterTreeMember[];
      departmentId: string;
      departmentName: string;
    }
  | {
      kind: 'member';
      id: string;
      name: string | null;
      selamnewId: string | null;
      teamId: string;
      teamName: string;
      departmentId: string;
      departmentName: string;
    };

/**
 * Flatten the department tree into a list of all nodes for easier lookup.
 */
export function flattenFilterTree(
  departments: FilterTreeDepartment[],
): FilterTreeNode[] {
  const nodes: FilterTreeNode[] = [];
  for (const dept of departments) {
    nodes.push({
      kind: 'department',
      id: dept.id,
      name: dept.name,
      teams: dept.teams,
    });
    for (const team of dept.teams) {
      nodes.push({
        kind: 'team',
        id: team.id,
        name: team.name,
        targetParentLevel: team.targetParentLevel,
        members: team.members,
        departmentId: dept.id,
        departmentName: dept.name,
      });
      for (const member of team.members) {
        nodes.push({
          kind: 'member',
          id: member.id,
          name: member.name,
          selamnewId: member.selamnewId,
          teamId: team.id,
          teamName: team.name,
          departmentId: dept.id,
          departmentName: dept.name,
        });
      }
    }
  }
  return nodes;
}

export function usePipelineFilterTree() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['pipeline-filter-tree', tenantId],
    queryFn: async (): Promise<FilterTreeDepartment[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/departments/filter-tree`,
        method: 'GET',
        headers,
      });

      if (Array.isArray(response)) {
        return response as FilterTreeDepartment[];
      }
      // Some APIs wrap response in { data: [...] }
      if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        Array.isArray((response as any).data)
      ) {
        return (response as any).data as FilterTreeDepartment[];
      }
      return [];
    },
    enabled: Boolean(tenantId),
    retry: retryUnlessUnauthorized,
    /** Picker still works from flat /users when org tree is forbidden. */
    useErrorBoundary: false,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
