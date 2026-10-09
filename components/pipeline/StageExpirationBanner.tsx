'use client';

import { cn } from '@/lib/utils';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Exact remaining time from now until expiresAt (e.g. "1d 12hr", "0d 12hr 45min"). */
function formatRemainingLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';

  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);

  const parts: string[] = [`${days}d`, `${hours}hr`];
  if (days === 0 || minutes > 0) {
    parts.push(`${minutes}min`);
  }
  return `${parts.join(' ')} remaining`;
}

export function StageExpirationBanner({
  stageEnteredAt,
  stageExpiresAt,
  stageExpired,
  stageExpirationStatus,
  className,
}: {
  stageEnteredAt?: string | null;
  stageExpiresAt?: string | null;
  stageExpired?: boolean;
  stageExpirationStatus?: 'none' | 'active' | 'approaching' | 'expired' | null;
  className?: string;
}) {
  if (!stageExpiresAt && !stageExpired) return null;

  const entered = stageEnteredAt ? formatDateTime(stageEnteredAt) : '—';
  const expires = stageExpiresAt ? formatDateTime(stageExpiresAt) : '—';

  let remainingLabel = 'No stage SLA';
  if (stageExpired || stageExpirationStatus === 'expired') {
    remainingLabel = 'Expired';
  } else if (stageExpiresAt) {
    remainingLabel = formatRemainingLabel(stageExpiresAt);
  }

  const tone =
    stageExpired || stageExpirationStatus === 'expired'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : stageExpirationStatus === 'approaching'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-900'
        : 'border-border bg-muted/40 text-muted-foreground';

  return (
    <div
      className={cn(
        'mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-xs',
        tone,
        className,
      )}
    >
      <span>
        Entered stage:{' '}
        <strong className="font-medium text-foreground">{entered}</strong>
      </span>
      <span>
        Expires:{' '}
        <strong className="font-medium text-foreground">{expires}</strong>
      </span>
      <span className="font-medium">{remainingLabel}</span>
    </div>
  );
}
