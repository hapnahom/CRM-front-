'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PARENT_CATEGORIES,
  applySelectedColumnsToReport,
  defaultColumnsForCategories,
  getCategory,
  getColumnsForCategories,
  getGroupByForCategories,
  getSortByForCategories,
} from './definitions';
import { describeCategories, isSameCategorySet } from './favorites';
import { createDefaultBuilderState } from './mock';
import { useReportPeriodLabel } from './period-label';
import type {
  FavoriteReport,
  GeneratedReport,
  ParentCategoryId,
  ReportBuilderState,
} from './types';
import { CategorySelector } from './components/CategorySelector';
import { CriteriaPanel } from './components/CriteriaPanel';
import { ReportSummary } from './components/ReportSummary';
import { ColumnSelector } from './components/ColumnSelector';
import { ScheduleReportModal } from './components/ScheduleReportModal';
import { ShareReportModal } from './components/ShareReportModal';
import { ReportResult } from './components/ReportResult';
import {
  useCreateReportFavorite,
  useCreateReportSchedule,
  useDeleteReportFavorite,
  useGenerateReport,
  useReportFavorites,
  useShareReport,
  toFavoriteReport,
} from '@/store/server/features/reports/queries';
import type { ApiFavorite } from '@/store/server/features/reports/api';

type MobileStep = 1 | 2 | 3;

function suggestedReportName(state: ReportBuilderState, periodLabel: string) {
  const cats = state.categories
    .map((id) => getCategory(id)?.shortName)
    .filter(Boolean);
  const scope =
    cats.length === PARENT_CATEGORIES.length || cats.length === 0
      ? 'All Categories'
      : cats.join(' + ');
  return [periodLabel, scope, 'Report'].filter(Boolean).join(' · ');
}

function syncGroupingForCategories(
  state: ReportBuilderState,
  categories: ParentCategoryId[],
): ReportBuilderState {
  const groupOptions = getGroupByForCategories(categories);
  const sortOptions = getSortByForCategories(categories);
  const columns = getColumnsForCategories(categories);
  const allowedGroupIds = new Set(groupOptions.map((o) => o.id));
  const allowedSortIds = new Set(sortOptions.map((o) => o.id));
  const allowedColIds = new Set(columns.map((c) => c.id));

  const groupBy = state.grouping.groupBy.filter((g) => allowedGroupIds.has(g));
  const sortBy = allowedSortIds.has(state.grouping.sortBy)
    ? state.grouping.sortBy
    : (sortOptions[0]?.id ?? 'pipelineValue');
  const prunedColumns = state.grouping.selectedColumns.filter((id) =>
    allowedColIds.has(id),
  );

  // Defaults only until the user has applied the Columns picker.
  // After clear+apply, keep the empty selection.
  const selectedColumns = state.grouping.columnsConfigured
    ? prunedColumns
    : defaultColumnsForCategories(categories);

  return {
    ...state,
    categories,
    grouping: {
      ...state.grouping,
      groupBy,
      sortBy,
      selectedColumns,
    },
  };
}

