import type {
  PipelineDeal,
  PipelineStage,
} from '@/store/server/features/deals/pipeline/types';

function dealCategoryRank(category?: string | null): number {
  switch (String(category ?? 'open').toLowerCase()) {
    case 'won':
      return 0;
    case 'open':
      return 1;
    case 'inactive':
      return 2;
    case 'lost':
      return 3;
    default:
      return 4;
  }
}

/** Won → open (reverse stage order) → inactive → lost. */
export function comparePipelineDeals(
  a: PipelineDeal,
  b: PipelineDeal,
  stageById: Map<string, PipelineStage>,
): number {
  const stageA = stageById.get(a.stageId);
  const stageB = stageById.get(b.stageId);
  const categoryA = stageA?.category ?? 'open';
  const categoryB = stageB?.category ?? 'open';

  const rankA = dealCategoryRank(categoryA);
  const rankB = dealCategoryRank(categoryB);
  if (rankA !== rankB) return rankA - rankB;

  const orderA = stageA?.order ?? 0;
  const orderB = stageB?.order ?? 0;
  if (orderA !== orderB) {
    if (categoryA === 'open' && categoryB === 'open') {
      return orderB - orderA;
    }
    return orderA - orderB;
  }

  const valueA = Number(a.value ?? 0);
  const valueB = Number(b.value ?? 0);
  if (valueA !== valueB) return valueB - valueA;

  return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
}
