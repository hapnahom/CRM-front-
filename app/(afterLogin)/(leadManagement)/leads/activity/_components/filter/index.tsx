'use client';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { usePipelineLeadOptions } from '@/store/server/features/leads/pipeline/queries';
import { useGetActivityTypes } from '@/store/server/features/leads/activity-types/queries';
import { ActivityFilters } from '@/store/server/features/leads/activity/types';
import dayjs from 'dayjs';

interface ActivityFilterProps {
  onFilter: (filters: ActivityFilters) => void;
  onReset: () => void;
}

const ActivityFilterModal: React.FC<ActivityFilterProps> = ({
  onFilter,
  onReset,
}) => {
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [activityTypeId, setActivityTypeId] = useState<string | undefined>(
    undefined,
  );
  const [priority, setPriority] =
    useState<ActivityFilters['priority']>(undefined);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [leadSearch, setLeadSearch] = useState('');
  const [debouncedLeadSearch, setDebouncedLeadSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedLeadSearch(leadSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [leadSearch]);

  const { leadOptions } = usePipelineLeadOptions({
    search: debouncedLeadSearch,
    pageSize: 25,
  });
  const { data: activityTypes } = useGetActivityTypes();

  const safeActivityTypes = (() => {
    if (Array.isArray(activityTypes)) return activityTypes;
    if (
      activityTypes &&
      typeof activityTypes === 'object' &&
      'data' in activityTypes
    ) {
      const data = (activityTypes as { data?: unknown }).data;
      return Array.isArray(data) ? data : [];
    }
    return [];
  })();

  const handleFilter = () => {
    const filters: ActivityFilters = {};

    if (leadId) {
      filters.leadId = leadId;
    }
    if (activityTypeId) filters.activityTypeId = activityTypeId;
    if (priority) filters.priority = priority;
    if (date) {
      filters.startDate = dayjs(date).startOf('day').toDate();
      filters.endDate = dayjs(date).endOf('day').toDate();
    }

    onFilter(filters);
  };

  const handleReset = () => {
    setLeadId(undefined);
    setActivityTypeId(undefined);
    setPriority(undefined);
    setDate(undefined);
    onReset();
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="text-lg font-semibold">Filter</h2>
          <p className="text-muted-foreground text-sm -mt-1">
            Filter your activities by
          </p>
        </div>
        <Button variant="link" onClick={handleReset} className="text-primary">
          Remove All
        </Button>
      </div>

      <div className="w-full">
        <h3 className="text-muted-foreground text-sm mb-2 mt-3">Filter</h3>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <Label className="mb-1">Name</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Lead Name" />
              </SelectTrigger>
              <SelectContent>
                <div className="border-b border-border p-2">
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search leads…"
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {leadOptions.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col">
            <Label className="mb-1">Type</Label>
            <Select value={activityTypeId} onValueChange={setActivityTypeId}>
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Lead Type" />
              </SelectTrigger>
              <SelectContent>
                {safeActivityTypes.map((type: any) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col mt-4">
          <Label className="mb-1">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              setPriority(value as ActivityFilters['priority'])
            }
          >
            <SelectTrigger className="h-10 mt-1">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col mt-4">
          <Label className="mb-1">Date</Label>
          <DatePicker
            className="w-full h-10 mt-1"
            placeholder="Set Date (Optional)"
            value={date}
            onChange={setDate}
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2 mt-6">
          <Button className="px-6" onClick={handleFilter}>
            Filter
          </Button>
          <Button variant="outline" className="px-6" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );

  return dropdownContent;
};

export default ActivityFilterModal;
