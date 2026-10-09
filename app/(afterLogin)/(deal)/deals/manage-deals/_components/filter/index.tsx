import { formatUserName } from '@/lib/format-user-name';
import { Button, Form, Input, Select } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import React from 'react';
import {
  useGetCompanies,
  useGetDealTypes,
  useGetDealStages,
  useGetCurrencies,
  useGetEmployees,
} from '@/store/server/features/deals/queries';

interface FilterDropdownProps {
  onFilter: (filters: any) => void;
  onCancel?: () => void;
}

const FilterModal: React.FC<FilterDropdownProps> = ({ onFilter, onCancel }) => {
  const [form] = Form.useForm();
  const [isFiltering, setIsFiltering] = React.useState(false);

  const { data: companies = [], isLoading: companiesLoading } =
    useGetCompanies();
  const { data: dealTypes = [], isLoading: dealTypesLoading } =
    useGetDealTypes();
  const { data: dealStages = [], isLoading: stagesLoading } =
    useGetDealStages();
  const { data: currencies = [], isLoading: currenciesLoading } =
    useGetCurrencies();
  const { data: employees = [], isLoading: employeesLoading } =
    useGetEmployees();

  const employeesList = Array.isArray(employees)
    ? employees
    : Array.isArray((employees as any)?.items)
      ? (employees as any).items
      : Array.isArray((employees as any)?.data)
        ? (employees as any).data
        : [];

  const handleFilter = async () => {
    setIsFiltering(true);
    try {
      const formValues = form.getFieldsValue();
      const filters = {
        companyId: formValues.name, // Company ID from "Account Name" field
        owner: formValues.owner, // Employee ID from "Account Owner" field
        dealTypeId: formValues.type, // Deal type ID
        engagementStageId: formValues.stage, // Deal stage ID
        currency: formValues.currency, // Currency ID
        minAmount: formValues.revenue
          ? parseFloat(formValues.revenue)
          : undefined,
      };

      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== undefined && value !== '',
        ),
      );

      onFilter(cleanFilters);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleCancel = () => {
    // Just close the modal without clearing filters
    if (onCancel) {
      onCancel();
    }
  };

  const handleRemoveAll = () => {
    form.resetFields();
    onFilter({}); // Clear all filters
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex justify-between items-center mb-1 ">
        <div>
          <h2 className="text-lg font-semibold">Filter</h2>
          <p className="text-muted-foreground text-sm -mt-1">
            Filter your Deals by
          </p>
        </div>
        <Button type="link" onClick={handleRemoveAll} className="text-primary">
          Remove All
        </Button>
      </div>

      <Form layout="vertical" form={form} className="w-full">
        <h3 className="text-muted-foreground text-sm mb-2 mt-3">
          Filter by general information
        </h3>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="name" label="Name">
            <Select
              placeholder="Account Name"
              loading={companiesLoading}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)
                  ?.toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {Array.isArray(companies) &&
                companies.map((company) => (
                  <Select.Option key={company.id} value={company.id}>
                    {company.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="owner" label="Owner">
            <Select
              placeholder="Account Owner"
              loading={employeesLoading}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)
                  ?.toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {employeesList.map((employee: any) => (
                <Select.Option key={employee.id} value={employee.id}>
                  {formatUserName(
                    {
                      ...employee,
                      name: employee.name ?? employee.fullName,
                    },
                    'Unknown Employee',
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select placeholder="Type" loading={dealTypesLoading} allowClear>
              {Array.isArray(dealTypes) &&
                dealTypes.map((type) => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="stage" label="Stage">
            <Select placeholder="Deal Stage" loading={stagesLoading} allowClear>
              {Array.isArray(dealStages) &&
                dealStages.map((stage) => (
                  <Select.Option key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      {stage.colorCode && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.colorCode }}
                        />
                      )}
                      {stage.name}
                    </div>
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </div>

        {/* Revenue Row */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="revenue" label="Revenue">
            <Input placeholder="Expected Revenue" prefix={<DollarOutlined />} />
          </Form.Item>
          <Form.Item name="currency" label=" ">
            <Select
              placeholder="Currency"
              loading={currenciesLoading}
              allowClear
            >
              {Array.isArray(currencies) &&
                currencies.map((currency) => (
                  <Select.Option key={currency.id} value={currency.id}>
                    {currency.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2 mt-6">
          <Button
            type="primary"
            className="px-6"
            onClick={handleFilter}
            loading={isFiltering}
            disabled={isFiltering}
          >
            Filter
          </Button>
          <Button
            type="default"
            className="px-6"
            onClick={handleCancel}
            disabled={isFiltering}
          >
            Cancel
          </Button>
        </div>
      </Form>
    </div>
  );

  return dropdownContent;
};

export default FilterModal;
