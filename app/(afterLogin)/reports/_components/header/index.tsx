'use client';

import { tokens } from '@/lib/design-tokens';

import React from 'react';
import { Typography, Button, Dropdown } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { LuSettings2 } from 'react-icons/lu';
import FilterDropdown from '../filterDropdown';
import ActionDropdown from '../actionDropdown';

const { Title, Text } = Typography;

interface HeaderProps {
  onFilter: (filterData: any) => void;
  onCancel: () => void;
}

const Header: React.FC<HeaderProps> = ({ onFilter, onCancel }) => {
  const handleFilter = (filterData: any) => {
    onFilter(filterData);
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleExport = () => {
    // Add your export logic here
  };

  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <Title level={3} className="mb-1">
          Report
        </Title>
        <Text className="text-muted-foreground">View All Reports</Text>
      </div>
      <div className="flex gap-3">
        <Dropdown
          overlay={
            <FilterDropdown onFilter={handleFilter} onCancel={handleCancel} />
          }
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            icon={<LuSettings2 />}
            style={{
              color: tokens.color.blue,
              borderColor: tokens.color.lightblue,
              borderWidth: '1px',
              height: '50px',
            }}
            className="flex items-center hover:bg-primary-muted"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = tokens.color.blue;
              e.currentTarget.style.borderColor = tokens.color.blue;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = tokens.color.blue;
              e.currentTarget.style.borderColor = tokens.color.lightblue;
            }}
          >
            Filter
          </Button>
        </Dropdown>

        <Dropdown
          overlay={<ActionDropdown onExport={handleExport} />}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            icon={<ExportOutlined />}
            style={{
              color: tokens.color.blue,
              borderColor: tokens.color.lightblue,
              borderWidth: '1px',
              height: '50px',
            }}
            className="flex items-center hover:bg-primary-muted"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = tokens.color.blue;
              e.currentTarget.style.borderColor = tokens.color.blue;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = tokens.color.blue;
              e.currentTarget.style.borderColor = tokens.color.lightblue;
            }}
          >
            Action
          </Button>
        </Dropdown>
      </div>
    </div>
  );
};

export default Header;
