import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineStage } from '@/store/server/features/deals/pipeline/types';
import {
  dealAgingLabel,
  hasExplicitStageEnteredAt,
  resolveStageEnteredAt,
} from '@/lib/deals/kanban-display';

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().split('T')[0]!;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function ownerName(deal: PipelineDeal) {
  return (
    deal.responsibleUser?.name ||
    deal.responsibleUser?.email ||
    deal.responsibleUser?.selamnewId ||
    '—'
  );
}

export function dealAgingLabelForBoard(
  deal: PipelineDeal,
  stageById: Map<string, PipelineStage>,
): string | null {
  const stage = stageById.get(deal.stageId);
  return dealAgingLabel(deal, stage?.category);
}

export { hasExplicitStageEnteredAt, resolveStageEnteredAt };

export function groupDealsByStageId(
  deals: PipelineDeal[],
): Map<string, PipelineDeal[]> {
  const map = new Map<string, PipelineDeal[]>();
  for (const deal of deals) {
    const bucket = map.get(deal.stageId);
    if (bucket) {
      bucket.push(deal);
    } else {
      map.set(deal.stageId, [deal]);
    }
  }
  return map;
}
