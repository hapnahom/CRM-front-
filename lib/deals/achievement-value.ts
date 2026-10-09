/** Won-deal amount for achievement/reports (exact when set, else estimated). */
export function resolveDealAchievementValue(deal: {
  exactValue?: number | null;
  value: number;
}): number {
  if (deal.exactValue != null && Number.isFinite(Number(deal.exactValue))) {
    return Number(deal.exactValue);
  }
  return Number(deal.value) || 0;
}

/** Won-deal solution amount for product achievement. */
export function resolveSolutionAchievementAmount(solution: {
  exactAmount?: number | null;
  amount: number;
}): number {
  if (
    solution.exactAmount != null &&
    Number.isFinite(Number(solution.exactAmount))
  ) {
    return Number(solution.exactAmount);
  }
  return Number(solution.amount) || 0;
}
