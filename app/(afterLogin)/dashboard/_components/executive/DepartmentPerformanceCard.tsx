'use client';

import { dealUiLabel } from '@/config/salesWorkflow';

import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { PieChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { lazyNamed } from '@/utils/lazyNamed';
import type { DepartmentPerformance } from './types';
import { CardFooter, DashboardCard, SectionTitle } from './DashboardCard';
import { DASHBOARD_CHART_COLORS, formatMoneyCompact } from './utils';

const DepartmentDonut = lazyNamed(() => import('./Charts'), 'DepartmentDonut', {
  ssr: false,
  loading: () => <Skeleton className="size-[120px] shrink-0 rounded-full" />,
});

export function DepartmentPerformanceCard({
  data,
  currency,
}: {
  data?: DepartmentPerformance;
  currency: string;
}) {
  const departments = data?.departments ?? [];
  const defaultId =
    departments.find((d) => d.total > 0)?.id ?? departments[0]?.id ?? '';
  const [departmentId, setDepartmentId] = useState(defaultId);

  useEffect(() => {
    if (!departments.length) {
      setDepartmentId('');
      return;
    }
    if (!departments.some((d) => d.id === departmentId)) {
      setDepartmentId(defaultId);
    }
  }, [defaultId, departmentId, departments]);

  const selected = useMemo(
    () => departments.find((d) => d.id === departmentId) ?? departments[0],
    [departmentId, departments],
  );

  const teams = (selected?.teams ?? []).map((team, index) => ({
    ...team,
    color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
  }));
  const donutTeams = teams.filter((team) => team.value > 0);
  const total = selected?.total ?? 0;
  const totalLabel = formatMoneyCompact(total, currency).replace(
    `${currency} `,
    '',
  );
  const topTeam = [...teams].sort((a, b) => b.value - a.value)[0];
  const showDepartmentSelect = departments.length > 1;

  return (
    <DashboardCard className="flex h-full min-h-[420px] flex-col">
      <SectionTitle
        action={
          showDepartmentSelect ? (
            <Select
              value={departmentId || undefined}
              options={departments.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              className="min-w-[160px]"
              showSearch
              optionFilterProp="label"
              placeholder="Department"
              onChange={setDepartmentId}
              disabled={!departments.length}
            />
          ) : selected ? (
            <span className="text-xs font-medium text-muted-foreground">
              {selected.name}
            </span>
          ) : undefined
        }
      >
        Department Performance
      </SectionTitle>

      {!selected || teams.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <PieChart size={18} strokeWidth={2.25} />
          </span>
          <p className="m-0 mt-3 text-sm font-medium text-foreground">
            No teams in this department yet.
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Team pipeline for the selected department will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex justify-center">
            <DepartmentDonut units={donutTeams} totalLabel={totalLabel} />
          </div>
          <ul className="m-0 max-h-[220px] min-h-0 flex-1 list-none space-y-3 overflow-y-auto p-0 pr-1">
            {teams.map((team) => (
              <li
                key={team.id}
                className="rounded-lg border border-border/60 bg-surface-elevated px-3 py-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-[3px]"
                    style={{ background: team.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-medium text-foreground">
                      {team.name}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({team.percent.toFixed(1)}%)
                      </span>
                    </p>
                    <p className="m-0 mt-1 text-xs text-muted-foreground">
                      {formatMoneyCompact(team.value, currency)} ·{' '}
                      {team.dealCount}{' '}
                      {dealUiLabel({ plural: team.dealCount !== 1 })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CardFooter
        label="Top Contributing Team"
        value={
          topTeam && topTeam.value > 0
            ? `${topTeam.name} (${topTeam.percent.toFixed(1)}%)`
            : undefined
        }
        valueClassName="text-brand"
      />
    </DashboardCard>
  );
}
