'use client';

import { Target } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { formatCoverage, formatMoneyMap, formatPercent } from './format';
import { buildExportPeriodHeaderLines } from './export-naming';
import type { SalesPipelineReportData } from './types';

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function ReportPreview({ report }: { report: SalesPipelineReportData }) {
  const { summary, meta, stages } = report;
  const selected = meta.selectedSections;
  const liveStages = stages.filter((stage) => stage.count > 0);
  const maxStage = Math.max(...liveStages.map((stage) => stage.count), 1);
  const achievementPct = summary.achievementPct ?? 0;
  const overTarget = achievementPct > 100;

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <p className="text-[14px] font-semibold text-foreground">
          {meta.title}
        </p>
        <div className="mt-1 space-y-0.5 text-[12px] text-muted-foreground">
          {buildExportPeriodHeaderLines(meta).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>
            {meta.periodLabel} · Generated {meta.generatedAt}
          </p>
        </div>
        {meta.filterLabels.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {meta.filterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {selected.includes('executive_summary') ? (
        <>
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            <div className="bg-white p-3">
              <div className="mb-3 flex items-center gap-2">
                <Target size={14} className="text-brand" />
                <p className="text-[12px] font-semibold text-foreground">
                  Target & coverage
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-semibold">
                    {formatMoneyMap(summary.target, true)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Achieved</p>
                  <p className="font-semibold">
                    {formatMoneyMap(summary.achieved, true)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold">
                    {formatMoneyMap(summary.remaining, true)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coverage</p>
                  <p className="font-semibold">
                    {formatCoverage(summary.coverage, summary.coverageLabel)}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                {overTarget ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>Target</span>
                      <span>100%</span>
                    </div>
                    <MiniBar
                      value={100}
                      max={achievementPct}
                      color={tokens.color.borderDefault}
                    />
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>Achieved</span>
                      <span>{formatPercent(summary.achievementPct)}</span>
                    </div>
                    <MiniBar
                      value={achievementPct}
                      max={achievementPct}
                      color={tokens.color.success}
                    />
                  </div>
                ) : (
                  <>
                    <MiniBar
                      value={achievementPct}
                      max={100}
                      color={tokens.color.success}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatPercent(summary.achievementPct)} of target
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-3">
              <p className="mb-3 text-[12px] font-semibold text-foreground">
                Pipeline by stage
              </p>
              <div className="max-h-36 space-y-2 overflow-y-auto">
                {liveStages.slice(0, 8).map((stage) => (
                  <div key={`${stage.group}-${stage.id}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="truncate">{stage.label}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {stage.count} · {stage.share}%
                      </span>
                    </div>
                    <MiniBar
                      value={stage.count}
                      max={maxStage}
                      color={stage.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
