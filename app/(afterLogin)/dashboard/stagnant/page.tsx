'use client';

import React, { useState } from 'react';
import { Button, Dropdown, ConfigProvider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { LuSettings2 } from 'react-icons/lu';
import { RiExchange2Line } from 'react-icons/ri';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import StagnantDealsTable from '../_components/stagnant/StagnantDealsTable';
import StagnantDealsFilterModal from '../_components/stagnant/filter';
import ActionDropdown from '../_components/stagnant/export';
import StagnantDealsPagination from '../_components/stagnant/pagination';
import { tokens, antdPageTheme } from '@/lib/design-tokens';
import { dealUiLabel } from '@/config/salesWorkflow';

export default function StagnantDealsPage() {
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<{
    page?: number;
    limit?: number;
    companyId?: string;
    engagementStageId?: string;
    ownerId?: string;
    date?: string; // YYYY-MM-DD format
    currency?: string;
  }>({
    page: 1,
    limit: 10,
  });

  const handleFilter = (filterData: any) => {
    setFilters({ ...filterData, page: 1, limit: 10 });
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setFilters((prev) => ({ ...prev, page }));
  };

  const handlePaginationDataChange = (newTotalPages: number) => {
    setTotalPages(newTotalPages);
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <ConfigProvider theme={antdPageTheme}>
      <div className="min-h-screen bg-surface-elevated p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="text-brand border-brand h-10 w-10"
                onClick={handleBack}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Stagnant {dealUiLabel({ plural: true })}
                </h1>
                <p className="text-muted-foreground">
                  Review {dealUiLabel({ plural: true, lowercase: true })} that
                  have passed their closing dates
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dropdown
                overlay={
                  <StagnantDealsFilterModal
                    onFilter={handleFilter}
                    onReset={handleResetFilters}
                  />
                }
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  icon={<LuSettings2 />}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  style={{
                    color: tokens.color.blue,
                    borderColor: tokens.color.lightblue,
                    borderWidth: '1px',
                    height: '50px',
                  }}
                  className={`flex items-center hover:bg-primary-muted h-10 ${isMobile ? 'w-10' : ''}`}
                  aria-label="Filter"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = tokens.color.blue;
                    e.currentTarget.style.borderColor = tokens.color.blue;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tokens.color.blue;
                    e.currentTarget.style.borderColor = tokens.color.lightblue;
                  }}
                >
                  {!isMobile && 'Filter'}
                </Button>
              </Dropdown>
              <Dropdown
                overlay={<ActionDropdown filters={filters} />}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  icon={<RiExchange2Line className="text-brand" size={20} />}
                  className={`h-10 border-brand text-brand ${isMobile ? 'w-10' : ''}`}
                  aria-label="Action"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = tokens.color.blue;
                    e.currentTarget.style.borderColor = tokens.color.blue;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tokens.color.blue;
                    e.currentTarget.style.borderColor = tokens.color.lightblue;
                  }}
                >
                  {!isMobile && 'Action'}
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Stagnant Deals Table */}
        <div className="bg-surface-card rounded-lg shadow-sm p-6">
          <StagnantDealsTable
            filters={filters}
            onPaginationDataChange={handlePaginationDataChange}
          />

          <StagnantDealsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </ConfigProvider>
  );
}
