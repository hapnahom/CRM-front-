import { useGetDealActivitiesTypes } from '@/store/server/features/deals/activity/query';
import { usePipelineDealOptions } from '@/store/server/features/deals/pipeline/queries';
import dealActivityStore from '@/store/uistate/features/deal/activity';
import { Button, DatePicker, Form, Select } from 'antd';
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';

interface ActivityFilterProps {
  onFilter: (filters: any) => void;
  onClose: () => void;
  onReset?: () => void;
  currentFilters?: any;
}

const ActivityFilterModal: React.FC<ActivityFilterProps> = ({
  onFilter,
  onClose,
  onReset,
  currentFilters,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateRange, setDateRange] = React.useState<any>(null);
  /* eslint-enable @typescript-eslint/naming-convention */
  const [form] = Form.useForm();
  const { searchParams } = dealActivityStore();
  const { data: activitiesTypes } = useGetDealActivitiesTypes();
  const [dealSearch, setDealSearch] = useState('');
  const [debouncedDealSearch, setDebouncedDealSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedDealSearch(dealSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [dealSearch]);

  const { dealOptions } = usePipelineDealOptions({
    search: debouncedDealSearch,
    pageSize: 25,
  });

  const handleCancel = () => {
    setDateRange(null);
    form.resetFields();
    onClose();
  };

  // Initialize form with current filter values only once
  React.useEffect(() => {
    form.setFieldsValue({
      name: currentFilters?.dealId || undefined,
      type: currentFilters?.activityType || undefined,
      priority: currentFilters?.priority || undefined,
      date: currentFilters?.activityDate
        ? dayjs(currentFilters.activityDate)
        : undefined,
    });
  }, [form, currentFilters]); // Use currentFilters instead of searchParams

  // Handle Remove All - clear all filters
  const handleRemoveAll = () => {
    form.resetFields();
    if (onReset) {
      onReset();
    } else {
      onFilter({});
    }
  };

  // Handle Filter - apply filters and close modal
  const handleFilter = () => {
    form.validateFields().then((values) => {
      // Build filter object like lead activity does
      const filters: any = {};

      if (values.name) {
        filters.dealId = values.name;
      }
      if (values.type) {
        filters.activityType = values.type;
      }
      if (values.priority) {
        filters.priority = values.priority;
      }
      if (values.date) {
        filters.activityDate = values.date.format('YYYY-MM-DD');
      }

      onFilter(filters);
      onClose(); // Close the modal after applying filters
    });
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex justify-between items-center mb-1 ">
        <div>
          <h2 className="text-lg font-semibold">Filter</h2>
          <p className="text-muted-foreground text-sm -mt-1">
            Filter your activities by
          </p>
        </div>
        <Button type="link" onClick={handleRemoveAll} className="text-primary">
          Remove All
        </Button>
      </div>

      <Form layout="vertical" form={form} className="w-full">
        <h3 className="text-muted-foreground text-sm mb-2 mt-3">Filter</h3>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="name" label="Name">
            <Select
              id={`selectDealId${searchParams.dealId}`}
              placeholder="Deal Name"
              className="h-10 mt-1"
              allowClear
              showSearch
              filterOption={false}
              onSearch={setDealSearch}
              options={dealOptions.map((deal) => ({
                value: deal.id,
                label: deal.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select
              id={`selectActivityType${searchParams.activityType}`}
              placeholder="Activity Type"
              className="h-10 mt-1"
              allowClear
              options={activitiesTypes?.map((i: any) => ({
                value: i.id,
                label: i.name,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item name="priority" label="Priority">
          <Select
            id={`selectPriority${searchParams.priority}`}
            placeholder="Priority"
            className="h-10 mt-1"
            allowClear
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </Form.Item>
        <Form.Item name="date" label="Date">
          <DatePicker
            id={`selectActivityDate${searchParams.activityDate}`}
            className="w-full h-10 mt-1"
            placeholder="Set Date"
          />
        </Form.Item>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2 mt-6">
          <Button type="primary" className="px-6" onClick={handleFilter}>
            Filter
          </Button>
          <Button type="default" className="px-6" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </Form>
    </div>
  );

  return dropdownContent;
};

export default ActivityFilterModal;
