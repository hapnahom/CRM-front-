'use client';

import { Badge } from '@/components/ui/badge';
import {
  activityKindLabel,
  formatActivityDateTime,
} from '@/store/server/features/activity/utils';
import type { Activity } from '@/store/server/features/activity/types';
import { pipelineDisplayText } from '@/config/salesWorkflow';

export interface FieldChangeEntry {
  fieldKey: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : '—';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatDisplayValue(item))
      .filter((part) => part !== '—');
    return parts.length ? parts.join(', ') : '—';
  }
  if (typeof value === 'object') {
    const parts = Object.values(value as Record<string, unknown>)
      .map((item) => formatDisplayValue(item))
      .filter((part) => part !== '—');
    return parts.length ? parts.join(' · ') : '—';
  }
  return String(value);
}

function changesFromActivity(activity: Activity): FieldChangeEntry[] {
  const raw = activity.metadata?.changes;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const fieldKey = typeof row.fieldKey === 'string' ? row.fieldKey : '';
      const fieldLabel =
        typeof row.fieldLabel === 'string' && row.fieldLabel.trim()
          ? row.fieldLabel
          : fieldKey || 'Field';
      return {
        fieldKey,
        fieldLabel,
        oldValue: row.oldValue,
        newValue: row.newValue,
      };
    })
    .filter((item): item is FieldChangeEntry => item != null);
}

export function FieldChangeFeedItem({ activity }: { activity: Activity }) {
  const changes = changesFromActivity(activity);
  const visible = changes.slice(0, 8);
  const remaining = Math.max(0, changes.length - visible.length);

  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2.5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {activityKindLabel(activity.kind)}
        </Badge>
        <Badge variant="outline" className="text-[10px] capitalize">
          {activity.origin}
        </Badge>
      </div>
      <p className="text-sm font-medium text-foreground">
        {pipelineDisplayText(activity.subject)}
      </p>
      {visible.length ? (
        <ul className="mt-2 space-y-1">
          {visible.map((change) => (
            <li
              key={`${change.fieldKey}:${String(change.oldValue)}:${String(change.newValue)}`}
              className="text-sm text-muted-foreground"
            >
              <span className="font-medium text-foreground">
                {pipelineDisplayText(change.fieldLabel)}
              </span>
              {': '}
              <span>{formatDisplayValue(change.oldValue)}</span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span>{formatDisplayValue(change.newValue)}</span>
            </li>
          ))}
        </ul>
      ) : activity.summary ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {pipelineDisplayText(activity.summary)}
        </p>
      ) : null}
      {remaining > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          and {remaining} more
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {formatActivityDateTime(activity.occurredAt)}
      </p>
    </div>
  );
}
