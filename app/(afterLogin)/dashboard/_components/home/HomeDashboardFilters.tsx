'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelineCurrencies } from '@/store/server/features/deals/pipeline/currency-queries';
import type { HomeDashboardQueryParams } from './types';
import type { ResolvedDashboardPeriod } from './HomeDashboardPeriodSelector';

export type HomeDashboardCurrencyStatus =
  | 'pending'
  | 'configured'
  | 'missing'
  | 'error';

export type HomeDashboardFiltersValue = HomeDashboardQueryParams & {
  ready: boolean;
  periodLabel: string;
  currencyStatus: HomeDashboardCurrencyStatus;
};

type HomeDashboardFiltersProps = {
  onChange: (next: HomeDashboardFiltersValue) => void;
  period: ResolvedDashboardPeriod | null;
};

function filtersKey(next: HomeDashboardFiltersValue): string {
  return JSON.stringify({
    ready: next.ready,
    currencyStatus: next.currencyStatus,
    currency: next.currency ?? '',
    startDate: next.startDate ?? '',
    endDate: next.endDate ?? '',
    sessionId: next.sessionId ?? '',
    calendarId: next.calendarId ?? '',
    periodLabel: next.periodLabel ?? '',
  });
}

function resolveCurrencyStatus(
  loading: boolean,
  fetched: boolean,
  error: boolean,
  count: number,
): HomeDashboardCurrencyStatus {
  if (loading || (!fetched && !error)) return 'pending';
  if (error) return 'error';
  if (count === 0) return 'missing';
  return 'configured';
}

export function HomeDashboardFilters({
  onChange,
  period,
}: HomeDashboardFiltersProps) {
  const {
    data: currencies = [],
    isLoading: currenciesLoading,
    isFetched: currenciesFetched,
    isError: currenciesError,
  } = usePipelineCurrencies();

  const [currency, setCurrency] = useState('');

  const didInitCurrency = useRef(false);
  const lastEmittedKey = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const currencyStatus = resolveCurrencyStatus(
    currenciesLoading,
    currenciesFetched,
    currenciesError,
    currencies.length,
  );

  useEffect(() => {
    if (currenciesLoading || (!currenciesFetched && !currenciesError)) return;

    if (currencies.length === 0) {
      didInitCurrency.current = true;
      setCurrency('');
      return;
    }

    const preferred =
      currencies.find((item) => item.isActive)?.code ?? currencies[0]?.code;
    if (!preferred) return;

    const preferredCode = preferred.toUpperCase();
    if (!didInitCurrency.current) {
      didInitCurrency.current = true;
      setCurrency(preferredCode);
      return;
    }

    setCurrency((current) => {
      if (
        current &&
        currencies.some((item) => item.code.toUpperCase() === current)
      ) {
        return current;
      }
      return preferredCode;
    });
  }, [currencies, currenciesError, currenciesFetched, currenciesLoading]);

  useEffect(() => {
    const next: HomeDashboardFiltersValue = {
      // Start loading immediately — backend resolves the active tenant currency
      // when none is selected. Only hard-block when currencies are missing/error.
      ready: currencyStatus !== 'missing' && currencyStatus !== 'error',
      currencyStatus,
      currency: currency || undefined,
      startDate: period?.from,
      endDate: period?.to,
      sessionId: period?.sessionId,
      calendarId: period?.calendarId,
      periodLabel: period?.label ?? '',
    };

    const key = filtersKey(next);
    if (key === lastEmittedKey.current) return;

    lastEmittedKey.current = key;
    onChangeRef.current(next);
  }, [currency, currencyStatus, period]);

  return (
    <div className="flex shrink-0 items-center gap-2 [&_button]:h-9 [&_button]:min-h-9 [&_button]:max-h-9">
      <Select
        value={currency || undefined}
        onValueChange={(next) => setCurrency(next.toUpperCase())}
        disabled={currenciesLoading || currencies.length === 0}
      >
        <SelectTrigger
          size="sm"
          aria-label="Filter by currency"
          className="box-border h-9 min-h-9 max-h-9 w-[72px] min-w-[72px] shrink-0 border-border bg-white px-2 py-0 text-[12px] leading-none data-[size=default]:h-9 data-[size=sm]:h-9 [&>span]:truncate"
        >
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent align="end">
          {currencies.map((item) => (
            <SelectItem key={item.id} value={item.code.toUpperCase()}>
              {item.code.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function emptyHomeDashboardFilters(): HomeDashboardFiltersValue {
  return {
    ready: false,
    periodLabel: '',
    currencyStatus: 'pending',
  };
}
