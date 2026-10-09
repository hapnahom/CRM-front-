'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PartnerCurrencyTarget } from '../../types';
import type { Currency } from '@/store/server/features/tenant-management/tenant-currencies/queries';

export type PartnerSessionTargetDraft = {
  sessionId: string;
  amount: number;
};

export type PartnerCurrencyTargetDraft = {
  currencyId: string;
  currency: string;
  annualAmount: number;
  sessionTargets: PartnerSessionTargetDraft[];
};

interface PartnerCurrencyTargetsEditorProps {
  currencies: Currency[];
  value: PartnerCurrencyTargetDraft[];
  onChange: (next: PartnerCurrencyTargetDraft[]) => void;
  disabled?: boolean;
  optionalHint?: string;
  className?: string;
}

export function toCurrencyTargetDrafts(
  targets: PartnerCurrencyTarget[] | undefined,
  currencies: Currency[],
  legacyAnnual?: number | null,
): PartnerCurrencyTargetDraft[] {
  if (targets?.length) {
    return targets.map((row) => ({
      currencyId: row.currencyId,
      currency: row.currency,
      annualAmount: Number(row.annualAmount ?? 0),
      sessionTargets: (row.sessionTargets ?? []).map((session) => ({
        sessionId: session.sessionId,
        amount: Number(session.amount ?? 0),
      })),
    }));
  }

  if (legacyAnnual != null && legacyAnnual > 0 && currencies.length) {
    const preferred = currencies.find((c) => c.name === 'USD') ?? currencies[0];
    return [
      {
        currencyId: preferred.id,
        currency: preferred.name,
        annualAmount: Number(legacyAnnual),
        sessionTargets: [],
      },
    ];
  }

  return [];
}

export function PartnerCurrencyTargetsEditor({
  currencies,
  value,
  onChange,
  disabled,
  optionalHint = 'Optional. Add one annual target per currency.',
  className,
}: PartnerCurrencyTargetsEditorProps) {
  const usedIds = new Set(value.map((row) => row.currencyId));
  const available = currencies.filter((c) => !usedIds.has(c.id));

  const addCurrency = (currencyId?: string) => {
    const nextCurrency =
      currencies.find((c) => c.id === currencyId) ?? available[0];
    if (!nextCurrency) return;
    onChange([
      ...value,
      {
        currencyId: nextCurrency.id,
        currency: nextCurrency.name,
        annualAmount: 0,
        sessionTargets: [],
      },
    ]);
  };

  const updateRow = (
    index: number,
    patch: Partial<PartnerCurrencyTargetDraft>,
  ) => {
    onChange(
      value.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (patch.currencyId && patch.currencyId !== row.currencyId) {
          const currency = currencies.find((c) => c.id === patch.currencyId);
          next.currency = currency?.name ?? next.currency;
        }
        return next;
      }),
    );
  };

  const removeRow = (index: number) => {
    onChange(value.filter((row, rowIndex) => rowIndex !== index));
  };

  if (!currencies.length) {
    return (
      <p className="m-0 text-[12px] text-muted-foreground">
        No tenant currencies are enabled. Configure currencies before setting
        partner targets.
      </p>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {value.length === 0 ? (
        <p className="m-0 text-[12px] text-muted-foreground">{optionalHint}</p>
      ) : (
        <div className="space-y-2">
          {value.map((row, index) => {
            const currencyChoices = currencies.filter(
              (c) => c.id === row.currencyId || !usedIds.has(c.id),
            );
            return (
              <div
                key={`${row.currencyId}-${index}`}
                className="grid gap-2 rounded-lg border border-border bg-surface-card p-3 sm:grid-cols-[140px_1fr_auto]"
              >
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Currency
                  </p>
                  <Select
                    value={row.currencyId}
                    onValueChange={(currencyId) =>
                      updateRow(index, { currencyId })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-[31.5px] text-[12.25px]">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyChoices.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Annual target ({row.currency || '—'})
                  </p>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={row.annualAmount || ''}
                    onChange={(e) =>
                      updateRow(index, {
                        annualAmount:
                          e.target.value === ''
                            ? 0
                            : Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={disabled}
                    className="h-[31.5px] text-[12.25px] tabular-nums"
                  />
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    aria-label={`Remove ${row.currency} target`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-[31.5px] text-[12.25px]"
        onClick={() => addCurrency()}
        disabled={disabled || available.length === 0}
      >
        <Plus size={14} className="mr-1.5" />
        {available.length === 0
          ? 'All currencies added'
          : 'Add currency target'}
      </Button>
    </div>
  );
}
