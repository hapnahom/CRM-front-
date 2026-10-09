import type { SalesTargetPlan } from '@/store/server/features/salesTargeting/types';

export function formatTargetSettingMethod(method?: string | null): string {
  switch (method) {
    case 'BOTTOM_TO_TOP':
      return 'Bottom to Top';
    case 'HYBRID':
      return 'Hybrid';
    case 'TOP_TO_BOTTOM':
    default:
      return 'Top to Bottom';
  }
}

export function isRequestWorkflowMethod(method?: string | null): boolean {
  return method === 'BOTTOM_TO_TOP' || method === 'HYBRID';
}

/** B2T/Hybrid team Details & approvals — same flow as TTB customs, this label. */
export const WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL = 'Add manual target';

/**
 * B2T/Hybrid target-request APIs apply only when the **plan row** uses that workflow.
 * Org Settings method is a fallback only when no plan is loaded yet (avoid calling
 * review APIs against a Top-to-Bottom plan while Settings show Bottom-to-Top).
 */
export function planUsesTargetRequestWorkflow(
  plan?: Pick<SalesTargetPlan, 'targetSettingMethod'> | null,
  orgFallback?: string | null,
): boolean {
  const onPlan = plan?.targetSettingMethod?.trim();
  if (onPlan) {
    return isRequestWorkflowMethod(onPlan);
  }
  return isRequestWorkflowMethod(orgFallback ?? null);
}

export function isHybridMethod(method?: string | null): boolean {
  return method === 'HYBRID';
}

export function isBottomToTopMethod(method?: string | null): boolean {
  return method === 'BOTTOM_TO_TOP';
}

export function isTopToBottomMethod(method?: string | null): boolean {
  return method === 'TOP_TO_BOTTOM' || method == null;
}

/** Top to Bottom — company/department allocation (not B2T request workflow). */
export function usesAllocationWorkbench(method?: string | null): boolean {
  return isTopToBottomMethod(method);
}

/** Downstream Details are derived from the company target under Top to Bottom. */
export function isDownstreamDetailsReadOnly(method?: string | null): boolean {
  return isTopToBottomMethod(method);
}

/** Avoid "FY (Bottom to Top) (Bottom to Top)" in plan pickers. */
export function planDisplayLabel(
  plan: Pick<SalesTargetPlan, 'name' | 'targetSettingMethod'>,
): string {
  const method = formatTargetSettingMethod(plan.targetSettingMethod);
  let name = plan.name?.trim() ?? '';
  if (!name) return method;
  const suffix = ` (${method})`;
  while (name.endsWith(suffix)) {
    name = name.slice(0, -suffix.length).trimEnd();
  }
  if (name.includes(method)) return name;
  return `${name}${suffix}`;
}

/** Shown when company/department top-down save is attempted under B2T/Hybrid. */
export function bottomUpStartsFromTeamsDescription(
  method?: string | null,
): string {
  if (method === 'HYBRID') {
    return 'Hybrid: set the company strategic amount on Annual or Periods. Only teams in the main department (User management → Teams) propose targets; after company finalization, forecast-based targets are set for all other departments, teams, and members.';
  }
  return 'Bottom to Top: only teams in the main department propose targets. After department and company approval, finalize the plan — then forecast-based targets are applied top-down for all other departments, teams, and members.';
}
