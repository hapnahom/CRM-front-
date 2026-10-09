import type { SalesTargetAllocation } from '@/store/server/features/salesTargeting/types';

const CONFIRM_RESEAT_CODE = 'CONFIRM_RESEAT_REQUIRED';

function mentionsReseatConfirm(value: unknown): boolean {
  if (typeof value === 'string') {
    return (
      value.includes(CONFIRM_RESEAT_CODE) ||
      value.includes('re-seat all department')
    );
  }
  if (!value || typeof value !== 'object') return false;
  const body = value as { code?: unknown; message?: unknown };
  if (body.code === CONFIRM_RESEAT_CODE) return true;
  return mentionsReseatConfirm(body.message);
}

/** Backend ConflictException body, including when the payload is nested or stringified. */
export function isConfirmReseatRequiredError(error: unknown): boolean {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (mentionsReseatConfirm(data)) return true;
  const message = (error as { message?: unknown })?.message;
  return mentionsReseatConfirm(message);
}

/**
 * Matches the company-commit check: any non-company seat for this currency
 * and horizon, including zero-amount rows created for empty teams.
 */
export function planHasDownstreamSeats(
  allocations: SalesTargetAllocation[] | undefined,
  options: { planCurrencyId?: string; sessionId: string | null },
): boolean {
  const sessionId = options.sessionId ?? null;
  return (allocations ?? []).some((allocation) => {
    if (allocation.level === 'company') return false;
    if (
      options.planCurrencyId &&
      allocation.planCurrencyId !== options.planCurrencyId
    ) {
      return false;
    }
    return (allocation.sessionId ?? null) === sessionId;
  });
}
