'use client';

import { Handshake, Layers, PieChart, Target, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { tokens } from '@/lib/design-tokens';
import type { PartnersReportData } from './types';

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

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

export function PartnersReportPreview({
  report,
}: {
  report: PartnersReportData;
}) {
  const { summary, meta } = report;
  const selected = new Set(meta.selectedSections);
  const maxTarget = Math.max(
    ...report.targetVsAchievement.map((row) =>
      Math.max(row.target, row.pipeline, row.achievement),
    ),
    1,
  );

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <p className="text-[14px] font-semibold text-foreground">
          {meta.reportKindLabel || meta.title}
        </p>
        <div className="mt-1 space-y-0.5 text-[12px] text-muted-foreground">
          {meta.exportFiscalYear ? (
            <p>Fiscal Year: {meta.exportFiscalYear}</p>
          ) : null}
          {meta.exportQuarter ? <p>Quarter: {meta.exportQuarter}</p> : null}
          <p>
            {meta.periodLabel} · Generated {meta.generatedAt}
          </p>
          <p>
            {meta.recordCount} {meta.primaryRoleName || 'partners'} in scope
            {meta.filterLabels.length
              ? ` · ${meta.filterLabels.length} filter${meta.filterLabels.length === 1 ? '' : 's'}`
              : ''}
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi
          icon={<Users size={12} />}
          label={meta.primaryRoleName || 'Partners'}
          value={String(summary.partners)}
          hint={`${summary.activePartners} active`}
        />
        <Kpi
          icon={<Target size={12} />}
          label="Target"
          value={money(summary.totalTarget)}
          hint={`${report.targetVsAchievement.length} with targets`}
        />
        <Kpi
          icon={<Layers size={12} />}
          label="Pipeline"
          value={money(summary.totalPipeline)}
          hint={`${summary.pipelineRows} rows`}
        />
        <Kpi
          icon={<Handshake size={12} />}
          label="Achievement"
          value={money(summary.totalAchievement)}
          hint={`${summary.leadRows} originated`}
        />
      </div>

      {selected.has('target_vs_achievement') ? (
        <Section
          title={meta.sheetTitles.targetVsAchievement}
          count={`${report.targetVsAchievement.length} partners`}
        >
          <div className="space-y-2">
            {report.targetVsAchievement.slice(0, 8).map((row) => (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="font-medium text-foreground">
                    {row.name}
                  </span>
                  <span className="text-muted-foreground">
                    {money(row.achievement)} / {money(row.target)}
                  </span>
                </div>
                <MiniBar
                  value={row.achievement}
                  max={maxTarget}
                  color={row.tierColor || tokens.color.brand}
                />
                <p className="text-[10px] text-muted-foreground">
                  Pipeline {money(row.pipeline)} · {row.partnershipLevel || '—'}{' '}
                  · {row.nextPartnershipTarget}
                </p>
              </div>
            ))}
            {!report.targetVsAchievement.length ? (
              <Empty>No primary-role partners with targets.</Empty>
            ) : null}
          </div>
        </Section>
      ) : null}

      {selected.has('partners_chart') ? (
        <Section
          title={meta.sheetTitles.partnersChart}
          count={`${report.partnerCharts.length} charts`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {report.partnerCharts.slice(0, 6).map((partner) => (
              <div
                key={partner.id}
                className="rounded-md border border-border p-2"
              >
                <div className="mb-1 flex items-center gap-1 text-[12px] font-medium">
                  <PieChart size={12} className="text-muted-foreground" />
                  {partner.name}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {money(partner.pipeline)} across {partner.stages.length}{' '}
                  stages
                </p>
                <div className="mt-2 space-y-1">
                  {partner.stages.slice(0, 4).map((stage) => (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-sm"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.label}
                      </span>
                      <span>{money(stage.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!report.partnerCharts.length ? (
              <Empty>
                No {meta.primaryPartnershipTypeName || 'primary-type'} partner
                pipeline to chart.
              </Empty>
            ) : null}
          </div>
        </Section>
      ) : null}

      {selected.has('vendor_pipeline') ? (
        <Section
          title={meta.sheetTitles.vendorPipeline}
          count={`${summary.pipelineRows} rows`}
        >
          <PipelinePreview rows={report.vendorPipeline} />
        </Section>
      ) : null}

      {selected.has('strategic_vendors') ? (
        <Section
          title={meta.sheetTitles.strategicVendors}
          count={`${summary.strategicRows} rows`}
        >
          <PipelinePreview rows={report.strategicPipeline} />
        </Section>
      ) : null}

      {selected.has('partner_lead_pipeline') ? (
        <Section
          title={meta.sheetTitles.partnerLeadPipeline}
          count={`${summary.leadRows} rows`}
        >
          <div className="space-y-2">
            {report.partnerLeadPipeline.slice(0, 8).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border px-2 py-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{row.partnerName}</span>
                  <span className="text-muted-foreground">{row.stage}</span>
                </div>
                <p className="text-muted-foreground">
                  {row.clientName || '—'} · {row.solutionArea || '—'}
                  {row.estimatedValue != null
                    ? ` · ${money(row.estimatedValue)}`
                    : ''}
                </p>
              </div>
            ))}
            {!report.partnerLeadPipeline.length ? (
              <Empty>No partner-originated opportunities.</Empty>
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function PipelinePreview({
  rows,
}: {
  rows: PartnersReportData['vendorPipeline'];
}) {
  if (!rows.length) return <Empty>No partner solution involvements.</Empty>;
  return (
    <div className="space-y-1.5">
      {rows.slice(0, 8).map((row) => (
        <div
          key={row.id}
          className="flex items-start gap-2 rounded-md border border-border px-2 py-1.5 text-[11px]"
        >
          <span
            className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: row.stageColor }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">
                {row.partnerName} · {row.dealName}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {money(row.value)}
              </span>
            </div>
            <p className="truncate text-muted-foreground">
              {row.customerName || '—'} · {row.stage}
              {row.opportunityType ? ` · ${row.opportunityType}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-2.5">
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-[14px] font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[11px] italic text-muted-foreground">{children}</p>;
}
