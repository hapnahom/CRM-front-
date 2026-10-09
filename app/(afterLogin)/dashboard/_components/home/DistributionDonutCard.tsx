'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  HomeDistribution,
  HomeDistributionDepartment,
  HomeDistributionItem,
} from './types';
import {
  formatCompactNumber,
  formatMoney,
  HOME_DISTRIBUTION_COLORS,
} from './utils';

const RADIUS = 54;
const STROKE_WIDTH = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface DistributionDonutCardProps {
  distribution: HomeDistribution;
  currency: string;
}

type ChartItem = {
  key: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
};

function withSegmentColors(
  items: Array<{
    key: string;
    name: string;
    value: number;
    percentage: number;
    color?: string;
  }>,
): ChartItem[] {
  return items.map((item, index) => ({
    ...item,
    color:
      item.color ||
      HOME_DISTRIBUTION_COLORS[index % HOME_DISTRIBUTION_COLORS.length],
  }));
}

function itemsFromFlat(items: HomeDistributionItem[]): ChartItem[] {
  return withSegmentColors(
    items.map((item) => ({
      key: item.name,
      name: item.name,
      value: item.value,
      percentage: item.percentage,
      color: item.color,
    })),
  );
}

function itemsFromDepartment(
  department: HomeDistributionDepartment | undefined,
): { total: number; chartItems: ChartItem[]; listItems: ChartItem[] } {
  if (!department) return { total: 0, chartItems: [], listItems: [] };
  const teams = department.teams ?? [];
  const listItems = withSegmentColors(
    teams.map((team) => ({
      key: team.id,
      name: team.name,
      value: team.value,
      percentage: team.percentage,
      color: team.color,
    })),
  );
  return {
    total: department.total,
    chartItems: listItems.filter((team) => team.value > 0),
    listItems,
  };
}

export const DistributionDonutCard: React.FC<DistributionDonutCardProps> = ({
  distribution,
  currency,
}) => {
  const departments = distribution.departments ?? [];
  const hasDepartmentFilter = departments.length > 0;
  const defaultDepartmentId = departments[0]?.id ?? '';

  const [departmentId, setDepartmentId] = useState(defaultDepartmentId);

  useEffect(() => {
    if (!departments.length) {
      setDepartmentId('');
      return;
    }
    if (!departments.some((d) => d.id === departmentId)) {
      setDepartmentId(defaultDepartmentId);
    }
  }, [defaultDepartmentId, departmentId, departments]);

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === departmentId) ?? departments[0],
    [departmentId, departments],
  );

  const { total, chartItems, listItems } = useMemo(() => {
    if (hasDepartmentFilter) {
      return itemsFromDepartment(selectedDepartment);
    }
    const flat = itemsFromFlat(distribution.items ?? []);
    return {
      total: distribution.total,
      chartItems: flat,
      listItems: flat,
    };
  }, [
    hasDepartmentFilter,
    selectedDepartment,
    distribution.total,
    distribution.items,
  ]);

  let offset = 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="min-w-0 truncate text-[14px] font-semibold text-foreground">
          {distribution.title}
        </h2>

        {hasDepartmentFilter ? (
          <Select
            value={departmentId || undefined}
            onValueChange={setDepartmentId}
            disabled={!departments.length}
          >
            <SelectTrigger
              size="sm"
              aria-label="Department"
              className="box-border h-8 min-h-8 max-h-8 w-[140px] shrink-0 border-border bg-white px-2 py-0 text-[11px] leading-none data-[size=default]:h-8 data-[size=sm]:h-8"
            >
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent align="end">
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex justify-center pt-6">
        <div className="relative flex size-32 items-center justify-center">
          <svg
            width="128"
            height="128"
            viewBox="0 0 144 144"
            className="-rotate-90"
          >
            <circle
              cx="72"
              cy="72"
              r={RADIUS}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={STROKE_WIDTH}
            />
            {chartItems.map((item) => {
              const length = (item.percentage / 100) * CIRCUMFERENCE;
              const circle = (
                <circle
                  key={item.key}
                  cx="72"
                  cy="72"
                  r={RADIUS}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">
              {currency}
            </span>
            <strong className="text-xs font-bold text-foreground">
              {formatCompactNumber(total)}
            </strong>
          </div>
        </div>
      </div>

      {listItems.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {hasDepartmentFilter
            ? 'No team pipeline in this department.'
            : 'No pipeline distribution available.'}
        </p>
      ) : (
        <ul className="w-full space-y-1 text-xs">
          {listItems.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate font-medium text-foreground">
                  {item.name}
                </span>
              </div>
              <span className="whitespace-nowrap font-semibold text-foreground">
                {formatMoney(item.value, currency)}{' '}
                <span className="text-[10.5px] text-muted-foreground">
                  ({Math.round(item.percentage)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
