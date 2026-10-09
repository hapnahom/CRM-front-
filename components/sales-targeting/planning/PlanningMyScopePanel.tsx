'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Target,
  Users,
} from 'lucide-react';
import {
  PrimaryButton,
  TARGETS_CARD_CLASS,
  TARGETS_TABLE_HEAD_CLASS,
  TARGETS_TABLE_HEAD_ROW_CLASS,
  ScopePanelSkeleton,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { isRequestWorkflowMethod } from '@/components/sales-targeting/targetSettingMethod';
import type {
  PlanningEligibilityView,
  TargetPlanningHierarchyNode,
} from '@/store/server/features/salesTargeting/types';
import type { DataScopeLevel } from '@/utils/dataScope';
import { cn } from '@/lib/utils';
import {
  collectDirectTeamsAtRoot,
  collectNodesByLevel,
  countTeamsWithProposal,
  filterDepartmentsForScope,
  findTeamsForUser,
  isBlockedEntity,
} from '@/components/sales-targeting/planning/planningHierarchyUtils';
import { PlanningStatusText } from '@/components/sales-targeting/planning/planningStatusDisplay';
import { PlanningPersonCell } from '@/components/sales-targeting/planning/PlanningPersonCell';
import {
  collectPersonIdsFromHierarchy,
  usePlanningPersonProfiles,
  type PlanningPersonProfile,
} from '@/components/sales-targeting/planning/planningPersonProfiles';

type Props = {
  scopeLevel: DataScopeLevel;
  root?: TargetPlanningHierarchyNode;
  currencyCode: string;
  currentUserId: string | null;
  ownPersonNode: TargetPlanningHierarchyNode | null;
  managedTeamIds?: string[];
  leadTeamIds?: string[];
  managedDepartmentIds?: string[];
  eligibility?: PlanningEligibilityView | null;
  showProposalsAction?: boolean;
  onOpenProposals?: () => void;
  onViewFullOrg?: () => void;
  loading?: boolean;
  /** Active target setting method — drives which columns and actions apply. */
  method?: string | null;
  /** Optional control rendered in the panel header (e.g. horizon toggle). */
  headerAction?: ReactNode;
};

const TABLE_HEAD = cn(TARGETS_TABLE_HEAD_CLASS, 'px-4 py-3 text-left');

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function PersonalScopePanel({
  node,
  teamNode,
  currencyCode,
  usesRequests,
  showProposalsAction,
  onOpenProposals,
  headerAction,
}: {
  node: TargetPlanningHierarchyNode;
  teamNode: TargetPlanningHierarchyNode | null;
  currencyCode: string;
  usesRequests: boolean;
  showProposalsAction?: boolean;
  onOpenProposals?: () => void;
  headerAction?: ReactNode;
}) {
  const primary = usesRequests
    ? (node.proposedTarget ?? node.originalProposal)
    : (node.officialTarget ?? node.strategicTarget);
  const forecast = node.currentForecast;

  return (
    <ScopeCard
      icon={<Target size={16} />}
      title="Your target"
      action={headerAction}
      subtitle={
        teamNode
          ? `Team: ${teamNode.scopeName}`
          : usesRequests
            ? 'Individual target proposal'
            : 'Individual target'
      }
      footer={
        usesRequests && showProposalsAction && onOpenProposals ? (
          <div className="flex justify-end border-t border-border px-4 py-3">
            <PrimaryButton
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={onOpenProposals}
            >
              Open proposals
              <ArrowRight size={14} />
            </PrimaryButton>
          </div>
        ) : null
      }
    >
      {usesRequests ? (
        <div className="mb-4">
          <PlanningStatusText status={node.requestStatus} />
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-3">
        <MetricTile
          label={usesRequests ? 'Proposed' : 'Target'}
          value={
            primary != null ? formatCompactMoney(primary, currencyCode) : '—'
          }
        />
        <MetricTile
          label="Forecast"
          value={
            forecast != null ? formatCompactMoney(forecast, currencyCode) : '—'
          }
        />
      </dl>
    </ScopeCard>
  );
}

function TeamScopePanel({
  teamNode,
  currencyCode,
  profiles,
  usesRequests,
  showProposalsAction,
  onOpenProposals,
  headerAction,
}: {
  teamNode: TargetPlanningHierarchyNode;
  currencyCode: string;
  profiles: Map<string, PlanningPersonProfile>;
  usesRequests: boolean;
  showProposalsAction?: boolean;
  onOpenProposals?: () => void;
  headerAction?: ReactNode;
}) {
  const members = teamNode.children.filter(
    (child) => child.scopeLevel === 'person',
  );

  return (
    <ScopeCard
      icon={<Users size={16} />}
      title={teamNode.scopeName}
      action={headerAction}
      subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`}
      footer={
        usesRequests && showProposalsAction && onOpenProposals ? (
          <div className="flex justify-end border-t border-border px-4 py-3">
            <PrimaryButton
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={onOpenProposals}
            >
              Open proposals
              <ArrowRight size={14} />
            </PrimaryButton>
          </div>
        ) : null
      }
    >
      {!usesRequests ? (
        <dl className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Team target"
            value={
              (teamNode.officialTarget ?? teamNode.strategicTarget) != null
                ? formatCompactMoney(
                    (teamNode.officialTarget ?? teamNode.strategicTarget)!,
                    currencyCode,
                  )
                : '—'
            }
          />
          <MetricTile
            label="Forecast"
            value={
              teamNode.currentForecast != null
                ? formatCompactMoney(teamNode.currentForecast, currencyCode)
                : '—'
            }
          />
        </dl>
      ) : members.length ? (
        <ScopeTable>
          <thead>
            <tr className={TARGETS_TABLE_HEAD_ROW_CLASS}>
              <th className={TABLE_HEAD}>Member</th>
              <th className={TABLE_HEAD}>Status</th>
              <th className={cn(TABLE_HEAD, 'text-right')}>Proposed</th>
              <th className="w-8" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {members.map((member) => {
              const amount =
                member.proposedTarget ?? member.originalProposal ?? null;
              return (
                <tr
                  key={member.scopeId ?? member.scopeName}
                  className="transition-colors hover:bg-surface-elevated/40"
                >
                  <td className="px-4 py-3">
                    <PlanningPersonCell node={member} profiles={profiles} />
                  </td>
                  <td className="px-4 py-3">
                    <PlanningStatusText status={member.requestStatus} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                    {amount != null
                      ? formatCompactMoney(amount, currencyCode)
                      : '—'}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    <ChevronRight size={14} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ScopeTable>
      ) : (
        <EmptyScopeMessage message="No team members are assigned to this planning scope yet." />
      )}
    </ScopeCard>
  );
}

function AmountCell({
  amount,
  currencyCode,
  className,
}: {
  amount: number | null | undefined;
  currencyCode: string;
  className?: string;
}) {
  return (
    <span className={cn('tabular-nums', className)}>
      {amount != null ? formatCompactMoney(amount, currencyCode) : '—'}
    </span>
  );
}

function DirectTeamsPanel({
  teams,
  currencyCode,
  eligibility,
  usesRequests,
}: {
  teams: TargetPlanningHierarchyNode[];
  currencyCode: string;
  eligibility?: PlanningEligibilityView | null;
  usesRequests: boolean;
}) {
  if (!teams.length) return null;

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Direct teams
      </h4>
      <ScopeTable>
        <thead>
          <tr className={TARGETS_TABLE_HEAD_ROW_CLASS}>
            <th className={TABLE_HEAD}>Team</th>
            <th className={cn(TABLE_HEAD, 'text-right')}>
              {usesRequests ? 'Proposed' : 'Target'}
            </th>
            <th className={cn(TABLE_HEAD, usesRequests ? '' : 'text-right')}>
              {usesRequests ? 'Status' : 'Forecast'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {teams.map((team) => {
            const amount = usesRequests
              ? (team.proposedTarget ?? team.officialTarget)
              : (team.officialTarget ?? team.strategicTarget);
            const blocked = isBlockedEntity(eligibility, 'team', team.scopeId);
            return (
              <tr
                key={team.scopeId ?? team.scopeName}
                className="transition-colors hover:bg-surface-elevated/40"
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {team.scopeName}
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">
                  <AmountCell amount={amount} currencyCode={currencyCode} />
                </td>
                <td
                  className={cn(
                    'px-4 py-3',
                    !usesRequests && 'text-right text-sm text-muted-foreground',
                  )}
                >
                  {usesRequests ? (
                    <PlanningStatusText
                      status={team.requestStatus}
                      blocked={blocked}
                    />
                  ) : (
                    <AmountCell
                      amount={team.currentForecast}
                      currencyCode={currencyCode}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </ScopeTable>
    </div>
  );
}

function DepartmentRollupPanel({
  title,
  subtitle,
  departments,
  directTeams,
  currencyCode,
  eligibility,
  onViewFullOrg,
  usesRequests,
  headerAction,
}: {
  title: string;
  subtitle: string;
  departments: TargetPlanningHierarchyNode[];
  directTeams: TargetPlanningHierarchyNode[];
  currencyCode: string;
  eligibility?: PlanningEligibilityView | null;
  onViewFullOrg?: () => void;
  usesRequests: boolean;
  headerAction?: ReactNode;
}) {
  const [expandedDeptKeys, setExpandedDeptKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleDept = (key: string) => {
    setExpandedDeptKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const tableBody =
    departments.length || directTeams.length ? (
      <>
        {departments.length ? (
          <table className="w-full text-left">
            <thead className={TARGETS_TABLE_HEAD_ROW_CLASS}>
              <tr>
                <th className={cn(TABLE_HEAD, 'w-10 pl-5')} aria-hidden />
                <th className={TABLE_HEAD}>Department</th>
                <th className={TABLE_HEAD}>Teams</th>
                <th className={cn(TABLE_HEAD, 'text-right')}>
                  {usesRequests ? 'Proposed' : 'Target'}
                </th>
                <th
                  className={cn(
                    TABLE_HEAD,
                    'pr-5',
                    !usesRequests && 'text-right',
                  )}
                >
                  {usesRequests ? 'Status' : 'Forecast'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {departments.map((dept) => {
                const deptKey = dept.scopeId ?? dept.scopeName;
                const { proposed, total } = countTeamsWithProposal(dept);
                const blocked = isBlockedEntity(
                  eligibility,
                  'department',
                  dept.scopeId,
                );
                const amount = usesRequests
                  ? (dept.proposedTarget ?? dept.officialTarget)
                  : (dept.officialTarget ?? dept.strategicTarget);
                const teams = dept.children.filter(
                  (child) => child.scopeLevel === 'team',
                );
                const isExpanded = expandedDeptKeys.has(deptKey);
                const canExpand = teams.length > 0;

                return (
                  <Fragment key={deptKey}>
                    <tr
                      className={cn(
                        'transition-colors',
                        canExpand && 'cursor-pointer',
                        isExpanded
                          ? 'bg-surface-elevated/50'
                          : 'hover:bg-surface-elevated/40',
                      )}
                      onClick={() => {
                        if (canExpand) toggleDept(deptKey);
                      }}
                    >
                      <td className="py-3.5 pl-5 pr-2 text-muted-foreground">
                        {canExpand ? (
                          <button
                            type="button"
                            className="flex size-5 items-center justify-center rounded hover:bg-surface-elevated hover:text-foreground"
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? `Collapse ${dept.scopeName}`
                                : `Expand ${dept.scopeName}`
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleDept(deptKey);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block size-5" aria-hidden />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                        {dept.scopeName}
                      </td>
                      <td className="px-4 py-3.5 text-sm tabular-nums text-muted-foreground">
                        {usesRequests ? `${proposed}/${total}` : total}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-foreground">
                        <AmountCell
                          amount={amount}
                          currencyCode={currencyCode}
                        />
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3.5 pr-5',
                          !usesRequests &&
                            'text-right text-sm text-muted-foreground',
                        )}
                      >
                        {usesRequests ? (
                          <PlanningStatusText
                            status={dept.requestStatus}
                            blocked={blocked}
                          />
                        ) : (
                          <AmountCell
                            amount={dept.currentForecast}
                            currencyCode={currencyCode}
                          />
                        )}
                      </td>
                    </tr>
                    {isExpanded
                      ? teams.map((team) => {
                          const teamAmount = usesRequests
                            ? (team.proposedTarget ?? team.officialTarget)
                            : (team.officialTarget ?? team.strategicTarget);
                          const teamBlocked = isBlockedEntity(
                            eligibility,
                            'team',
                            team.scopeId,
                          );
                          return (
                            <tr
                              key={team.scopeId ?? team.scopeName}
                              className="bg-surface-elevated/25 transition-colors hover:bg-surface-elevated/40"
                            >
                              <td className="py-3 pl-5 pr-2" aria-hidden />
                              <td className="px-4 py-3 pl-8 text-sm text-foreground">
                                <span className="flex items-center gap-2">
                                  <Users
                                    size={13}
                                    className="shrink-0 text-muted-foreground"
                                  />
                                  {team.scopeName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                Team
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-foreground">
                                <AmountCell
                                  amount={teamAmount}
                                  currencyCode={currencyCode}
                                />
                              </td>
                              <td
                                className={cn(
                                  'px-4 py-3 pr-5',
                                  !usesRequests &&
                                    'text-right text-sm text-muted-foreground',
                                )}
                              >
                                {usesRequests ? (
                                  <PlanningStatusText
                                    status={team.requestStatus}
                                    blocked={teamBlocked}
                                  />
                                ) : (
                                  <AmountCell
                                    amount={team.currentForecast}
                                    currencyCode={currencyCode}
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : null}
        {directTeams.length ? (
          <div className="border-t border-border px-5 py-4 first:border-t-0">
            <DirectTeamsPanel
              teams={directTeams}
              currencyCode={currencyCode}
              eligibility={eligibility}
              usesRequests={usesRequests}
            />
          </div>
        ) : null}
      </>
    ) : (
      <div className="px-5 py-8">
        <EmptyScopeMessage message="No department planning data is available for your access level." />
      </div>
    );

  return (
    <section className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground">
            <LayoutList size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {headerAction}
      </div>
      <div className="overflow-x-auto">{tableBody}</div>
      {onViewFullOrg ? (
        <div className="flex justify-end border-t border-border px-5 py-3">
          <PrimaryButton
            type="button"
            size="sm"
            className="gap-1.5 px-4"
            onClick={onViewFullOrg}
          >
            View organization
            <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      ) : null}
    </section>
  );
}

function ScopeTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

function ScopeCard({
  icon,
  title,
  subtitle,
  action,
  footer,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer}
    </section>
  );
}

function EmptyScopeMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
      {message}
    </p>
  );
}

export function PlanningMyScopePanel({
  scopeLevel,
  root,
  currencyCode,
  currentUserId,
  ownPersonNode,
  managedTeamIds = [],
  leadTeamIds = [],
  managedDepartmentIds = [],
  eligibility,
  showProposalsAction,
  onOpenProposals,
  onViewFullOrg,
  loading = false,
  method,
  headerAction,
}: Props) {
  const usesRequests = isRequestWorkflowMethod(method);
  const personIds = useMemo(
    () => (root ? collectPersonIdsFromHierarchy(root) : []),
    [root],
  );
  const profiles = usePlanningPersonProfiles(personIds);

  if (loading) {
    return <ScopePanelSkeleton />;
  }

  if (!root) {
    return (
      <EmptyScopeMessage message="Unable to load your planning scope right now." />
    );
  }

  const teamNodes = findTeamsForUser(
    root,
    currentUserId,
    managedTeamIds,
    leadTeamIds,
  );
  const departments = filterDepartmentsForScope(
    collectNodesByLevel(root, 'department'),
    scopeLevel,
    managedDepartmentIds,
  );
  const directTeams =
    scopeLevel === 'company' ? collectDirectTeamsAtRoot(root) : [];

  if (scopeLevel === 'personal') {
    if (!ownPersonNode) {
      return (
        <EmptyScopeMessage message="You are not assigned to a planning scope on this target plan yet." />
      );
    }
    return (
      <PersonalScopePanel
        node={ownPersonNode}
        teamNode={teamNodes[0] ?? null}
        currencyCode={currencyCode}
        usesRequests={usesRequests}
        showProposalsAction={showProposalsAction}
        onOpenProposals={onOpenProposals}
        headerAction={headerAction}
      />
    );
  }

  if (scopeLevel === 'team') {
    if (!teamNodes.length) {
      return (
        <EmptyScopeMessage message="No team planning scope is available for your account on this plan." />
      );
    }
    return (
      <div className="space-y-3">
        {teamNodes.map((teamNode, index) => (
          <TeamScopePanel
            key={teamNode.scopeId ?? teamNode.scopeName}
            teamNode={teamNode}
            currencyCode={currencyCode}
            profiles={profiles}
            usesRequests={usesRequests}
            showProposalsAction={showProposalsAction}
            onOpenProposals={onOpenProposals}
            headerAction={index === 0 ? headerAction : undefined}
          />
        ))}
      </div>
    );
  }

  const rollupTitle =
    scopeLevel === 'company' ? 'Planning by department' : 'Department planning';
  const rollupSubtitle =
    scopeLevel === 'company'
      ? `${departments.length} department${departments.length === 1 ? '' : 's'} in this plan`
      : usesRequests
        ? 'Teams and proposals across your departments'
        : 'Teams and targets across your departments';

  return (
    <DepartmentRollupPanel
      title={rollupTitle}
      subtitle={rollupSubtitle}
      departments={departments}
      directTeams={directTeams}
      currencyCode={currencyCode}
      eligibility={eligibility}
      onViewFullOrg={onViewFullOrg}
      usesRequests={usesRequests}
      headerAction={headerAction}
    />
  );
}
