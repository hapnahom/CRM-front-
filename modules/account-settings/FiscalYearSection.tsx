'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useGetActiveFiscalYears,
  useGetAllFiscalYears,
} from '@/store/server/features/organizationStructure/fiscalYear/queries';
import type { FiscalYear } from '@/store/server/features/organizationStructure/fiscalYear/interface';
import { isFiscalYearApiUnavailableError } from './fiscalYearApiAvailability';
import { FiscalYearSectionView } from './FiscalYearSectionView';
import {
  calendarToFiscalYearRow,
  getCurrentSessionFromCalendar,
  normalizeCalendarsResponse,
  type FiscalYearRow,
  type LeadQuarter,
} from './fiscalYearUtils';
import { AlertCircle } from 'lucide-react';

interface FiscalYearSectionProps {
  onSave: () => void;
}

function buildStateFromCalendars(
  calendars: FiscalYear[],
  activeFiscalYear?: FiscalYear | null,
) {
  const rows = calendars
    .filter((calendar) => calendar.id || calendar.name)
    .map(calendarToFiscalYearRow);
  const activeId =
    activeFiscalYear?.id ||
    calendars.find((calendar) => calendar.isActive)?.id ||
    rows[0]?.id ||
    '';

  return {
    rows,
    activeId,
    editingId: activeId || rows[0]?.id || '',
  };
}

export function FiscalYearSection({}: FiscalYearSectionProps) {
  const {
    data: allFiscalData,
    isLoading: isLoadingAll,
    isError: isListError,
    error: listError,
  } = useGetAllFiscalYears(50, 1);
  const {
    data: activeFiscalYear,
    isLoading: isLoadingActive,
    isError: isActiveError,
    error: activeError,
  } = useGetActiveFiscalYears();

  const calendars = useMemo(
    () => normalizeCalendarsResponse(allFiscalData),
    [allFiscalData],
  );

  const [fiscalYears, setFiscalYears] = useState<FiscalYearRow[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<string>('');
  const [editingCalendarId, setEditingCalendarId] = useState<string>('');

  useEffect(() => {
    if (isLoadingAll || isLoadingActive) return;

    const nextState = buildStateFromCalendars(calendars, activeFiscalYear);
    setFiscalYears(nextState.rows);
    setActiveCalendarId(nextState.activeId);
    setEditingCalendarId((current) =>
      nextState.rows.some((row) => row.id === current)
        ? current
        : nextState.editingId,
    );
  }, [calendars, activeFiscalYear, isLoadingAll, isLoadingActive]);

  const isApiUnavailable =
    !isLoadingAll &&
    !isLoadingActive &&
    (isListError || isActiveError) &&
    (isFiscalYearApiUnavailableError(listError) ||
      isFiscalYearApiUnavailableError(activeError));

  const activeCalendar = useMemo(
    () => calendars.find((calendar) => calendar.id === activeCalendarId),
    [calendars, activeCalendarId],
  );

  const activeRow = useMemo(
    () => fiscalYears.find((row) => row.id === activeCalendarId),
    [fiscalYears, activeCalendarId],
  );

  const currentSession = useMemo(
    () =>
      getCurrentSessionFromCalendar(
        activeCalendar ?? activeFiscalYear,
        activeRow?.quarterDefinitions,
      ),
    [activeCalendar, activeFiscalYear, activeRow],
  );

  const editingCurrentSessionQuarter = useMemo<LeadQuarter | null>(() => {
    if (editingCalendarId !== activeCalendarId || !currentSession) {
      return null;
    }
    return currentSession.quarter;
  }, [editingCalendarId, activeCalendarId, currentSession]);

  if (isApiUnavailable) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">
              Fiscal year service unavailable
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The organization calendar service is currently unavailable. Please
              contact your system administrator or try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FiscalYearSectionView
      fiscalYears={fiscalYears}
      activeCalendarId={activeCalendarId}
      editingCalendarId={editingCalendarId}
      currentSession={currentSession}
      editingCurrentSessionQuarter={editingCurrentSessionQuarter}
      isLoading={isLoadingAll || isLoadingActive}
      onSetCurrentFiscalYear={(calendarId) => {
        setActiveCalendarId(calendarId);
        setEditingCalendarId(calendarId);
      }}
      onSetEditingCalendarId={setEditingCalendarId}
      onUpdatePeriodLabel={(calendarId, q, periodLabel) => {
        setFiscalYears((current) =>
          current.map((row) =>
            row.id === calendarId
              ? {
                  ...row,
                  quarterDefinitions: row.quarterDefinitions.map(
                    (definition) =>
                      definition.q === q
                        ? { ...definition, periodLabel }
                        : definition,
                  ),
                }
              : row,
          ),
        );
      }}
    />
  );
}
