import { resolveWorkflowEntityScopeLabel } from '@/config/salesWorkflow';
import type {
  ApprovalWorkflowSummary,
  ApprovalWorkflowTrigger,
} from '@/store/server/features/pipeline/workflows';

export type WorkflowEntityContext = 'LEAD' | 'DEAL' | 'TARGET';

function supportsTrigger(
  wf: ApprovalWorkflowSummary,
  trigger: ApprovalWorkflowTrigger,
): boolean {
  const triggers = wf.allowedTriggerTypes ?? [];
  if (!triggers.length) return true;
  return triggers.includes(trigger);
}

function matchesEntityScope(
  wf: ApprovalWorkflowSummary,
  entityScope?: WorkflowEntityContext,
): boolean {
  if (!entityScope) return true;
  if (entityScope === 'TARGET') {
    return wf.entityScope === 'TARGET';
  }
  return wf.entityScope === 'ANY' || wf.entityScope === entityScope;
}

export function isWorkflowCompatible(
  wf: ApprovalWorkflowSummary,
  opts: {
    entityScope?: WorkflowEntityContext;
    requiredTrigger: ApprovalWorkflowTrigger;
  },
): boolean {
  return (
    matchesEntityScope(wf, opts.entityScope) &&
    supportsTrigger(wf, opts.requiredTrigger)
  );
}

/** Human labels for restrictions that make a workflow unusable in this context. */
export function describeWorkflowIncompatibility(
  wf: ApprovalWorkflowSummary,
  opts: {
    entityScope?: WorkflowEntityContext;
    requiredTrigger: ApprovalWorkflowTrigger;
  },
): string[] {
  const parts: string[] = [];

  if (
    opts.entityScope &&
    wf.entityScope !== 'ANY' &&
    wf.entityScope !== opts.entityScope
  ) {
    const scopeLabel = resolveWorkflowEntityScopeLabel(wf.entityScope);
    if (scopeLabel) {
      parts.push(scopeLabel);
    }
  }

  const triggers = wf.allowedTriggerTypes ?? [];
  if (triggers.length && !triggers.includes(opts.requiredTrigger)) {
    const hasStage = triggers.includes('stage_approval');
    const hasRule = triggers.includes('rule_exception');
    const hasTarget = triggers.includes('sales_target_approval');
    if (opts.requiredTrigger === 'sales_target_approval') {
      parts.push('non–Sales Target triggers');
    } else if (hasTarget && !hasStage && !hasRule) {
      parts.push('Sales Target only');
    } else if (hasRule && !hasStage) {
      parts.push('Rule Exceptions only');
    } else if (hasStage && !hasRule) {
      parts.push('Stage Changes only');
    } else if (opts.requiredTrigger === 'stage_approval') {
      parts.push('non–Stage Change triggers');
    } else {
      parts.push('non–Rule Exception triggers');
    }
  }

  return parts;
}

export function workflowIncompatibilityWarning(
  wf: ApprovalWorkflowSummary | undefined,
  opts: {
    entityScope?: WorkflowEntityContext;
    requiredTrigger: ApprovalWorkflowTrigger;
  },
): string | null {
  if (!wf) return null;
  if (isWorkflowCompatible(wf, opts)) return null;
  const parts = describeWorkflowIncompatibility(wf, opts);
  if (!parts.length) {
    return 'Warning: The assigned workflow cannot be used here.';
  }
  return `Warning: The assigned workflow is configured for ${parts.join(' / ')} and cannot be used here.`;
}
