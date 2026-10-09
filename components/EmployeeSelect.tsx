import React from 'react';
import { Select } from 'antd';
import { formatUserName } from '@/lib/format-user-name';
import { useGetAllUsers } from '@/store/server/features/employees/queries';

interface EmployeeSelectProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  mode?: 'multiple' | 'tags';
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
}

const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  value,
  onChange,
  mode,
  placeholder = 'Select an employee',
  loading: externalLoading,
  disabled = false,
}) => {
  const { data: employees, isLoading, error } = useGetAllUsers();

  if (error) {
    return <div>Error loading employees</div>;
  }

  const employeeOptions =
    employees?.data?.map((employee: any) => ({
      label: formatUserName(
        { ...employee, name: employee.name ?? employee.fullName },
        'Unknown',
      ),
      value: employee.id,
    })) || [];

  return (
    <Select
      value={value}
      onChange={onChange}
      mode={mode}
      placeholder={placeholder}
      loading={isLoading || externalLoading}
      disabled={disabled}
      options={employeeOptions}
      showSearch
      filterOption={(input, option) => {
        const label = String(option?.label ?? '');
        return label.toLowerCase().includes(input.toLowerCase());
      }}
    />
  );
};

export default EmployeeSelect;
