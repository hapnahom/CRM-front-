'use client';

import React from 'react';
import { DatePicker, Button } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useReportsFilterStore } from '@/store/uistate/features/reports/filter';

const { RangePicker } = DatePicker;

interface FilterDropdownProps {
  onFilter: (dateRange: any) => void;
  onCancel: () => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  onFilter,
  onCancel,
}) => {
  const { dateRange, setDateRange } = useReportsFilterStore();

  const handleFilter = () => {
    onFilter(dateRange);
  };

  const handleCancel = () => {
    setDateRange(null);
    onCancel();
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="space-y-4">
        <div>
          <p className="text-muted-foreground mb-2">
            Filter your activities by
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Date
          </label>
          <RangePicker
            className="w-full"
            placeholder={['Start Date', 'End Date']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            suffixIcon={<CalendarOutlined />}
            format="YYYY-MM-DD"
            allowClear
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="primary"
            onClick={handleFilter}
            className="flex-1 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover"
          >
            Filter
          </Button>
          <Button
            onClick={handleCancel}
            className="flex-1 text-primary border-primary hover:text-primary-hover hover:border-primary-hover hover:bg-primary-muted"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  return dropdownContent;
};

export default FilterDropdown;
