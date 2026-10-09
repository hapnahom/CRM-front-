import type { TeamTargetParentLevel } from '@/lib/teamTargetParent';

// ─── UI types (TeamsTab / DepartmentTeamModals) ───────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  jobTitle?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  members: TeamMember[];
  createdAt: string;
  targetParentLevel?: TeamTargetParentLevel;
  teamLeadId?: string | null;
  teamLead?: { id: string; name: string | null } | null;
  memberCount?: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  teams: Team[];
  managerId?: string | null;
  manager?: { id: string; name: string | null } | null;
  /** Bottom-up / hybrid target proposals come from this department only. */
  isMain?: boolean;
}

// ─── CRM API types (queries / mutations) ──────────────────────────────────────

export interface OrganizationStructureSettings {
  tenantId: string;
  companyChiefUserId: string | null;
  companyChief?: DepartmentManager | null;
}

export interface UpdateOrganizationStructureSettingsPayload {
  companyChiefUserId?: string | null;
}

export interface DepartmentManager {
  id: string;
  selamnewId?: string | null;
  name: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface DepartmentTeamSummary {
  id: string;
  name: string;
  targetParentLevel: TeamTargetParentLevel;
  teamLeadId: string | null;
}

/** API department shape — no required nested Team[] with members. */
export interface CrmDepartment {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  managerId: string | null;
  manager: DepartmentManager | null;
  isMain?: boolean;
  teamsCount?: number;
  teams?: DepartmentTeamSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDepartments {
  data: CrmDepartment[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  managerId: string;
  isMain?: boolean;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string | null;
  managerId?: string | null;
  isMain?: boolean;
}
