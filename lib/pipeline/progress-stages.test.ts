import {
  getPathProgressState,
  splitStagesForProgress,
} from './progress-stages';

const stages = [
  { id: '1', name: 'Prospect', category: 'open' as const, order: 0 },
  { id: '2', name: 'Proposal', category: 'open' as const, order: 1 },
  { id: '3', name: 'Won', category: 'won' as const, order: 2 },
  { id: '4', name: 'Lost', category: 'lost' as const, order: 3 },
  { id: '5', name: 'Inactive', category: 'inactive' as const, order: 4 },
];

describe('splitStagesForProgress', () => {
  it('puts open and won on the path and lost/inactive on outcomes', () => {
    const { pathStages, outcomeStages, usesCategorySplit } =
      splitStagesForProgress(stages);

    expect(usesCategorySplit).toBe(true);
    expect(pathStages.map((stage) => stage.id)).toEqual(['1', '2', '3']);
    expect(outcomeStages.map((stage) => stage.id)).toEqual(['4', '5']);
  });

  it('orders open and won together by stage order', () => {
    const mixed = [
      { id: '1', name: 'Open 1', category: 'open' as const, order: 0 },
      { id: '2', name: 'Won', category: 'won' as const, order: 1 },
      { id: '3', name: 'Open 2', category: 'open' as const, order: 2 },
      { id: '4', name: 'Lost', category: 'lost' as const, order: 3 },
    ];

    const { pathStages, outcomeStages } = splitStagesForProgress(mixed);

    expect(pathStages.map((stage) => stage.id)).toEqual(['1', '2', '3']);
    expect(outcomeStages.map((stage) => stage.id)).toEqual(['4']);
  });

  it('keeps legacy behavior when categories are missing', () => {
    const legacy = [
      { id: 'a', name: 'A', order: 1 },
      { id: 'b', name: 'B', order: 0 },
    ];
    const { pathStages, outcomeStages, usesCategorySplit } =
      splitStagesForProgress(legacy);

    expect(usesCategorySplit).toBe(false);
    expect(pathStages.map((stage) => stage.id)).toEqual(['b', 'a']);
    expect(outcomeStages).toEqual([]);
  });
});

describe('getPathProgressState', () => {
  const { pathStages, outcomeStages } = splitStagesForProgress(stages);

  it('marks the current open stage on the path', () => {
    expect(getPathProgressState(pathStages, outcomeStages, '2')).toMatchObject({
      currentPathIndex: 1,
      completeThroughIndex: 1,
      isOnOutcome: false,
    });
  });

  it('marks won as the current path stage', () => {
    expect(getPathProgressState(pathStages, outcomeStages, '3')).toMatchObject({
      currentPathIndex: 2,
      completeThroughIndex: 2,
      isOnOutcome: false,
    });
  });

  it('completes open stages but leaves won unreached when on lost', () => {
    expect(getPathProgressState(pathStages, outcomeStages, '4')).toMatchObject({
      currentPathIndex: -1,
      completeThroughIndex: 1,
      isOnOutcome: true,
    });
  });
});
