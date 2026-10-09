import { formatUserName } from '@/lib/format-user-name';
import { Button, DatePicker, Form, Select } from 'antd';
import React, { useMemo } from 'react';
import {
  useGetUsers,
  useGetCompanies,
  useGetDealStages,
} from '@/store/server/features/dashboard';

interface StagnantDealsFilterProps {
  onFilter: (filters: any) => void;
  onReset: () => void;
}

const StagnantDealsFilterModal: React.FC<StagnantDealsFilterProps> = ({
  onFilter,
  onReset,
}) => {
  const [form] = Form.useForm();

  // Fetch reference data
  const { data: usersData } = useGetUsers();
  const { data: companiesData } = useGetCompanies();
  const { data: dealStagesData } = useGetDealStages();

  // Transform data to { value, label } format
  const companies = useMemo(() => {
    return (
      companiesData?.map((company) => ({
        value: company.id,
        label: company.name,
      })) || []
    );
  }, [companiesData]);

  const stages = useMemo(() => {
    return (
      dealStagesData?.map((stage) => ({
        value: stage.id,
        label: stage.name,
      })) || []
    );
  }, [dealStagesData]);

  const owners = useMemo(() => {
    return (
      usersData?.map((user) => ({
        value: user.id,
        label: formatUserName(user),
      })) || []
    );
  }, [usersData]);

  const handleFilter = () => {
    form.validateFields().then((values) => {
      const filters: any = {};

      // Transform to API format with correct field names
      if (values.date) {
        filters.date = values.date.format('YYYY-MM-DD');
      }
      if (values.stage) {
        filters.engagementStageId = values.stage;
      }
      if (values.owner) {
        filters.ownerId = values.owner;
      }
      if (values.company) {
        filters.companyId = values.company;
      }

      onFilter(filters);
    });
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="text-lg font-semibold">Filter</h2>
          <p className="text-muted-foreground text-sm -mt-1">
            Filter stagnant deals
          </p>
        </div>
        <Button type="link" onClick={handleReset} className="text-primary">
          Remove All
        </Button>
      </div>

      <Form layout="vertical" form={form} className="w-full">
        <h3 className="text-muted-foreground text-sm mb-2 mt-3">Filter</h3>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="company" label="Company">
            <Select
              placeholder="All Companies"
              className="h-10 mt-1"
              showSearch
              optionFilterProp="children"
              filterOption={(input: string, option: any) =>
                String(option?.children || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {companies.map((company) => (
                <Select.Option key={company.value} value={company.value}>
                  {company.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="stage" label="Stage">
            <Select
              placeholder="All Stages"
              className="h-10 mt-1"
              showSearch
              optionFilterProp="children"
              filterOption={(input: string, option: any) =>
                String(option?.children || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {stages.map((stage) => (
                <Select.Option key={stage.value} value={stage.value}>
                  {stage.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item name="owner" label="Owner">
          <Select placeholder="All Owners" className="h-10 mt-1">
            {owners.map((owner) => (
              <Select.Option key={owner.value} value={owner.value}>
                {owner.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="date" label="Date">
          <DatePicker className="w-full h-10 mt-1" placeholder="Select Date" />
        </Form.Item>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2 mt-6">
          <Button type="primary" className="px-6" onClick={handleFilter}>
            Filter
          </Button>
          <Button type="default" className="px-6" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </Form>
    </div>
  );

  return dropdownContent;
};

export default StagnantDealsFilterModal;
