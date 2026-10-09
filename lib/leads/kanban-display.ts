import type {
  PipelineCustomerSummary,
  PipelineLead,
} from '@/store/server/features/leads/pipeline/types';

export const KANBAN_SALES_TEAM_NAMES: string[] = [];

type LeadQuarter = 1 | 2 | 3 | 4;

function stableIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) % mod;
  }
  return hash;
}

export function getLeadQuarterFromLead(
  lead: Pick<PipelineLead, 'expectedClose' | 'createdAt'>,
  referenceDate = new Date(),
): LeadQuarter {
  const dateSource = lead.expectedClose || lead.createdAt;
  const parsed = dateSource ? new Date(dateSource) : referenceDate;
  const month = Number.isNaN(parsed.getTime())
    ? referenceDate.getMonth() + 1
    : parsed.getMonth() + 1;

  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

export function quarterLabel(q: LeadQuarter): string {
  return `Q${q}`;
}

export function getCurrentOrgQuarter(referenceDate = new Date()): LeadQuarter {
  const month = referenceDate.getMonth() + 1;
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

export function resolveLeadQuarterLabel(lead: PipelineLead): string {
  // Always normalize to Q1–Q4 for kanban (even if API stored "Session 1").
  return quarterLabel(getLeadQuarterFromLead(lead));
}

export function resolveLeadTeamName(lead: PipelineLead): string {
  if (lead.team?.name?.trim()) return lead.team.name.trim();
  if (KANBAN_SALES_TEAM_NAMES.length > 0) {
    return KANBAN_SALES_TEAM_NAMES[
      stableIndex(lead.id, KANBAN_SALES_TEAM_NAMES.length)
    ]!;
  }
  return '—';
}

export function resolveLeadCustomerName(
  lead: PipelineLead,
  customerById: Map<string, PipelineCustomerSummary>,
): string {
  const fromLead =
    lead.customer?.accountName?.trim() ||
    customerById.get(lead.customerId)?.accountName?.trim();
  if (fromLead) return fromLead;
  return 'Unassigned customer';
}

export function resolveLeadExpectedClose(lead: PipelineLead): string {
  const raw = lead.expectedClose?.trim() || lead.createdAt?.trim() || '';
  if (!raw) return '';

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toISOString().split('T')[0]!;
}

export function resolveLeadBaseValue(lead: PipelineLead): number {
  return lead.baseValue > 0 ? lead.baseValue : lead.value;
}

export function resolveStageEnteredAt(lead: PipelineLead): string {
  if (lead.stageEnteredAt?.trim()) return lead.stageEnteredAt;
  return '';
}

/** True when the API provided an explicit stage entry timestamp (not inferred). */
export function hasExplicitStageEnteredAt(lead: PipelineLead): boolean {
  return Boolean(lead.stageEnteredAt?.trim());
}

export type KanbanTeamBadgeVariant = 'brand' | 'success' | 'purple' | 'muted';

export function kanbanTeamBadgeVariant(
  teamName: string,
): KanbanTeamBadgeVariant {
  if (teamName === 'Public and Telecom Sales') return 'brand';
  if (teamName === 'International and Corporate Sales') return 'success';
  if (teamName === 'BFSI') return 'purple';
  return 'muted';
}
