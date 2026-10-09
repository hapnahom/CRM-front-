import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';

export function resolvePipelineSalesTeamId(
  record: PipelineLead | PipelineDeal,
): string | null {
  if (record.teamId) return record.teamId;
  return record.team?.id ?? null;
}
