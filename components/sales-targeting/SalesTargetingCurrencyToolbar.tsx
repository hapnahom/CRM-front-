'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { CurrencyToolbar } from '@/components/sales-targeting/shared';
import { formatMoneyInCurrency } from '@/components/sales-targeting/targetingUtils';
import {
  getCurrencyCode,
  getPlanCurrencyRemovalImpact,
} from '@/store/server/features/salesTargeting/mappers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TargetModuleContextLabel } from '@/components/sales-targeting/TargetModuleContextLabel';

export function SalesTargetingCurrencyToolbar({
  leading,
  periodSegment,
  showModuleContext = true,
  variant = 'bar',
}: {
  leading?: ReactNode;
  /** Periods tab: session name appended after FY (method comes from Settings). */
  periodSegment?: string;
  /** Show read-only `{Method} · {FY}` beside the currency control. */
  showModuleContext?: boolean;
  /** `inline` for the shell tab row (desktop); `bar` for section toolbars. */
  variant?: 'bar' | 'inline';
}) {
  const {
    plan,
    planCurrencies,
    currencyOptions,
    activeCurrencyId,
    activeCurrencyCode,
    setActiveCurrencyId,
    availableCurrencyCodes,
    isPlanEditable,
    canManageCompany,
    addPlanCurrency,
    removePlanCurrency,
  } = useSalesTargeting();

  const [currencyToRemove, setCurrencyToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const removalImpact = useMemo(() => {
    if (!currencyToRemove) return null;
    const target = planCurrencies.find(
      (entry) => getCurrencyCode(entry) === currencyToRemove,
    );
    if (!target) return null;
    return getPlanCurrencyRemovalImpact(plan, target.id, currencyToRemove);
  }, [currencyToRemove, plan, planCurrencies]);

  const canConfigureCurrencies = canManageCompany && isPlanEditable;

  /**
   * Same rule as the old "Remove {code}" button:
   * show X only when this currency has no configured data yet
   * (company annual = 0, and no team/period allocations).
   * Backend still allows delete with data (it cascades), but the UI
   * only exposes remove for empty currencies.
   */
  const canRemoveCurrency = useCallback(
    (currencyCode: string) => {
      if (!canConfigureCurrencies || currencyOptions.length <= 1) return false;
      const target = planCurrencies.find(
        (entry) => getCurrencyCode(entry) === currencyCode,
      );
      if (!target) return false;
      const impact = getPlanCurrencyRemovalImpact(
        plan,
        target.id,
        currencyCode,
      );
      return !impact.hasConfiguredTargets;
    },
    [canConfigureCurrencies, currencyOptions.length, plan, planCurrencies],
  );

  const handleRequestRemove = useCallback((currencyCode: string) => {
    setCurrencyToRemove(currencyCode);
  }, []);

  const handleConfirmRemove = async () => {
    if (!currencyToRemove) return;
    setIsRemoving(true);
    try {
      await removePlanCurrency(currencyToRemove);
      setCurrencyToRemove(null);
    } catch {
      // removePlanCurrency already surfaces errors
    } finally {
      setIsRemoving(false);
    }
  };

  const moduleContext =
    showModuleContext && !leading ? (
      <TargetModuleContextLabel periodSegment={periodSegment} />
    ) : null;
  const toolbarLeading = leading ?? moduleContext;
  const mobileLeadingOnly =
    variant === 'bar' && Boolean(moduleContext) && !leading;

  return (
    <>
      <CurrencyToolbar
        variant={variant}
        mobileLeadingOnly={mobileLeadingOnly}
        currencyOptions={currencyOptions}
        activeCurrencyId={activeCurrencyId}
        activeCurrencyLabel={activeCurrencyCode}
        onSelectCurrencyId={setActiveCurrencyId}
        onAddCurrency={canConfigureCurrencies ? addPlanCurrency : undefined}
        onRemoveCurrency={
          canConfigureCurrencies ? handleRequestRemove : undefined
        }
        canRemoveCurrency={canRemoveCurrency}
        availableToAdd={availableCurrencyCodes}
        configureCurrencies={canConfigureCurrencies}
        leading={toolbarLeading}
      />

      <AlertDialog
        open={currencyToRemove != null}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setCurrencyToRemove(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {currencyToRemove ?? 'currency'}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {removalImpact?.hasConfiguredTargets ? (
                  <>
                    <p>
                      This currency has configured targets on the current fiscal
                      year plan. Removing it will permanently delete all related
                      data below.
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-foreground">
                      {removalImpact.companyAnnualTarget > 0 ? (
                        <li>
                          Company annual target:{' '}
                          {formatMoneyInCurrency(
                            removalImpact.companyAnnualTarget,
                            removalImpact.currencyCode,
                          )}
                        </li>
                      ) : null}
                      {removalImpact.teamAnnualAllocationCount > 0 ? (
                        <li>
                          {removalImpact.teamAnnualAllocationCount} team annual
                          target
                          {removalImpact.teamAnnualAllocationCount === 1
                            ? ''
                            : 's'}
                        </li>
                      ) : null}
                      {removalImpact.sessionAllocationCount > 0 ? (
                        <li>
                          {removalImpact.sessionAllocationCount} period target
                          {removalImpact.sessionAllocationCount === 1
                            ? ''
                            : 's'}
                        </li>
                      ) : null}
                    </ul>
                    <p className="font-medium text-error">
                      This action cannot be undone.
                    </p>
                  </>
                ) : removalImpact?.isPersisted ? (
                  <p>
                    No targets have been configured for {currencyToRemove} yet.
                    It will be removed from this plan.
                  </p>
                ) : (
                  <p>
                    {currencyToRemove} will be removed from the currency list
                    for this plan setup.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRemove();
              }}
            >
              {isRemoving ? 'Removing...' : 'Remove currency'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
