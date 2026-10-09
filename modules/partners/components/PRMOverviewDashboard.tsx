'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  PieChart,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Partner, PRMMainTab } from '../types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDealRegistrations } from '@/store/server/features/partners/dealRegistrations';
import { usePartnerCertifications } from '@/store/server/features/partners/queries';
import { usePartnerTiers } from '../tiers/hooks/usePartnerTiers';
import {
  formatDealMoney,
  isApprovedRegistrationStatus,
  isPendingRegistrationStatus,
  registrationStatusStyle,
} from '../utils/deal-registrations';
import { PRMOverviewSkeleton } from '@/components/loading/skeleton-screens';

const VENDOR_COLORS = [
  '#2563eb',
  '#16a34a',
  '#0284c7',
  '#f59e0b',
  '#ea580c',
  '#cbd5e1',
];

const ALL_TIERS_FILTER = 'all';

function partnerMatchesTierFilter(
  partner: Partner | undefined,
  tierFilter: string,
): boolean {
  if (tierFilter === ALL_TIERS_FILTER) return true;
  if (!partner) return false;
  if (partner.tierId && partner.tierId === tierFilter) return true;
  return partner.tier === tierFilter;
}

function partnerHasTarget(partner: Partner): boolean {
  if (typeof partner.annualTarget === 'number' && partner.annualTarget > 0) {
    return true;
  }
  if (
    (partner.currencyTargets ?? []).some(
      (row) => typeof row.annualAmount === 'number' && row.annualAmount > 0,
    )
  ) {
    return true;
  }
  return (partner.scorecard?.revenueTarget ?? 0) > 0;
}

function formatPipelineValue(value: number) {
  return formatDealMoney(value);
}

function truncateLabel(text: string, maxLength = 14) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function displayRegistrationStatus(status: string) {
  if (/converted to deal/i.test(status)) return 'Approved';
  return status;
}

const KPI_CARD_CLASS =
  'flex min-h-[104px] cursor-pointer flex-col justify-between rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors hover:border-brand/40';

/** Matches Partner Management / profile panel table styles. */
const TABLE_HEAD_CLASS =
  'px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground';

const TABLE_CELL_CLASS = 'px-3 py-3 text-sm text-foreground';

const TABLE_CELL_SECONDARY_CLASS = 'px-3 py-3 text-sm text-muted-foreground';

type HintTone = 'positive' | 'neutral' | 'danger';

const HINT_TONE_CLASS: Record<HintTone, string> = {
  positive: 'text-emerald-600',
  neutral: 'text-slate-600',
  danger: 'text-red-600',
};

function KpiCard({
  label,
  value,
  hint,
  hintTone = 'neutral',
  icon,
  iconWrapClass,
  iconUnwrapped = false,
  valueClassName,
  labelClassName,
  onClick,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: HintTone;
  icon?: React.ReactNode;
  iconWrapClass?: string;
  iconUnwrapped?: boolean;
  valueClassName?: string;
  labelClassName?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(KPI_CARD_CLASS, onClick && 'cursor-pointer')}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
            labelClassName,
          )}
        >
          {label}
        </span>
        {icon ? (
          iconUnwrapped ? (
            <div className="shrink-0">{icon}</div>
          ) : (
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                iconWrapClass,
              )}
            >
              {icon}
            </div>
          )
        ) : null}
      </div>
      <div
        className={cn(
          'mt-2 text-[20px] font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-[22px]',
          valueClassName,
        )}
      >
        {value}
      </div>
      {hint ? (
        <p
          className={cn(
            'mt-2 text-[10px] font-medium',
            HINT_TONE_CLASS[hintTone],
          )}
        >
          {hint}
        </p>
      ) : null}
      {footer}
    </div>
  );
}

