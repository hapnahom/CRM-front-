'use client';

import { useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Columns3,
  Filter,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  FILTER_FIELDS,
  getFiltersForCategories,
  getGroupByForCategories,
  getSortByForCategories,
} from '../definitions';
import type {
  FilterFieldId,
  GroupByOptionId,
  GroupingState,
  ParentCategoryId,
  ReportCriteriaState,
  SortByOptionId,
  SortOrder,
} from '../types';
import { MultiSelectFilter } from './MultiSelectFilter';
import { isPeriodFilterField, ReportPeriodPicker } from './ReportPeriodPicker';
import { FieldLabel, PanelCard, PanelHeader } from './ui-bits';
import { useReportFilterOptions } from '@/store/server/features/reports/queries';

type CriteriaPanelProps = {
  categories: ParentCategoryId[];
  value: ReportCriteriaState;
  onChange: (next: ReportCriteriaState) => void;
  grouping: GroupingState;
  onGroupingChange: (next: GroupingState) => void;
  onOpenColumns: () => void;
};

export function CriteriaPanel({
  categories,
  value,
  onChange,
  grouping,
  onGroupingChange,
  onOpenColumns,
}: CriteriaPanelProps) {
  const [showMore, setShowMore] = useState(false);

  const availableIds = getFiltersForCategories(categories).filter(
    (id) => !isPeriodFilterField(id),
  );

  // Always include currency so every report can filter by each currency
  const filterFieldsForQuery = availableIds.includes('currency')
    ? availableIds
    : categories.length > 0
      ? (['currency', ...availableIds] as FilterFieldId[])
      : availableIds;

  const { data: liveFilterOptions } = useReportFilterOptions(
    filterFieldsForQuery.length ? filterFieldsForQuery : undefined,
  );

  const primary = availableIds.slice(0, 8);
  const more = availableIds.slice(8);
  const visible = showMore ? availableIds : primary;

  const allowedGroupBy = getGroupByForCategories(categories);
  const allowedSortBy = getSortByForCategories(categories);
  const columnCount = grouping.selectedColumns.length;

  const setMulti = (field: FilterFieldId, next: string[]) => {
    onChange({
      ...value,
      multi: { ...value.multi, [field]: next },
    });
  };

  // No auto-select for currency or other multi-filters.
  // Empty selection = do not apply that filter (include all).
  // Fiscal year / period stay required via ReportPeriodPicker.

  const thenByOptions = allowedGroupBy.filter(
    (o) => o.id === grouping.groupBy[1] || !grouping.groupBy.includes(o.id),
  );

  return (
    <PanelCard className="h-full">
      <PanelHeader
        title="Set Report Criteria"
        trailing={
          categories.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  periodMode: 'fiscal',
                  fiscalPeriod: { type: 'annual' },
                  dateRange: 'this-quarter',
                  multi: {},
                })
              }
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Reset All
            </button>
          ) : null
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {categories.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-[#9ca3af]">
            Select at least one category to configure criteria.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <ReportPeriodPicker value={value} onChange={onChange} />

              {visible.map((fieldId) => {
                const field = FILTER_FIELDS[fieldId];
                if (!field || field.kind !== 'multi') return null;
                const liveOptions = liveFilterOptions?.[fieldId];
                const options =
                  liveOptions && liveOptions.length > 0
                    ? liveOptions
                    : (field.options ?? []);

                return (
                  <MultiSelectFilter
                    key={fieldId}
                    label={field.label}
                    placeholder={field.placeholder}
                    options={options}
                    value={value.multi[fieldId] ?? []}
                    onChange={(next) => setMulti(fieldId, next)}
                  />
                );
              })}
            </div>

            {more.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
              >
                <Filter size={13} />
                {showMore ? 'Fewer Filters' : 'More Filters'}
              </button>
            ) : null}

            <div className="mt-5 border-t border-[#eef0f3] pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold text-[#111827]">
                  Group By & Sort
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-[#e5e7eb] text-[10px]"
                  onClick={onOpenColumns}
                >
                  <Columns3 size={12} />
                  Columns ({columnCount})
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <MultiSelectFilter
                  label="Group By"
                  placeholder="Select grouping..."
                  options={allowedGroupBy}
                  value={grouping.groupBy}
                  max={3}
                  onChange={(next) =>
                    onGroupingChange({
                      ...grouping,
                      groupBy: next.slice(0, 3) as GroupByOptionId[],
                    })
                  }
                />

                <div>
                  <FieldLabel>Then By (Optional)</FieldLabel>
                  <Select
                    value={grouping.groupBy[1]}
                    onValueChange={(v) => {
                      const id = v as GroupByOptionId;
                      const next = [...grouping.groupBy];
                      if (next.length === 0) {
                        onGroupingChange({ ...grouping, groupBy: [id] });
                        return;
                      }
                      next[1] = id;
                      onGroupingChange({
                        ...grouping,
                        groupBy: next.slice(0, 3) as GroupByOptionId[],
                      });
                    }}
                    disabled={grouping.groupBy.length === 0}
                  >
                    <SelectTrigger className="h-9 border-[#e5e7eb] text-[12px] shadow-none">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {thenByOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Sort By</FieldLabel>
                  <Select
                    value={grouping.sortBy}
                    onValueChange={(v) =>
                      onGroupingChange({
                        ...grouping,
                        sortBy: v as SortByOptionId,
                      })
                    }
                  >
                    <SelectTrigger className="h-9 border-[#e5e7eb] text-[12px] shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedSortBy.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Order</FieldLabel>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={grouping.sortOrder}
                      onValueChange={(v) =>
                        onGroupingChange({
                          ...grouping,
                          sortOrder: v as SortOrder,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 border-[#e5e7eb] text-[12px] shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      aria-label="Toggle sort order"
                      onClick={() =>
                        onGroupingChange({
                          ...grouping,
                          sortOrder:
                            grouping.sortOrder === 'desc' ? 'asc' : 'desc',
                        })
                      }
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] text-brand hover:bg-brand-muted"
                    >
                      {grouping.sortOrder === 'desc' ? (
                        <ArrowDownWideNarrow size={14} />
                      ) : (
                        <ArrowUpWideNarrow size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PanelCard>
  );
}
