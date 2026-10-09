import {
  opportunityTypeCategories,
  opportunityTypeCategoryDescription,
  opportunityTypeCategoryLabel,
  type OpportunityTypeCategory,
} from '@/config/salesWorkflow';
import type { PipelineRecordInsight } from '@/store/server/features/deals/pipeline/dashboard-queries';

export type OpportunityCategoryKpi = {
  category: OpportunityTypeCategory;
  label: string;
  description: string;
  total: number;
  open: number;
  won: number;
  lost: number;
};

function recordCategory(
  record: PipelineRecordInsight,
): OpportunityTypeCategory | null {
  const category = record.typeCategory;
  if (category === 'SD' || category === 'BID') return category;
  return null;
}

function filterRecordsByCategory(
  records: PipelineRecordInsight[],
  category: OpportunityTypeCategory,
): PipelineRecordInsight[] {
  return records.filter(
    (record) => record.kind === 'deal' && recordCategory(record) === category,
  );
}

function buildOutcomeCounts(
  records: PipelineRecordInsight[],
): Pick<OpportunityCategoryKpi, 'total' | 'open' | 'won' | 'lost'> {
  let open = 0;
  let won = 0;
  let lost = 0;

  for (const record of records) {
    if (record.status === 'won') won += 1;
    else if (record.status === 'lost') lost += 1;
    else open += 1;
  }

  return {
    total: open + won + lost,
    open,
    won,
    lost,
  };
}

export function buildOpportunityCategoryKpis(
  records: PipelineRecordInsight[],
): OpportunityCategoryKpi[] {
  return opportunityTypeCategories().map((category) => {
    const categoryRecords = filterRecordsByCategory(records, category);

    return {
      category,
      label: opportunityTypeCategoryLabel(category),
      description: opportunityTypeCategoryDescription(category),
      ...buildOutcomeCounts(categoryRecords),
    };
  });
}
