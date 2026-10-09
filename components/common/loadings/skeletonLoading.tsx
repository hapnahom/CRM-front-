import React from 'react';
import { Card, Skeleton, Table, List, Col, Row } from 'antd';

// Define the column type
interface ColumnType {
  title: string;
  dataIndex: string;
  key: string;
  render?: (text: any, record: any) => React.ReactNode;
}

// Define the props for the SkeletonLoading component
interface SkeletonLoadingProps {
  count?: number;
  type?: 'active' | 'avatar' | 'default'; // Skeleton loading types
  alignment?: 'horizontal' | 'vertical'; // Alignment of the skeletons
  componentType?: 'card' | 'table' | 'list' | 'grid' | 'avatar' | 'custom'; // Expanded component types
  columns?: any[]; // Custom columns for table
}

/* eslint-disable @typescript-eslint/naming-convention */
const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  count = 3,
  type = 'active',
  alignment = 'vertical',
  componentType = 'card',
  columns,
}) => {
  const skeletonItems = Array.from({ length: count });

  const renderSkeletonItem = (index: number) => {
    if (componentType === 'card') {
      return (
        <Card key={index} className="shadow-sm rounded-lg">
          <Skeleton active={type === 'active'} avatar={type === 'avatar'} />
        </Card>
      );
    }

    if (componentType === 'table') {
      const defaultColumns: ColumnType[] = [
        { title: 'Column 1', dataIndex: 'col1', key: 'col1' },
        { title: 'Column 2', dataIndex: 'col2', key: 'col2' },
        { title: 'Column 3', dataIndex: 'col3', key: 'col3' },
      ];

      const tableColumns = columns || defaultColumns; // Use custom columns if provided, otherwise fallback to default

      // Create a data source for the table
      const dataSource = skeletonItems.map((_, idx) => {
        const rowData: { [key: string]: React.ReactNode } = {};
        tableColumns.forEach((col) => {
          rowData[col.dataIndex] = <Skeleton active={type === 'active'} />;
        });
        return { key: idx, ...rowData };
      });

      return (
        <Table
          key={index}
          columns={tableColumns}
          dataSource={dataSource}
          pagination={false}
        />
      );
    }

    if (componentType === 'list') {
      return (
        <List
          key={index}
          itemLayout="horizontal"
          dataSource={skeletonItems}
          renderItem={() => (
            <List.Item>
              <Skeleton avatar={type === 'avatar'} active={type === 'active'} />
            </List.Item>
          )}
        />
      );
    }

    if (componentType === 'grid') {
      return (
        <Row gutter={16} key={index}>
          {skeletonItems.map((_, i) => (
            <Col span={8} key={i}>
              <Card>
                <Skeleton
                  active={type === 'active'}
                  avatar={type === 'avatar'}
                />
              </Card>
            </Col>
          ))}
        </Row>
      );
    }

    if (componentType === 'avatar') {
      return (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton.Avatar active={type === 'active'} />
          <Skeleton.Input active={type === 'active'} style={{ width: 200 }} />
        </div>
      );
    }

    // Default to custom or fallback layout
    return (
      <div key={index} className="p-4 border rounded-md">
        <Skeleton active={type === 'active'} avatar={type === 'avatar'} />
      </div>
    );
  };

  return (
    <div
      className={`flex ${
        alignment === 'horizontal' ? 'space-x-4' : 'space-y-4 flex-col'
      }`}
    >
      {skeletonItems.map((_, index) => renderSkeletonItem(index))}
    </div>
  );
};

export default SkeletonLoading;

/* eslint-enable @typescript-eslint/naming-convention */
