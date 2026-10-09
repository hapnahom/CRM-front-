'use client';

import { FileText, Info } from 'lucide-react';
import {
  FILTER_FIELDS,
  PARENT_CATEGORIES,
  getAvailableReportTypes,
  getCategory,
  getGroupByLabel,
  getSortByLabel,
} from '../definitions';
import { useReportPeriodLabel } from '../period-label';
import type { FilterFieldId, ReportBuilderState } from '../types';
import { PanelCard, PanelHeader } from './ui-bits';
import { useReportFilterOptions } from '@/store/server/features/reports/queries';
import { formatMultiFilterLabels } from '../filter-labels';

type ReportSummaryProps = {
  state: ReportBuilderState;
  reportName: string;
};

export function ReportSummary({ state, reportName }: ReportSummaryProps) {
  const available = getAvailableReportTypes(state.categories);
  const selectedSet = new Set(state.grouping.selectedColumns);
  const sections = available.filter((type) =>
    type.columns.some((col) => selectedSet.has(col.id)),
  );
  const periodLabel = useReportPeriodLabel(state.criteria);
  const { data: liveFilterOptions } = useReportFilterOptions();

  const categoryLabels =
    state.categories.length === PARENT_CATEGORIES.length
      ? 'All categories'
      : state.categories
          .map((id) => getCategory(id)?.shortName)
          .filter(Boolean)
          .join(' + ') || '—';

  const periodType =
    state.criteria.periodMode === 'fiscal' ? 'Fiscal period' : 'Date range';

  const grouping =
    state.grouping.groupBy.length > 0
      ? state.grouping.groupBy.map(getGroupByLabel).join(' → ')
      : 'None';

  const sorting = `${getSortByLabel(state.grouping.sortBy)} (${
    state.grouping.sortOrder === 'desc' ? 'Desc' : 'Asc'
  })`;

  const columnCount = state.grouping.selectedColumns.length;

  const rows: { label: string; value: string }[] = [
    { label: 'Report name', value: reportName },
    { label: 'Categories', value: categoryLabels },
    { label: 'Sections', value: String(sections.length) },
    { label: periodType, value: periodLabel },
  ];

  const extraFields: FilterFieldId[] = [
    'department',
    'team',
    'owner',
    'status',
    'customer',
    'vendor',
    'implementationPartner',
    'vector',
    'campaign',
    'solution',
    'dealStage',
    'marketingChannel',
    'campaignType',
    'probability',
    'dealStatus',
  ];
  for (const fieldId of extraFields) {
    const labels = formatMultiFilterLabels(state, fieldId, liveFilterOptions);
    if (!labels) continue;
    rows.push({
      label: FILTER_FIELDS[fieldId]?.label ?? fieldId,
      value: labels,
    });
  }

  rows.push(
    { label: 'Grouping', value: grouping },
    { label: 'Sorting', value: sorting },
    { label: 'Columns', value: String(columnCount) },
  );

  const about =
    sections.length === 0
      ? 'Select at least one category to preview what will be included.'
      : sections.length === 1
        ? sections[0].about
        : `This report combines ${sections.length} sections across ${categoryLabels.toLowerCase()}.`;

  return (
    <PanelCard className="h-full">
      <PanelHeader title="Report Summary" />

      <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3 border-b border-[#eef0f3] py-2.5 last:border-0"
          >
            <span className="shrink-0 text-[11px] text-[#6b7280]">
              {row.label}
            </span>
            <span className="text-right text-[11px] font-medium text-[#111827]">
              {row.value}
            </span>
          </div>
        ))}

        {sections.length > 0 ? (
          <div className="border-b border-[#eef0f3] py-3 last:border-0">
            <p className="mb-2 text-[11px] font-medium text-[#6b7280]">
              Included sections
            </p>
            <ul className="space-y-1.5">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="flex items-start gap-2 rounded-md bg-[#f8fafc] px-2.5 py-2"
                >
                  <FileText size={12} className="mt-0.5 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-[#111827]">
                      {section.name}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#9ca3af]">
                      {section.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="m-3 mt-auto rounded-lg border border-brand-border bg-brand-muted p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-brand">
          <Info size={12} />
          Preview
        </div>
        <p className="text-[11px] leading-relaxed text-[#9a4a1f]">{about}</p>
      </div>
    </PanelCard>
  );
}
