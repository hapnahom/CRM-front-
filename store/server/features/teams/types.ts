import type { TeamTargetParentLevel } from '@/lib/teamTargetParent';

export interface CrmTeamLead {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface CrmTeamMember {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  selamnewId?: string | null;
}

export interface CrmTeam {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  departmentId: string;
  department?: { id: string; name: string } | null;
  teamLeadId: string | null;
  teamLead?: CrmTeamLead | null;
  targetParentLevel: TeamTargetParentLevel;
  memberCount?: number;
  members?: CrmTeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTeams {
  data: CrmTeam[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateTeamPayload {
  name: string;
  departmentId: string;
  description?: string;
  teamLeadId: string;
  targetParentLevel?: TeamTargetParentLevel;
  memberIds?: string[];
}

export interface UpdateTeamPayload {
  name?: string;
  departmentId?: string;
  description?: string | null;
  teamLeadId?: string | null;
  targetParentLevel?: TeamTargetParentLevel;
}
