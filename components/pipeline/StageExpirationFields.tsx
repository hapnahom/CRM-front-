'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type StageExpirationDraft = {
  expirationDays: number | null;
  expirationAction: 'mark_expired' | 'move_to_lost' | null;
  expirationLostStageId: string | null;
};

type LostStageOption = {
  id: string;
  name: string;
};

export function StageExpirationFields({
  value,
  onChange,
  lostStages,
  disabled = false,
  readOnly = false,
}: {
  value: StageExpirationDraft;
  onChange: (next: StageExpirationDraft) => void;
  lostStages: LostStageOption[];
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const hasExpiration =
    value.expirationDays != null && value.expirationDays > 0;
  const lostStageName =
    lostStages.find((stage) => stage.id === value.expirationLostStageId)
      ?.name ?? null;
  const expirationActionLabel =
    value.expirationAction === 'move_to_lost'
      ? 'Move to a Lost stage'
      : 'Keep in stage and mark expired';

  const clearExpiration = () =>
    onChange({
      expirationDays: null,
      expirationAction: null,
      expirationLostStageId: null,
    });

  return (
    <div className="space-y-3 rounded-md border border-border/60 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="stage-expiration-days">Stage expiration (days)</Label>
        {readOnly ? (
          <p className="text-sm font-medium text-foreground">
            {hasExpiration ? `${value.expirationDays} days` : 'No expiration'}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id="stage-expiration-days"
              type="number"
              min={1}
              placeholder="No expiration"
              disabled={disabled}
              value={value.expirationDays ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  clearExpiration();
                  return;
                }
                const days = Number(raw);
                if (!Number.isFinite(days) || days <= 0) {
                  clearExpiration();
                  return;
                }
                onChange({
                  expirationDays: days,
                  expirationAction: value.expirationAction ?? 'mark_expired',
                  expirationLostStageId: value.expirationLostStageId,
                });
              }}
              className="h-9"
            />
            {hasExpiration ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-9 shrink-0"
                disabled={disabled}
                onClick={clearExpiration}
                title="Remove expiration"
                aria-label="Remove expiration"
              >
                <X size={14} />
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {hasExpiration ? (
        <>
          <div className="space-y-1.5">
            <Label>When expired</Label>
            {readOnly ? (
              <p className="text-sm font-medium text-foreground">
                {expirationActionLabel}
              </p>
            ) : (
              <Select
                disabled={disabled}
                value={value.expirationAction ?? 'mark_expired'}
                onValueChange={(next) => {
                  const action = next as 'mark_expired' | 'move_to_lost';
                  onChange({
                    ...value,
                    expirationAction: action,
                    expirationLostStageId:
                      action === 'move_to_lost'
                        ? value.expirationLostStageId
                        : null,
                  });
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="mark_expired">
                    Keep in stage and mark expired
                  </SelectItem>
                  <SelectItem value="move_to_lost">
                    Move to a Lost stage
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {value.expirationAction === 'move_to_lost' ? (
            <div className="space-y-1.5">
              <Label>Lost stage</Label>
              {readOnly ? (
                <p className="text-sm font-medium text-foreground">
                  {lostStageName ?? 'Not selected'}
                </p>
              ) : (
                <Select
                  disabled={disabled || lostStages.length === 0}
                  value={value.expirationLostStageId ?? undefined}
                  onValueChange={(id) =>
                    onChange({ ...value, expirationLostStageId: id })
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select lost stage" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {lostStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
