'use client';

import React from 'react';
import { dealUiLabel } from '@/config/salesWorkflow';
import { Table, Avatar, Skeleton } from 'antd';
import { EyeOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useGetStagnantDeals } from '@/store/server/features/dashboard';
import { useUserNames } from '../../_hooks';
import styles from './StagnantDealsTable.module.css';

interface StagnantDeal {
  id: string;
  dealName: string;
  companyName: string;
  supplierName: string;
  engagementStageName: string;
  stagnationDays: number;
  stagnationLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhoneNumber: string;
  additionalInformation?: string;
  value?: number;
  currency?: string;
  dealOwner?: string;
  ownerId?: string;
  // Nested objects
  company?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  supplier?: {
    id: string;
    name: string;
    description: string;
  };
  engagementStage?: {
    id: string;
    name: string;
    description: string;
    level: number;
    colorCode: string;
  };
}

interface StagnantDealsTableProps {
  filters?: {
    page?: number;
    limit?: number;
    companyId?: string;
    engagementStageId?: string;
    ownerId?: string;
    date?: string; // YYYY-MM-DD format
    currency?: string;
  };
  onPaginationDataChange?: (totalPages: number) => void;
}

const StagnantDealsTable: React.FC<StagnantDealsTableProps> = ({
  filters = {},
  onPaginationDataChange,
}) => {
  const router = useRouter();

  // Get stagnant deals data from API
  const { data: stagnantDealsData, isLoading } = useGetStagnantDeals({
    page: filters.page || 1,
    limit: filters.limit || 10,
    ...filters,
  });

  // Get user names mapping
  const { getUserName } = useUserNames();

  // Handle the actual API response structure
  // The API returns: { data: [...], pagination: {...} }
  const stagnantDeals = stagnantDealsData?.data || [];
  const paginationData = stagnantDealsData?.pagination || null;

  // Notify parent of pagination data changes
  React.useEffect(() => {
    if (paginationData && onPaginationDataChange) {
      const totalPages = paginationData.totalPages || 1;
      onPaginationDataChange(totalPages);
    }
  }, [paginationData, onPaginationDataChange]);

  const handleViewDeal = (dealId: string) => {
    router.push(`/deals/${dealId}`);
  };

  const columns = [
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <span className="text-sm font-normal text-foreground">{text}</span>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'engagementStageName',
      key: 'engagementStageName',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <span className="text-sm font-normal text-foreground">{text}</span>
      ),
    },
    {
      title: 'Days',
      key: 'stagnation',
      width: 100,
      ellipsis: true,
      //eslint-disable-next-line
      render: (_: any, record: StagnantDeal) => (
        <span className="text-sm font-normal text-foreground">
          {record.stagnationDays}
        </span>
      ),
    },
    {
      title: 'Value',
      key: 'value',
      width: 150,
      ellipsis: true,
      //eslint-disable-next-line
      render: (_: any, record: StagnantDeal) => {
        if (!record.value && record.value !== 0) {
          return (
            <span className="text-sm font-normal text-muted-foreground">-</span>
          );
        }
        const formattedValue = record.value.toLocaleString();
        const displayValue = record.currency
          ? `${record.currency} ${formattedValue}`
          : formattedValue;
        return (
          <span className="text-sm font-normal text-foreground">
            {displayValue}
          </span>
        );
      },
    },
    {
      title: 'Owner',
      key: 'owner',
      width: 150,
      ellipsis: true,
      //eslint-disable-next-line
      render: (_: any, record: StagnantDeal) => {
        const ownerId = record.dealOwner || record.ownerId;

        if (!ownerId) {
          return (
            <span className="text-sm font-normal text-muted-foreground">-</span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Avatar
              size={24}
              icon={<UserOutlined />}
              className="bg-primary-muted0 text-brand-foreground"
            />
            <span className="text-sm font-normal text-foreground">
              {getUserName(ownerId)}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      ellipsis: true,
      //eslint-disable-next-line
      render: (_: any, record: StagnantDeal) => (
        <EyeOutlined
          className="text-muted-foreground hover:text-primary cursor-pointer transition-colors text-lg"
          onClick={() => handleViewDeal(record.id)}
          title={`View ${dealUiLabel()} Details`}
        />
      ),
    },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <Table
        columns={columns}
        dataSource={stagnantDeals}
        loading={isLoading}
        pagination={false}
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
        className={`custom-table ${styles.stagnantDealsTable}`}
        //eslint-disable-next-line
        rowClassName={(_record, index: number) =>
          index !== undefined && index % 2 === 0
            ? 'bg-surface-card'
            : 'bg-surface-elevated'
        }
        style={{
          fontFamily: 'inherit',
        }}
        locale={{
          emptyText: (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                No stagnant deals found.
              </p>
            </div>
          ),
        }}
      />
    </div>
  );
};

export default StagnantDealsTable;
