'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Search,
  X,
} from 'lucide-react';
import {
  TARGETS_CARD_CLASS,
  TARGETS_TABLE_HEAD_CLASS,
  TARGETS_TABLE_HEAD_ROW_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { isRequestWorkflowMethod } from '@/components/sales-targeting/targetSettingMethod';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  defaultExpandedHierarchyKeys,
  flattenVisibleHierarchyRows,
  hierarchyScopeKey,
  walkHierarchy,
} from '@/components/sales-targeting/planning/planningHierarchyUtils';
import {
  PlanningStatusText,
} from '@/components/sales-targeting/planning/planningStatusDisplay';
import { PlanningPersonCell } from '@/components/sales-targeting/planning/PlanningPersonCell';
import {
  collectPersonIdsFromHierarchy,
  resolvePlanningScopeName,
  usePlanningPersonProfiles,
} from '@/components/sales-targeting/planning/planningPersonProfiles';

type Props = {
  root: TargetPlanningHierarchyNode;
  currencyCode: string;
  /** Active target setting method — drives which columns apply. */
  method?: string | null;
  showProposalsAction?: boolean;
  onOpenProposals?: () => void;
};

type Row = { node: TargetPlanningHierarchyNode; depth: number };

const TABLE_HEAD = cn(TARGETS_TABLE_HEAD_CLASS, 'px-4 py-3 text-left');
const TREE_INDENT_PX = 20;

function buildParentNameMap(
  root: TargetPlanningHierarchyNode,
): Map<string, string> {
  const map = new Map<string, string>();
  walkHierarchy(root, (node) => {
    for (const child of node.children) {
      map.set(hierarchyScopeKey(child), node.scopeName);
    }
  });
  return map;
}

function countByLevel(root: TargetPlanningHierarchyNode) {
  const counts = { department: 0, team: 0, person: 0 };
  walkHierarchy(root, (node) => {
    if (node.scopeLevel === 'department') counts.department += 1;
    else if (node.scopeLevel === 'team') counts.team += 1;
    else if (node.scopeLevel === 'person') counts.person += 1;
  });
  return counts;
}

function plural(count: number, singular: string, pluralLabel?: string) {
  return `${count} ${count === 1 ? singular : (pluralLabel ?? `${singular}s`)}`;
}

/** Individual proposals only exist for request-workflow methods. */
function stripPersonNodes(
  node: TargetPlanningHierarchyNode,
): TargetPlanningHierarchyNode {
  return {
    ...node,
    children: node.children
      .filter((child) => child.scopeLevel !== 'person')
      .map(stripPersonNodes),
  };
}

