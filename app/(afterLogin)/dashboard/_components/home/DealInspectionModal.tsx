'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { HomeTopCustomer } from './types';
import { dealStageBadgeClass, formatMoney, probabilityBarColor } from './utils';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';

interface DealInspectionModalProps {
  customer: HomeTopCustomer | null;
  currency: string;
  onClose: () => void;
}

export const DealInspectionModal: React.FC<DealInspectionModalProps> = ({
  customer,
  currency,
  onClose,
}) => {
  if (!customer) return null;

  const deals = customer.deals ?? [];
  const dealLabelPlural = dealUiLabel({ plural: true });
  const dealLabelPluralLower = dealUiLabel({ plural: true, lowercase: true });
  const showLeads = isLeadsEnabled();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-white"
              style={{ background: customer.avatarColor || '#ed6925' }}
            >
              {customer.initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">
                {customer.name}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {[customer.industry, customer.location]
                  .filter(Boolean)
                  .join(' · ')}
                {deals.length
                  ? ` · ${deals.length} Registered ${dealLabelPlural}`
                  : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div
            className={cn(
              'grid gap-3',
              showLeads
                ? 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3',
            )}
          >
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Combined Value
              </span>
              <p className="mt-1 text-base font-extrabold text-brand">
                {formatMoney(customer.totalCombinedValue, currency)}
              </p>
            </div>
            {showLeads ? (
              <div className="rounded-xl border border-border bg-surface-elevated p-3">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Active Leads
                </span>
                <p className="mt-1 text-base font-extrabold text-foreground">
                  {customer.leadsCount}
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Registered {dealLabelPlural}
              </span>
              <p className="mt-1 text-base font-extrabold text-emerald-600">
                {customer.dealsCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Account Owner
              </span>
              <p className="mt-1 text-xs font-bold text-foreground">
                {customer.owner}
              </p>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Registered {dealLabelPlural} & {dealUiLabel()} Numbers
          </h3>

          {deals.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-elevated p-4 text-center text-xs text-muted-foreground">
              No registered {dealLabelPluralLower} for this account.
            </p>
          ) : (
            <div className="space-y-3">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="rounded-xl border border-border bg-white p-4 transition-all hover:border-brand-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                        {deal.dealNumber}
                      </span>
                      <h4 className="truncate text-sm font-bold text-foreground">
                        {deal.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-extrabold text-foreground">
                        {formatMoney(deal.value, currency)}
                      </strong>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10.5px] font-bold',
                          dealStageBadgeClass(deal.stage),
                        )}
                      >
                        {deal.stage}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-surface-elevated p-2.5 text-xs sm:grid-cols-4">
                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Solution
                      </span>
                      <strong className="font-medium text-foreground">
                        {deal.solutionCategory || '—'}
                      </strong>
                    </div>
                    {showLeads ? (
                      <div>
                        <span className="block text-[10px] text-muted-foreground">
                          Lead Team
                        </span>
                        <strong className="font-medium text-foreground">
                          {deal.leadTeam || '—'}
                        </strong>
                      </div>
                    ) : null}
                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Win Probability
                      </span>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, deal.probability))}%`,
                              backgroundColor: probabilityBarColor(
                                deal.probability,
                              ),
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-foreground">
                          {Math.round(deal.probability)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Expected Close
                      </span>
                      <strong className="font-medium text-foreground">
                        {deal.expectedCloseDate || '—'}
                      </strong>
                    </div>
                  </div>

                  {deal.notes ? (
                    <p className="mt-2 rounded border border-border bg-surface-elevated p-2 text-[11.5px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Scope:
                      </span>{' '}
                      {deal.notes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-border bg-surface-elevated px-6 py-3">
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
