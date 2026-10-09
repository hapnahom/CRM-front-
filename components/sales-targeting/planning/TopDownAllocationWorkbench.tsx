'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import {
  AllocationLinesEditor,
  type AllocationLineDraft,
} from '@/components/sales-targeting/planning/AllocationLinesEditor';
import { useGetAllocationSuggestions } from '@/store/server/features/salesTargeting/queries';
import {
  useDistributeTeamAnnualTargets,
  useUpsertTeamAnnualTargets,
} from '@/store/server/features/salesTargeting/mutations';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AllocationWorkbenchSkeleton } from '@/components/sales-targeting/ui-kit';
import type { SalesTargetLevel } from '@/store/server/features/salesTargeting/types';
import { canEditCompanyTargets } from '@/utils/dataScope';

type ScopeOption = {
  scopeLevel: SalesTargetLevel;
  orgUnitId: string | null;
  label: string;
};

function lineKey(line: {
  childScopeLevel: string;
  childOrgUnitId: string | null;
  userId: string | null;
}): string {
  return `${line.childScopeLevel}:${line.childOrgUnitId ?? 'none'}:${line.userId ?? 'none'}`;
}

export function TopDownAllocationWorkbench() {
  const {
    plan,
    selectedPlanId,
    activePlanCurrency,
    activeCurrencyCode,
    salesTeams,
  } = useSalesTargeting();

  const planId = selectedPlanId ?? plan?.id;
  const currencyId = activePlanCurrency?.currencyId;
  const planCurrencyId = activePlanCurrency?.id;

  const scopeOptions = useMemo((): ScopeOption[] => {
    const options: ScopeOption[] = [];
    if (canEditCompanyTargets()) {
      options.push({
        scopeLevel: 'company',
        orgUnitId: null,
        label: 'Company → teams',
      });
    }
    const deptNames = new Map<string, string>();
    for (const team of salesTeams) {
      if (team.parentDepartmentId && team.parentDepartmentName) {
        deptNames.set(team.parentDepartmentId, team.parentDepartmentName);
      }
    }
    for (const [deptId, deptName] of deptNames) {
      options.push({
        scopeLevel: 'department',
        orgUnitId: deptId,
        label: `${deptName} → teams`,
      });
    }
    return options;
  }, [salesTeams]);

  const [scopeIndex, setScopeIndex] = useState(0);
  const activeScope = scopeOptions[scopeIndex] ?? scopeOptions[0];

  const scopeParams = useMemo(
    () =>
      activeScope
        ? {
            currencyId: currencyId ?? '',
            horizon: 'annual' as const,
            sessionId: null as string | null,
            scopeLevel: activeScope.scopeLevel,
            orgUnitId: activeScope.orgUnitId,
          }
        : undefined,
    [activeScope, currencyId],
  );

  const { data: suggestions, isLoading } = useGetAllocationSuggestions(
    planId,
    scopeParams,
    Boolean(planId && currencyId && activeScope),
  );

  const [lines, setLines] = useState<AllocationLineDraft[]>([]);

  useEffect(() => {
    if (!suggestions) return;
    setLines(
      suggestions.lines.map((line) => ({
        key: lineKey(line),
        label: line.label,
        forecastValue: line.forecastValue,
        suggestedAmount: line.suggestedAmount,
        amount: line.scaledAmount,
        childScopeLevel: line.childScopeLevel,
        childOrgUnitId: line.childOrgUnitId,
        userId: line.userId,
      })),
    );
  }, [suggestions]);

  const distributeMutation = useDistributeTeamAnnualTargets();
  const upsertMutation = useUpsertTeamAnnualTargets();

  const applySuggestions = useCallback(() => {
    if (!suggestions) return;
    setLines(
      suggestions.lines.map((line) => ({
        key: lineKey(line),
        label: line.label,
        forecastValue: line.forecastValue,
        suggestedAmount: line.suggestedAmount,
        amount: line.scaledAmount,
        childScopeLevel: line.childScopeLevel,
        childOrgUnitId: line.childOrgUnitId,
        userId: line.userId,
      })),
    );
  }, [suggestions]);

  const onChangeAmount = useCallback((key: string, amount: number) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, amount } : line)),
    );
  }, []);

  const requiredAmount = suggestions?.requiredAmount ?? 0;
  const allocated = lines.reduce(
    (sum, line) => sum + Number(line.amount || 0),
    0,
  );
  const isBalanced = Math.abs(allocated - requiredAmount) < 0.01;

  const handleSave = async () => {
    if (!planId || !planCurrencyId || !isBalanced || !activeScope) return;

    try {
      if (activeScope.scopeLevel === 'company') {
        const teamLines = lines.filter(
          (line) => line.childScopeLevel === 'team',
        );
        await distributeMutation.mutateAsync({
          planId,
          allocations: teamLines.map((line) => ({
            planCurrencyId,
            orgDepartmentId: line.childOrgUnitId!,
            amount: line.amount,
          })),
        });
      } else {
        await upsertMutation.mutateAsync({
          planId,
          allocations: lines
            .filter((line) => line.childScopeLevel === 'team')
            .map((line) => ({
              planCurrencyId,
              orgDepartmentId: line.childOrgUnitId!,
              amount: line.amount,
            })),
        });
      }
      NotificationMessage.success({
        message: 'Allocations saved',
        description: 'Forecast-based targets were applied to the plan.',
      });
    } catch {
      NotificationMessage.error({
        message: 'Save failed',
        description:
          'Could not save allocations. Check balance and permissions.',
      });
    }
  };

  if (!planId || !currencyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a plan and currency to allocate targets.
      </p>
    );
  }

  if (isLoading) {
    return <AllocationWorkbenchSkeleton />;
  }

  if (!suggestions) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to load allocation suggestions.
      </p>
    );
  }

  if (suggestions.requiredAmount <= 0 && activeScope.scopeLevel !== 'company') {
    return (
      <p className="text-sm text-muted-foreground">
        No parent target is set for {suggestions.scopeName} yet. Allocate the
        parent scope first, then return here to distribute to teams.
      </p>
    );
  }

  const saving = distributeMutation.isLoading || upsertMutation.isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {suggestions.scopeName}
            </h3>
            <Badge variant="outline">Top to Bottom</Badge>
            {suggestions.scaleFactor !== 1 ? (
              <Badge variant="secondary">
                Scale {suggestions.scaleFactor.toFixed(2)}×
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Forecast rollups scaled to the required target for this scope.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={String(scopeIndex)}
            onChange={(event) => setScopeIndex(Number(event.target.value))}
            className="h-9 rounded-md border border-border bg-surface-card px-3 text-[12px]"
          >
            {scopeOptions.map((option, index) => (
              <option
                key={`${option.scopeLevel}:${option.orgUnitId ?? 'company'}`}
                value={index}
              >
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applySuggestions}
          >
            <Sparkles size={14} className="mr-1.5" />
            Apply suggestions
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isBalanced || saving || !lines.length}
            onClick={handleSave}
          >
            Save allocations
          </Button>
        </div>
      </div>

      <AllocationLinesEditor
        currencyCode={activeCurrencyCode}
        requiredAmount={requiredAmount}
        lines={lines}
        onChangeAmount={onChangeAmount}
      />
    </div>
  );
}
