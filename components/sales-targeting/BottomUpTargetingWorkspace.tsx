'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  X,
} from 'lucide-react';
import type { TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import {
  fetchTargetRequestAllowedActions,
  useGetSalesTargetingSettings,
  useGetTargetApprovalWorkspaceAccess,
  useGetTargetRequestReviewQueue,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { useApprovalWorkflow } from '@/store/server/features/pipeline/workflows';
import {
  useCreateTargetReview,
  useSubmitDepartmentConsolidation,
  useWithdrawTargetFromCompanyForward,
} from '@/store/server/features/salesTargeting/mutations';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { planUsesTargetRequestWorkflow } from '@/components/sales-targeting/targetSettingMethod';
import {
  isCompanyApprovedTargetRequestStatus,
  resolveCompanyOnlyTargetApproval,
} from '@/components/sales-targeting/hybridTargetApprovalWorkflow';
import {
  TeamProposalOpportunityPicker,
  linesFromRequestOpportunities,
  collapseDuplicateOpportunityLines,
  normalizeOpportunityLinesForTargetRequestApi,
  opportunityKey,
  sumAllocated,
  type OpportunityClaimHint,
  type ProposalOpportunityLine,
} from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import { isDepartmentOrHigherApproved } from '@/components/sales-targeting/targetRequestEditGuards';
import {
  mergedOpportunitiesForTeam,
  pickDepartmentWorkflowDisplayRequest,
  pickMyApprovalsCompanyApprovedTrackingRequest,
  pickMyApprovalsSubmittedToCompanyRequest,
} from '@/components/sales-targeting/targetRequestProposalRows';
import {
  buildDepartmentConsolidationGroupsForDept,
  type DepartmentConsolidationScopeGroup,
} from '@/components/sales-targeting/departmentConsolidationGroups';
import { countWaitingApprovalActions } from '@/components/sales-targeting/waitingApprovalActionCount';
import {
  PrimaryButton,
  TARGETS_CARD_CLASS,
  TARGETS_TABLE_HEAD_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { ProposalInboxStatusText } from '@/components/sales-targeting/planning/planningStatusDisplay';
import { resolveApprovalWorkspaceAccess } from '@/components/sales-targeting/approvalPermissions';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  SalesTargetRequest,
  SalesTargetReviewDecision,
  SalesTargetReviewLevel,
} from '@/store/server/features/salesTargeting/types';
import { RequestHistorySection } from '@/components/sales-targeting/planning/RequestHistorySection';
import { MemberProposalSubject } from '@/components/sales-targeting/planning/MemberProposalSubject';
import {
  collectMemberRequestUserIds,
  resolveMemberRequestDisplayName,
} from '@/components/sales-targeting/planning/planningMemberRequestLabel';
import { usePlanningPersonProfiles } from '@/components/sales-targeting/planning/planningPersonProfiles';

type ProposalPendingAction =
  | {
      requestId: string;
      kind: 'review';
      decision: SalesTargetReviewDecision;
      level: SalesTargetReviewLevel;
    }
  | {
      requestId: string;
      kind: 'modify-open';
      level: SalesTargetReviewLevel;
    }
  | { requestId: string; kind: 'modify-save' }
  | { requestId: string; kind: 'withdraw' };

function currentRevision(request?: SalesTargetRequest | null) {
  return request?.revisions?.find((r) => r.id === request.currentRevisionId);
}

/** My approvals only surfaces Pending and Approved — nothing else. */
function myApprovalsStatusLabel(
  status?: string | null,
): 'Pending' | 'Approved' | null {
  switch (status) {
    case 'PENDING_TEAM':
    case 'PENDING_DEPARTMENT':
    case 'PENDING_COMPANY':
    case 'PENDING_RECONCILIATION':
      return 'Pending';
    case 'COMPANY_APPROVED':
    case 'RECONCILED':
    case 'OFFICIAL':
      return 'Approved';
    default:
      return null;
  }
}

function approvalWorkspaceInboxContext(input: {
  showCompanyInbox: boolean;
  showDepartmentInbox: boolean;
  companyOnlyApproval: boolean;
}) {
  /** Company is the last configured step and this viewer uses the company inbox. */
  const companyStepApprovalViewer =
    input.showCompanyInbox &&
    (input.companyOnlyApproval || !input.showDepartmentInbox);

  /** Department-only workflow (one step, no company). */
  const departmentOnlyLastStep =
    input.showDepartmentInbox &&
    !input.showCompanyInbox &&
    !input.companyOnlyApproval;

  /** Last step in settings → second tab is “Approved”; else “Submitted”. */
  const trackingTabLabel: 'Approved' | 'Submitted' =
    companyStepApprovalViewer || departmentOnlyLastStep
      ? 'Approved'
      : 'Submitted';

  return {
    companyStepApprovalViewer,
    departmentOnlyLastStep,
    trackingTabLabel,
  };
}

/** B2T/Hybrid Submitted tab: dept-approved vs forwarded — never a lone “Approved” or “Submitted”. */
function trackingApprovalStatusLabel(
  status?: string | null,
  approvedTrackingTab = false,
): string | null {
  switch (status) {
    case 'DEPARTMENT_APPROVED':
      return 'Approved';
    case 'PENDING_COMPANY':
      return 'Submitted to company';
    case 'COMPANY_APPROVED':
    case 'PENDING_RECONCILIATION':
    case 'RECONCILED':
    case 'OFFICIAL':
      return approvedTrackingTab ? 'Approved' : 'Completed';
    default:
      return null;
  }
}

function isTrackingPipelineStatus(status?: string | null): boolean {
  return trackingApprovalStatusLabel(status) != null;
}

/** Submitted tab — forwarded to company or company-approved (not dept-approved-only). */
function isSubmittedAwaitingCompanyApproval(status?: string | null): boolean {
  return status === 'PENDING_COMPANY';
}

function isSubmittedTrackingStatus(status?: string | null): boolean {
  switch (status) {
    case 'PENDING_COMPANY':
    case 'COMPANY_APPROVED':
    case 'PENDING_RECONCILIATION':
    case 'RECONCILED':
    case 'OFFICIAL':
      return true;
    default:
      return false;
  }
}

function forwardScopeSelectionKey(
  departmentId: string,
  scopeKey: string,
): string {
  return `${departmentId}::${scopeKey}`;
}

function approvedForwardRequestIdsInScope(
  scopeGroup: DepartmentConsolidationScopeGroup,
): string[] {
  return scopeGroup.teamRows
    .filter((row) => row.status === 'DEPARTMENT_APPROVED')
    .map((row) => row.requestId)
    .filter(Boolean);
}

function resolveForwardSubmitRequestIds(
  scopeGroup: DepartmentConsolidationScopeGroup,
  selectedIds: string[],
): string[] {
  const approved = approvedForwardRequestIdsInScope(scopeGroup);
  if (!approved.length) return [];
  if (!selectedIds.length) return approved;
  const approvedSet = new Set(approved);
  const picked = selectedIds.filter((id) => approvedSet.has(id));
  return picked.length ? picked : approved;
}

function trackingStepLabel(
  status?: string | null,
  approvedTrackingTab = false,
): string | null {
  return trackingApprovalStatusLabel(status, approvedTrackingTab);
}

function isMyApprovalsListRequest(status?: string | null): boolean {
  return myApprovalsStatusLabel(status) != null;
}

/** UI: only teams that actually created/submitted a target request (not every sales team in the dept). */
function hasTeamTargetRequest(request?: SalesTargetRequest | null): boolean {
  if (!request?.id?.trim()) return false;
  const status = request.status ?? 'DRAFT';
  if (status === 'DRAFT') {
    return Boolean(
      request.submittedAt?.trim() || request.currentRevisionId?.trim(),
    );
  }
  return (
    isMyApprovalsListRequest(status) ||
    isDepartmentPackageStatus(status) ||
    isTrackingPipelineStatus(status)
  );
}

type MyApprovalInboxEntry = {
  request: SalesTargetRequest;
  level: SalesTargetReviewLevel;
  teamName: string;
  departmentName: string | null;
  departmentId: string | null;
  reportsToCompany: boolean;
  scopeLabel: string;
  displayOnly: boolean;
  /** Present on “submit to company” rows — manual forward selection. */
  forwardPackage?: { departmentId: string; scopeKey: string };
};

function pendingMyApprovalCount(items: MyApprovalInboxEntry[]): number {
  return items.filter((item) => !item.displayOnly).length;
}

function sortMyApprovalInboxEntries(
  a: MyApprovalInboxEntry,
  b: MyApprovalInboxEntry,
): number {
  const scopeCmp = a.scopeLabel.localeCompare(b.scopeLabel);
  if (scopeCmp !== 0) return scopeCmp;
  const teamCmp = a.teamName.localeCompare(b.teamName);
  if (teamCmp !== 0) return teamCmp;
  const aTime = a.request.submittedAt
    ? new Date(a.request.submittedAt).getTime()
    : 0;
  const bTime = b.request.submittedAt
    ? new Date(b.request.submittedAt).getTime()
    : 0;
  return aTime - bTime;
}

export type MyApprovalDeptSection = {
  id: string;
  heading: string;
  pendingCount: number;
  items: MyApprovalInboxEntry[];
  forwardPackageMeta?: { departmentId: string; scopeKey: string };
};

type MyApprovalSectionCountMode = 'pending-action' | 'all';

function sectionHeadingCount(
  items: MyApprovalInboxEntry[],
  mode: MyApprovalSectionCountMode,
): number {
  if (mode === 'all') return items.length;
  return pendingMyApprovalCount(items);
}

/** Group inbox by department + annual|period; badge counts follow countMode. */
export function buildMyApprovalDeptSections(
  inbox: MyApprovalInboxEntry[],
  countMode: MyApprovalSectionCountMode = 'pending-action',
): MyApprovalDeptSection[] {
  const byDept = new Map<
    string,
    {
      deptLabel: string;
      annual: MyApprovalInboxEntry[];
      period: MyApprovalInboxEntry[];
    }
  >();

  for (const item of inbox) {
    const deptKey =
      item.departmentId ??
      (item.reportsToCompany ? '__company__' : '__unknown__');
    const deptLabel =
      item.departmentName ??
      (item.reportsToCompany ? 'Company-direct teams' : 'Other teams');
    let row = byDept.get(deptKey);
    if (!row) {
      row = { deptLabel, annual: [], period: [] };
      byDept.set(deptKey, row);
    }
    if (requestScopeKey(item.request) === 'annual') {
      row.annual.push(item);
    } else {
      row.period.push(item);
    }
  }

  const sections: MyApprovalDeptSection[] = [];
  const sortedDepts = [...byDept.entries()].sort((a, b) =>
    a[1].deptLabel.localeCompare(b[1].deptLabel),
  );

  for (const [deptKey, row] of sortedDepts) {
    if (row.annual.length > 0) {
      const items = [...row.annual].sort(sortMyApprovalInboxEntries);
      const pendingCount = sectionHeadingCount(items, countMode);
      sections.push({
        id: `${deptKey}:annual`,
        heading: `${row.deptLabel} annual${
          pendingCount > 0 ? ` (${pendingCount})` : ''
        }`,
        pendingCount,
        items,
      });
    }
    if (row.period.length > 0) {
      const items = [...row.period].sort(sortMyApprovalInboxEntries);
      const pendingCount = sectionHeadingCount(items, countMode);
      sections.push({
        id: `${deptKey}:period`,
        heading: `${row.deptLabel} period${
          pendingCount > 0 ? ` (${pendingCount})` : ''
        }`,
        pendingCount,
        items,
      });
    }
  }

  return sections;
}

/** Company waiting inbox — one section; dept “Waiting approval” tab naming unchanged. */
export function buildCompanyWaitingSections(
  inbox: MyApprovalInboxEntry[],
): MyApprovalDeptSection[] {
  if (!inbox.length) return [];
  const items = [...inbox].sort(sortMyApprovalInboxEntries);
  const pendingCount = pendingMyApprovalCount(items);
  return [
    {
      id: 'company-waiting',
      heading:
        pendingCount > 0
          ? `Company review (${pendingCount})`
          : 'Company review',
      pendingCount,
      items,
    },
  ];
}

function submittedHistorySortTime(entry: MyApprovalInboxEntry): number {
  const request = entry.request;
  const submitted = request.submittedAt
    ? new Date(request.submittedAt).getTime()
    : 0;
  const updated = request.updatedAt ? new Date(request.updatedAt).getTime() : 0;
  return Math.max(submitted, updated);
}

function requestScopeKey(request: SalesTargetRequest): string {
  if (request.horizon === 'session' && request.sessionId) {
    return `session:${request.sessionId}`;
  }
  return 'annual';
}

function workflowScopeFromScopeKey(
  scopeKey: string,
  currencyId: string,
): {
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
} {
  if (scopeKey === 'annual') {
    return { horizon: 'annual', sessionId: null, currencyId };
  }
  return {
    horizon: 'session',
    sessionId: scopeKey.replace(/^session:/, ''),
    currencyId,
  };
}

function collectTeamScopeKeysForRequests(
  requests: SalesTargetRequest[],
  inScope: (request: SalesTargetRequest) => boolean,
): string[] {
  const keys = new Set<string>();
  for (const request of requests) {
    if (!request.teamId?.trim()) continue;
    if (!hasTeamTargetRequest(request)) continue;
    if (!inScope(request)) continue;
    keys.add(`${request.teamId.trim()}\0${requestScopeKey(request)}`);
  }
  return [...keys];
}

function pickTrackingDisplayForTeamScopeKey(
  requests: SalesTargetRequest[],
  teamScopeKey: string,
  currencyId: string,
  trackingTabLabel: 'Approved' | 'Submitted',
): SalesTargetRequest | undefined {
  const sep = teamScopeKey.indexOf('\0');
  if (sep <= 0) return undefined;
  const teamId = teamScopeKey.slice(0, sep);
  const scopeKey = teamScopeKey.slice(sep + 1);
  const scope = workflowScopeFromScopeKey(scopeKey, currencyId);
  return trackingTabLabel === 'Approved'
    ? pickMyApprovalsCompanyApprovedTrackingRequest(requests, teamId, scope)
    : pickMyApprovalsSubmittedToCompanyRequest(requests, teamId, scope);
}

function requestScopeLabel(
  request: SalesTargetRequest,
  sessions: { id: string; name?: string | null }[],
): string {
  if (request.horizon === 'session' && request.sessionId) {
    const session = sessions.find((s) => s.id === request.sessionId);
    if (session?.name?.trim()) {
      return `Period · ${session.name.trim()}`;
    }
    return `Period · ${request.sessionId.slice(0, 8)}`;
  }
  return 'Annual';
}

function buildPeerOpportunityClaimHintsForTeam(
  teamId: string,
  allRequests: SalesTargetRequest[],
  salesTeams: {
    id: string;
    name: string;
    parentDepartmentId?: string;
    parentDepartmentName?: string;
    targetParentLevel?: string;
  }[],
  teamOptions: { value: string; label: string }[],
): Map<string, OpportunityClaimHint> {
  const hints = new Map<string, OpportunityClaimHint>();
  for (const otherTeam of salesTeams) {
    if (otherTeam.id === teamId) continue;
    const sample = allRequests.find((row) => row.teamId === otherTeam.id);
    if (!sample?.teamId) continue;
    const scope = {
      horizon:
        sample.horizon === 'session'
          ? ('session' as const)
          : ('annual' as const),
      sessionId: sample.sessionId,
      currencyId: sample.currencyId,
    };
    const { teamName } = resolveSubmittedTeam(
      otherTeam.id,
      salesTeams,
      teamOptions,
    );
    for (const { request, opp } of mergedOpportunitiesForTeam(
      allRequests,
      otherTeam.id,
      scope,
    )) {
      const key = opportunityKey(opp.opportunityType, opp.opportunityId);
      const allocated = Number(opp.allocatedAmount) || 0;
      const pending = !isDepartmentOrHigherApproved(request.status);
      const existing = hints.get(key);
      if (existing) {
        const labels = existing.teamLabel.split(' · ');
        if (!labels.includes(teamName)) labels.push(teamName);
        hints.set(key, {
          teamLabel: labels.join(' · '),
          pending: existing.pending || pending,
          peerAllocatedTotal:
            Math.round((existing.peerAllocatedTotal + allocated) * 100) / 100,
        });
      } else {
        hints.set(key, {
          teamLabel: teamName,
          pending,
          peerAllocatedTotal: allocated,
        });
      }
    }
  }
  return hints;
}

function departmentScopedTeamsForDepartment(
  salesTeams: {
    id: string;
    name: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  departmentId: string,
) {
  const deptKey = departmentId.trim();
  if (!deptKey) return [];
  return salesTeams.filter(
    (team) =>
      team.targetParentLevel !== 'company' &&
      (team.parentDepartmentId?.trim() ?? '') === deptKey,
  );
}

/** Still in the department package — not forwarded to company yet. */
function isDepartmentPackageStatus(status?: string | null): boolean {
  return (
    status === 'DRAFT' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'DEPARTMENT_APPROVED'
  );
}

function resolveSubmittedTeam(
  teamId: string | null | undefined,
  salesTeams: {
    id: string;
    name: string;
    parentDepartmentId?: string;
    parentDepartmentName?: string;
    targetParentLevel?: string;
  }[],
  teamOptions: { value: string; label: string }[],
): {
  teamName: string;
  departmentName: string | null;
  departmentId: string | null;
  reportsToCompany: boolean;
} {
  const team = teamId ? salesTeams.find((row) => row.id === teamId) : undefined;
  const teamName =
    team?.name?.trim() ||
    teamOptions.find((t) => t.value === teamId)?.label ||
    (teamId ? `Team ${teamId.slice(0, 8)}` : 'Unknown team');
  const reportsToCompany = team?.targetParentLevel === 'company';
  const departmentName = reportsToCompany
    ? 'Company'
    : team?.parentDepartmentName?.trim() || null;
  const departmentId = reportsToCompany
    ? null
    : team?.parentDepartmentId?.trim() || null;
  return { teamName, departmentName, departmentId, reportsToCompany };
}

function includeInSubmittedApprovalInbox(
  request: SalesTargetRequest,
  managedDepartmentIds: string[],
  salesTeams: {
    id: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  effectiveDepartmentInbox: boolean,
  showCompanyInbox: boolean,
): boolean {
  const inDept = includeInMyApprovalsDepartmentInbox(
    request,
    managedDepartmentIds,
    salesTeams,
  );
  const status = request.status ?? '';

  if (status === 'DEPARTMENT_APPROVED') {
    return false;
  }

  if (status === 'PENDING_COMPANY') {
    return effectiveDepartmentInbox && inDept;
  }

  if (showCompanyInbox) {
    return isSubmittedTrackingStatus(status);
  }

  return (
    effectiveDepartmentInbox && inDept && isSubmittedTrackingStatus(status)
  );
}

/** Dept lead row edit uses DEPARTMENT review level even when company step is active. */
function isDepartmentPackageContentEditLevel(
  request: SalesTargetRequest,
  level: SalesTargetReviewLevel,
): boolean {
  return (
    level === 'DEPARTMENT' &&
    (request.status === 'DEPARTMENT_APPROVED' ||
      request.status === 'PENDING_COMPANY')
  );
}

/** Map UI row level + request status to the review level used for MODIFIED reviews. */
function resolveContentModifyReviewLevel(
  request: SalesTargetRequest,
  uiLevel: SalesTargetReviewLevel,
): SalesTargetReviewLevel {
  const status = request.status ?? '';
  if (
    status === 'PENDING_DEPARTMENT' ||
    status === 'DEPARTMENT_APPROVED' ||
    status === 'DEPARTMENT_REJECTED'
  ) {
    return 'DEPARTMENT';
  }
  if (status === 'PENDING_COMPANY') {
    return uiLevel === 'DEPARTMENT' ? 'DEPARTMENT' : 'COMPANY';
  }
  return uiLevel;
}

function requestInForwardToCompanySection(
  requestId: string,
  forwardToCompanySections: MyApprovalDeptSection[],
): boolean {
  return forwardToCompanySections.some((section) =>
    section.items.some((item) => item.request.id === requestId),
  );
}

/** Dept-scoped visibility: managers only see requests for teams in departments they lead. */
function isRequestInManagedDepartmentScope(
  request: SalesTargetRequest,
  salesTeams: {
    id: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  managedDepartmentIds: string[],
): boolean {
  if (!managedDepartmentIds.length) return true;
  return teamInManagedDepartments(
    request.teamId,
    salesTeams,
    managedDepartmentIds,
  );
}

function includeInMyApprovalsDepartmentInbox(
  request: SalesTargetRequest,
  managedDepartmentIds: string[],
  salesTeams: {
    id: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
): boolean {
  return isRequestInManagedDepartmentScope(
    request,
    salesTeams,
    managedDepartmentIds,
  );
}

function teamManagedDepartmentId(
  teamId: string | null | undefined,
  salesTeams: {
    id: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
): string | null {
  if (!teamId) return null;
  const team = salesTeams.find((row) => row.id === teamId);
  if (!team) return null;
  return team.parentDepartmentId?.trim() || null;
}

function teamInManagedDepartments(
  teamId: string | null | undefined,
  salesTeams: {
    id: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  managedDepartmentIds: string[],
): boolean {
  if (!managedDepartmentIds.length) return true;
  const deptId = teamManagedDepartmentId(teamId, salesTeams);
  // Align with requestInDepartmentReviewerScope — missing team dept must not hide inbox rows.
  if (!deptId) return true;
  return managedDepartmentIds.includes(deptId);
}

function inboxBadgeLabel(
  request: SalesTargetRequest,
  displayOnly: boolean,
  trackingView: boolean,
  options?: {
    companyStepViewer?: boolean;
    approvedTrackingTab?: boolean;
    reviewLevel?: SalesTargetReviewLevel;
  },
): string | null {
  const companyStepViewer = options?.companyStepViewer ?? false;
  const approvedTrackingTab = options?.approvedTrackingTab ?? false;
  if (trackingView) {
    return trackingApprovalStatusLabel(request.status, approvedTrackingTab);
  }
  if (displayOnly || request.status === 'DEPARTMENT_APPROVED') {
    if (request.status === 'DEPARTMENT_APPROVED') {
      return 'Approved';
    }
    return trackingApprovalStatusLabel(request.status, approvedTrackingTab);
  }
  if (
    companyStepViewer &&
    options?.reviewLevel === 'COMPANY' &&
    request.status === 'PENDING_COMPANY'
  ) {
    return 'Pending';
  }
  return myApprovalsStatusLabel(request.status);
}

type BottomUpTargetingWorkspaceProps = {
  /** Embedded inside Overview → Requests (no standalone page chrome). */
  embedded?: boolean;
  initialPanel?: 'action' | 'tracking';
};

export function BottomUpTargetingWorkspace({
  embedded = false,
  initialPanel = 'action',
}: BottomUpTargetingWorkspaceProps = {}) {
  const {
    plan,
    selectedPlanId,
    orgTargetSettingMethod,
    activePlanCurrency,
    activeCurrencyCode,
    teamOptions,
    salesTeams,
    sessions,
  } = useSalesTargeting();
  const planId = selectedPlanId ?? plan?.id;
  const currencyId = activePlanCurrency?.currencyId;
  const currencyCode = activeCurrencyCode || 'ETB';
  const requestWorkflowEnabled = Boolean(
    planId && planUsesTargetRequestWorkflow(plan, orgTargetSettingMethod),
  );
  const approvalAccess = useMemo(() => resolveApprovalWorkspaceAccess(), []);
  const { data: targetingSettings } = useGetSalesTargetingSettings(true);
  const { data: teamApprovalWorkflow } = useApprovalWorkflow(
    targetingSettings?.teamTargetApprovalWorkflowId,
    Boolean(
      targetingSettings?.enableApprovalWorkflows &&
        targetingSettings?.teamTargetApprovalWorkflowId,
    ),
  );
  const companyOnlyApproval = useMemo(
    () =>
      resolveCompanyOnlyTargetApproval({
        enableApprovalWorkflows: targetingSettings?.enableApprovalWorkflows,
        teamTargetApprovalWorkflowId:
          targetingSettings?.teamTargetApprovalWorkflowId,
        workflowStepCount: teamApprovalWorkflow?.version?.steps?.length,
      }),
    [
      targetingSettings?.enableApprovalWorkflows,
      targetingSettings?.teamTargetApprovalWorkflowId,
      teamApprovalWorkflow?.version?.steps?.length,
    ],
  );
  const { data: workspaceAccess } = useGetTargetApprovalWorkspaceAccess(
    planId,
    requestWorkflowEnabled,
  );
  const showTeamInbox = workspaceAccess?.teamInbox ?? false;
  const showDepartmentInbox =
    (workspaceAccess?.departmentInbox ?? false) && !companyOnlyApproval;
  const showCompanyInbox = workspaceAccess?.companyInbox ?? false;
  const inboxApprover =
    showTeamInbox || showDepartmentInbox || showCompanyInbox;
  const canModifyProposal = approvalAccess.canModify || inboxApprover;
  const canRejectProposal = approvalAccess.canReject || inboxApprover;
  const managedTeamIds = workspaceAccess?.managedTeamIds ?? [];
  const showDepartmentConsolidation =
    workspaceAccess?.departmentConsolidation ?? false;
  const managedDepartmentIds = workspaceAccess?.managedDepartmentIds ?? [];
  /** Dept lead / inbox: show approved teams + submit-to-company on Waiting tab (B2T/Hybrid). */
  const canManageDeptForwardPackages =
    !companyOnlyApproval &&
    managedDepartmentIds.length > 0 &&
    (showDepartmentConsolidation || showDepartmentInbox);
  const teamLabelById = useCallback(
    (teamId: string) =>
      teamOptions.find((team) => team.value === teamId)?.label ?? teamId,
    [teamOptions],
  );

  const manualTargetTeamGroups = useMemo((): TeamSelectGroup[] => {
    const byDepartment = new Map<
      string,
      { label: string; options: { value: string; label: string }[] }
    >();
    for (const option of teamOptions) {
      const team = salesTeams.find((row) => row.id === option.value);
      const deptLabel =
        team?.parentDepartmentName?.trim() ||
        team?.parentDepartmentId?.trim() ||
        'Teams';
      const bucket = byDepartment.get(deptLabel) ?? {
        label: deptLabel,
        options: [],
      };
      bucket.options.push({ value: option.value, label: option.label });
      byDepartment.set(deptLabel, bucket);
    }
    if (byDepartment.size === 0 && teamOptions.length > 0) {
      return [{ label: '', options: teamOptions }];
    }
    return [...byDepartment.values()];
  }, [salesTeams, teamOptions]);

  const departmentIdOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const team of salesTeams) {
      const id = team.parentDepartmentId?.trim();
      const name = team.parentDepartmentName?.trim() || id;
      if (id && !seen.has(id)) seen.set(id, name ?? id);
    }
    const managed = new Set(
      managedDepartmentIds.map((id) => id.trim()).filter(Boolean),
    );
    for (const id of managed) {
      if (!seen.has(id)) {
        seen.set(id, `Department ${id.slice(0, 8)}`);
      }
    }
    return [...seen.entries()]
      .filter(([value]) => managed.has(value))
      .map(([value, label]) => ({ value, label }));
  }, [managedDepartmentIds, salesTeams]);

  const [selectedDeptId, setSelectedDeptId] = useState(
    departmentIdOptions[0]?.value ?? '',
  );

  useEffect(() => {
    if (!departmentIdOptions.length) {
      if (selectedDeptId) setSelectedDeptId('');
      return;
    }
    if (
      !selectedDeptId ||
      !departmentIdOptions.some((opt) => opt.value === selectedDeptId)
    ) {
      setSelectedDeptId(departmentIdOptions[0]!.value);
    }
  }, [departmentIdOptions, selectedDeptId]);

  const [modifyRequestId, setModifyRequestId] = useState<string | null>(null);
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyDescription, setModifyDescription] = useState('');
  const [modifyComment, setModifyComment] = useState('');
  const [modifyOpps, setModifyOpps] = useState<ProposalOpportunityLine[]>([]);
  const [modifyLevel, setModifyLevel] =
    useState<SalesTargetReviewLevel>('DEPARTMENT');
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rejectDialog, setRejectDialog] = useState<{
    request: SalesTargetRequest;
    level: SalesTargetReviewLevel;
  } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [pendingAction, setPendingAction] =
    useState<ProposalPendingAction | null>(null);
  const [selectedForwardByScope, setSelectedForwardByScope] = useState<
    Record<string, string[]>
  >({});
  const [approvalsPanel, setApprovalsPanel] = useState<'action' | 'tracking'>(
    initialPanel,
  );

  const toggleRequestExpanded = (requestId: string) => {
    setExpandedRequestIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  };

  const ensureRequestExpanded = (requestId: string) => {
    setExpandedRequestIds((prev) => {
      if (prev.has(requestId)) return prev;
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
  };

  const { data: allRequests = [], refetch: refetchRequests } =
    useGetTargetRequests(planId, requestWorkflowEnabled);

  const allRequestsForCurrency = useMemo(() => {
    return allRequests.filter(
      (row) => !currencyId || row.currencyId === currencyId,
    );
  }, [allRequests, currencyId]);

  const shouldSyncDepartmentAutoApprovals = Boolean(
    requestWorkflowEnabled &&
      (showDepartmentInbox || showDepartmentConsolidation),
  );
  const { data: reviewQueue = [], refetch: refetchDeptReviewQueue } =
    useGetTargetRequestReviewQueue(
      planId,
      {
        reviewLevel: 'DEPARTMENT',
        currencyId,
      },
      shouldSyncDepartmentAutoApprovals,
    );

  useEffect(() => {
    if (!shouldSyncDepartmentAutoApprovals) return;
    void refetchRequests();
  }, [reviewQueue, shouldSyncDepartmentAutoApprovals, refetchRequests]);
  const { data: companyQueue = [], refetch: refetchCompanyReviewQueue } =
    useGetTargetRequestReviewQueue(
      planId,
      {
        reviewLevel: 'COMPANY',
        currencyId,
      },
      Boolean(planId && showCompanyInbox),
    );
  const { data: teamQueue = [] } = useGetTargetRequestReviewQueue(
    planId,
    {
      reviewLevel: 'TEAM',
      currencyId,
    },
    Boolean(planId && showTeamInbox),
  );
  const inboxPersonUserIds = useMemo(
    () =>
      collectMemberRequestUserIds([
        ...teamQueue,
        ...reviewQueue,
        ...companyQueue,
      ]),
    [teamQueue, reviewQueue, companyQueue],
  );
  const personProfiles = usePlanningPersonProfiles(inboxPersonUserIds);
  const createReview = useCreateTargetReview();
  const submitConsolidation = useSubmitDepartmentConsolidation();
  const withdrawFromCompany = useWithdrawTargetFromCompanyForward();
  const departmentTeamIds = useMemo(() => {
    const deptKey = selectedDeptId?.trim();
    if (!deptKey) return new Set<string>();
    return new Set(
      departmentScopedTeamsForDepartment(salesTeams, deptKey).map(
        (team) => team.id,
      ),
    );
  }, [salesTeams, selectedDeptId]);

  const modifyOpportunityClaimHints = useMemo(() => {
    if (!modifyRequestId) return undefined;
    const request =
      allRequestsForCurrency.find((row) => row.id === modifyRequestId) ??
      teamQueue.find((row) => row.id === modifyRequestId);
    if (!request?.teamId) return undefined;
    const peerRequests = [...allRequestsForCurrency];
    for (const row of teamQueue) {
      if (!peerRequests.some((entry) => entry.id === row.id)) {
        peerRequests.push(row);
      }
    }
    return buildPeerOpportunityClaimHintsForTeam(
      request.teamId,
      peerRequests,
      salesTeams,
      teamOptions,
    );
  }, [
    modifyRequestId,
    allRequestsForCurrency,
    teamQueue,
    salesTeams,
    teamOptions,
  ]);

  const deptOpportunityClaimHintsByTeam = useMemo(() => {
    const hintsByTeam = new Map<string, Map<string, OpportunityClaimHint>>();
    if (!departmentTeamIds.size) return hintsByTeam;

    const deptTeams = salesTeams.filter((team) =>
      departmentTeamIds.has(team.id),
    );
    for (const teamId of departmentTeamIds) {
      hintsByTeam.set(
        teamId,
        buildPeerOpportunityClaimHintsForTeam(
          teamId,
          allRequestsForCurrency,
          deptTeams,
          teamOptions,
        ),
      );
    }
    return hintsByTeam;
  }, [allRequestsForCurrency, departmentTeamIds, salesTeams, teamOptions]);

  const consolidationGroupsByDepartmentId = useMemo(() => {
    const map = new Map<string, DepartmentConsolidationScopeGroup[]>();
    for (const opt of departmentIdOptions) {
      map.set(
        opt.value,
        buildDepartmentConsolidationGroupsForDept(
          opt.value,
          salesTeams,
          allRequestsForCurrency,
          currencyId ?? '',
          companyOnlyApproval,
          sessions,
        ),
      );
    }
    return map;
  }, [
    allRequestsForCurrency,
    currencyId,
    companyOnlyApproval,
    departmentIdOptions,
    salesTeams,
    sessions,
  ]);

  useEffect(() => {
    setSelectedForwardByScope((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [deptId, groups] of consolidationGroupsByDepartmentId) {
        for (const group of groups) {
          const selectionKey = forwardScopeSelectionKey(deptId, group.key);
          const approvedIds = group.teamRows
            .filter((row) => row.status === 'DEPARTMENT_APPROVED')
            .map((row) => row.requestId);
          const existing = prev[selectionKey];
          if (existing === undefined) {
            next[selectionKey] = approvedIds;
            changed = true;
            continue;
          }
          if (!approvedIds.length) continue;
          const merged = new Set(existing);
          let mergedChanged = false;
          for (const id of approvedIds) {
            if (!merged.has(id)) {
              merged.add(id);
              mergedChanged = true;
            }
          }
          if (mergedChanged) {
            next[selectionKey] = [...merged];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [consolidationGroupsByDepartmentId]);

  const effectiveDepartmentInbox = showDepartmentInbox;

  const { companyStepApprovalViewer, trackingTabLabel } = useMemo(
    () =>
      approvalWorkspaceInboxContext({
        showCompanyInbox,
        showDepartmentInbox: effectiveDepartmentInbox,
        companyOnlyApproval,
      }),
    [showCompanyInbox, effectiveDepartmentInbox, companyOnlyApproval],
  );

  const myApprovalInbox = useMemo(() => {
    type InboxItem = {
      request: SalesTargetRequest;
      level: SalesTargetReviewLevel;
      teamName: string;
      departmentName: string | null;
      departmentId: string | null;
      reportsToCompany: boolean;
      scopeLabel: string;
      displayOnly: boolean;
    };
    const byId = new Map<string, InboxItem>();

    // Team lead inbox: member (person) proposals awaiting team review.
    if (showTeamInbox) {
      for (const request of teamQueue) {
        if (request.status !== 'PENDING_TEAM') continue;
        if (
          managedTeamIds.length > 0 &&
          request.teamId &&
          !managedTeamIds.includes(request.teamId)
        ) {
          continue;
        }
        const org = resolveSubmittedTeam(
          request.teamId,
          salesTeams,
          teamOptions,
        );
        const memberLabel = resolveMemberRequestDisplayName(
          request,
          personProfiles,
        );
        byId.set(`${request.id}:TEAM`, {
          ...org,
          request,
          level: 'TEAM',
          teamName: memberLabel,
          scopeLabel: `${requestScopeLabel(request, sessions)} · ${org.teamName}`,
          displayOnly: false,
        });
      }
    }

    // Inbox: only items waiting on the user at their workflow step (all scopes).
    if (effectiveDepartmentInbox) {
      for (const request of reviewQueue) {
        if (request.status !== 'PENDING_DEPARTMENT') continue;
        if (
          !includeInMyApprovalsDepartmentInbox(
            request,
            managedDepartmentIds,
            salesTeams,
          )
        ) {
          continue;
        }
        const org = resolveSubmittedTeam(
          request.teamId,
          salesTeams,
          teamOptions,
        );
        byId.set(`${request.id}:DEPARTMENT`, {
          request,
          level: 'DEPARTMENT',
          scopeLabel: requestScopeLabel(request, sessions),
          displayOnly: false,
          ...org,
        });
      }
    }
    if (showCompanyInbox) {
      for (const request of companyQueue) {
        if (request.status !== 'PENDING_COMPANY') continue;
        const org = resolveSubmittedTeam(
          request.teamId,
          salesTeams,
          teamOptions,
        );
        byId.set(`${request.id}:COMPANY`, {
          request,
          level: 'COMPANY',
          scopeLabel: requestScopeLabel(request, sessions),
          displayOnly: false,
          ...org,
        });
      }
    }

    if (effectiveDepartmentInbox && managedDepartmentIds.length > 0) {
      for (const request of allRequestsForCurrency) {
        if (request.status !== 'PENDING_DEPARTMENT') continue;
        if (
          !includeInMyApprovalsDepartmentInbox(
            request,
            managedDepartmentIds,
            salesTeams,
          )
        ) {
          continue;
        }
        const pendingKey = `${request.id}:DEPARTMENT`;
        if (byId.has(pendingKey)) continue;
        const org = resolveSubmittedTeam(
          request.teamId,
          salesTeams,
          teamOptions,
        );
        byId.set(pendingKey, {
          request,
          level: 'DEPARTMENT',
          scopeLabel: requestScopeLabel(request, sessions),
          displayOnly: false,
          ...org,
        });
      }
    }

    return [...byId.values()].sort((a, b) => {
      const scopeCmp = a.scopeLabel.localeCompare(b.scopeLabel);
      if (scopeCmp !== 0) return scopeCmp;
      const deptCmp = (a.departmentName ?? '').localeCompare(
        b.departmentName ?? '',
      );
      if (deptCmp !== 0) return deptCmp;
      const teamCmp = a.teamName.localeCompare(b.teamName);
      if (teamCmp !== 0) return teamCmp;
      const aTime = a.request.submittedAt
        ? new Date(a.request.submittedAt).getTime()
        : 0;
      const bTime = b.request.submittedAt
        ? new Date(b.request.submittedAt).getTime()
        : 0;
      return aTime - bTime;
    });
  }, [
    companyQueue,
    managedDepartmentIds,
    managedTeamIds,
    reviewQueue,
    teamQueue,
    salesTeams,
    sessions,
    showCompanyInbox,
    showTeamInbox,
    effectiveDepartmentInbox,
    teamOptions,
    allRequestsForCurrency,
    personProfiles,
  ]);

  const submittedApprovalInbox = useMemo(() => {
    if (!currencyId) return [];

    type InboxItem = {
      request: SalesTargetRequest;
      level: SalesTargetReviewLevel;
      teamName: string;
      departmentName: string | null;
      departmentId: string | null;
      reportsToCompany: boolean;
      scopeLabel: string;
      displayOnly: boolean;
    };
    const actionIds = new Set(myApprovalInbox.map((item) => item.request.id));
    const byId = new Map<string, InboxItem>();

    const inTrackingScope = (request: SalesTargetRequest) => {
      if (!hasTeamTargetRequest(request)) return false;
      if (showCompanyInbox && !effectiveDepartmentInbox) return true;
      if (effectiveDepartmentInbox) {
        return isRequestInManagedDepartmentScope(
          request,
          salesTeams,
          managedDepartmentIds,
        );
      }
      return showCompanyInbox;
    };

    const teamScopeKeys = collectTeamScopeKeysForRequests(
      allRequestsForCurrency,
      inTrackingScope,
    );

    for (const teamScopeKey of teamScopeKeys) {
      const request = pickTrackingDisplayForTeamScopeKey(
        allRequestsForCurrency,
        teamScopeKey,
        currencyId,
        trackingTabLabel,
      );
      if (!request || actionIds.has(request.id)) continue;
      if (!hasTeamTargetRequest(request)) continue;

      if (trackingTabLabel === 'Submitted') {
        if (request.status !== 'PENDING_COMPANY') continue;
        if (
          !includeInSubmittedApprovalInbox(
            request,
            managedDepartmentIds,
            salesTeams,
            effectiveDepartmentInbox,
            showCompanyInbox,
          )
        ) {
          continue;
        }
      } else {
        if (!isCompanyApprovedTargetRequestStatus(request.status)) continue;
        if (effectiveDepartmentInbox) {
          if (
            !isRequestInManagedDepartmentScope(
              request,
              salesTeams,
              managedDepartmentIds,
            )
          ) {
            continue;
          }
        } else if (!showCompanyInbox) {
          continue;
        }
      }
      const org = resolveSubmittedTeam(request.teamId, salesTeams, teamOptions);
      const level: SalesTargetReviewLevel = 'COMPANY';
      byId.set(`${request.id}:submitted`, {
        request,
        level,
        scopeLabel: requestScopeLabel(request, sessions),
        displayOnly: true,
        ...org,
      });
    }

    return [...byId.values()].sort(
      (a, b) => submittedHistorySortTime(b) - submittedHistorySortTime(a),
    );
  }, [
    allRequestsForCurrency,
    currencyId,
    companyOnlyApproval,
    effectiveDepartmentInbox,
    managedDepartmentIds,
    myApprovalInbox,
    salesTeams,
    sessions,
    showCompanyInbox,
    teamOptions,
    trackingTabLabel,
  ]);

  const showMyApprovalsSection =
    showTeamInbox ||
    effectiveDepartmentInbox ||
    showCompanyInbox ||
    canManageDeptForwardPackages;

  const inboxStatusBadge = (
    request: SalesTargetRequest,
    displayOnly: boolean,
    reviewLevel?: SalesTargetReviewLevel,
  ) =>
    inboxBadgeLabel(request, displayOnly, approvalsPanel === 'tracking', {
      companyStepViewer: companyStepApprovalViewer,
      approvedTrackingTab: trackingTabLabel === 'Approved',
      reviewLevel,
    });

  const myApprovalInboxForDisplay = useMemo(
    () => myApprovalInbox.filter((item) => hasTeamTargetRequest(item.request)),
    [myApprovalInbox],
  );

  const myApprovalDeptSections = useMemo(
    () => buildMyApprovalDeptSections(myApprovalInboxForDisplay),
    [myApprovalInboxForDisplay],
  );

  const submittedApprovalInboxForDisplay = useMemo(
    () =>
      submittedApprovalInbox.filter((item) =>
        hasTeamTargetRequest(item.request),
      ),
    [submittedApprovalInbox],
  );

  /** Submitted tab: flat history, newest first (no dept/annual groupings). */
  const submittedHistorySections = useMemo((): MyApprovalDeptSection[] => {
    if (!submittedApprovalInboxForDisplay.length) return [];
    const items = [...submittedApprovalInboxForDisplay].sort(
      (a, b) => submittedHistorySortTime(b) - submittedHistorySortTime(a),
    );
    return [
      {
        id: 'submitted-history',
        heading: '',
        pendingCount: 0,
        items,
      },
    ];
  }, [submittedApprovalInboxForDisplay]);

  /** Dept waiting + approved teams (same section until submit to company). */
  const forwardToCompanySections = useMemo((): MyApprovalDeptSection[] => {
    if (!canManageDeptForwardPackages || !departmentIdOptions.length) return [];

    const sections: MyApprovalDeptSection[] = [];
    for (const deptOpt of departmentIdOptions) {
      const groups = consolidationGroupsByDepartmentId.get(deptOpt.value) ?? [];
      for (const group of groups) {
        const pendingRows = group.teamRows.filter(
          (row) => row.status === 'PENDING_DEPARTMENT',
        );
        const forwardRows = group.teamRows.filter(
          (row) => row.status === 'DEPARTMENT_APPROVED',
        );
        if (!pendingRows.length && !forwardRows.length) continue;

        const items: MyApprovalInboxEntry[] = [
          ...pendingRows.map((row): MyApprovalInboxEntry => {
            const org = resolveSubmittedTeam(
              row.teamId,
              salesTeams,
              teamOptions,
            );
            return {
              request: row.request,
              level: 'DEPARTMENT',
              scopeLabel: group.scopeLabel,
              displayOnly: false,
              ...org,
            };
          }),
          ...forwardRows.map((row): MyApprovalInboxEntry => {
            const org = resolveSubmittedTeam(
              row.teamId,
              salesTeams,
              teamOptions,
            );
            return {
              request: row.request,
              level: 'DEPARTMENT',
              scopeLabel: group.scopeLabel,
              displayOnly: true,
              forwardPackage: {
                departmentId: deptOpt.value,
                scopeKey: group.key,
              },
              ...org,
            };
          }),
        ].sort(sortMyApprovalInboxEntries);

        sections.push({
          id: `${deptOpt.value}:${group.key}`,
          heading: `${deptOpt.label} · ${group.scopeLabel}${
            forwardRows.length ? ' · submit to company when ready' : ''
          }`,
          pendingCount: pendingRows.length,
          items,
          ...(forwardRows.length
            ? {
                forwardPackageMeta: {
                  departmentId: deptOpt.value,
                  scopeKey: group.key,
                },
              }
            : {}),
        });
      }
    }

    const coveredIds = new Set(
      sections.flatMap((section) =>
        section.items.map((item) => item.request.id),
      ),
    );
    const orphanByDeptScope = new Map<string, SalesTargetRequest[]>();
    for (const request of allRequestsForCurrency) {
      if (request.status !== 'DEPARTMENT_APPROVED') continue;
      if (!request.teamId) continue;
      if (coveredIds.has(request.id)) continue;
      if (
        !isRequestInManagedDepartmentScope(
          request,
          salesTeams,
          managedDepartmentIds,
        )
      ) {
        continue;
      }
      const deptId = teamManagedDepartmentId(request.teamId, salesTeams);
      if (!deptId || !managedDepartmentIds.includes(deptId)) continue;
      const scopeKey = requestScopeKey(request);
      const workflowScope = workflowScopeFromScopeKey(
        scopeKey,
        currencyId ?? '',
      );
      const activeDisplay = pickDepartmentWorkflowDisplayRequest(
        allRequestsForCurrency,
        request.teamId,
        workflowScope,
        companyOnlyApproval,
      );
      if (
        !activeDisplay ||
        activeDisplay.id !== request.id ||
        activeDisplay.status !== 'DEPARTMENT_APPROVED'
      ) {
        continue;
      }
      const bucketKey = `${deptId}:${scopeKey}`;
      const bucket = orphanByDeptScope.get(bucketKey) ?? [];
      bucket.push(request);
      orphanByDeptScope.set(bucketKey, bucket);
    }
    for (const [bucketKey, requests] of orphanByDeptScope) {
      const firstColon = bucketKey.indexOf(':');
      const departmentId = bucketKey.slice(0, firstColon);
      const scopeKey = bucketKey.slice(firstColon + 1);
      const deptOpt = departmentIdOptions.find(
        (opt) => opt.value === departmentId,
      );
      const scopeLabel =
        scopeKey === 'annual'
          ? 'Annual'
          : requestScopeLabel(requests[0]!, sessions);
      const items: MyApprovalInboxEntry[] = requests.map((request) => {
        const org = resolveSubmittedTeam(
          request.teamId,
          salesTeams,
          teamOptions,
        );
        return {
          request,
          level: 'DEPARTMENT',
          scopeLabel,
          displayOnly: true,
          forwardPackage: { departmentId, scopeKey },
          ...org,
        };
      });
      sections.push({
        id: `${departmentId}:${scopeKey}:orphan`,
        heading: `${deptOpt?.label ?? 'Department'} · ${scopeLabel} · submit to company`,
        pendingCount: items.length,
        items: [...items].sort(sortMyApprovalInboxEntries),
        forwardPackageMeta: { departmentId, scopeKey },
      });
    }

    return sections;
  }, [
    allRequestsForCurrency,
    canManageDeptForwardPackages,
    companyOnlyApproval,
    currencyId,
    departmentIdOptions,
    consolidationGroupsByDepartmentId,
    managedDepartmentIds,
    salesTeams,
    sessions,
    teamOptions,
  ]);

  const toggleForwardPackageRequest = (
    departmentId: string,
    scopeKey: string,
    requestId: string,
    selected: boolean,
  ) => {
    const selectionKey = forwardScopeSelectionKey(departmentId, scopeKey);
    setSelectedForwardByScope((prev) => {
      const current = new Set(prev[selectionKey] ?? []);
      if (selected) current.add(requestId);
      else current.delete(requestId);
      return { ...prev, [selectionKey]: [...current] };
    });
  };

  const myApprovalActionCount = useMemo(
    () =>
      countWaitingApprovalActions({
        currencyId,
        reviewQueue,
        companyQueue,
        allRequests: allRequestsForCurrency,
        showDepartmentInbox,
        showCompanyInbox,
        showDepartmentConsolidation,
        managedDepartmentIds,
        salesTeams,
        companyOnlyApproval,
        sessions,
      }),
    [
      currencyId,
      reviewQueue,
      companyQueue,
      allRequestsForCurrency,
      showDepartmentInbox,
      showCompanyInbox,
      showDepartmentConsolidation,
      managedDepartmentIds,
      salesTeams,
      companyOnlyApproval,
      sessions,
    ],
  );

  const teamInboxForDisplay = useMemo(
    () => myApprovalInboxForDisplay.filter((item) => item.level === 'TEAM'),
    [myApprovalInboxForDisplay],
  );

  const companyInboxForDisplay = useMemo(
    () => myApprovalInboxForDisplay.filter((item) => item.level === 'COMPANY'),
    [myApprovalInboxForDisplay],
  );

  const teamWaitingSections = useMemo((): MyApprovalDeptSection[] => {
    if (!teamInboxForDisplay.length) return [];
    return [
      {
        id: 'team-member-requests',
        heading: 'Member proposals',
        pendingCount: teamInboxForDisplay.length,
        items: teamInboxForDisplay,
      },
    ];
  }, [teamInboxForDisplay]);

  const companyWaitingSections = useMemo(
    () =>
      companyStepApprovalViewer
        ? buildCompanyWaitingSections(companyInboxForDisplay)
        : buildMyApprovalDeptSections(companyInboxForDisplay),
    [companyInboxForDisplay, companyStepApprovalViewer],
  );

  const deptWaitingSections = useMemo(() => {
    const inboxDeptSections = myApprovalDeptSections.filter(
      (section) => !section.items.every((item) => item.level === 'COMPANY'),
    );
    if (
      !canManageDeptForwardPackages ||
      forwardToCompanySections.length === 0
    ) {
      return inboxDeptSections;
    }
    const coveredRequestIds = new Set(
      forwardToCompanySections.flatMap((section) =>
        section.items.map((item) => item.request.id),
      ),
    );
    const supplemental = inboxDeptSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !coveredRequestIds.has(item.request.id),
        ),
      }))
      .filter((section) => section.items.length > 0);
    return [...forwardToCompanySections, ...supplemental];
  }, [
    canManageDeptForwardPackages,
    forwardToCompanySections,
    myApprovalDeptSections,
  ]);

  const visibleApprovalSections =
    approvalsPanel === 'tracking'
      ? submittedHistorySections
      : [
          ...teamWaitingSections,
          ...deptWaitingSections,
          ...companyWaitingSections,
        ];

  const waitingTabHasRows =
    teamWaitingSections.some((section) => section.items.length > 0) ||
    deptWaitingSections.some((section) => section.items.length > 0) ||
    companyInboxForDisplay.length > 0;

  const showApprovalTabFullyEmpty =
    approvalsPanel === 'tracking'
      ? submittedHistorySections.length === 0
      : !waitingTabHasRows;

  const isTrackingApprovalsPanel = approvalsPanel === 'tracking';

  if (!planId || !currencyId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Select a plan and currency to manage bottom-up targets.
      </div>
    );
  }

  const handleReview = async (
    request: SalesTargetRequest,
    decision: SalesTargetReviewDecision,
    level: SalesTargetReviewLevel,
    comment?: string,
    options?: { fromDepartmentConsolidation?: boolean },
  ) => {
    if (!request.currentRevisionId) return;

    setPendingAction({
      requestId: request.id,
      kind: 'review',
      decision,
      level,
    });
    try {
      // Strict allowed actions check from backend
      const allowed = await fetchTargetRequestAllowedActions(request.id);
      const actions = allowed?.actions ?? null;

      if (!actions) {
        NotificationMessage.error({
          message: 'No approval actions available',
          description:
            'This request is not waiting on a configured approval step.',
        });
        return;
      }

      if (actions.reviewLevel !== level) {
        NotificationMessage.error({
          message: 'Not your approval step',
          description:
            level === 'TEAM'
              ? 'Only the team lead can review member proposals while they are pending team review.'
              : level === 'COMPANY'
                ? 'Company can approve only after department approval forwards the request.'
                : 'Department can approve only while the request is pending department review.',
        });
        return;
      }

      if (!actions.allowedDecisions.includes(decision)) {
        NotificationMessage.error({
          message: 'Action not allowed',
          description: `Decision '${decision}' is not allowed for this request at its current step.`,
        });
        return;
      }

      const waitingForMe = myApprovalInbox.some(
        (item) =>
          item.request.id === request.id &&
          item.level === level &&
          !item.displayOnly,
      );
      const consolidationDeptAct =
        options?.fromDepartmentConsolidation &&
        level === 'DEPARTMENT' &&
        showDepartmentConsolidation &&
        request.teamId &&
        departmentTeamIds.has(request.teamId);
      const inForwardPendingAction = forwardToCompanySections.some((section) =>
        section.items.some(
          (item) =>
            item.request.id === request.id &&
            item.level === level &&
            !item.displayOnly,
        ),
      );
      if (!waitingForMe && !consolidationDeptAct && !inForwardPendingAction) {
        NotificationMessage.error({
          message: 'Not your approval step',
          description:
            level === 'TEAM'
              ? 'This member proposal is not in your team review inbox.'
              : level === 'COMPANY'
                ? 'This request is not waiting for you as a company approver yet.'
                : 'Only the submitting team’s department lead can act on this step.',
        });
        return;
      }
      const resolvedComment =
        comment?.trim() ||
        (decision === 'APPROVED'
          ? 'Approved'
          : decision === 'REJECTED'
            ? 'Rejected'
            : decision === 'RETURNED'
              ? 'Returned'
              : decision);
      await createReview.mutateAsync({
        requestId: request.id,
        reviewLevel: level,
        decision,
        expectedRevisionId: request.currentRevisionId,
        comment: resolvedComment,
      });
      NotificationMessage.success({
        message: `Request ${decision.toLowerCase()}`,
        description:
          level === 'DEPARTMENT' &&
          decision === 'APPROVED' &&
          canManageDeptForwardPackages
            ? 'Department approved. Status stays on Waiting approval until you use Submit to company.'
            : undefined,
      });
      setRejectDialog(null);
      setRejectComment('');
      ensureRequestExpanded(request.id);
      await refetchRequests();
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      NotificationMessage.error({
        message: 'Review failed',
        description: Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : typeof apiMessage === 'string'
            ? apiMessage
            : 'The revision may be stale or you may lack permission. Reload and retry.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const openReject = (
    request: SalesTargetRequest,
    level: SalesTargetReviewLevel,
  ) => {
    setRejectComment('');
    setRejectDialog({ request, level });
  };

  const submitReject = () => {
    if (!rejectDialog) return;
    void handleReview(
      rejectDialog.request,
      'REJECTED',
      rejectDialog.level,
      rejectComment.trim() || undefined,
    );
  };

  const openModify = async (
    request: SalesTargetRequest,
    level: SalesTargetReviewLevel,
  ) => {
    setPendingAction({
      requestId: request.id,
      kind: 'modify-open',
      level,
    });
    try {
      const effectiveLevel = resolveContentModifyReviewLevel(request, level);

      // Strict allowed actions check from backend
      const allowed = await fetchTargetRequestAllowedActions(request.id);
      const actions = allowed?.actions ?? null;

      if (!actions) {
        NotificationMessage.error({
          message: 'No modification actions available',
          description:
            'This request is not in a state that allows modification.',
        });
        return;
      }

      const deptPackageEdit = isDepartmentPackageContentEditLevel(
        request,
        effectiveLevel,
      );

      if (actions.reviewLevel !== effectiveLevel && !deptPackageEdit) {
        NotificationMessage.error({
          message: 'Not your approval step',
          description:
            effectiveLevel === 'COMPANY'
              ? 'Company can modify only while the request is pending company review.'
              : 'Department can modify during department review or before submitting to company.',
        });
        return;
      }

      if (!actions.mayModifyContent && !deptPackageEdit) {
        NotificationMessage.error({
          message: 'Modification not allowed',
          description:
            'Content modification is not allowed for this request at its current step.',
        });
        return;
      }

      const inPendingActionInbox = myApprovalInbox.some(
        (item) =>
          item.request.id === request.id &&
          item.level === effectiveLevel &&
          !item.displayOnly,
      );
      const inForwardPendingAction = forwardToCompanySections.some((section) =>
        section.items.some(
          (item) =>
            item.request.id === request.id &&
            !item.displayOnly &&
            (item.level === effectiveLevel ||
              (effectiveLevel === 'DEPARTMENT' &&
                item.request.status === 'PENDING_DEPARTMENT')),
        ),
      );
      const inForwardPackage = requestInForwardToCompanySection(
        request.id,
        forwardToCompanySections,
      );
      const inSubmittedAwaitingCompany =
        request.status === 'PENDING_COMPANY' &&
        effectiveLevel === 'DEPARTMENT' &&
        submittedApprovalInboxForDisplay.some(
          (item) => item.request.id === request.id,
        ) &&
        isRequestInManagedDepartmentScope(
          request,
          salesTeams,
          managedDepartmentIds,
        );
      const deptApprovedForwardEditable =
        request.status === 'DEPARTMENT_APPROVED' && inForwardPackage;
      const inCompanyPendingInbox =
        effectiveLevel === 'COMPANY' &&
        request.status === 'PENDING_COMPANY' &&
        myApprovalInbox.some(
          (item) =>
            item.request.id === request.id &&
            item.level === 'COMPANY' &&
            !item.displayOnly,
        );
      if (
        !inPendingActionInbox &&
        !inForwardPendingAction &&
        !deptApprovedForwardEditable &&
        !inSubmittedAwaitingCompany &&
        !inCompanyPendingInbox
      ) {
        NotificationMessage.error({
          message: 'Not your approval step',
          description:
            'Only assignees for the current workflow step can modify this request.',
        });
        return;
      }
      const rev = currentRevision(request);
      setModifyRequestId(request.id);
      setModifyLevel(effectiveLevel);
      setModifyAmount(String(Number(rev?.amount ?? 0)));
      setModifyDescription(rev?.description ?? '');
      setModifyComment('');
      setModifyOpps(linesFromRequestOpportunities(rev?.opportunities));
      ensureRequestExpanded(request.id);
    } finally {
      setPendingAction(null);
    }
  };

  const submitModify = async () => {
    if (!modifyRequestId) return;
    setPendingAction({ requestId: modifyRequestId, kind: 'modify-save' });
    try {
      const { data: refreshedRequests = [] } = await refetchRequests();
      const request =
        refreshedRequests.find((r) => r.id === modifyRequestId) ||
        teamQueue.find((r) => r.id === modifyRequestId) ||
        reviewQueue.find((r) => r.id === modifyRequestId) ||
        companyQueue.find((r) => r.id === modifyRequestId) ||
        allRequestsForCurrency.find((r) => r.id === modifyRequestId);
      if (!request?.currentRevisionId) return;

      // Strict allowed actions check from backend
      const allowed = await fetchTargetRequestAllowedActions(request.id);
      const actions = allowed?.actions ?? null;

      const effectiveLevel = resolveContentModifyReviewLevel(
        request,
        modifyLevel,
      );
      const deptPackageEdit = isDepartmentPackageContentEditLevel(
        request,
        effectiveLevel,
      );

      if (!actions && !deptPackageEdit) {
        NotificationMessage.error({
          message: 'Modification not allowed',
          description:
            'Content modification is not allowed for this request at its current step.',
        });
        return;
      }

      if (actions && !actions.mayModifyContent && !deptPackageEdit) {
        NotificationMessage.error({
          message: 'Modification not allowed',
          description:
            'Content modification is not allowed for this request at its current step.',
        });
        return;
      }

      if (
        actions &&
        actions.reviewLevel !== effectiveLevel &&
        !deptPackageEdit
      ) {
        NotificationMessage.error({
          message: 'Not your approval step',
          description:
            effectiveLevel === 'COMPANY'
              ? 'Company can modify only while the request is pending company review.'
              : 'Department can modify during department review or before submitting to company.',
        });
        return;
      }

      await createReview.mutateAsync({
        requestId: request.id,
        reviewLevel: effectiveLevel,
        decision: 'MODIFIED',
        expectedRevisionId: request.currentRevisionId,
        comment: modifyComment || 'Modified during review',
        modifiedAmount: Number(modifyAmount) || sumAllocated(modifyOpps),
        modifiedDescription: modifyDescription,
        modifiedOpportunityLines: normalizeOpportunityLinesForTargetRequestApi(
          collapseDuplicateOpportunityLines(modifyOpps),
        ),
      });
      setModifyRequestId(null);
      await refetchRequests();
      NotificationMessage.success({
        message: 'Proposal updated',
        description:
          modifyLevel === 'DEPARTMENT' &&
          request.status === 'PENDING_DEPARTMENT'
            ? 'Changes saved. Still in Waiting approval — use Approve when ready, then submit the department package to company.'
            : modifyLevel === 'DEPARTMENT' &&
                (request.status === 'DEPARTMENT_APPROVED' ||
                  request.status === 'PENDING_COMPANY')
              ? request.status === 'PENDING_COMPANY'
                ? 'Changes saved. Still with company until they approve — only this team request was updated.'
                : 'Changes saved. The team stays dept-approved until you submit to company.'
              : modifyLevel === 'COMPANY' &&
                  request.status === 'PENDING_COMPANY'
                ? 'Changes saved. Company review continues on the updated proposal.'
                : 'A new immutable revision was created from the review.',
      });
    } catch (error: unknown) {
      const apiMessage = (
        error as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      NotificationMessage.error({
        message: 'Modify failed',
        description: Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : typeof apiMessage === 'string'
            ? apiMessage
            : 'Stale revision or missing permission. Reload and retry.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const consolidationScopesForSection = (
    section: MyApprovalDeptSection,
  ): { departmentId: string; group: DepartmentConsolidationScopeGroup }[] => {
    if (!canManageDeptForwardPackages || !section.forwardPackageMeta) return [];
    const { departmentId, scopeKey } = section.forwardPackageMeta;
    const groups = consolidationGroupsByDepartmentId.get(departmentId) ?? [];
    let group = groups.find((row) => row.key === scopeKey);
    if (!group) {
      const approvedItems = section.items.filter(
        (item) => item.request.status === 'DEPARTMENT_APPROVED',
      );
      if (!approvedItems.length) return [];
      const sample = approvedItems[0]!.request;
      group = {
        key: scopeKey,
        scopeLabel: approvedItems[0]!.scopeLabel,
        horizon: sample.horizon === 'session' ? 'session' : 'annual',
        sessionId: sample.sessionId ?? undefined,
        sortKey: 0,
        teamRows: approvedItems.map((item) => {
          const rev = currentRevision(item.request);
          return {
            requestId: item.request.id,
            teamId: item.request.teamId ?? '',
            teamName: item.teamName,
            status: item.request.status ?? 'DEPARTMENT_APPROVED',
            amount: Number(rev?.amount ?? 0),
            request: item.request,
          };
        }),
        allTeamsDeptReadyForScope: false,
        canSubmit: true,
      };
    }
    return [{ departmentId, group }];
  };

  const selectAllApprovedInForwardScope = (
    departmentId: string,
    scopeGroup: DepartmentConsolidationScopeGroup,
  ) => {
    const selectionKey = forwardScopeSelectionKey(departmentId, scopeGroup.key);
    setSelectedForwardByScope((prev) => ({
      ...prev,
      [selectionKey]: approvedForwardRequestIdsInScope(scopeGroup),
    }));
  };

  const handleWithdrawFromCompany = async (request: SalesTargetRequest) => {
    if (!planId || request.status !== 'PENDING_COMPANY') return;
    if (
      !isRequestInManagedDepartmentScope(
        request,
        salesTeams,
        managedDepartmentIds,
      )
    ) {
      return;
    }
    setPendingAction({ requestId: request.id, kind: 'withdraw' });
    try {
      await withdrawFromCompany.mutateAsync({
        requestId: request.id,
        planId,
      });
      await refetchRequests();
      NotificationMessage.success({
        message: 'Removed from company review',
        description:
          'This team proposal is dept-approved again. Submit from Waiting approval when ready.',
      });
    } catch (error: unknown) {
      NotificationMessage.error({
        message: 'Could not withdraw',
        description:
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Try again after reload.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const rejectDialogSubmitting =
    pendingAction?.kind === 'review' &&
    pendingAction.decision === 'REJECTED' &&
    rejectDialog != null &&
    pendingAction.requestId === rejectDialog.request.id;

  const submitScopeToCompany = async (
    departmentId: string,
    scopeGroup: DepartmentConsolidationScopeGroup,
  ) => {
    if (!planId || !currencyId) return;
    const selectionKey = forwardScopeSelectionKey(departmentId, scopeGroup.key);
    const selectedIds = selectedForwardByScope[selectionKey] ?? [];
    const requestIds = resolveForwardSubmitRequestIds(scopeGroup, selectedIds);
    if (!requestIds.length) {
      NotificationMessage.error({
        message: 'Nothing to submit',
        description:
          'Approve teams in this scope first, then submit them to company review.',
      });
      return;
    }
    try {
      const { data: freshRequests = [] } = await refetchRequests();
      const approvedIds = requestIds.filter((id) => {
        const row = freshRequests.find((entry) => entry.id === id);
        return row?.status === 'DEPARTMENT_APPROVED';
      });
      if (!approvedIds.length) {
        NotificationMessage.error({
          message: 'Submit to company failed',
          description:
            'Nothing is dept-approved in this scope anymore. Reload — teams may already be with company review (Submitted tab).',
        });
        return;
      }
      await submitConsolidation.mutateAsync({
        planId,
        departmentId,
        currencyId,
        horizon: scopeGroup.horizon,
        sessionId:
          scopeGroup.horizon === 'session' ? scopeGroup.sessionId : undefined,
        requestIds: approvedIds,
      });
      await Promise.all([
        refetchRequests(),
        refetchDeptReviewQueue(),
        showCompanyInbox ? refetchCompanyReviewQueue() : Promise.resolve(),
      ]);
      setSelectedForwardByScope((prev) => ({
        ...prev,
        [selectionKey]: [],
      }));
      NotificationMessage.success({
        message: 'Submitted to company approval',
        description: showCompanyInbox
          ? `${approvedIds.length} team proposal${approvedIds.length === 1 ? '' : 's'} moved to company Waiting approval.`
          : `${approvedIds.length} team proposal${approvedIds.length === 1 ? '' : 's'} forwarded — track them under Submitted.`,
      });
      if (!showCompanyInbox) {
        setApprovalsPanel('tracking');
      }
    } catch (error: unknown) {
      NotificationMessage.error({
        message: 'Submit to company failed',
        description:
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Could not submit department package',
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section
        className={cn(
          embedded
            ? cn(
                TARGETS_CARD_CLASS,
                'flex min-h-0 flex-1 flex-col overflow-hidden',
              )
            : 'flex min-h-0 flex-1 flex-col',
        )}
      >
        {showMyApprovalsSection || showDepartmentConsolidation ? (
          <>
            <div
              className={cn(
                'flex flex-wrap items-center gap-1 border-b border-border',
                embedded ? 'px-4 pt-1' : 'pb-0',
              )}
            >
              <button
                type="button"
                onClick={() => setApprovalsPanel('action')}
                className={cn(
                  'inline-flex items-center whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-medium transition-colors',
                  approvalsPanel === 'action'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                Waiting approval
                {myApprovalActionCount > 0 ? ` (${myApprovalActionCount})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setApprovalsPanel('tracking')}
                className={cn(
                  'inline-flex items-center whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-medium transition-colors',
                  approvalsPanel === 'tracking'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {trackingTabLabel}
                {submittedApprovalInboxForDisplay.length > 0
                  ? ` (${submittedApprovalInboxForDisplay.length})`
                  : ''}
              </button>
            </div>

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto',
                embedded ? '' : 'px-4 py-5 sm:px-6 sm:py-6',
              )}
            >
              <div
                className={cn(
                  embedded ? 'space-y-0 pb-4' : 'mx-auto max-w-4xl space-y-6',
                )}
              >
                {!isTrackingApprovalsPanel && showApprovalTabFullyEmpty ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                      <CheckCircle2 size={22} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">All caught up</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      No target proposals are currently waiting for your review.
                    </p>
                  </div>
                ) : null}
                {isTrackingApprovalsPanel &&
                submittedApprovalInboxForDisplay.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
                      <CheckCircle2 size={22} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {trackingTabLabel === 'Approved'
                        ? 'No approved proposals yet'
                        : 'No submitted proposals yet'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {trackingTabLabel === 'Approved'
                        ? 'Proposals approved by your team or department will appear here.'
                        : 'Proposals submitted for company review will appear here.'}
                    </p>
                  </div>
                ) : null}
                {visibleApprovalSections.map((section) => {
                  const forwardDeptId =
                    section.forwardPackageMeta?.departmentId ?? '';
                  const forwardScopeKey =
                    section.forwardPackageMeta?.scopeKey ?? '';
                  const forwardSelectionKey =
                    forwardDeptId && forwardScopeKey
                      ? forwardScopeSelectionKey(forwardDeptId, forwardScopeKey)
                      : '';
                  const forwardSelectedIds = forwardSelectionKey
                    ? (selectedForwardByScope[forwardSelectionKey] ?? [])
                    : [];

                  return (
                    <div key={section.id}>
                      {!isTrackingApprovalsPanel && section.heading.trim() ? (
                        <div className="border-b border-border bg-surface-elevated/50 px-4 py-2.5">
                          <p
                            className={cn(
                              'm-0',
                              TARGETS_TABLE_HEAD_CLASS,
                              'normal-case text-foreground',
                            )}
                          >
                            {section.heading}
                          </p>
                        </div>
                      ) : null}
                      {section.items.length > 0 ? (
                        <ul
                          className={cn(
                            embedded
                              ? 'space-y-3 px-3 pb-2 pt-3'
                              : 'divide-y divide-border/60',
                          )}
                        >
                          {section.items.map(
                            ({
                              request,
                              level,
                              teamName,
                              departmentName,
                              reportsToCompany,
                              scopeLabel,
                              displayOnly,
                              forwardPackage,
                            }) => {
                              const forwardSelected =
                                forwardPackage &&
                                forwardSelectedIds.includes(request.id);
                              const rev = currentRevision(request);
                              const isModifying =
                                modifyRequestId === request.id;
                              const rowActionBusy =
                                pendingAction?.requestId === request.id;
                              const approveLoading =
                                rowActionBusy &&
                                pendingAction?.kind === 'review' &&
                                pendingAction.decision === 'APPROVED';
                              const editOpening =
                                rowActionBusy &&
                                pendingAction?.kind === 'modify-open';
                              const modifySaveLoading =
                                rowActionBusy &&
                                pendingAction?.kind === 'modify-save';
                              const withdrawLoading =
                                rowActionBusy &&
                                pendingAction?.kind === 'withdraw';
                              const isExpanded =
                                expandedRequestIds.has(request.id) ||
                                isModifying;
                              const oppCount = rev?.opportunities?.length ?? 0;
                              const amount = Number(rev?.amount ?? 0);
                              const memberOwnerId =
                                request.targetLevel === 'person'
                                  ? (request.userId ?? undefined)
                                  : undefined;
                              const stepLabel = isTrackingApprovalsPanel
                                ? (trackingStepLabel(
                                    request.status,
                                    trackingTabLabel === 'Approved',
                                  ) ?? 'In approval pipeline')
                                : level === 'COMPANY'
                                  ? companyStepApprovalViewer
                                    ? 'Company approval'
                                    : 'Company review'
                                  : request.status === 'DEPARTMENT_APPROVED'
                                    ? 'Department approved · submit to company'
                                    : 'Department review';
                              const badgeLabel = inboxStatusBadge(
                                request,
                                displayOnly,
                                level,
                              );
                              return (
                                <li
                                  key={`${request.id}-${level}`}
                                  className={cn(
                                    embedded &&
                                      'overflow-hidden rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]',
                                    isExpanded &&
                                      embedded &&
                                      'ring-1 ring-border',
                                  )}
                                >
                                  <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-elevated/40 sm:px-5">
                                    {forwardPackage ? (
                                      <Checkbox
                                        className="mt-1 shrink-0 border-border shadow-none data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background focus-visible:border-foreground focus-visible:ring-foreground/20"
                                        checked={Boolean(forwardSelected)}
                                        onCheckedChange={(checked) =>
                                          toggleForwardPackageRequest(
                                            forwardPackage.departmentId,
                                            forwardPackage.scopeKey,
                                            request.id,
                                            checked === true,
                                          )
                                        }
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                        aria-label={`Include ${teamName} in submit to company`}
                                      />
                                    ) : null}
                                    <button
                                      type="button"
                                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                                      onClick={() =>
                                        toggleRequestExpanded(request.id)
                                      }
                                      aria-expanded={isExpanded}
                                    >
                                      <span className="mt-0.5 shrink-0 text-muted-foreground">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        {request.targetLevel === 'person' &&
                                        request.userId ? (
                                          <MemberProposalSubject
                                            displayName={resolveMemberRequestDisplayName(
                                              request,
                                              personProfiles,
                                            )}
                                            profile={personProfiles.get(
                                              request.userId,
                                            )}
                                            subtitle={[
                                              resolveSubmittedTeam(
                                                request.teamId,
                                                salesTeams,
                                                teamOptions,
                                              ).teamName,
                                              departmentName
                                                ? reportsToCompany
                                                  ? 'Reports to company'
                                                  : departmentName
                                                : null,
                                              stepLabel,
                                            ]
                                              .filter(Boolean)
                                              .join(' · ')}
                                          />
                                        ) : (
                                          <>
                                            <span className="block truncate text-sm font-semibold text-foreground">
                                              {teamName}
                                            </span>
                                            <span className="mt-0.5 block text-[12px] text-muted-foreground">
                                              {[
                                                scopeLabel,
                                                departmentName
                                                  ? reportsToCompany
                                                    ? 'Reports to company'
                                                    : `Dept · ${departmentName}`
                                                  : null,
                                                stepLabel,
                                              ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            </span>
                                          </>
                                        )}
                                        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Review amount
                                          </span>
                                          <span className="text-sm font-semibold tabular-nums text-foreground">
                                            {formatCompactMoney(
                                              amount,
                                              currencyCode,
                                            )}
                                          </span>
                                          <span className="text-[12px] text-muted-foreground">
                                            · {oppCount} opportunit
                                            {oppCount === 1 ? 'y' : 'ies'}
                                          </span>
                                        </span>
                                      </span>
                                    </button>
                                    {badgeLabel ? (
                                      <ProposalInboxStatusText
                                        label={badgeLabel}
                                      />
                                    ) : null}
                                    {isModifying ? (
                                      <span className="text-[12px] font-medium text-muted-foreground">
                                        Editing…
                                      </span>
                                    ) : isTrackingApprovalsPanel &&
                                      isSubmittedAwaitingCompanyApproval(
                                        request.status,
                                      ) &&
                                      isRequestInManagedDepartmentScope(
                                        request,
                                        salesTeams,
                                        managedDepartmentIds,
                                      ) &&
                                      showDepartmentConsolidation &&
                                      canModifyProposal ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            aria-label="More actions"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-52"
                                        >
                                          <DropdownMenuItem
                                            disabled={rowActionBusy}
                                            onClick={() =>
                                              void openModify(
                                                request,
                                                'DEPARTMENT',
                                              )
                                            }
                                          >
                                            {editOpening
                                              ? 'Opening…'
                                              : 'Modify proposal'}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            disabled={rowActionBusy}
                                            onClick={() =>
                                              void handleWithdrawFromCompany(
                                                request,
                                              )
                                            }
                                          >
                                            {withdrawLoading
                                              ? 'Removing…'
                                              : 'Remove from company review'}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : !displayOnly && !forwardPackage ? (
                                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                        {canModifyProposal &&
                                        (level !== 'DEPARTMENT' ||
                                          request.status ===
                                            'PENDING_DEPARTMENT') ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 px-3 text-[12px]"
                                            disabled={rowActionBusy}
                                            onClick={() =>
                                              void openModify(request, level)
                                            }
                                          >
                                            {editOpening ? (
                                              <Loader2
                                                className="h-3.5 w-3.5 animate-spin"
                                                aria-hidden
                                              />
                                            ) : (
                                              <Pencil
                                                className="h-3.5 w-3.5"
                                                aria-hidden
                                              />
                                            )}
                                            {editOpening ? 'Opening…' : 'Edit'}
                                          </Button>
                                        ) : null}
                                        {canRejectProposal ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 border-destructive/35 px-3 text-[12px] text-destructive hover:bg-destructive/5 hover:text-destructive"
                                            disabled={rowActionBusy}
                                            onClick={() =>
                                              openReject(request, level)
                                            }
                                          >
                                            <X
                                              className="h-3.5 w-3.5"
                                              aria-hidden
                                            />
                                            Reject
                                          </Button>
                                        ) : null}
                                        <PrimaryButton
                                          size="sm"
                                          className="h-8 gap-1.5 px-3"
                                          disabled={rowActionBusy}
                                          onClick={() =>
                                            void handleReview(
                                              request,
                                              'APPROVED',
                                              level,
                                            )
                                          }
                                        >
                                          {approveLoading ? (
                                            <Loader2
                                              className="h-3.5 w-3.5 animate-spin"
                                              aria-hidden
                                            />
                                          ) : (
                                            <Check
                                              className="h-3.5 w-3.5"
                                              aria-hidden
                                            />
                                          )}
                                          {approveLoading
                                            ? 'Approving…'
                                            : 'Approve'}
                                        </PrimaryButton>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div
                                    className={cn(
                                      'grid transition-[grid-template-rows] duration-200 ease-out',
                                      isExpanded
                                        ? 'grid-rows-[1fr]'
                                        : 'grid-rows-[0fr]',
                                    )}
                                  >
                                    <div className="overflow-hidden">
                                      {isExpanded ? (
                                        <div className="border-t border-border bg-surface-elevated/30 px-4 pb-5 pt-4 sm:px-5">
                                          {!isModifying ? (
                                            <>
                                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Opportunities
                                              </p>
                                              <TeamProposalOpportunityPicker
                                                selected={linesFromRequestOpportunities(
                                                  rev?.opportunities,
                                                )}
                                                onChange={() => undefined}
                                                reviewMode
                                                disabled
                                                currencyCode={currencyCode}
                                                ownerId={memberOwnerId}
                                                opportunityClaimHints={
                                                  request.teamId
                                                    ? deptOpportunityClaimHintsByTeam.get(
                                                        request.teamId,
                                                      )
                                                    : undefined
                                                }
                                              />
                                              <RequestHistorySection
                                                planId={planId}
                                                requestId={request.id}
                                                currencyCode={currencyCode}
                                              />
                                            </>
                                          ) : (
                                            <div className="space-y-3">
                                              <p className="m-0 text-[12px] font-semibold text-foreground">
                                                Edit proposal
                                              </p>
                                              <p className="m-0 text-[11px] text-muted-foreground">
                                                Select forecast opportunities or
                                                add manual targets, adjust
                                                allocations, then save. If
                                                another team uses the same
                                                opportunity, split{' '}
                                                <span className="font-medium">
                                                  Allocated
                                                </span>{' '}
                                                so the plan total does not
                                                exceed the opportunity value.
                                              </p>
                                              <TeamProposalOpportunityPicker
                                                calendarId={plan?.calendarId}
                                                currencyCode={currencyCode}
                                                currencyId={currencyId}
                                                salesTeamId={
                                                  request.teamId ?? undefined
                                                }
                                                ownerId={memberOwnerId}
                                                horizon={
                                                  request.horizon === 'session'
                                                    ? 'session'
                                                    : 'annual'
                                                }
                                                sessionId={
                                                  request.sessionId ?? undefined
                                                }
                                                selected={modifyOpps}
                                                onChange={(lines) => {
                                                  setModifyOpps(lines);
                                                  setModifyAmount(
                                                    String(sumAllocated(lines)),
                                                  );
                                                }}
                                                allowCustomAdd={Boolean(
                                                  planId && currencyId,
                                                )}
                                                useManualTargetForm
                                                manualTargetTeamGroups={
                                                  manualTargetTeamGroups
                                                }
                                                manualTargetTeamLabel={
                                                  request.teamId
                                                    ? teamLabelById(
                                                        request.teamId,
                                                      )
                                                    : undefined
                                                }
                                                initialManualMemberIds={
                                                  memberOwnerId
                                                    ? [memberOwnerId]
                                                    : undefined
                                                }
                                                planId={planId}
                                                opportunityClaimHints={
                                                  modifyOpportunityClaimHints
                                                }
                                              />
                                              <label className="block text-[12px] font-medium">
                                                Modified amount
                                                <input
                                                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 shadow-sm focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                                                  value={modifyAmount}
                                                  onChange={(e) =>
                                                    setModifyAmount(
                                                      e.target.value,
                                                    )
                                                  }
                                                />
                                              </label>
                                              <div className="flex gap-2">
                                                <PrimaryButton
                                                  disabled={modifySaveLoading}
                                                  className="gap-1.5"
                                                  onClick={() =>
                                                    void submitModify()
                                                  }
                                                >
                                                  {modifySaveLoading ? (
                                                    <>
                                                      <Loader2
                                                        className="h-3.5 w-3.5 animate-spin"
                                                        aria-hidden
                                                      />
                                                      Saving…
                                                    </>
                                                  ) : (
                                                    'Save changes'
                                                  )}
                                                </PrimaryButton>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  className="h-8 px-3 text-[12px]"
                                                  disabled={modifySaveLoading}
                                                  onClick={() =>
                                                    setModifyRequestId(null)
                                                  }
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </li>
                              );
                            },
                          )}
                        </ul>
                      ) : null}
                      {!isTrackingApprovalsPanel &&
                        consolidationScopesForSection(section).map(
                          ({ departmentId, group: scopeGroup }) => {
                            const selectionKey = forwardScopeSelectionKey(
                              departmentId,
                              scopeGroup.key,
                            );
                            const selectedIds =
                              selectedForwardByScope[selectionKey] ?? [];
                            const approvedIds =
                              approvedForwardRequestIdsInScope(scopeGroup);
                            const submitCount = resolveForwardSubmitRequestIds(
                              scopeGroup,
                              selectedIds,
                            ).length;
                            return (
                              <div
                                key={selectionKey}
                                className="sticky bottom-0 z-[1] flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-card/95 px-4 py-3.5 backdrop-blur sm:px-5"
                              >
                                <p className="mr-auto text-[12px] text-muted-foreground">
                                  {approvedIds.length
                                    ? `Select approved teams to submit to company`
                                    : 'Approve remaining teams before submitting this package.'}
                                </p>
                                {approvedIds.length > 0 ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={submitConsolidation.isLoading}
                                    onClick={() =>
                                      selectAllApprovedInForwardScope(
                                        departmentId,
                                        scopeGroup,
                                      )
                                    }
                                  >
                                    Select all approved
                                  </Button>
                                ) : null}
                                <PrimaryButton
                                  size="sm"
                                  className="shrink-0 gap-1.5"
                                  disabled={
                                    !scopeGroup.canSubmit ||
                                    submitConsolidation.isLoading ||
                                    submitCount === 0
                                  }
                                  onClick={() =>
                                    void submitScopeToCompany(
                                      departmentId,
                                      scopeGroup,
                                    )
                                  }
                                >
                                  {submitConsolidation.isLoading ? (
                                    <>
                                      <Loader2
                                        className="h-3.5 w-3.5 animate-spin"
                                        aria-hidden
                                      />
                                      Submitting…
                                    </>
                                  ) : submitCount > 0 ? (
                                    `Submit to company (${submitCount})`
                                  ) : (
                                    'Submit to company'
                                  )}
                                </PrimaryButton>
                              </div>
                            );
                          },
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </section>

      <Dialog
        open={rejectDialog != null}
        onOpenChange={(open) => {
          if (!open && rejectDialogSubmitting) return;
          if (!open) {
            setRejectDialog(null);
            setRejectComment('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject target request</DialogTitle>
            <DialogDescription>
              Optionally add a comment for the submitting team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-comment" className="text-[12px]">
              Comment (optional)
            </Label>
            <Textarea
              id="reject-comment"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Explain why this proposal is rejected (optional)"
              className="min-h-[88px] text-[13px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={rejectDialogSubmitting}
              onClick={() => {
                setRejectDialog(null);
                setRejectComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              disabled={rejectDialogSubmitting}
              onClick={() => submitReject()}
            >
              {rejectDialogSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Rejecting…
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
