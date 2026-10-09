import { comparePipelineDeals } from './compare-opportunities';
import type {
  PipelineDeal,
  PipelineStage,
} from '@/store/server/features/deals/pipeline/types';

function deal(id: string, stageId: string, value = 0): PipelineDeal {
  return {
    id,
    stageId,
    name: id,
    value,
    currency: 'USD',
    customerId: 'c1',
    responsibleUserId: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  } as PipelineDeal;
}

describe('comparePipelineDeals', () => {
  const stages = new Map<string, PipelineStage>([
    [
      'won',
      { id: 'won', name: 'Won', category: 'won', order: 1 } as PipelineStage,
    ],
    [
      'open-late',
      {
        id: 'open-late',
        name: 'Late',
        category: 'open',
        order: 5,
      } as PipelineStage,
    ],
    [
      'open-early',
      {
        id: 'open-early',
        name: 'Early',
        category: 'open',
        order: 2,
      } as PipelineStage,
    ],
    [
      'inactive',
      {
        id: 'inactive',
        name: 'Inactive',
        category: 'inactive',
        order: 1,
      } as PipelineStage,
    ],
    [
      'lost',
      { id: 'lost', name: 'Lost', category: 'lost', order: 1 } as PipelineStage,
    ],
  ]);

  it('orders won, open reverse, inactive, then lost', () => {
    const rows = [
      deal('lost', 'lost'),
      deal('open-early', 'open-early'),
      deal('inactive', 'inactive'),
      deal('won', 'won'),
      deal('open-late', 'open-late'),
    ].sort((a, b) => comparePipelineDeals(a, b, stages));

    expect(rows.map((row) => row.id)).toEqual([
      'won',
      'open-late',
      'open-early',
      'inactive',
      'lost',
    ]);
  });
});
