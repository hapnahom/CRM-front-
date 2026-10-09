'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Save, Target, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { formatMoneyInCurrency } from '@/components/sales-targeting/targetingUtils';
import { useGetEnabledCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { useGetActiveFiscalYears } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { useUpdatePartner } from '@/store/server/features/partners/mutations';
import { usePartnerPerformance } from '@/store/server/features/partners/queries';
import type { Partner } from '../../types';
import { usePartnerRoles } from '../../roles';
import {
  FILTER_TRIGGER_CLASS,
  Panel,
  PanelHeader,
  ProfileKpiCard,
} from './shared';
import {
  PartnerCurrencyTargetsEditor,
  toCurrencyTargetDrafts,
  type PartnerCurrencyTargetDraft,
  type PartnerSessionTargetDraft,
} from './PartnerCurrencyTargetsEditor';

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

export function PartnerTargetsTab({
  partner,
  onPartnerUpdated,
}: {
  partner: Partner;
  onPartnerUpdated?: (partner: Partner) => void;
}) {
  const { data: enabledCurrencies = [], isLoading: currenciesLoading } =
    useGetEnabledCurrencies();
  const { data: fiscalYear } = useGetActiveFiscalYears();
  const { data: performance } = usePartnerPerformance();
  const updatePartner = useUpdatePartner();
  const { activeRoles } = usePartnerRoles();

  const isVendorOnly = useMemo(() => {
    const codes = activeRoles
      .filter((role) => partner.roleIds.includes(role.id))
      .map((role) => role.code);
    return codes.length > 0 && codes.every((code) => code === 'vendor');
  }, [activeRoles, partner.roleIds]);

  const sessions = useMemo(
    () =>
      [...(fiscalYear?.sessions ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [fiscalYear],
  );

  const [drafts, setDrafts] = useState<PartnerCurrencyTargetDraft[]>([]);
  const [activeCurrencyId, setActiveCurrencyId] = useState('');

  useEffect(() => {
    const next = toCurrencyTargetDrafts(
      partner.currencyTargets,
      enabledCurrencies,
      partner.annualTarget ?? partner.scorecard?.revenueTarget,
    );
    setDrafts((prev) => {
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
  const activeCode = activeDraft?.currency || drafts[0]?.currency || '—';
  const annualTarget = activeDraft?.annualAmount ?? 0;
  const achieved = performance?.wonByPartnerId?.[partner.id]?.[activeCode] ?? 0;
  const remaining = Math.max(0, annualTarget - achieved);
  const attainmentPct =
    annualTarget > 0 ? Math.round((achieved / annualTarget) * 100) : 0;

  const handleDraftsChange = (next: PartnerCurrencyTargetDraft[]) => {
    setDrafts(next);
    setActiveCurrencyId((prev) => {
      if (prev && next.some((row) => row.currencyId === prev)) return prev;
      return next[0]?.currencyId ?? '';
    });
  };

  const updateActiveDraftSessionTarget = (
    sessionId: string,
    amount: number,
  ) => {
    if (!activeDraft) return;
    handleDraftsChange(
      drafts.map((row) =>
        row.currencyId === activeDraft.currencyId
          ? patchSessionTarget(row, sessionId, amount)
          : row,
      ),
    );
  };

  const handleSave = async () => {
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
    }
  };

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

  if (!enabledCurrencies.length) {
    return (
      <Empty className="border border-dashed border-border">
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
    );
  }

  return (
    <div className="space-y-4">
      {drafts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ProfileKpiCard
            label="Annual target"
            value={formatMoneyInCurrency(annualTarget, activeCode)}
            hint={activeCode}
            icon={<Target size={18} />}
          />
          <ProfileKpiCard
            label="Achieved"
            value={formatMoneyInCurrency(achieved, activeCode)}
            hint={`${attainmentPct}% of target`}
            icon={<Wallet size={18} />}
          />
          <ProfileKpiCard
            label="Remaining"
            value={formatMoneyInCurrency(remaining, activeCode)}
            hint={`${drafts.length} currenc${drafts.length === 1 ? 'y' : 'ies'}`}
            icon={<TrendingUp size={18} />}
          />
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Currency targets"
          description={
            isVendorOnly
              ? 'Optional for vendors. Add up to one annual target per currency.'
              : 'Optional. Add up to one annual target per enabled currency.'
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {drafts.length > 0 ? (
                <Select
                  value={activeCurrencyId}
                  onValueChange={setActiveCurrencyId}
                >
                  <SelectTrigger
                    className={cn(FILTER_TRIGGER_CLASS, 'w-[120px]')}
                  >
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {drafts.map((row) => (
                      <SelectItem key={row.currencyId} value={row.currencyId}>
                        {row.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                onClick={() => void handleSave()}
                disabled={updatePartner.isLoading}
              >
                <Save size={14} className="mr-1.5" />
                {updatePartner.isLoading ? 'Saving…' : 'Save'}
              </Button>
            </div>
          }
        />

        <div className="space-y-4 p-4">
          <PartnerCurrencyTargetsEditor
            currencies={enabledCurrencies}
            value={drafts}
            onChange={handleDraftsChange}
            disabled={updatePartner.isLoading}
            optionalHint={
              isVendorOnly
                ? 'Optional for vendors. Leave empty or add a target for each currency.'
                : 'Optional. Add a target for each currency you want to track.'
            }
          />

          {activeDraft && sessions.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-border bg-surface-elevated/25 p-4">
              <div>
                <h4 className="m-0 text-[12px] font-semibold text-foreground">
                  Session targets ({activeCode})
                </h4>
                <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
                  Optional breakdown by fiscal year session for{' '}
                  {fiscalYear?.name ?? 'the active fiscal year'}.
                </p>
              </div>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="grid gap-2 rounded-md border border-border bg-surface-card p-3 sm:grid-cols-[minmax(0,1fr)_160px]"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-foreground">
                        {session.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {session.startDate} – {session.endDate}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={
                        sessionAmountForDraft(activeDraft, session.id) || ''
                      }
                      onChange={(e) =>
                        updateActiveDraftSessionTarget(
                          session.id,
                          e.target.value === ''
                            ? 0
                            : Number(e.target.value) || 0,
                        )
                      }
                      placeholder="0"
                      disabled={updatePartner.isLoading}
                      className="h-[31.5px] text-[12.25px] tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      {drafts.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>No targets configured</EmptyTitle>
            <EmptyDescription>
              Use Add currency target above when you are ready. Targets are not
              required{isVendorOnly ? ' for this partner' : ''}.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : null}
    </div>
  );
}
