import type { SalesTargetPlan } from '@/store/server/features/salesTargeting/types';

/** Resolve the tenant currency id for a plan currency line. */
export function resolveTargetCurrencyId(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  currencyId?: string | null,
): string {
  const direct = currencyId?.trim();
  if (direct) return direct;
  return (
    plan?.currencyTargets
      ?.find((line) => line.id === planCurrencyId)
      ?.currencyId?.trim() ?? ''
  );
}

/**
 * Strict currency match for forecast snapshots.
 * Untagged snapshots never satisfy a currency-scoped check.
 */
export function snapshotMatchesCurrency(
  snapshotCurrencyId: string | null | undefined,
  currencyId?: string | null,
): boolean {
  const expected = currencyId?.trim();
  if (!expected) return false;
  const actual = snapshotCurrencyId?.trim();
  if (!actual) return false;
  return actual === expected;
}
