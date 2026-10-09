'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FiscalYearSectionSkeleton } from '@/components/loading/skeleton-screens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  formatFiscalYearQuartersSummary,
  type CurrentSessionInfo,
  type FiscalYearRow,
  type LeadQuarter,
} from './fiscalYearUtils';

const QUARTERS = [1, 2, 3, 4] as const;

export type FiscalYearSectionViewProps = {
  fiscalYears: FiscalYearRow[];
  activeCalendarId: string;
  editingCalendarId: string;
  currentSession: CurrentSessionInfo | null;
  editingCurrentSessionQuarter: LeadQuarter | null;
  isLoading: boolean;
  onSetCurrentFiscalYear: (calendarId: string) => void;
  onSetEditingCalendarId: (calendarId: string) => void;
  onUpdatePeriodLabel: (
    calendarId: string,
    q: LeadQuarter,
    periodLabel: string,
  ) => void;
};

export function FiscalYearSectionView({
  fiscalYears,
  activeCalendarId,
  editingCalendarId,
  currentSession,
  editingCurrentSessionQuarter,
  isLoading,
  onSetCurrentFiscalYear,
  onSetEditingCalendarId,
  onUpdatePeriodLabel,
}: FiscalYearSectionViewProps) {
  const activeRow = fiscalYears.find((row) => row.id === activeCalendarId);
  const editingRow = fiscalYears.find((row) => row.id === editingCalendarId);

  if (isLoading) {
    return <FiscalYearSectionSkeleton />;
  }

  if (!fiscalYears.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No fiscal years configured yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-brand/20 bg-brand-muted p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Current fiscal year
            </p>
            <Badge className="bg-brand text-brand-foreground hover:bg-brand">
              Active
            </Badge>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Used for targets, lead quarters, and quarterly reporting.
          </p>
        </div>

        {activeRow ? (
          <div className="mt-4 rounded-md border border-brand-border bg-surface-card p-3">
            <p className="text-sm font-semibold text-foreground">
              FY {activeRow.year}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {formatFiscalYearQuartersSummary(activeRow.quarterDefinitions)}
            </p>
            {currentSession ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-border pt-3">
                <p className="text-[12px] font-medium text-muted-foreground">
                  Current session
                </p>
                <Badge
                  variant="outline"
                  className="border-brand-border bg-brand-muted text-brand"
                >
                  Q{currentSession.quarter} · {currentSession.label}
                </Badge>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Available fiscal years
          </p>
          <p className="text-[12px] text-muted-foreground">
            Choose a fiscal year to edit its quarter periods.
          </p>
        </div>

        <div className="grid gap-2">
          {fiscalYears.map((row) => {
            const isCurrent = row.id === activeCalendarId;
            const isEditing = row.id === editingCalendarId;

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSetEditingCalendarId(row.id)}
                className={cn(
                  'flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors',
                  isEditing
                    ? 'border-brand bg-brand-muted'
                    : 'border-border bg-surface-card hover:bg-surface-elevated',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      FY {row.year}
                    </p>
                    {isCurrent ? (
                      <Badge
                        variant="outline"
                        className="border-brand-border bg-brand-muted text-brand"
                      >
                        Current
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {formatFiscalYearQuartersSummary(row.quarterDefinitions)}
                  </p>
                </div>
                {isEditing ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {editingRow ? (
        <div className="space-y-3 rounded-xl border border-border p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Quarter periods · FY {editingRow.year}
            </p>
            <p className="text-[12px] text-muted-foreground">
              Define how each quarter is labeled for this fiscal year.
            </p>
          </div>

          <div className="grid gap-3">
            {QUARTERS.map((q) => {
              const definition = editingRow.quarterDefinitions.find(
                (row) => row.q === q,
              );
              const isCurrent = q === editingCurrentSessionQuarter;

              return (
                <div
                  key={q}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-md border p-3 sm:flex-nowrap',
                    isCurrent
                      ? 'border-brand-border bg-brand-muted'
                      : 'border-border bg-surface-elevated',
                  )}
                >
                  <div className="w-12 shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        Q{q}
                      </p>
                      {isCurrent ? (
                        <Badge
                          variant="outline"
                          className="border-brand-border bg-surface-card text-brand"
                        >
                          Current
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`quarter-period-${editingRow.id}-${q}`}
                      className="sr-only"
                    >
                      Q{q} period
                    </Label>
                    <Input
                      id={`quarter-period-${editingRow.id}-${q}`}
                      value={definition?.periodLabel ?? ''}
                      onChange={(e) =>
                        onUpdatePeriodLabel(editingRow.id, q, e.target.value)
                      }
                      placeholder="e.g. Jan – Mar"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {editingRow.id !== activeCalendarId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSetCurrentFiscalYear(editingRow.id)}
            >
              Set FY {editingRow.year} as current
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
