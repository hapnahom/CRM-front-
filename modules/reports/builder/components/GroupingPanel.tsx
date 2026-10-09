'use client';

import { Columns3, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  GROUP_BY_OPTIONS,
  SORT_BY_OPTIONS,
  getGroupByLabel,
} from '../definitions';
import type {
  GroupByOptionId,
  GroupingState,
  ReportTypeDefinition,
  SortByOptionId,
  SortOrder,
} from '../types';
import { FieldLabel, PanelCard, PanelHeader } from './ui-bits';

type GroupingPanelProps = {
  reportType: ReportTypeDefinition | null;
  value: GroupingState;
  onChange: (next: GroupingState) => void;
  onOpenColumns: () => void;
};

export function GroupingPanel({
  reportType,
  value,
  onChange,
  onOpenColumns,
}: GroupingPanelProps) {
  const allowedGroupBy = reportType
    ? GROUP_BY_OPTIONS.filter((o) => reportType.groupBy.includes(o.id))
    : GROUP_BY_OPTIONS;

  const allowedSortBy = reportType
    ? SORT_BY_OPTIONS.filter((o) => reportType.sortBy.includes(o.id))
    : SORT_BY_OPTIONS;

  const levels = [0, 1, 2] as const;

  const setGroupLevel = (index: number, nextId: GroupByOptionId) => {
    const next = [...value.groupBy];
    next[index] = nextId;
    // Drop subsequent levels when an earlier level changes
    next.splice(index + 1);
    onChange({ ...value, groupBy: next.slice(0, 3) });
  };

  const removeLevel = (index: number) => {
    onChange({
      ...value,
      groupBy: value.groupBy.filter((id, i) => i !== index),
    });
  };

  return (
    <PanelCard className="h-full">
      <PanelHeader step={4} title="Group, Sort & Output" />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2.5">
          {levels.map((index) => {
            const label =
              index === 0 ? 'Group By' : index === 1 ? 'Then By' : 'Then By';
            const current = value.groupBy[index];
            const used = new Set(value.groupBy.filter((id, i) => i !== index));
            const options = allowedGroupBy.filter(
              (o) => !used.has(o.id) || o.id === current,
            );

            if (index > 0 && !value.groupBy[index - 1]) return null;

            return (
              <div key={index}>
                <FieldLabel>{label}</FieldLabel>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={current}
                    onValueChange={(v) =>
                      setGroupLevel(index, v as GroupByOptionId)
                    }
                  >
                    <SelectTrigger className="h-9 border-[#e5e7eb] text-[12px] shadow-none">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {current ? (
                    <button
                      type="button"
                      aria-label={`Remove ${getGroupByLabel(current)}`}
                      onClick={() => removeLevel(index)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f8fafc]"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {value.groupBy.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {value.groupBy.map((id, i) => (
                <span
                  key={`${id}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-medium text-[#374151]"
                >
                  {i > 0 ? <span className="text-[#9ca3af]">then</span> : null}
                  {getGroupByLabel(id)}
                  <button
                    type="button"
                    onClick={() => removeLevel(i)}
                    className="rounded p-0.5 hover:bg-[#e5e7eb]"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[#eef0f3] pt-4">
          <div>
            <FieldLabel>Sort By</FieldLabel>
            <Select
              value={value.sortBy}
              onValueChange={(v) =>
                onChange({ ...value, sortBy: v as SortByOptionId })
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
            <Select
              value={value.sortOrder}
              onValueChange={(v) =>
                onChange({ ...value, sortOrder: v as SortOrder })
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
          </div>
        </div>

        <div className="border-t border-[#eef0f3] pt-4">
          <FieldLabel>Columns / Metrics</FieldLabel>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5">
            <div>
              <p className="text-[12px] font-medium text-[#111827]">
                Selected Columns: {value.selectedColumns.length}
              </p>
              <p className="text-[10px] text-[#9ca3af]">
                Depends on selected report type
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-[#e5e7eb] text-[11px]"
              onClick={onOpenColumns}
              disabled={!reportType}
            >
              <Columns3 size={13} />
              Select Columns
            </Button>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
