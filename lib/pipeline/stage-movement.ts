import type { StageMovementPolicy } from '@/store/server/features/pipeline/settings';

export function isStageMoveAllowed(
  policy: StageMovementPolicy | undefined | null,
  fromOrder: number,
  toOrder: number,
): boolean {
  const resolved = policy ?? 'any';
  if (resolved === 'any') return true;
  if (resolved === 'forward_only') return toOrder >= fromOrder;
  if (resolved === 'forward_adjacent') {
    return toOrder === fromOrder || toOrder === fromOrder + 1;
  }
  return true;
}

export function stageMoveBlockedReason(
  policy: StageMovementPolicy | undefined | null,
  fromName: string,
  toName: string,
): string {
  const resolved = policy ?? 'any';
  if (resolved === 'forward_only') {
    return `Stage movement is forward-only. You cannot move from "${fromName}" back to "${toName}".`;
  }
  if (resolved === 'forward_adjacent') {
    return `Stage movement is limited to the next stage only. You cannot move from "${fromName}" to "${toName}".`;
  }
  return `Moving from "${fromName}" to "${toName}" is not allowed.`;
}
