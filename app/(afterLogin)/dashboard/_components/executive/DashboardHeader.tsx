'use client';

import { useMemo } from 'react';
import { DatePicker, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { DashboardFiltersState, FilterOption } from './types';

const { RangePicker } = DatePicker;

type FilterOptions = {
  currencies: FilterOption[];
};

type Props = {
  scopeLabel: string;
  greetingName: string;
  filters: DashboardFiltersState;
  filterOptions: FilterOptions;
  onFiltersChange: (filters: DashboardFiltersState) => void;
};

export function DashboardHeader({
  scopeLabel,
  greetingName,
  filters,
  filterOptions,
  onFiltersChange,
}: Props) {
  const rangeValue = useMemo<[Dayjs, Dayjs]>(
    () => [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])],
    [filters.dateRange],
  );

  const patch = (partial: Partial<DashboardFiltersState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="border-b border-border bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-[20px] font-semibold text-foreground">
            {scopeLabel}
          </h1>
          <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
            Welcome back, {greetingName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RangePicker
            value={rangeValue}
            allowClear={false}
            className="w-full min-w-[220px] sm:w-auto"
            onChange={(dates) => {
              if (!dates?.[0] || !dates?.[1]) return;
              patch({
                dateRange: [
                  dates[0].format('YYYY-MM-DD'),
                  dates[1].format('YYYY-MM-DD'),
                ],
              });
            }}
          />
          <Select
            value={filters.currency}
            options={filterOptions.currencies}
            className="min-w-[90px]"
            onChange={(currency) => patch({ currency })}
          />
        </div>
      </div>
    </div>
  );
}
