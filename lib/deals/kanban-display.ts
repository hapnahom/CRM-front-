import type {
  PipelineCustomerSummary,
  PipelineDeal,
} from '@/store/server/features/deals/pipeline/types';

export {
  getCurrentOrgQuarter,
  quarterLabel,
  kanbanTeamBadgeVariant,
} from '@/lib/leads/kanban-display';

export const DEAL_STAGE_AGING_WARNING_DAYS = 4;

function daysBetween(fromIso: string, toDate = new Date()) {
  const datePart = fromIso.includes('T') ? fromIso.split('T')[0]! : fromIso;
  const a = new Date(`${datePart}T12:00:00`).getTime();
  if (Number.isNaN(a)) return 0;
  const b = new Date(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate(),
    12,
  ).getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

export function resolveDealCustomerName(
  deal: PipelineDeal,
  customerById: Map<string, PipelineCustomerSummary>,
): string {
  const fromDeal =
    deal.customer?.accountName?.trim() ||
    customerById.get(deal.customerId)?.accountName?.trim();
  if (fromDeal) return fromDeal;
  return 'Unassigned customer';
}

export function resolveDealBaseValue(deal: PipelineDeal): number {
  return deal.baseValue > 0 ? deal.baseValue : deal.value;
}

export function resolveDealExpectedClose(deal: PipelineDeal): string {
  if (deal.expectedClose?.trim()) {
    const parsed = new Date(deal.expectedClose);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]!;
    }
  }
  return '—';
}

export function resolveDealTeamName(deal: PipelineDeal): string {
  if (deal.team?.name?.trim()) return deal.team.name.trim();
  return '—';
}

export function resolveStageEnteredAt(deal: PipelineDeal): string {
  if (deal.stageEnteredAt?.trim()) return deal.stageEnteredAt;
  return '';
}

/** True when the API provided an explicit stage entry timestamp (not inferred). */
export function hasExplicitStageEnteredAt(deal: PipelineDeal): boolean {
  return Boolean(deal.stageEnteredAt?.trim());
}

export function dealAgingLabel(
  deal: PipelineDeal,
  stageCategory?: string,
): string | null {
  if (stageCategory && stageCategory !== 'open') return null;
  if (!hasExplicitStageEnteredAt(deal)) return null;

  const enteredAt = resolveStageEnteredAt(deal);
  if (!enteredAt) return null;

  const days = daysBetween(enteredAt);
  if (days < DEAL_STAGE_AGING_WARNING_DAYS) return null;
  return `Stuck for ${days} days`;
}

export function resolveDealQuarterLabel(deal: PipelineDeal): string {
  const close = deal.expectedClose || deal.createdAt;
  if (!close) return '—';
  const parsed = new Date(close);
  if (Number.isNaN(parsed.getTime())) return '—';
  const month = parsed.getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}
