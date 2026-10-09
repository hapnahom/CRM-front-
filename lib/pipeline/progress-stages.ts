import type { PipelineStageCategory } from '@/modules/pipeline/types';

export type ProgressStageItem = {
  id: string;
  name: string;
  color?: string | null;
  borderColor?: string | null;
  category?: PipelineStageCategory | string;
  order?: number;
};

function byOrder(a: ProgressStageItem, b: ProgressStageItem): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

function normalizeCategory(
  category: ProgressStageItem['category'],
): PipelineStageCategory | 'unknown' {
  if (
    category === 'open' ||
    category === 'won' ||
    category === 'lost' ||
    category === 'inactive'
  ) {
    return category;
  }
  return 'unknown';
}

export function splitStagesForProgress(stages: ProgressStageItem[]): {
  pathStages: ProgressStageItem[];
  outcomeStages: ProgressStageItem[];
  usesCategorySplit: boolean;
} {
  const hasCategories = stages.some(
    (stage) => normalizeCategory(stage.category) !== 'unknown',
  );

  if (!hasCategories) {
    return {
      pathStages: [...stages].sort(byOrder),
      outcomeStages: [],
      usesCategorySplit: false,
    };
  }

  const pathStages = stages
    .filter((stage) => {
      const category = normalizeCategory(stage.category);
      return category === 'open' || category === 'won';
    })
    .sort(byOrder);
  const outcomeStages = stages
    .filter((stage) => {
      const category = normalizeCategory(stage.category);
      return category === 'lost' || category === 'inactive';
    })
    .sort(byOrder);

  return {
    pathStages,
    outcomeStages,
    usesCategorySplit: true,
  };
}

export function getOutcomeProgressState(
  outcomeStages: ProgressStageItem[],
  currentStageId: string,
): { currentIndex: number } {
  return {
    currentIndex: outcomeStages.findIndex(
      (stage) => stage.id === currentStageId,
    ),
  };
}

export type PathProgressState = {
  currentPathIndex: number;
  completeThroughIndex: number;
  isOnOutcome: boolean;
  currentCategory: PipelineStageCategory | 'unknown';
};

export function getPathProgressState(
  pathStages: ProgressStageItem[],
  outcomeStages: ProgressStageItem[],
  currentStageId: string,
): PathProgressState {
  const currentStage =
    pathStages.find((stage) => stage.id === currentStageId) ??
    outcomeStages.find((stage) => stage.id === currentStageId);

  const currentCategory = normalizeCategory(currentStage?.category);
  const isOnOutcome =
    currentCategory === 'lost' || currentCategory === 'inactive';

  if (isOnOutcome) {
    const lastOpenIndex = pathStages.reduce(
      (lastIndex, stage, index) =>
        normalizeCategory(stage.category) === 'open' ? index : lastIndex,
      -1,
    );

    return {
      currentPathIndex: -1,
      completeThroughIndex: lastOpenIndex,
      isOnOutcome: true,
      currentCategory,
    };
  }

  const currentPathIndex = pathStages.findIndex(
    (stage) => stage.id === currentStageId,
  );

  if (currentPathIndex >= 0) {
    return {
      currentPathIndex,
      completeThroughIndex: currentPathIndex,
      isOnOutcome: false,
      currentCategory,
    };
  }

  return {
    currentPathIndex: 0,
    completeThroughIndex: 0,
    isOnOutcome: false,
    currentCategory,
  };
}
