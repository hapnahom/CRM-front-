import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import {
  hasExplicitStageEnteredAt,
  resolveStageEnteredAt,
} from '@/lib/leads/kanban-display';
import { STAGE_AGING_WARNING_DAYS } from '@/store/server/features/leads/pipeline/types';
import type { PipelineStage } from '@/store/server/features/leads/pipeline/types';

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

export function daysBetween(fromIso: string, toDate = new Date()) {
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

export function leadAgingLabel(
  lead: PipelineLead,
  stageById: Map<string, PipelineStage>,
): string | null {
  if (!hasExplicitStageEnteredAt(lead)) return null;

  const st = stageById.get(lead.stageId);
  if (!st || st.category !== 'open') return null;

  const enteredAt = resolveStageEnteredAt(lead);
  if (!enteredAt) return null;

  const days = daysBetween(enteredAt);
  if (days < STAGE_AGING_WARNING_DAYS) return null;
  return `Stuck for ${days} days`;
}

export function ownerName(lead: PipelineLead) {
  return (
    lead.responsibleUser?.name ||
    lead.responsibleUser?.email ||
    lead.responsibleUser?.selamnewId ||
    '—'
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function groupLeadsByStageId(
  leads: PipelineLead[],
): Map<string, PipelineLead[]> {
  const map = new Map<string, PipelineLead[]>();
  for (const lead of leads) {
    const bucket = map.get(lead.stageId);
    if (bucket) {
      bucket.push(lead);
    } else {
      map.set(lead.stageId, [lead]);
    }
  }
  return map;
}
