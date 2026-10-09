'use client';

import { Badge } from '@/components/ui/badge';
import type {
  DealStageHistoryItem,
  StageHistorySource,
} from '@/store/server/features/deals/stage-history/queries';

function formatDuration(ms: string | null | undefined): string {
  if (!ms) return '—';
  const totalMs = Number(ms);
  if (!Number.isFinite(totalMs) || totalMs < 0) return '—';

  const totalMinutes = Math.floor(totalMs / 60_000);
  if (totalMinutes < 60) {
    return totalMinutes <= 1 ? '< 1 min' : `${totalMinutes} min`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 48) {
    return `${totalHours} hr${totalHours === 1 ? '' : 's'}`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (hours === 0) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'} ${hours} hr${hours === 1 ? '' : 's'}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceLabel(source: StageHistorySource): string {
  switch (source) {
    case 'approval':
      return 'Approval';
    case 'stage_expiration':
      return 'Stage SLA';
    case 'import':
      return 'Import';
    case 'system':
      return 'System';
    default:
      return 'User';
  }
}

export function StageHistoryFeedItem({ item }: { item: DealStageHistoryItem }) {
  const fromLabel = item.previousStage?.name ?? 'Created';
  const toLabel = item.newStage.name;

  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2.5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          Stage change
        </Badge>
        <Badge variant="outline" className="text-[10px] capitalize">
          {sourceLabel(item.source)}
        </Badge>
      </div>
      <p className="text-sm font-medium text-foreground">
        {fromLabel}
        <span className="mx-1.5 text-muted-foreground">→</span>
        {toLabel}
      </p>
      {item.changeReason ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {item.changeReason}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDateTime(item.changedAt)}
        {item.durationInPreviousStageMs ? (
          <>
            {' · '}
            {formatDuration(item.durationInPreviousStageMs)} in previous stage
          </>
        ) : null}
      </p>
    </div>
  );
}
