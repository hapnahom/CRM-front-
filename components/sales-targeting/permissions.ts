import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import {
  canEditCompanyTargets,
  canEditDepartmentTargets,
  canEditTeamTargets,
  canEditOwnTargets,
  canViewCompanyTargets,
  canAccessForecast,
  canViewTeamTargets,
} from '@/utils/dataScope';

export type SalesTargetingTab = 'overview' | 'annual' | 'sessions' | 'persons';

export const ST_PERMISSIONS = {
  VIEW_COMPANY: PERMISSIONS.VIEW_COMPANY_TARGETS,
  EDIT_COMPANY: PERMISSIONS.EDIT_COMPANY_TARGETS,
  VIEW_DEPARTMENT: PERMISSIONS.VIEW_DEPARTMENT_TARGETS,
  EDIT_DEPARTMENT: PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
  VIEW_TEAM: PERMISSIONS.VIEW_TEAM_TARGETS,
  EDIT_TEAM: PERMISSIONS.EDIT_TEAM_TARGETS,
  VIEW_MY: PERMISSIONS.VIEW_TARGETS,
  EDIT_MY: PERMISSIONS.EDIT_TARGETS,
} as const;

export function resolveSalesTargetPermissions() {
  const canManageCompanyAnnual = canEditCompanyTargets();
  const canManageDepartmentAnnual = canEditDepartmentTargets();
  const canManageTeamAnnual = canEditTeamTargets();
  const canManageTeamSessions = canEditTeamTargets();
  const canManageOwnTargets = canEditOwnTargets();
  const canViewCompany = canViewCompanyTargets();

  const canViewAny = AccessGuard.checkAnyAccess({
    permissions: [
      ST_PERMISSIONS.VIEW_COMPANY,
      ST_PERMISSIONS.EDIT_COMPANY,
      ST_PERMISSIONS.VIEW_DEPARTMENT,
      ST_PERMISSIONS.EDIT_DEPARTMENT,
      ST_PERMISSIONS.VIEW_TEAM,
      ST_PERMISSIONS.EDIT_TEAM,
      ST_PERMISSIONS.VIEW_MY,
      ST_PERMISSIONS.EDIT_MY,
    ],
  });

  return {
    canManageCompanyAnnual,
    canManageDepartmentAnnual,
    canManageTeamAnnual,
    canManageTeamSessions,
    canManageOwnTargets,
    canManageCompany: canManageCompanyAnnual,
    canViewCompany,
    isCompanyScope: canViewCompany,
    canViewAny,
  };
}

function resolveDefaultSalesTargetingTab(): SalesTargetingTab {
  return 'overview';
}

/** Tab visibility aligned with target scope. Forecast lives on its own page. */
export function resolveSalesTargetingTabAccess() {
  const canSeeForecast = canAccessForecast();
  const hasTeamOrHigherAccess = canViewTeamTargets();
  const canSeeAnnual = hasTeamOrHigherAccess;
  const canSeePeriods = hasTeamOrHigherAccess;
  const canSeePeople = true;

  const tabAccess: Record<SalesTargetingTab, boolean> = {
    overview: canViewTeamTargets() || canSeeForecast || canSeePeople,
    annual: canSeeAnnual,
    sessions: canSeePeriods,
    persons: canSeePeople,
  };

  const defaultTab = resolveDefaultSalesTargetingTab();

  return {
    tabAccess,
    defaultTab,
    canSeeForecast,
    canSeeOverview: tabAccess.overview,
    canSeeAnnual,
    canSeePeriods,
    canSeePeople,
  };
}

export function resolveAllowedSalesTargetingTab(
  requested: SalesTargetingTab | null,
): SalesTargetingTab {
  const { tabAccess, defaultTab } = resolveSalesTargetingTabAccess();
  if (requested && tabAccess[requested]) return requested;
  return defaultTab;
}
