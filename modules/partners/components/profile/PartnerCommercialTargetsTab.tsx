'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  DollarSign,
  Download,
  Eye,
  Handshake,
  MoreVertical,
  Save,
  Search,
  Split,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatMoneyInCurrency } from '@/components/sales-targeting/targetingUtils';
import { useGetEnabledCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { useGetActiveFiscalYears } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { useUpdatePartner } from '@/store/server/features/partners/mutations';
import { usePartnerPerformance } from '@/store/server/features/partners/queries';
import { useDealRegistrations } from '@/store/server/features/partners/dealRegistrations';
import type { Partner } from '../../types';
import { exportPartnersTable } from '../../utils/export-table';
import {
  AttainmentBar,
  FILTER_TRIGGER_CLASS,
  Panel,
  PanelHeader,
  ProfileKpiCard,
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
  formatMoney,
} from './shared';
import {
  PartnerCurrencyTargetsEditor,
  toCurrencyTargetDrafts,
  type PartnerCurrencyTargetDraft,
  type PartnerSessionTargetDraft,
} from './PartnerCurrencyTargetsEditor';

type CommercialFilter = 'all' | 'registrations';

interface CommercialRow {
  id: string;
  rowType: 'Deal Registration';
  name: string;
  customer: string;
  solution: string;
  owner: string;
  value: number;
  stage: string;
  status: string;
  href: string | null;
}

function attainment(achieved: number, target: number) {
  return target > 0 ? (achieved / target) * 100 : 0;
}

function sessionAmountForDraft(
  draft: PartnerCurrencyTargetDraft | undefined,
  sessionId: string,
): number {
  return (
    draft?.sessionTargets.find((row) => row.sessionId === sessionId)?.amount ??
    0
  );
}

function patchSessionTarget(
  draft: PartnerCurrencyTargetDraft,
  sessionId: string,
  amount: number,
): PartnerCurrencyTargetDraft {
  const existing = draft.sessionTargets.filter(
    (row) => row.sessionId !== sessionId,
  );
  const sessionTargets: PartnerSessionTargetDraft[] =
    amount > 0 ? [...existing, { sessionId, amount }] : existing;
  return { ...draft, sessionTargets };
}

export function PartnerCommercialTargetsTab({
  partner,
  onPartnerUpdated,
  onSelectOpportunity,
}: {
  partner: Partner;
  onPartnerUpdated?: (partner: Partner) => void;
  onSelectOpportunity?: (rowType: string, id: string) => void;
}) {
  const { data: enabledCurrencies = [], isLoading: currenciesLoading } =
    useGetEnabledCurrencies();
  const { data: fiscalYear } = useGetActiveFiscalYears();
  const { data: performance } = usePartnerPerformance();
  const updatePartner = useUpdatePartner();
  const { registrations, isLoading: regsLoading } = useDealRegistrations([
    partner,
  ]);

  const sessions = useMemo(
    () =>
      [...(fiscalYear?.sessions ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [fiscalYear],
  );

  const [drafts, setDrafts] = useState<PartnerCurrencyTargetDraft[]>([]);
  const [activeCurrencyId, setActiveCurrencyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CommercialFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const next = toCurrencyTargetDrafts(
      partner.currencyTargets,
      enabledCurrencies,
      partner.annualTarget ?? partner.scorecard?.revenueTarget,
    );
    setDrafts((prev) => {
      // Skip update when drafts already match to avoid unnecessary re-renders.
      if (
        prev.length === next.length &&
        prev.every(
          (row, index) =>
            row.currencyId === next[index]?.currencyId &&
            row.annualAmount === next[index]?.annualAmount,
        )
      ) {
        return prev;
      }
      return next;
    });
    setActiveCurrencyId((prev) => {
      if (prev && next.some((row) => row.currencyId === prev)) return prev;
      return next[0]?.currencyId ?? '';
    });
  }, [partner, enabledCurrencies]);

  const activeDraft = drafts.find((row) => row.currencyId === activeCurrencyId);
  const activeCode = activeDraft?.currency || drafts[0]?.currency || 'USD';
  const annualTarget = activeDraft?.annualAmount ?? 0;
  const achieved =
    performance?.wonByPartnerId?.[partner.id]?.[activeCode] ??
    partner.revenue ??
    0;

  const partnerRegs = useMemo(
    () => registrations.filter((reg) => reg.partnerId === partner.id),
    [registrations, partner.id],
  );

  const pipelineValue = useMemo(
    () =>
      partnerRegs.reduce((sum, reg) => sum + (reg.estimatedDealValue || 0), 0),
    [partnerRegs],
  );

  const rowsTarget = useMemo(() => {
    return sessions.map((session) => {
      const targetValue = sessionAmountForDraft(activeDraft, session.id);
      return {
        session,
        targetValue,
        achievedValue: 0,
        attainment: attainment(0, targetValue),
      };
    });
  }, [sessions, activeDraft]);

  const allocated = rowsTarget.reduce((sum, row) => sum + row.targetValue, 0);
  const annualAttainment = attainment(achieved, annualTarget);
  const allocationGap = allocated - annualTarget;

  const handleDraftsChange = (next: PartnerCurrencyTargetDraft[]) => {
    setDrafts(next);
    setActiveCurrencyId((prev) => {
      if (prev && next.some((row) => row.currencyId === prev)) return prev;
      return next[0]?.currencyId ?? '';
    });
  };

  const setAnnualTarget = (value: number) => {
    if (!activeDraft) return;
    handleDraftsChange(
      drafts.map((row) =>
        row.currencyId === activeDraft.currencyId
          ? { ...row, annualAmount: value }
          : row,
      ),
    );
  };

  const setSessionTarget = (sessionId: string, value: number) => {
    if (!activeDraft) return;
    handleDraftsChange(
      drafts.map((row) =>
        row.currencyId === activeDraft.currencyId
          ? patchSessionTarget(row, sessionId, value)
          : row,
      ),
    );
  };

  const distributeEvenly = () => {
    if (!activeDraft || sessions.length === 0) return;
    const count = sessions.length;
    const even = Math.round(annualTarget / count);
    let remaining = annualTarget;
    handleDraftsChange(
      drafts.map((row) => {
        if (row.currencyId !== activeDraft.currencyId) return row;
        const sessionTargets = sessions.map((session, index) => {
          const isLast = index === count - 1;
          const amount = isLast ? remaining : even;
          remaining -= amount;
          return { sessionId: session.id, amount };
        });
        return { ...row, sessionTargets };
      }),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updatePartner.mutateAsync({
        id: partner.id,
        payload: {
          currencyTargets: drafts.map((row) => ({
            currencyId: row.currencyId,
            annualAmount: row.annualAmount,
            sessionTargets: row.sessionTargets.map((session) => ({
              sessionId: session.sessionId,
              amount: session.amount,
            })),
          })),
          annualTarget: drafts[0]?.annualAmount,
        },
      });
      toast.success('Partner targets saved');
      onPartnerUpdated?.(updated);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Failed to save partner targets';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const rowsCommercial = useMemo<CommercialRow[]>(() => {
    const collected = partnerRegs.map((reg) => ({
      id: reg.id,
      rowType: 'Deal Registration' as const,
      name: reg.opportunityName,
      customer: reg.customerName,
      solution: reg.productOrSolution,
      owner: partner.accountManager,
      value: reg.estimatedDealValue,
      stage: reg.status,
      status: reg.registrationNumber || reg.status,
      href: reg.crmDealId ? `/sales-hub?tab=deals` : null,
    }));

    const query = search.trim().toLowerCase();
    if (!query) return collected;
    return collected.filter((row) =>
      [row.name, row.customer, row.solution, row.owner].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [partnerRegs, partner.accountManager, search]);

  if (currenciesLoading) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Target />
          </EmptyMedia>
          <EmptyTitle>Loading currencies</EmptyTitle>
          <EmptyDescription>
            Fetching enabled currencies for {partner.name}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileKpiCard
          label="Annual Target"
          value={
            annualTarget
              ? formatMoneyInCurrency(annualTarget, activeCode)
              : formatMoney(0)
          }
          hint={`${Math.round(annualAttainment)}% Attained`}
          icon={<Target size={18} />}
        />
        <ProfileKpiCard
          label="Revenue Delivered"
          value={
            achieved
              ? formatMoneyInCurrency(achieved, activeCode)
              : formatMoney(0)
          }
          hint="Won deals attributed to this partner"
          icon={<DollarSign size={18} />}
        />
        <ProfileKpiCard
          label="Registered Pipeline"
          value={formatMoney(pipelineValue)}
          hint={`${partnerRegs.length} deal registrations`}
          icon={<TrendingUp size={18} />}
        />
        <ProfileKpiCard
          label="Deal Registrations"
          value={String(partnerRegs.length)}
          hint={regsLoading ? 'Loading…' : 'From leads & deals'}
          icon={<Handshake size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Target Attainment & Quota"
            description={`Currency targets for ${partner.name}.`}
            action={
              <div className="flex items-center gap-2">
                {drafts.length > 0 ? (
                  <Select
                    value={activeCurrencyId}
                    onValueChange={setActiveCurrencyId}
                  >
                    <SelectTrigger
                      className={cn(
                        FILTER_TRIGGER_CLASS,
                        'h-[30px] w-[100px] text-xs',
                      )}
                    >
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {drafts.map((row) => (
                        <SelectItem
                          key={row.currencyId}
                          value={row.currencyId}
                          className="text-xs"
                        >
                          {row.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="h-[30px] gap-1.5 text-xs"
                  disabled={saving || !enabledCurrencies.length}
                  onClick={() => void handleSave()}
                >
                  <Save size={12} />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            }
          />

          {!enabledCurrencies.length ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Target />
                </EmptyMedia>
                <EmptyTitle>No currencies enabled</EmptyTitle>
                <EmptyDescription>
                  Enable tenant currencies before setting partner targets.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="border-b border-border p-3.5">
                <PartnerCurrencyTargetsEditor
                  currencies={enabledCurrencies}
                  value={drafts}
                  onChange={handleDraftsChange}
                  optionalHint="Add one annual target per currency."
                />
              </div>

              {activeDraft ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-elevated/30 p-3.5">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="partner-annual-target"
                        className="whitespace-nowrap text-xs font-medium text-muted-foreground"
                      >
                        Target ({activeCode}):
                      </label>
                      <Input
                        id="partner-annual-target"
                        type="number"
                        min={0}
                        step={50000}
                        value={annualTarget}
                        onChange={(e) =>
                          setAnnualTarget(Number(e.target.value) || 0)
                        }
                        className="h-7 w-[130px] border-border bg-white text-xs tabular-nums dark:bg-surface-card"
                      />
                    </div>
                    <div className="flex min-w-[170px] flex-1 items-center justify-end gap-2">
                      <div className="w-24">
                        <AttainmentBar value={annualAttainment} />
                      </div>
                      <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-foreground">
                        {Math.round(annualAttainment)}%
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 shrink-0 border-border px-2 text-[11px]"
                        onClick={distributeEvenly}
                        disabled={!sessions.length}
                        title="Distribute target evenly across sessions"
                      >
                        <Split size={12} className="mr-1" />
                        Evenly
                      </Button>
                    </div>
                  </div>

                  {sessions.length > 0 && allocationGap !== 0 ? (
                    <div className="flex items-center gap-2 border-b border-border bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <span>
                        Sessions total{' '}
                        {formatMoneyInCurrency(allocated, activeCode)} (
                        {formatMoneyInCurrency(
                          Math.abs(allocationGap),
                          activeCode,
                        )}{' '}
                        {allocationGap > 0 ? 'above' : 'below'} annual target)
                      </span>
                    </div>
                  ) : null}

                  {sessions.length === 0 ? (
                    <Empty className="m-4 border border-dashed border-border">
                      <EmptyHeader>
                        <EmptyTitle>No fiscal sessions</EmptyTitle>
                        <EmptyDescription>
                          Configure an active fiscal year with sessions to
                          allocate targets by period.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                            <TableHead className={cn(TABLE_HEAD_CLASS, 'py-2')}>
                              Session
                            </TableHead>
                            <TableHead
                              className={cn(
                                TABLE_HEAD_CLASS,
                                'py-2 text-right',
                              )}
                            >
                              Target
                            </TableHead>
                            <TableHead
                              className={cn(TABLE_HEAD_CLASS, 'py-2 w-[110px]')}
                            >
                              Share
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rowsTarget.map(({ session, targetValue }) => (
                            <TableRow key={session.id}>
                              <TableCell
                                className={cn(
                                  TABLE_CELL_CLASS,
                                  'py-2.5 text-xs font-medium',
                                )}
                              >
                                <p className="font-medium text-foreground">
                                  {session.name}
                                </p>
                                {session.startDate && session.endDate ? (
                                  <p className="text-[10px] text-muted-foreground">
                                    {String(session.startDate).slice(0, 10)} —{' '}
                                    {String(session.endDate).slice(0, 10)}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  TABLE_CELL_CLASS,
                                  'py-2.5 text-right',
                                )}
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  step={10000}
                                  value={targetValue}
                                  onChange={(e) =>
                                    setSessionTarget(
                                      session.id,
                                      Number(e.target.value) || 0,
                                    )
                                  }
                                  className="ml-auto h-[26px] w-[100px] border-border bg-white text-right text-xs tabular-nums dark:bg-surface-card"
                                />
                              </TableCell>
                              <TableCell
                                className={cn(TABLE_CELL_CLASS, 'py-2.5')}
                              >
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1">
                                    <AttainmentBar
                                      value={
                                        annualTarget > 0
                                          ? (targetValue / annualTarget) * 100
                                          : 0
                                      }
                                    />
                                  </div>
                                  <span className="w-9 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                                    {annualTarget > 0
                                      ? Math.round(
                                          (targetValue / annualTarget) * 100,
                                        )
                                      : 0}
                                    %
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : (
                <Empty className="m-4 border border-dashed border-border">
                  <EmptyHeader>
                    <EmptyTitle>No currency targets</EmptyTitle>
                    <EmptyDescription>
                      Add a currency target above, then save.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </>
          )}
        </Panel>

        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Commercial Pipeline & Deals"
            action={
              <div className="flex items-center gap-2">
                <div className="relative w-36 sm:w-44">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search deals..."
                    className="h-[30px] border-border bg-white pl-8 text-xs dark:bg-surface-card"
                  />
                </div>
                <Select
                  value={filter}
                  onValueChange={(value) =>
                    setFilter(value as CommercialFilter)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      FILTER_TRIGGER_CLASS,
                      'h-[30px] w-[120px] text-xs',
                    )}
                  >
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All registrations
                    </SelectItem>
                    <SelectItem value="registrations" className="text-xs">
                      Registrations
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[30px] border-border px-2.5 text-xs"
                  onClick={() => {
                    if (!rowsCommercial.length) {
                      toast.error('No commercial records to export');
                      return;
                    }
                    void exportPartnersTable(
                      rowsCommercial.map((row) => ({
                        Opportunity: row.name,
                        Type: row.rowType,
                        Customer: row.customer,
                        Solution: row.solution,
                        Owner: row.owner,
                        Value: row.value,
                        Stage: row.stage,
                        Status: row.status,
                      })),
                      `${partner.name} commercial records`,
                      'xlsx',
                      [
                        `${partner.name} — Commercial Records`,
                        `Generated ${new Date().toLocaleDateString()}`,
                      ],
                    )
                      .then(() => toast.success('Commercial records exported'))
                      .catch(() => toast.error('Failed to export'));
                  }}
                >
                  <Download size={13} />
                </Button>
              </div>
            }
          />

          {regsLoading ? (
            <div className="flex min-h-[140px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
              Loading deal registrations…
            </div>
          ) : rowsCommercial.length === 0 ? (
            <Empty className="m-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>No commercial records</EmptyTitle>
                <EmptyDescription>
                  Deal registrations for this partner will appear here when
                  added on leads or deals.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'py-2')}>
                      Opportunity
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'w-[80px] py-2')}
                    >
                      Type
                    </TableHead>
                    <TableHead
                      className={cn(
                        TABLE_HEAD_CLASS,
                        'w-[100px] py-2 text-right',
                      )}
                    >
                      Value
                    </TableHead>
                    <TableHead
                      className={cn(TABLE_HEAD_CLASS, 'w-[100px] py-2')}
                    >
                      Status
                    </TableHead>
                    <TableHead className={cn(TABLE_HEAD_CLASS, 'w-10 py-2')} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsCommercial.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell
                        className={cn(TABLE_CELL_CLASS, 'py-2.5 font-medium')}
                      >
                        <p
                          className="max-w-[200px] truncate text-xs font-semibold text-foreground"
                          title={row.name}
                        >
                          {row.name}
                        </p>
                        <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">
                          {row.customer}
                          {row.solution ? ` · ${row.solution}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className={cn(TABLE_CELL_CLASS, 'py-2.5')}>
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          Reg
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          TABLE_CELL_CLASS,
                          'py-2.5 text-right text-xs font-semibold tabular-nums',
                        )}
                      >
                        {formatMoney(row.value)}
                      </TableCell>
                      <TableCell className={cn(TABLE_CELL_CLASS, 'py-2.5')}>
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {row.stage}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(TABLE_CELL_CLASS, 'py-2.5 text-right')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical size={13} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() =>
                                onSelectOpportunity?.(row.rowType, row.id)
                              }
                            >
                              <Eye size={12} className="mr-2" />
                              View in Sales Hub
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
