'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';

function scopeIcon(level: string) {
  switch (level) {
    case 'company':
      return <Building2 size={14} />;
    case 'department':
      return <Target size={14} />;
    case 'team':
      return <Users size={14} />;
    case 'person':
      return <Users size={14} />;
    default:
      return <Target size={14} />;
  }
}

function statusBadge(node: TargetPlanningHierarchyNode) {
  if (
    !node.requestStatus ||
    node.scopeLevel === 'company' ||
    node.scopeLevel === 'department'
  ) {
    if (node.gap != null && node.gap > 0) {
      return (
        <Badge variant="outline" className="text-[10px]">
          Gap
        </Badge>
      );
    }
    return null;
  }

  switch (node.requestStatus) {
    case 'OFFICIAL':
    case 'COMPANY_APPROVED':
    case 'RECONCILED':
    case 'TEAM_APPROVED':
      return (
        <Badge variant="secondary" className="text-[10px]">
          Approved
        </Badge>
      );
    case 'PENDING_TEAM':
    case 'PENDING_DEPARTMENT':
    case 'PENDING_COMPANY':
    case 'PENDING_RECONCILIATION':
      return (
        <Badge variant="outline" className="text-[10px]">
          Pending
        </Badge>
      );
    case 'TEAM_REJECTED':
    case 'DEPARTMENT_REJECTED':
    case 'COMPANY_REJECTED':
      return (
        <Badge variant="destructive" className="text-[10px]">
          Rejected
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge variant="outline" className="text-[10px]">
          Draft
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {node.requestStatus.replace(/_/g, ' ')}
        </Badge>
      );
  }
}

type TreeNodeProps = {
  node: TargetPlanningHierarchyNode;
  depth: number;
  currencyCode: string;
  selectedScopeKey: string | null;
  onSelect: (node: TargetPlanningHierarchyNode) => void;
  defaultExpanded?: boolean;
};

function TreeNode({
  node,
  depth,
  currencyCode,
  selectedScopeKey,
  onSelect,
  defaultExpanded = depth < 2,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const scopeKey = `${node.scopeLevel}:${node.scopeId ?? 'company'}`;
  const selected = selectedScopeKey === scopeKey;
  const primaryAmount =
    node.proposedTarget ?? node.officialTarget ?? node.strategicTarget ?? null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(node);
          if (hasChildren) setExpanded((value) => !value);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
          selected ? 'bg-brand/10 ring-1 ring-brand/30' : 'hover:bg-muted/60',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <span className="text-muted-foreground">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-[14px]" />
        )}
        <span className="text-muted-foreground">
          {scopeIcon(node.scopeLevel)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {node.scopeName}
        </span>
        {primaryAmount != null ? (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
            {formatCompactMoney(primaryAmount, currencyCode)}
          </span>
        ) : null}
        <span className="shrink-0">{statusBadge(node)}</span>
      </button>
      {hasChildren && expanded ? (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={`${child.scopeLevel}:${child.scopeId}`}
              node={child}
              depth={depth + 1}
              currencyCode={currencyCode}
              selectedScopeKey={selectedScopeKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  root: TargetPlanningHierarchyNode;
  currencyCode: string;
  selectedNode: TargetPlanningHierarchyNode | null;
  onSelectNode: (node: TargetPlanningHierarchyNode) => void;
};

export function PlanningHierarchyTree({
  root,
  currencyCode,
  selectedNode,
  onSelectNode,
}: Props) {
  const selectedScopeKey = useMemo(() => {
    if (!selectedNode) return `${root.scopeLevel}:${root.scopeId ?? 'company'}`;
    return `${selectedNode.scopeLevel}:${selectedNode.scopeId ?? 'company'}`;
  }, [selectedNode, root.scopeId, root.scopeLevel]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <TreeNode
        node={root}
        depth={0}
        currencyCode={currencyCode}
        selectedScopeKey={selectedScopeKey}
        onSelect={onSelectNode}
        defaultExpanded
      />
    </div>
  );
}
