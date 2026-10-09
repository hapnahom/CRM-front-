'use client';

import { Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatTargetPercent } from '@/lib/target-format';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import {
  usePipelineSalesTargetProgress,
  type PipelineKpiCurrencyRow,
  type PipelineKpiTeamTile,
} from '@/hooks/usePipelineSalesTargetProgress';

export const QUARTERLY_KPI_TILE_WIDTH_CLASS = 'w-[360px]';

function getKpiTileHeightClass(currencyCount: number) {
  if (currencyCount <= 1) return 'h-[12.75rem]';
  if (currencyCount === 2) return 'h-[16.5rem]';
  return 'min-h-[16.5rem] h-auto';
}

function formatTeamLabel(teamName: string) {
  return teamName
    .replace('International', 'Intl')
    .replace(' and ', ' & ')
    .replace(/ Sales$/i, '');
}

function getKpiDensity(
  currencyCount: number,
): 'comfortable' | 'compact' | 'dense' {
  if (currencyCount <= 1) return 'comfortable';
  if (currencyCount === 2) return 'compact';
  return 'dense';
}

const KPI_DENSITY_STYLES = {
  comfortable: {
    achieved: { first: 'text-[22px]', rest: 'text-[15px]' },
    target: { first: 'mt-2 text-[12px]', rest: 'mt-1 text-[11px]' },
    bar: { first: 'h-2.5', rest: 'h-2' },
    pct: { first: 'text-[12px]', rest: 'text-[11px]' },
    block: { first: '', rest: 'mt-2.5 border-t border-border pt-2.5' },
    progress: 'mt-2',
  },
  compact: {
    achieved: { first: 'text-[20px]', rest: 'text-[14px]' },
    target: { first: 'mt-1.5 text-[11px]', rest: 'mt-1 text-[10px]' },
    bar: { first: 'h-2', rest: 'h-1.5' },
    pct: { first: 'text-[11px]', rest: 'text-[10px]' },
    block: { first: '', rest: 'mt-2 border-t border-border pt-2' },
    progress: 'mt-1.5',
  },
  dense: {
    achieved: { first: 'text-[16px]', rest: 'text-[13px]' },
    target: { first: 'mt-1 text-[10px]', rest: 'mt-0.5 text-[9px]' },
    bar: { first: 'h-1.5', rest: 'h-1' },
    pct: { first: 'text-[10px]', rest: 'text-[9px]' },
    block: { first: '', rest: 'mt-1.5 border-t border-border pt-1.5' },
    progress: 'mt-1',
  },
} as const;

function CurrencyKpiBlock({
  row,
  density,
  isFirst,
}: {
  row: PipelineKpiCurrencyRow;
  density: keyof typeof KPI_DENSITY_STYLES;
  isFirst: boolean;
}) {
  const styles = KPI_DENSITY_STYLES[density];
  const slot = isFirst ? 'first' : 'rest';

  return (
    <div className={styles.block[slot]}>
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {row.currency}
      </p>
      <p
        className={cn(
          'mt-1 truncate font-semibold leading-none tabular-nums text-foreground',
          styles.achieved[slot],
        )}
      >
        {formatCompactMoney(row.achieved, row.currency)}
      </p>
      <p className={cn('truncate text-muted-foreground', styles.target[slot])}>
        Target: {formatCompactMoney(row.target, row.currency)}
      </p>

      <div className={cn('flex items-center gap-2', styles.progress)}>
        <div
          className={cn(
            'min-w-0 flex-1 overflow-hidden rounded-full bg-brand-muted',
            styles.bar[slot],
          )}
        >
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${Math.min(row.pct, 100)}%` }}
          />
        </div>
        <p
          className={cn(
            'shrink-0 font-semibold tabular-nums text-brand',
            styles.pct[slot],
          )}
        >
          {row.target > 0 ? formatTargetPercent(row.pct) : '—'}
        </p>
      </div>
    </div>
  );
}

function TeamQuarterKpiTile({
  team,
  title,
}: {
  team: PipelineKpiTeamTile;
  title?: string;
}) {
  if (!team.rows.length) return null;

  const density = getKpiDensity(team.rows.length);
  const displayTitle = title ?? formatTeamLabel(team.teamName);
  const tileHeightClass = getKpiTileHeightClass(team.rows.length);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col rounded-lg border border-border bg-surface-card px-4 py-3.5',
        QUARTERLY_KPI_TILE_WIDTH_CLASS,
        tileHeightClass,
      )}
    >
      <p className="shrink-0 truncate text-[12px] font-medium text-muted-foreground">
        {displayTitle}
      </p>

      <div className="mt-2 flex flex-1 flex-col">
        {team.rows.map((row, index) => (
          <CurrencyKpiBlock
            key={row.currency}
            row={row}
            density={density}
            isFirst={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyQuarterlyTargetCard({ hint }: { hint: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-lg border border-border bg-brand-muted px-5 py-4',
        QUARTERLY_KPI_TILE_WIDTH_CLASS,
      )}
    >
      <div className="shrink-0 rounded-md bg-brand p-2">
        <Target
          size={16}
          className="text-brand-foreground"
          strokeWidth={2.25}
        />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          Quarterly Target
        </p>
        <p className="mt-1 text-base font-semibold text-foreground">
          Not configured
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export function QuarterlyTargetKpiSkeleton() {
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: 3 }).map((unused, index) => (
        <Skeleton
          key={index}
          className={cn(
            'shrink-0 rounded-lg',
            QUARTERLY_KPI_TILE_WIDTH_CLASS,
            getKpiTileHeightClass(2),
          )}
        />
      ))}
    </div>
  );
}

export function PipelineSalesTargetKpiCards() {
  const { kpi, isLoading, isConfigured, hasPlan, isCompanyScope } =
    usePipelineSalesTargetProgress();

  if (isLoading) {
    return <QuarterlyTargetKpiSkeleton />;
  }

  if (!hasPlan || !isConfigured || !kpi) {
    return <EmptyQuarterlyTargetCard hint="Set quarterly targets in Targets" />;
  }

  const tiles: { key: string; team: PipelineKpiTeamTile; title?: string }[] =
    isCompanyScope
      ? [
          {
            key: 'overall',
            team: kpi.overall,
            title: `Q${kpi.q} Target · ${kpi.fiscalYear}`,
          },
          ...kpi.teams.map((team) => ({
            key: team.teamId,
            team,
            title: formatTeamLabel(team.teamName),
          })),
        ]
      : [
          {
            key: kpi.overall.teamId,
            team: kpi.overall,
            title: formatTeamLabel(kpi.overall.teamName),
          },
        ];

  return (
    <div className="flex flex-wrap gap-4">
      {tiles.map(({ key, team, title }) => (
        <TeamQuarterKpiTile key={key} team={team} title={title} />
      ))}
    </div>
  );
}
