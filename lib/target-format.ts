/** Shared precision for target amounts and achievement percentages. */
export const TARGET_FRACTION_DIGITS = 2;

export function roundTarget(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** TARGET_FRACTION_DIGITS;
  return Math.round(value * factor) / factor;
}

export function targetAchievementPercent(
  achieved: number,
  target: number,
): number {
  if (target <= 0) return 0;
  return Math.min(100, roundTarget((achieved / target) * 100));
}

export function targetSharePercent(amount: number, total: number): number {
  if (total <= 0) return 0;
  return roundTarget((amount / total) * 100);
}

export function formatTargetPercent(
  value: number | null | undefined,
  digits = TARGET_FRACTION_DIGITS,
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${roundTarget(value).toFixed(digits)}%`;
}

export function formatTargetAmount(
  amount: number,
  digits = TARGET_FRACTION_DIGITS,
): string {
  const rounded = roundTarget(amount);
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