export function ReportBuilder() {
  const [state, setState] = useState<ReportBuilderState>(() =>
    createDefaultBuilderState(),
  );
  const [result, setResult] = useState<GeneratedReport | null>(null);
  const [mobileStep, setMobileStep] = useState<MobileStep>(1);
  const [activeFavoriteId, setActiveFavoriteId] = useState<string | null>(null);

  const [columnsOpen, setColumnsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const periodLabel = useReportPeriodLabel(state.criteria);
  const reportName = useMemo(
    () => suggestedReportName(state, periodLabel),
    [state, periodLabel],
  );

  const columns = useMemo(
    () => getColumnsForCategories(state.categories),
    [state.categories],
  );

  const favoritesQuery = useReportFavorites();
  const createFavorite = useCreateReportFavorite();
  const deleteFavorite = useDeleteReportFavorite();
  const generateMutation = useGenerateReport();
  const createSchedule = useCreateReportSchedule();
  const shareReport = useShareReport();

  const apiFavorites: ApiFavorite[] = favoritesQuery.data ?? [];
  const favorites: FavoriteReport[] = apiFavorites.map(toFavoriteReport);

  useEffect(() => {
    const match = favorites.find((f) =>
      isSameCategorySet(f.categories, state.categories),
    );
    setActiveFavoriteId(match?.id ?? null);
  }, [favorites, state.categories]);

  const setCategories = (categories: ParentCategoryId[]) => {
    setState((prev) => syncGroupingForCategories(prev, categories));
  };

  const applyFavorite = (favorite: FavoriteReport) => {
    const full = apiFavorites.find((f) => f.id === favorite.id);
    setActiveFavoriteId(favorite.id);
    if (full?.criteria || full?.grouping) {
      setState((prev) => {
        let next = syncGroupingForCategories(prev, favorite.categories);
        if (full.criteria) {
          next = { ...next, criteria: { ...next.criteria, ...full.criteria } };
        }
        if (full.grouping) {
          next = {
            ...next,
            grouping: {
              ...next.grouping,
              ...full.grouping,
              columnsConfigured: true,
            },
          };
        }
        return next;
      });
    } else {
      setState((prev) => syncGroupingForCategories(prev, favorite.categories));
    }
    toast.success(`Applied ${describeCategories(favorite.categories)}`);
  };

  const handleToggleFavorite = async () => {
    if (state.categories.length === 0) {
      toast.error('Select at least one category to favorite');
      return;
    }

    const existing = apiFavorites.find((f) =>
      isSameCategorySet(f.categories, state.categories),
    );

    try {
      if (existing) {
        await deleteFavorite.mutateAsync(existing.id);
        toast.message('Removed from favorites');
        return;
      }

      await createFavorite.mutateAsync({
        name: describeCategories(state.categories),
        categories: state.categories,
        criteria: state.criteria,
        grouping: state.grouping,
      });
      toast.success(`Saved ${describeCategories(state.categories)}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not update favorite';
      toast.error(message);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      await deleteFavorite.mutateAsync(id);
      if (activeFavoriteId === id) setActiveFavoriteId(null);
      toast.message('Favorite removed');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not remove favorite';
      toast.error(message);
    }
  };

  const clearAll = () => {
    setState(createDefaultBuilderState());
  };

  const generate = async () => {
    if (state.categories.length === 0) {
      toast.error('Select at least one report category');
      return;
    }
    if (state.grouping.selectedColumns.length === 0) {
      toast.error('Select at least one column before generating');
      return;
    }
    try {
      const generated = await generateMutation.mutateAsync({
        state,
        name: reportName,
        periodLabel,
      });
      setResult(
        applySelectedColumnsToReport(generated, state.grouping.selectedColumns),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate report';
      toast.error(message);
    }
  };

  const handleScheduleSave = async (payload: {
    frequency: string;
    format: string;
    recipients: string;
    date: string;
    time: string;
  }) => {
    if (state.categories.length === 0) {
      toast.error('Select at least one report category before scheduling');
      return;
    }
    if (state.grouping.selectedColumns.length === 0) {
      toast.error('Select at least one column before scheduling');
      return;
    }
    if (!payload.date) {
      toast.error('Select a start date for the schedule');
      return;
    }
    if (!payload.recipients.trim()) {
      toast.error('Add at least one recipient email');
      return;
    }
    try {
      await createSchedule.mutateAsync({
        name: reportName,
        config: {
          name: reportName,
          categories: state.categories,
          criteria: state.criteria,
          grouping: state.grouping,
        },
        frequency: payload.frequency,
        format: payload.format,
        recipients: payload.recipients,
        startDate: payload.date,
        time: payload.time || '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
      toast.success(
        'Schedule saved — delivery runs at the selected time (or immediately if already due)',
      );
      setScheduleOpen(false);
    } catch (error: unknown) {
      const axiosMsg = (
        error as { response?: { data?: { message?: unknown } } }
      )?.response?.data?.message;
      const message = Array.isArray(axiosMsg)
        ? axiosMsg.join(', ')
        : typeof axiosMsg === 'string'
          ? axiosMsg
          : error instanceof Error
            ? error.message
            : 'Failed to save schedule';
      toast.error(message);
    }
  };

  const handleShare = async (payload: {
    formats: Array<'excel' | 'pdf'>;
    recipients: string;
  }) => {
    if (state.categories.length === 0) {
      toast.error('Select at least one report category before sharing');
      return;
    }
    if (state.grouping.selectedColumns.length === 0) {
      toast.error('Select at least one column before sharing');
      return;
    }
    if (!payload.formats.length) {
      toast.error('Select Excel, PDF, or both');
      return;
    }
    if (!payload.recipients.trim()) {
      toast.error('Add at least one recipient email');
      return;
    }
    try {
      await shareReport.mutateAsync({
        name: reportName,
        categories: state.categories,
        criteria: state.criteria,
        grouping: state.grouping,
        formats: payload.formats,
        recipients: payload.recipients,
      });
      toast.success('Report emailed to recipients');
      setShareOpen(false);
    } catch (error: unknown) {
      const axiosMsg = (
        error as { response?: { data?: { message?: unknown } } }
      )?.response?.data?.message;
      const message = Array.isArray(axiosMsg)
        ? axiosMsg.join(', ')
        : typeof axiosMsg === 'string'
          ? axiosMsg
          : error instanceof Error
            ? error.message
            : 'Failed to share report';
      toast.error(message);
    }
  };

  if (result) {
    return (
      <>
        <ReportResult
          report={result}
          onBack={() => setResult(null)}
          onShare={() => setShareOpen(true)}
          onSchedule={() => setScheduleOpen(true)}
        />
        <ShareReportModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          reportName={result.name}
          sending={shareReport.isLoading}
          onShare={handleShare}
        />
        <ScheduleReportModal
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          reportName={result.name}
          categoryLabel={describeCategories(result.categories)}
          saving={createSchedule.isLoading}
          onSave={handleScheduleSave}
        />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-[#e5e7eb] bg-white px-4 py-3 sm:px-6">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">
                Reports
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-[#e5e7eb] text-[12px]"
                onClick={() => {
                  if (state.categories.length === 0) {
                    toast.error('Select at least one report category first');
                    return;
                  }
                  if (state.grouping.selectedColumns.length === 0) {
                    toast.error('Select at least one column first');
                    return;
                  }
                  setScheduleOpen(true);
                }}
              >
                <CalendarClock size={14} />
                Schedule Report
              </Button>
              {state.grouping.selectedColumns.length > 0 ? (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-brand px-4 text-[12px] font-semibold text-white hover:bg-brand-hover"
                  onClick={generate}
                  disabled={generateMutation.isLoading}
                >
                  <Play size={14} fill="currentColor" />
                  {generateMutation.isLoading
                    ? 'Generating…'
                    : 'Generate Report'}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex gap-1 xl:hidden">
            {(
              [
                [1, 'Category'],
                [2, 'Criteria'],
                [3, 'Summary'],
              ] as const
            ).map(([step, label]) => (
              <button
                key={step}
                type="button"
                onClick={() => setMobileStep(step)}
                className={cn(
                  'flex-1 rounded-md px-1 py-1.5 text-[10px] font-semibold',
                  mobileStep === step
                    ? 'bg-brand text-white'
                    : 'bg-[#f3f4f6] text-[#6b7280]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3 sm:p-4">
          <div className="hidden min-h-0 flex-1 gap-3 xl:grid xl:grid-cols-[minmax(260px,0.9fr)_minmax(360px,1.2fr)_minmax(360px,1.2fr)]">
            <div className="min-h-0">
              <CategorySelector
                selected={state.categories}
                onChange={setCategories}
                favorites={favorites}
                activeFavoriteId={activeFavoriteId}
                onFavoriteSelect={applyFavorite}
                onToggleFavorite={handleToggleFavorite}
                onRemoveFavorite={removeFavorite}
              />
            </div>
            <div className="min-h-0">
              <CriteriaPanel
                categories={state.categories}
                value={state.criteria}
                onChange={(criteria) =>
                  setState((prev) => ({ ...prev, criteria }))
                }
                grouping={state.grouping}
                onGroupingChange={(grouping) =>
                  setState((prev) => ({ ...prev, grouping }))
                }
                onOpenColumns={() => setColumnsOpen(true)}
              />
            </div>
            <div className="min-h-0">
              <ReportSummary state={state} reportName={reportName} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto xl:hidden">
            {mobileStep === 1 ? (
              <CategorySelector
                selected={state.categories}
                onChange={setCategories}
                favorites={favorites}
                activeFavoriteId={activeFavoriteId}
                onFavoriteSelect={applyFavorite}
                onToggleFavorite={handleToggleFavorite}
                onRemoveFavorite={removeFavorite}
              />
            ) : null}
            {mobileStep === 2 ? (
              <CriteriaPanel
                categories={state.categories}
                value={state.criteria}
                onChange={(criteria) =>
                  setState((prev) => ({ ...prev, criteria }))
                }
                grouping={state.grouping}
                onGroupingChange={(grouping) =>
                  setState((prev) => ({ ...prev, grouping }))
                }
                onOpenColumns={() => setColumnsOpen(true)}
              />
            ) : null}
            {mobileStep === 3 ? (
              <ReportSummary state={state} reportName={reportName} />
            ) : null}
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#e5e7eb] bg-white px-4 py-3 sm:px-6">
        <div className="flex w-full items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-[#e5e7eb] text-[12px]"
            onClick={clearAll}
          >
            <Trash2 size={14} />
            Reset to defaults
          </Button>
        </div>
      </footer>

      <ColumnSelector
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        categories={state.categories}
        columns={columns}
        selected={state.grouping.selectedColumns}
        columnsConfigured={state.grouping.columnsConfigured}
        onSave={(selectedColumns) =>
          setState((prev) => ({
            ...prev,
            grouping: {
              ...prev.grouping,
              selectedColumns,
              columnsConfigured: true,
            },
          }))
        }
      />
      <ScheduleReportModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        reportName={reportName}
        categoryLabel={describeCategories(state.categories)}
        saving={createSchedule.isLoading}
        onSave={handleScheduleSave}
      />
      <ShareReportModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        reportName={reportName}
        sending={shareReport.isLoading}
        onShare={handleShare}
      />
    </div>
  );
}
