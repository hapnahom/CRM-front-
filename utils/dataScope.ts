'use client';

import AccessGuard from '@/utils/permissionGuard';
import {
  DashboardView,
  PERMISSIONS,
  TARGET_EDIT_COMPANY_SLUGS,
  TARGET_EDIT_DEPARTMENT_SLUGS,
  TARGET_EDIT_TEAM_SLUGS,
  TARGET_MODULE_ACCESS_PERMISSIONS,
  TARGET_VIEW_COMPANY_SLUGS,
  TARGET_VIEW_DEPARTMENT_SLUGS,
  TARGET_VIEW_TEAM_SLUGS,
} from '@/constants/permissions';

export type DataScopeLevel = 'company' | 'department' | 'team' | 'personal';

export type DataScope = {
  level: DataScopeLevel;
  dashboardView: DashboardView;
  label: string;
};

export { DashboardView };

function hasAny(slugs: readonly string[]) {
  return AccessGuard.checkAnyAccess({ permissions: [...slugs] });
}

export function resolveDashboardView(): DashboardView {
  if (
    AccessGuard.checkAccess({
      permissions: [PERMISSIONS.VIEW_EXECUTIVE_DASHBOARD],
    })
  ) {
    return DashboardView.Executive;
  }
  if (
    AccessGuard.checkAccess({
      permissions: [PERMISSIONS.VIEW_DEPARTMENT_DASHBOARD],
    })
  ) {
    return DashboardView.Department;
  }
  if (
    AccessGuard.checkAccess({ permissions: [PERMISSIONS.VIEW_TEAM_DASHBOARD] })
  ) {
    return DashboardView.TeamLeader;
  }
  return DashboardView.TeamMember;
}

/** Dashboard widgets — driven by dashboard permissions, not module permissions. */
export function resolveDashboardDataScope(): DataScope {
  const dashboardView = resolveDashboardView();
  if (dashboardView === DashboardView.Executive) {
    return { level: 'company', dashboardView, label: 'Company' };
  }
  if (dashboardView === DashboardView.Department) {
    return { level: 'department', dashboardView, label: 'Department' };
  }
  if (dashboardView === DashboardView.TeamLeader) {
    return { level: 'team', dashboardView, label: 'Team' };
  }
  return { level: 'personal', dashboardView, label: 'Personal' };
}

export function resolveTargetDataScope(): DataScope {
  if (hasAny(TARGET_VIEW_COMPANY_SLUGS)) {
    return {
      level: 'company',
      dashboardView: DashboardView.Executive,
      label: 'Company',
    };
  }
  if (hasAny(TARGET_VIEW_DEPARTMENT_SLUGS)) {
    return {
      level: 'department',
      dashboardView: DashboardView.Department,
      label: 'Department',
    };
  }
  if (hasAny(TARGET_VIEW_TEAM_SLUGS)) {
    return {
      level: 'team',
      dashboardView: DashboardView.TeamLeader,
      label: 'Team',
    };
  }
  return {
    level: 'personal',
    dashboardView: DashboardView.TeamMember,
    label: 'Personal',
  };
}

/** Pipeline / leads / deals — dashboard permissions only (not target permissions). */
export function resolveReportDataScope(): DataScope {
  return resolveDashboardDataScope();
}

export function canViewCompanyTargets() {
  return hasAny(TARGET_VIEW_COMPANY_SLUGS);
}

export function canEditCompanyTargets() {
  return hasAny(TARGET_EDIT_COMPANY_SLUGS);
}

export function canViewDepartmentTargets() {
  return canViewCompanyTargets() || hasAny(TARGET_VIEW_DEPARTMENT_SLUGS);
}

export function canEditDepartmentTargets() {
  return hasAny(TARGET_EDIT_DEPARTMENT_SLUGS);
}

export function canViewTeamTargets() {
  return canViewDepartmentTargets() || hasAny(TARGET_VIEW_TEAM_SLUGS);
}

export function canEditTeamTargets() {
  return hasAny(TARGET_EDIT_TEAM_SLUGS);
}

export function canEditOwnTargets() {
  return AccessGuard.checkAccess({ permissions: [PERMISSIONS.EDIT_TARGETS] });
}

export function canAccessTargetsModule() {
  return AccessGuard.checkAnyAccess({
    permissions: [...TARGET_MODULE_ACCESS_PERMISSIONS],
  });
}

/**
 * Forecast visibility is enforced by target data scope on the API (personal → own
 * opportunities, team → team, department → department, company → org-wide).
 */
export function canAccessForecast(): boolean {
  return true;
}

/** @deprecated Use {@link canAccessForecast} — scope is enforced server-side. */
export function hasViewForecastPermission(): boolean {
  return canAccessForecast();
}

/** @deprecated Use {@link canAccessForecast} */
export function canViewForecast(): boolean {
  return canAccessForecast();
}

/** Working/custom forecast mutations are scope-checked on the API. */
export function canEditForecast(): boolean {
  return canAccessForecast();
}

export function canCreateForecast(): boolean {
  return canAccessForecast();
}

export function canDeleteForecast(): boolean {
  return canAccessForecast();
}

export function canEditSettings() {
  return AccessGuard.checkAccess({ permissions: [PERMISSIONS.EDIT_SETTINGS] });
}

export function canViewSettings() {
  return (
    AccessGuard.checkAccess({ permissions: [PERMISSIONS.VIEW_SETTINGS] }) ||
    canEditSettings()
  );
}
