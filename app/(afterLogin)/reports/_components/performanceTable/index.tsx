'use client';

import React from 'react';
import { Card, Table } from 'antd';

interface PerformanceTableProps {
  title: string;
  dataSource: any[];
  columns: any[];
  loading: boolean;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({
  title,
  dataSource,
  columns,
  loading,
}) => {
  return (
    <Card title={title}>
      <Table
        loading={loading}
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        rowClassName={(record, index) =>
          index !== undefined && index % 2 === 0
            ? 'bg-surface-card'
            : 'bg-surface-elevated'
        }
      />
    </Card>
  );
};

export default PerformanceTable;
