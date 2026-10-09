'use client';

import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import {
  canEditDepartmentTargets,
  canEditTeamTargets,
} from '@/utils/dataScope';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useGetOrganizationStructureSettings } from '@/store/server/features/departments/queries';

function hasAny(slugs: string[]) {
  return AccessGuard.checkAnyAccess({ permissions: slugs });
}

/** Submit / update team target proposals. */
export function canSubmitTargetApprovals() {
  return (
    hasAny([
      PERMISSIONS.SUBMIT_TEAM_TARGET_REQUEST,
      PERMISSIONS.EDIT_TEAM_TARGETS,
    ]) || canEditTeamTargets()
  );
}

/** Department review queue + consolidation. */
export function canReviewDepartmentApprovals() {
  return (
    hasAny([
      PERMISSIONS.REVIEW_DEPARTMENT_TARGET_REQUESTS,
      PERMISSIONS.APPROVE_DEPARTMENT_TARGET_REQUEST,
      PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
    ]) || canEditDepartmentTargets()
  );
}

/** Assigned company chief (org chart) — not RBAC company-target permissions. */
export function useIsAssignedCompanyChief() {
  const userId = useAuthenticationStore((state) => state.userId);
  const { data: orgSettings } = useGetOrganizationStructureSettings();
  const chiefId = orgSettings?.companyChiefUserId?.trim();
  if (!userId || !chiefId) return false;
  return String(userId) === chiefId;
}

/** @deprecated Prefer useIsAssignedCompanyChief or approval-workspace-access API. */
export function canReviewCompanyApprovals() {
  return false;
}

export function canModifyTargetApprovals() {
  return (
    hasAny([
      PERMISSIONS.MODIFY_TARGET_REQUEST,
      PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
    ]) || canEditDepartmentTargets()
  );
}

export function canRejectTargetApprovals() {
  return (
    hasAny([
      PERMISSIONS.REJECT_TARGET_REQUEST,
      PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
    ]) || canEditDepartmentTargets()
  );
}

/** @deprecated Prefer useIsAssignedCompanyChief or approval-workspace-access API. */
export function canFinalizeTargetApprovals() {
  return false;
}

export function resolveApprovalWorkspaceAccess() {
  const canSubmit = canSubmitTargetApprovals();
  const canReviewDepartment = canReviewDepartmentApprovals();
  const canModify = canModifyTargetApprovals();
  const canReject = canRejectTargetApprovals();

  return {
    canSubmit,
    canReviewDepartment,
    canReviewCompany: false,
    canModify,
    canReject,
    canFinalize: false,
    canSeeMyApprovals: canReviewDepartment,
    canSeeApprovals: canReviewDepartment || canSubmit,
  };
}
