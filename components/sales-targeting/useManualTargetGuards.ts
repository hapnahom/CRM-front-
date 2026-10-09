'use client';

import { useCallback, useMemo } from 'react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { isRequestWorkflowMethod } from '@/components/sales-targeting/targetSettingMethod';
import {
  buildDepartmentNameById,
  buildTeamNameById,
  getTargetBlockReason,
} from '@/components/sales-targeting/targetSettingGuards';
import { resolveTargetCurrencyId } from '@/components/sales-targeting/targetCurrencyUtils';
export function useTargetSettingGuards(sessionId?: string | null) {
  const {
    plan,
    salesTeams,
    activePlanCurrency,
    activeCurrencyCode,
    orgTargetSettingMethod,
    bottomUpProposerBlockedReason,
  } = useSalesTargeting();

  // Bottom-to-Top / Hybrid start from teams — skip company-first TTB gates.
  const skipTopDownPrerequisites = isRequestWorkflowMethod(
    orgTargetSettingMethod,
  );

  const baseInput = useMemo(
    () => ({
      plan,
      planCurrencyId: activePlanCurrency?.id ?? '',
      currencyId: resolveTargetCurrencyId(
        plan,
        activePlanCurrency?.id ?? '',
        activePlanCurrency?.currencyId,
      ),
      currencyLabel: activeCurrencyCode?.trim() || undefined,
      salesTeams,
      departmentNameById: buildDepartmentNameById(salesTeams),
      teamNameById: buildTeamNameById(salesTeams),
      sessionId: sessionId ?? null,
    }),
    [
      plan,
      activePlanCurrency?.id,
      activePlanCurrency?.currencyId,
      activeCurrencyCode,
      salesTeams,
      sessionId,
    ],
  );

  const departmentAnnualReason = useCallback(
    (departmentId: string) =>
      skipTopDownPrerequisites
        ? null
        : getTargetBlockReason({
            ...baseInput,
            level: 'department',
            horizon: 'annual',
            orgUnitId: departmentId,
          }),
    [baseInput, skipTopDownPrerequisites],
  );

  const departmentSessionReason = useCallback(
    (departmentId: string) =>
      skipTopDownPrerequisites
        ? null
        : getTargetBlockReason({
            ...baseInput,
            level: 'department',
            horizon: 'session',
            orgUnitId: departmentId,
          }),
    [baseInput, skipTopDownPrerequisites],
  );

  const teamAnnualReason = useCallback(
    (teamId: string) => {
      if (skipTopDownPrerequisites) {
        return bottomUpProposerBlockedReason(teamId);
      }
      return getTargetBlockReason({
        ...baseInput,
        level: 'team',
        horizon: 'annual',
        orgUnitId: teamId,
      });
    },
    [baseInput, skipTopDownPrerequisites, bottomUpProposerBlockedReason],
  );

  const teamSessionReason = useCallback(
    (teamId: string) => {
      if (skipTopDownPrerequisites) {
        return bottomUpProposerBlockedReason(teamId);
      }
      return getTargetBlockReason({
        ...baseInput,
        level: 'team',
        horizon: 'session',
        orgUnitId: teamId,
      });
    },
    [baseInput, skipTopDownPrerequisites, bottomUpProposerBlockedReason],
  );

  const personSessionReason = useCallback(
    (teamId: string, userId: string) => {
      if (skipTopDownPrerequisites) {
        // Main-department rules apply to team bottom-up proposals, not member Detail modals.
        void teamId;
        void userId;
        return null;
      }
      return getTargetBlockReason({
        ...baseInput,
        level: 'person',
        horizon: 'session',
        orgUnitId: teamId,
        userId,
      });
    },
    [baseInput, skipTopDownPrerequisites, bottomUpProposerBlockedReason],
  );

  return {
    departmentAnnualReason,
    departmentSessionReason,
    teamAnnualReason,
    teamSessionReason,
    personSessionReason,
  };
}

/** @deprecated Use useTargetSettingGuards */
export const useManualTargetGuards = useTargetSettingGuards;
