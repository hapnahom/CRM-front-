export function calculateWinRate(won: number, lost: number): number | null {
  const closed = won + lost;
  if (!closed) return null;
  return (won / closed) * 100;
}

export function formatWinRatePercent(
  won: number,
  lost: number,
  decimals = 0,
): string {
  const rate = calculateWinRate(won, lost);
  if (rate == null) return '—';
  if (decimals > 0) return `${rate.toFixed(decimals)}%`;
  return `${Math.round(rate)}%`;
}
