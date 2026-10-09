'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatEntityMoney } from '@/components/entity-detail/utils';
import type { OpportunitySolution } from '@/modules/product-catalog/types';
import { dealUiLabel } from '@/config/salesWorkflow';

export type WonExactValueFormState = {
  exactValue: string;
  solutionExactAmounts: Record<string, string>;
};

export function buildWonExactValueDefaults(
  deal: {
    value: number;
    exactValue?: number | null;
  },
  solutions: OpportunitySolution[],
): WonExactValueFormState {
  const dealDefault = deal.exactValue ?? deal.value ?? null;
  const solutionExactAmounts: Record<string, string> = {};
  for (const solution of solutions) {
    const fallback = solution.exactAmount ?? solution.amount ?? 0;
    solutionExactAmounts[solution.id] = String(fallback);
  }
  return {
    exactValue: dealDefault != null ? String(dealDefault) : '',
    solutionExactAmounts,
  };
}

export function validateWonExactValueForm(
  state: WonExactValueFormState,
  solutions: OpportunitySolution[],
): { exactValue?: string; solutions?: Record<string, string> } {
  const errors: {
    exactValue?: string;
    solutions?: Record<string, string>;
  } = {};
  const dealAmount = Number(state.exactValue);
  if (!Number.isFinite(dealAmount) || dealAmount <= 0) {
    errors.exactValue = 'Exact value must be greater than zero';
  }
  const solutionErrors: Record<string, string> = {};
  for (const solution of solutions) {
    const raw = state.solutionExactAmounts[solution.id] ?? '';
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      solutionErrors[solution.id] = 'Exact amount must be greater than zero';
    }
  }
  if (Object.keys(solutionErrors).length) {
    errors.solutions = solutionErrors;
  }
  return errors;
}

export function WonExactValueFields({
  currency,
  estimatedValue,
  solutions,
  state,
  onChange,
  errors,
}: {
  currency: string;
  estimatedValue: number;
  solutions: OpportunitySolution[];
  state: WonExactValueFormState;
  onChange: (next: WonExactValueFormState) => void;
  errors?: {
    exactValue?: string;
    solutions?: Record<string, string>;
  };
}) {
  return (
    <div className="space-y-4 rounded-md border border-border bg-surface-elevated p-3">
      <div>
        <p className="m-0 text-sm font-semibold text-foreground">Exact value</p>
        <p className="m-0 mt-1 text-xs text-muted-foreground">
          Enter the closed-book amount for this deal. Estimated value (
          {formatEntityMoney(estimatedValue, currency)}) stays unchanged and
          continues to represent the pipeline forecast.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="won-exact-value">
          {dealUiLabel()} exact value ({currency})
        </Label>
        <Input
          id="won-exact-value"
          type="number"
          min={0.01}
          step="0.01"
          value={state.exactValue}
          onChange={(e) => onChange({ ...state, exactValue: e.target.value })}
        />
        {errors?.exactValue ? (
          <p className="m-0 text-xs text-destructive">{errors.exactValue}</p>
        ) : null}
      </div>

      {solutions.length ? (
        <div className="space-y-3">
          <p className="m-0 text-xs font-medium text-foreground">
            Solution exact amounts
          </p>
          {solutions.map((solution) => {
            const label =
              solution.familyName ??
              solution.productFamilyName ??
              solution.productFamilyId;
            return (
              <div key={solution.id} className="space-y-1.5">
                <Label htmlFor={`won-solution-${solution.id}`}>
                  {label} ({currency || solution.currency || '—'})
                </Label>
                <p className="m-0 text-xs text-muted-foreground">
                  Estimated:{' '}
                  {formatEntityMoney(
                    solution.amount,
                    solution.currency || currency,
                  )}
                </p>
                <Input
                  id={`won-solution-${solution.id}`}
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={state.solutionExactAmounts[solution.id] ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      solutionExactAmounts: {
                        ...state.solutionExactAmounts,
                        [solution.id]: e.target.value,
                      },
                    })
                  }
                />
                {errors?.solutions?.[solution.id] ? (
                  <p className="m-0 text-xs text-destructive">
                    {errors.solutions[solution.id]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
