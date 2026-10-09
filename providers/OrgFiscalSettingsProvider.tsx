'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGetActiveFiscalYears } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { useGetFiscalSessions } from '@/store/server/features/salesTargeting/queries';
import {
  calendarToFiscalYearRow,
  type FiscalQuarterDefinition,
} from '@/modules/account-settings/fiscalYearUtils';
import type { FiscalYear } from '@/store/server/features/organizationStructure/fiscalYear/interface';
import type {
  OrgFiscalCalendar,
  OrgFiscalSession,
} from '@/store/server/features/salesTargeting/types';
import {
  fiscalYearToOrgCalendar,
  formatOrgFiscalYearLabel,
  resolveActiveOrgSession,
  resolveActiveOrgSessionId,
} from '@/lib/orgFiscalSettings';

export type OrgFiscalSettingsValue = {
  isLoading: boolean;
  isError: boolean;
  /** Active fiscal calendar from Account Settings / org-structure. */
  fiscalCalendar: OrgFiscalCalendar | null;
  /** Raw org-structure payload (Settings parity). */
  activeFiscalYear: FiscalYear | null;
  sessions: OrgFiscalSession[];
  quarterDefinitions: FiscalQuarterDefinition[];
  activeSession: OrgFiscalSession | null;
  activeSessionId: string | null;
  fiscalYearLabel: string;
  refetch: () => void;
};

const OrgFiscalSettingsContext = createContext<OrgFiscalSettingsValue | null>(
  null,
);

export function OrgFiscalSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    data: activeFiscalYear,
    isLoading,
    isError,
    refetch,
  } = useGetActiveFiscalYears();

  const calendarId = activeFiscalYear?.id?.trim() ?? '';
  const { data: sessionsFromApi = [], isLoading: sessionsLoading } =
    useGetFiscalSessions(calendarId || undefined);

  const fiscalCalendar = useMemo((): OrgFiscalCalendar | null => {
    if (!activeFiscalYear) return null;
    const base = fiscalYearToOrgCalendar(activeFiscalYear);
    const embedded = base.sessions ?? [];
    const sessions =
      embedded.length > 0
        ? embedded
        : sessionsFromApi.filter(
            (session) => session.calendarId === calendarId,
          );
    return { ...base, sessions };
  }, [activeFiscalYear, sessionsFromApi, calendarId]);

  const quarterDefinitions = useMemo(() => {
    if (!activeFiscalYear) return [];
    return calendarToFiscalYearRow(activeFiscalYear).quarterDefinitions;
  }, [activeFiscalYear]);

  const sessions = fiscalCalendar?.sessions ?? [];

  const activeSessionId = useMemo(
    () => resolveActiveOrgSessionId(fiscalCalendar),
    [fiscalCalendar],
  );

  const activeSession = useMemo(
    () => resolveActiveOrgSession(fiscalCalendar),
    [fiscalCalendar],
  );

  const fiscalYearLabel = useMemo(
    () => formatOrgFiscalYearLabel(fiscalCalendar),
    [fiscalCalendar],
  );

  const value = useMemo(
    (): OrgFiscalSettingsValue => ({
      isLoading: isLoading || (Boolean(calendarId) && sessionsLoading),
      isError,
      fiscalCalendar,
      activeFiscalYear: activeFiscalYear ?? null,
      sessions,
      quarterDefinitions,
      activeSession,
      activeSessionId,
      fiscalYearLabel,
      refetch,
    }),
    [
      isLoading,
      sessionsLoading,
      calendarId,
      isError,
      fiscalCalendar,
      activeFiscalYear,
      sessions,
      quarterDefinitions,
      activeSession,
      activeSessionId,
      fiscalYearLabel,
      refetch,
    ],
  );

  return (
    <OrgFiscalSettingsContext.Provider value={value}>
      {children}
    </OrgFiscalSettingsContext.Provider>
  );
}

export function useOrgFiscalSettings(): OrgFiscalSettingsValue {
  const ctx = useContext(OrgFiscalSettingsContext);
  if (!ctx) {
    throw new Error(
      'useOrgFiscalSettings must be used within OrgFiscalSettingsProvider',
    );
  }
  return ctx;
}

/** Safe outside provider — returns null context fields (legacy call sites). */
export function useOrgFiscalSettingsOptional(): OrgFiscalSettingsValue | null {
  return useContext(OrgFiscalSettingsContext);
}