export function PlanningOrgExplorer({
  root: sourceRoot,
  currencyCode,
  method,
  showProposalsAction,
  onOpenProposals,
}: Props) {
  const usesRequests = isRequestWorkflowMethod(method);
  const root = useMemo(
    () => (usesRequests ? sourceRoot : stripPersonNodes(sourceRoot)),
    [sourceRoot, usesRequests],
  );
  const personIds = useMemo(() => collectPersonIdsFromHierarchy(root), [root]);
  const profiles = usePlanningPersonProfiles(personIds);
  const parentNames = useMemo(() => buildParentNameMap(root), [root]);
  const counts = useMemo(() => countByLevel(root), [root]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() =>
    defaultExpandedHierarchyKeys(root),
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    setExpandedKeys(defaultExpandedHierarchyKeys(root));
  }, [root]);

  const searchTerm = query.trim().toLowerCase();
  const isSearching = searchTerm.length > 0;

  const rows = useMemo<Row[]>(() => {
    if (!isSearching) return flattenVisibleHierarchyRows(root, expandedKeys);

    // While searching, keep matching rows and the ancestors that lead to them.
    const collect = (
      node: TargetPlanningHierarchyNode,
      depth: number,
    ): Row[] => {
      const childRows = node.children.flatMap((child) =>
        collect(child, depth + 1),
      );
      const selfMatches = resolvePlanningScopeName(node, profiles)
        .toLowerCase()
        .includes(searchTerm);
      if (!selfMatches && childRows.length === 0) return [];
      return [{ node, depth }, ...childRows];
    };
    return collect(root, 0);
  }, [root, expandedKeys, isSearching, searchTerm, profiles]);

  const toggleExpanded = useCallback((node: TargetPlanningHierarchyNode) => {
    const key = hierarchyScopeKey(node);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedKeys(
      defaultExpandedHierarchyKeys(root, Number.MAX_SAFE_INTEGER),
    );
  }, [root]);

  const collapseAll = useCallback(() => {
    setExpandedKeys(new Set([hierarchyScopeKey(root)]));
  }, [root]);

  const columnCount = usesRequests ? 6 : 5;

  return (
    <div
      className={cn(TARGETS_CARD_CLASS, 'flex min-h-[520px] overflow-hidden bg-white')}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Organization planning
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {[
                counts.department
                  ? plural(counts.department, 'department')
                  : null,
                plural(counts.team, 'team'),
                counts.person
                  ? plural(counts.person, 'person', 'people')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search scopes..."
                aria-label="Search organization"
                className="h-8.5 w-48 rounded-lg border border-border bg-white pl-8 pr-7 text-[12px] text-foreground outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8.5 gap-1.5 border-border bg-white px-2.5 text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={expandAll}
                disabled={isSearching}
              >
                <ChevronsDown size={14} aria-hidden />
                Expand all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8.5 gap-1.5 border-border bg-white px-2.5 text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={collapseAll}
                disabled={isSearching}
              >
                <ChevronsUp size={14} aria-hidden />
                Collapse all
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead
              className={cn(TARGETS_TABLE_HEAD_ROW_CLASS, 'sticky top-0 z-[1] bg-[#fafbfc]')}
            >
              <tr>
                <th className={cn(TABLE_HEAD, 'pl-5')}>Scope name</th>
                <th className={TABLE_HEAD}>Level</th>
                <th className={cn(TABLE_HEAD, 'text-right')}>
                  {usesRequests ? 'Proposed target' : 'Official target'}
                </th>
                <th className={cn(TABLE_HEAD, 'text-right')}>Forecast</th>
                {usesRequests ? <th className={TABLE_HEAD}>Status</th> : null}
                <th className={cn(TABLE_HEAD, 'w-10')} aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-5 py-12 text-center text-[13px] text-muted-foreground"
                  >
                    No organization scopes match “{query.trim()}”.
                  </td>
                </tr>
              ) : null}
              {rows.map(({ node, depth }) => {
                const amount = usesRequests
                  ? (node.proposedTarget ?? node.originalProposal ?? null)
                  : (node.officialTarget ?? node.strategicTarget ?? null);
                const forecast = node.currentForecast ?? null;
                const scopeKey = hierarchyScopeKey(node);
                const hasChildren = node.children.length > 0;
                const isExpanded = expandedKeys.has(scopeKey);

                return (
                  <tr
                    key={scopeKey}
                    className="group cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => {
                      if (hasChildren && !isSearching) {
                        toggleExpanded(node);
                      }
                    }}
                  >
                    <td className="border-l-[3px] border-transparent py-3.5 pl-4 pr-3">
                      <div
                        className="flex min-w-0 items-center gap-1.5"
                        style={{
                          paddingLeft: isSearching ? 0 : depth * TREE_INDENT_PX,
                        }}
                      >
                        {hasChildren && !isSearching ? (
                          <button
                            type="button"
                            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? `Collapse ${node.scopeName}`
                                : `Expand ${node.scopeName}`
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpanded(node);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                        ) : (
                          <span className="size-6 shrink-0" aria-hidden />
                        )}
                        <PlanningPersonCell
                          node={node}
                          profiles={profiles}
                          showScopeIcon
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {node.scopeLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-foreground">
                      {amount != null
                        ? formatCompactMoney(amount, currencyCode)
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                      {forecast != null
                        ? formatCompactMoney(forecast, currencyCode)
                        : '—'}
                    </td>
                    {usesRequests ? (
                      <td className="px-4 py-3.5">
                        <PlanningStatusText status={node.requestStatus} />
                      </td>
                    ) : null}
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {hasChildren ? (
                        <span className="text-[11px] text-muted-foreground/60">
                          {isExpanded ? 'Expanded' : 'Collapsed'}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