function SectionCard({
  title,
  children,
  footer,
  headerActions,
  className,
  bodyClassName,
  flushHorizontal = false,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Table cards: extend content to the card edges (no horizontal inset). */
  flushHorizontal?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] sm:p-5',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="m-0 min-w-0 truncate text-[14px] font-semibold text-foreground">
          {title}
        </h2>
        {headerActions ? (
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto pt-3',
          flushHorizontal && '-mx-4 sm:-mx-5',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-border pt-3">{footer}</div>
      ) : null}
    </div>
  );
}

function FooterLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand transition-colors hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </button>
  );
}

function ActionRequiredCard({
  items,
  onNavigate,
}: {
  items: Array<{ label: string; badge: string; isPill: boolean }>;
  onNavigate: () => void;
}) {
  return (
    <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-500 opacity-80" />

      <div className="min-h-0 flex-1">
        <h2 className="m-0 text-[14px] font-semibold text-foreground">
          Action Required
        </h2>

        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">All caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No actions required right now.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            {items.map((act) => (
              <button
                key={act.label}
                type="button"
                onClick={onNavigate}
                className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left text-[13px] transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 leading-snug text-foreground/90">
                  {act.label}
                </span>
                {act.isPill ? (
                  <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-[#ef4444] px-2 text-[10px] font-semibold tabular-nums text-white shadow-sm">
                    {act.badge}
                  </span>
                ) : (
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-semibold tabular-nums text-white shadow-sm">
                    {act.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-3">
        <FooterLink onClick={onNavigate}>View all actions</FooterLink>
      </div>
    </div>
  );
}

function EmptyTableMessage({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-10 text-center text-sm text-muted-foreground"
      >
        {message}
      </td>
    </tr>
  );
}

interface PRMOverviewDashboardProps {
  partners: Partner[];
  onNavigateTab: (tab: PRMMainTab) => void;
  onSelectPartner: (partnerId: string) => void;
  openRegisterQbr?: boolean;
  onRegisterQbrOpenChange?: (open: boolean) => void;
  prefillPartnerId?: string | null;
}

export function PRMOverviewDashboard({
  partners,
  onNavigateTab,
  onSelectPartner,
}: PRMOverviewDashboardProps) {
  const { registrations, partnersWithPipeline, isLoading } =
    useDealRegistrations(partners);
  const certificationsQuery = usePartnerCertifications();
  const { activeTiers } = usePartnerTiers();
  const [vendorTierFilter, setVendorTierFilter] =
    useState<string>(ALL_TIERS_FILTER);

  useEffect(() => {
    if (vendorTierFilter === ALL_TIERS_FILTER) return;
    if (!activeTiers.some((tier) => tier.id === vendorTierFilter)) {
      setVendorTierFilter(ALL_TIERS_FILTER);
    }
  }, [activeTiers, vendorTierFilter]);

  const filteredPartnersForPipeline = useMemo(() => {
    if (vendorTierFilter === ALL_TIERS_FILTER) return partnersWithPipeline;
    return partnersWithPipeline.filter((partner) =>
      partnerMatchesTierFilter(partner, vendorTierFilter),
    );
  }, [partnersWithPipeline, vendorTierFilter]);

  const expiringCertifications = useMemo(
    () =>
      (certificationsQuery.data ?? []).filter(
        (cert) => cert.status === 'Expiring Soon' || cert.status === 'Expired',
      ),
    [certificationsQuery.data],
  );

  const activePartnerCount = partnersWithPipeline.filter(
    (p) => p.status === 'Active',
  ).length;

  const pipelineTotal = useMemo(
    () => partnersWithPipeline.reduce((sum, p) => sum + p.pipelineValue, 0),
    [partnersWithPipeline],
  );

  const partnerWonTotal = useMemo(
    () =>
      partnersWithPipeline.reduce(
        (sum, p) => sum + (Number(p.revenue) || 0),
        0,
      ),
    [partnersWithPipeline],
  );

  const partnerContribution = useMemo(() => {
    const withTarget = partnersWithPipeline.filter(
      (p) => (p.scorecard?.targetAchievement ?? 0) > 0,
    );
    if (!withTarget.length) return null;
    const avg =
      withTarget.reduce(
        (sum, p) => sum + (p.scorecard?.targetAchievement ?? 0),
        0,
      ) / withTarget.length;
    return Math.round(avg);
  }, [partnersWithPipeline]);

  const partnersAtRisk = partnersWithPipeline.filter(
    (p) => partnerHasTarget(p) && (p.scorecard?.targetAchievement ?? 0) < 50,
  ).length;

  const topPartners = useMemo(() => {
    const byPartner = new Map<
      string,
      {
        id: string;
        name: string;
        pipeline: number;
        won: number;
        opps: number;
        approved: number;
      }
    >();

    for (const partner of partnersWithPipeline) {
      byPartner.set(partner.id, {
        id: partner.id,
        name: partner.name,
        pipeline: partner.pipelineValue,
        won: Number(partner.revenue) || 0,
        opps: 0,
        approved: 0,
      });
    }

    for (const reg of registrations) {
      const key = reg.partnerId;
      const row = byPartner.get(key);
      if (!row) continue;
      row.opps += 1;
      if (isApprovedRegistrationStatus(reg.status)) {
        row.approved += 1;
      }
    }

    // Only rank partners that actually have registrations behind them.
    return Array.from(byPartner.values())
      .filter((row) => row.opps > 0 || row.pipeline > 0)
      .sort((a, b) => b.pipeline - a.pipeline)
      .slice(0, 5)
      .map((row) => ({
        id: row.id,
        name: row.name,
        pipeline: formatPipelineValue(row.pipeline),
        won: row.won ? formatDealMoney(row.won) : '—',
        opps: row.opps,
        winRate:
          row.opps > 0
            ? `${Math.round((row.approved / row.opps) * 100)}%`
            : '—',
      }));
  }, [partnersWithPipeline, registrations]);

  const partnersByValue = useMemo(() => {
    // Use partner pipelineValue (vendor.amount / partner value), not deal totals.
    const sorted = filteredPartnersForPipeline
      .map((partner) => ({
        id: partner.id,
        name: partner.name?.trim() || 'Unknown',
        rawValue: Number(partner.pipelineValue) || 0,
      }))
      .filter((row) => row.rawValue > 0)
      .sort((a, b) => b.rawValue - a.rawValue);

    const total = sorted.reduce((sum, row) => sum + row.rawValue, 0) || 1;
    const top = sorted.slice(0, 5);
    const othersValue = sorted
      .slice(5)
      .reduce((sum, row) => sum + row.rawValue, 0);

    const rows = top.map((row, index) => ({
      id: row.id,
      name: row.name,
      value: formatDealMoney(row.rawValue),
      pct: `${Math.round((row.rawValue / total) * 100)}%`,
      color: VENDOR_COLORS[index % VENDOR_COLORS.length],
      pctNum: (row.rawValue / total) * 100,
    }));

    if (othersValue > 0) {
      rows.push({
        id: 'others',
        name: 'Others',
        value: formatDealMoney(othersValue),
        pct: `${Math.round((othersValue / total) * 100)}%`,
        color: VENDOR_COLORS[5],
        pctNum: (othersValue / total) * 100,
      });
    }

    return rows;
  }, [filteredPartnersForPipeline]);

  const vendorPipelineTotal = useMemo(
    () =>
      filteredPartnersForPipeline.reduce(
        (sum, partner) => sum + (Number(partner.pipelineValue) || 0),
        0,
      ),
    [filteredPartnersForPipeline],
  );

  const donutSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 38;
    let offset = 0;
    return partnersByValue.map((v) => {
      const len = (v.pctNum / 100) * circumference;
      const seg = {
        id: v.id,
        name: v.name,
        color: v.color,
        dashArray: `${len} ${circumference - len}`,
        dashOffset: -offset,
      };
      offset += len;
      return seg;
    });
  }, [partnersByValue]);

  const partnerTiers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tier of activeTiers) {
      counts.set(tier.id, 0);
    }

    for (const partner of partnersWithPipeline) {
      const byId = partner.tierId ? counts.get(partner.tierId) : undefined;
      if (byId !== undefined) {
        counts.set(partner.tierId, byId + 1);
        continue;
      }

      const matched = activeTiers.find((tier) => tier.name === partner.tier);
      if (matched) {
        counts.set(matched.id, (counts.get(matched.id) ?? 0) + 1);
      }
    }

    const max = Math.max(...Array.from(counts.values()), 1);

    return activeTiers.map((tier) => {
      const count = counts.get(tier.id) ?? 0;
      return {
        id: tier.id,
        label: tier.name,
        count,
        widthPct: count > 0 ? Math.max(12, Math.round((count / max) * 100)) : 0,
        color: tier.color || '#cbd5e1',
      };
    });
  }, [activeTiers, partnersWithPipeline]);

  const recentDeals = useMemo(
    () =>
      registrations.slice(0, 5).map((reg) => ({
        id: reg.registrationNumber,
        partner: reg.partnerName,
        customer: reg.customerName,
        value: formatDealMoney(reg.estimatedDealValue),
        status: reg.status,
        displayStatus: displayRegistrationStatus(reg.status),
        date: reg.registrationDate || '—',
      })),
    [registrations],
  );

  const healthList = useMemo(() => {
    return [...partnersWithPipeline]
      .filter(partnerHasTarget)
      .sort((a, b) => (b.health?.score ?? 0) - (a.health?.score ?? 0))
      .slice(0, 5)
      .map((partner) => {
        const score = partner.health?.score ?? partner.performanceScore ?? 0;
        let trend: 'up' | 'flat' | 'down' = 'flat';
        if (score >= 75) trend = 'up';
        else if (score < 60) trend = 'down';
        return {
          id: partner.id,
          partner: partner.name,
          score,
          trend,
        };
      });
  }, [partnersWithPipeline]);

  const pendingRegistrationCount = registrations.filter((reg) =>
    isPendingRegistrationStatus(reg.status),
  ).length;
  const expiredRegistrationCount = registrations.filter((reg) =>
    /expir/i.test(reg.status),
  ).length;
  const belowTargetCount = partnersWithPipeline.filter(
    (p) => (p.scorecard?.targetAchievement ?? 100) < 75,
  ).length;
  const expiringCertsCount = expiringCertifications.filter(
    (cert) => cert.status === 'Expiring Soon',
  ).length;

  const actionItems = useMemo(
    () =>
      [
        {
          label: 'Deal registrations awaiting approval',
          badge: String(pendingRegistrationCount),
          isPill: false,
          visible: pendingRegistrationCount > 0,
        },
        {
          label: 'Expired deal registrations',
          badge: String(expiredRegistrationCount),
          isPill: false,
          visible: expiredRegistrationCount > 0,
        },
        {
          label: 'Certifications expiring (30 days)',
          badge: String(expiringCertsCount),
          isPill: false,
          visible: expiringCertsCount > 0,
        },
        {
          label: 'Partners below quarterly target',
          badge: String(belowTargetCount),
          isPill: false,
          visible: belowTargetCount > 0,
        },
      ].filter((item) => item.visible),
    [
      pendingRegistrationCount,
      expiredRegistrationCount,
      expiringCertsCount,
      belowTargetCount,
    ],
  );

  if (isLoading) {
    return <PRMOverviewSkeleton />;
  }

  return (
    <div className="flex-1 space-y-5 overflow-y-auto bg-white p-4 sm:p-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Active Partners"
          value={activePartnerCount}
          hint={`${partnersWithPipeline.length} total partners`}
          hintTone="positive"
          icon={<Users className="size-4" />}
          iconWrapClass="bg-blue-100 text-blue-700"
          onClick={() => onNavigateTab('partner-management')}
        />

        <KpiCard
          label="Partner Won"
          value={formatDealMoney(partnerWonTotal)}
          hint="Won opportunities with partners"
          hintTone="positive"
          icon={<DollarSign className="size-4" />}
          iconWrapClass="bg-violet-100 text-violet-700"
          onClick={() => onNavigateTab('partner-sales')}
          footer={
            <div className="mt-2 flex items-end justify-between gap-2 border-t border-border/70 pt-2.5">
              <div>
                <p className="mb-0.5 text-[10px] font-medium leading-none text-slate-600">
                  Partner Pipeline
                </p>
                <p className="text-[12px] font-semibold leading-none text-emerald-700 tabular-nums">
                  {formatPipelineValue(pipelineTotal)}
                </p>
              </div>
              <span className="text-[10px] font-medium text-brand">
                Total pipeline
              </span>
            </div>
          }
        />

        <KpiCard
          label="Partner Contribution"
          value={partnerContribution !== null ? `${partnerContribution}%` : '—'}
          hint="Average target achievement"
          icon={<PieChart className="size-4" />}
          iconWrapClass="bg-amber-100 text-amber-700"
          onClick={() => onNavigateTab('partner-management')}
        />

        <KpiCard
          label="Deal Registrations"
          value={registrations.length}
          hint="From leads and deals"
          icon={<FileText className="size-4" />}
          iconWrapClass="bg-sky-100 text-sky-700"
          onClick={() => onNavigateTab('partner-sales')}
        />

        <KpiCard
          label="Partners at Risk"
          value={partnersAtRisk}
          hint="Below 50% of target"
          hintTone="danger"
          labelClassName="text-red-700"
          valueClassName="text-red-600"
          icon={<AlertTriangle className="size-4" />}
          iconWrapClass="bg-red-100 text-red-600"
          onClick={() => onNavigateTab('partner-management')}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Top Partners by Pipeline"
          flushHorizontal
          bodyClassName="pt-2"
          footer={
            <FooterLink onClick={() => onNavigateTab('partner-management')}>
              View all partners
            </FooterLink>
          }
        >
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-border">
                <th className={cn(TABLE_HEAD_CLASS, 'w-[34%]')}>Partner</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[18%]')}>Pipeline</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[18%]')}>Won</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[14%] text-center')}>
                  Opps
                </th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[16%] text-right')}>
                  Win Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topPartners.length === 0 ? (
                <EmptyTableMessage
                  colSpan={5}
                  message="No pipeline data yet."
                />
              ) : (
                topPartners.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPartner(p.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td
                      className={cn(TABLE_CELL_CLASS, 'max-w-0 truncate')}
                      title={p.name}
                    >
                      {truncateLabel(p.name, 14)}
                    </td>
                    <td className={cn(TABLE_CELL_CLASS, 'tabular-nums')}>
                      {p.pipeline}
                    </td>
                    <td
                      className={cn(TABLE_CELL_SECONDARY_CLASS, 'tabular-nums')}
                    >
                      {p.won}
                    </td>
                    <td
                      className={cn(
                        TABLE_CELL_SECONDARY_CLASS,
                        'text-center tabular-nums',
                      )}
                    >
                      {p.opps}
                    </td>
                    <td
                      className={cn(
                        TABLE_CELL_CLASS,
                        'text-right tabular-nums',
                      )}
                    >
                      {p.winRate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard
          title="Pipeline by Partner"
          bodyClassName="flex items-center justify-center py-2"
          headerActions={
            <Select
              value={vendorTierFilter}
              onValueChange={setVendorTierFilter}
            >
              <SelectTrigger
                size="sm"
                aria-label="Filter by partner tier"
                className="box-border h-8 min-h-8 max-h-8 w-[140px] shrink-0 border-border bg-white px-2 py-0 text-[11px] leading-none data-[size=default]:h-8 data-[size=sm]:h-8"
              >
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_TIERS_FILTER}>All tiers</SelectItem>
                {activeTiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {partnersByValue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pipeline yet.</p>
          ) : (
            <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
              <div className="relative flex size-[132px] shrink-0 items-center justify-center sm:size-[140px]">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    strokeWidth="16"
                    stroke="#f1f5f9"
                    fill="none"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="50"
                      cy="50"
                      r="38"
                      strokeWidth="16"
                      stroke={seg.color}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      fill="none"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[15px] font-bold tracking-tight text-foreground tabular-nums">
                    {formatDealMoney(vendorPipelineTotal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Total
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2 text-[12px]">
                {partnersByValue.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="truncate text-foreground">{v.name}</span>
                    </div>
                    <span className="shrink-0 tabular-nums text-foreground">
                      {v.value}{' '}
                      <span className="text-muted-foreground">({v.pct})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Partner Tier"
          bodyClassName="flex flex-col justify-center py-2"
        >
          {partnerTiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No partner tiers configured.
            </p>
          ) : (
            <div className="space-y-3.5">
              {partnerTiers.map((st) => (
                <div key={st.id} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-[12px] text-foreground">
                    {st.label}
                  </span>
                  <div className="relative h-7 flex-1 rounded-full bg-slate-50">
                    <div
                      className="h-7 rounded-full transition-all duration-500"
                      style={{
                        width: st.count > 0 ? `${st.widthPct}%` : '0%',
                        backgroundColor: st.color,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[12px] font-medium tabular-nums text-foreground">
                    {st.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent Deal Registrations"
          flushHorizontal
          bodyClassName="pt-2"
          footer={
            <FooterLink onClick={() => onNavigateTab('partner-sales')}>
              View all deal registrations
            </FooterLink>
          }
        >
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-border">
                <th className={cn(TABLE_HEAD_CLASS, 'w-[24%]')}>Partner</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[28%]')}>Customer</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[14%]')}>Value</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[16%]')}>Status</th>
                <th className={cn(TABLE_HEAD_CLASS, 'w-[18%]')}>
                  Registered On
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentDeals.length === 0 ? (
                <EmptyTableMessage
                  colSpan={5}
                  message="No deal registrations yet."
                />
              ) : (
                recentDeals.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => onNavigateTab('partner-sales')}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td
                      className={cn(TABLE_CELL_CLASS, 'max-w-0 truncate')}
                      title={d.partner}
                    >
                      {truncateLabel(d.partner, 14)}
                    </td>
                    <td
                      className={cn(
                        TABLE_CELL_SECONDARY_CLASS,
                        'max-w-0 truncate',
                      )}
                      title={d.customer}
                    >
                      {truncateLabel(d.customer, 14)}
                    </td>
                    <td className={cn(TABLE_CELL_CLASS, 'tabular-nums')}>
                      {d.value}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'border px-2 py-0.5 text-[10px] font-medium',
                          registrationStatusStyle(d.displayStatus),
                        )}
                      >
                        {d.displayStatus}
                      </Badge>
                    </td>
                    <td className={TABLE_CELL_SECONDARY_CLASS}>{d.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard
          title="Partner Health (Top 5)"
          bodyClassName="pt-2"
          footer={
            <FooterLink onClick={() => onNavigateTab('partner-management')}>
              View partner health
            </FooterLink>
          }
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={TABLE_HEAD_CLASS}>Partner</th>
                <th className={cn(TABLE_HEAD_CLASS, 'text-center')}>
                  Health Score
                </th>
                <th className={cn(TABLE_HEAD_CLASS, 'text-right')}>Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {healthList.length === 0 ? (
                <EmptyTableMessage
                  colSpan={3}
                  message="No health scores available."
                />
              ) : (
                healthList.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => onSelectPartner(h.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td className={TABLE_CELL_CLASS}>{h.partner}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm tabular-nums text-foreground">
                        {h.score}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {h.trend === 'up' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                          <ArrowUp className="size-3.5 stroke-[2.5]" />
                        </span>
                      ) : null}
                      {h.trend === 'flat' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                          <ArrowRight className="size-3.5 stroke-[2.5]" />
                        </span>
                      ) : null}
                      {h.trend === 'down' ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-red-600">
                          <ArrowDown className="size-3.5 stroke-[2.5]" />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionCard>

        <ActionRequiredCard
          items={actionItems}
          onNavigate={() => onNavigateTab('partner-sales')}
        />
      </section>
    </div>
  );
}
