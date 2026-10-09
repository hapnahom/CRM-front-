'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  currentFiscalSession,
  sortFiscalSessions,
} from '@/modules/sales-pipeline/pipeline-filter';
import { usePipelineFiscalSessions } from '@/modules/sales-pipeline/pipeline-filters';
import {
  formatFiscalSessionDateRange,
  resolveFiscalSessionDisplay,
} from './fiscal-session-display';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';

function isCurrentSession(session: OrgFiscalSession): boolean {
  return Boolean(currentFiscalSession([session]));
}

export interface FiscalPeriodFieldsProps {
  sessionId: string;
  onSessionIdChange: (sessionId: string) => void;
  /** Applied once when fiscal data first loads and sessionId is empty. */
  autoSelectCurrent?: boolean;
  required?: boolean;
  hideLabel?: boolean;
  className?: string;
  controlClassName?: string;
}

/**
 * Compact fiscal-session picker for lead/deal forms.
 * Selecting a session implies its fiscal year.
 */
export function FiscalPeriodFields({
  sessionId,
  onSessionIdChange,
  autoSelectCurrent = true,
  required = true,
  hideLabel = false,
  className,
  controlClassName,
}: FiscalPeriodFieldsProps) {
  const { fiscalYears, fiscalYear, allSessions } = usePipelineFiscalSessions();
  const didAutoSelect = useRef(false);

  const yearsWithSessions = useMemo(
    () =>
      fiscalYears
        .map((year) => ({
          ...year,
          sessions: sortFiscalSessions(year.sessions ?? []),
        }))
        .filter((year) => year.sessions.length > 0),
    [fiscalYears],
  );

  const selectedDisplay = useMemo(
    () =>
      resolveFiscalSessionDisplay(sessionId, yearsWithSessions, allSessions),
    [yearsWithSessions, allSessions, sessionId],
  );

  useEffect(() => {
    if (!sessionId) {
      didAutoSelect.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!autoSelectCurrent || didAutoSelect.current || sessionId) return;
    const pool = allSessions.length
      ? allSessions
      : (fiscalYear?.sessions ?? []);
    if (!pool.length) return;
    didAutoSelect.current = true;
    const current = currentFiscalSession(pool);
    onSessionIdChange(current?.id ?? pool[0]!.id);
  }, [
    autoSelectCurrent,
    allSessions,
    fiscalYear?.sessions,
    onSessionIdChange,
    sessionId,
  ]);

  const loading = fiscalYears.length === 0;
  const triggerLabel = selectedDisplay?.primaryLabel;

  return (
    <div className={cn('space-y-1.5', className)}>
      {!hideLabel ? (
        <Label className="text-xs font-medium text-muted-foreground">
          Fiscal period
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      <Select
        value={sessionId || undefined}
        onValueChange={onSessionIdChange}
        disabled={loading || yearsWithSessions.length === 0}
      >
        <SelectTrigger
          className={cn(
            'h-9 border-border bg-white text-sm dark:bg-surface-card',
            controlClassName,
          )}
        >
          <SelectValue placeholder={loading ? 'Loading…' : 'Select session'}>
            {triggerLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {yearsWithSessions.map((year) => {
            const isCurrentYear =
              year.id === fiscalYear?.id || Boolean(year.isActive);
            return (
              <SelectGroup key={year.id}>
                <SelectLabel className="flex items-center gap-1.5 font-medium text-foreground/70">
                  <span>{year.name}</span>
                  {isCurrentYear ? (
                    <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                      Current
                    </span>
                  ) : null}
                </SelectLabel>
                {year.sessions.map((session, index) => {
                  const quarter = `Q${index + 1}`;
                  const range = formatFiscalSessionDateRange(
                    session.startDate,
                    session.endDate,
                  );
                  const current = isCurrentSession(session);
                  return (
                    <SelectItem key={session.id} value={session.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="font-medium tabular-nums">
                          {quarter}
                        </span>
                        <span className="truncate text-muted-foreground">
                          {session.name}
                          {range ? ` · ${range}` : ''}
                        </span>
                        {current ? (
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-brand">
                            Now
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
