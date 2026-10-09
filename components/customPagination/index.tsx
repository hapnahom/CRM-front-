import React from 'react';
import { Select } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useIsMobile } from '@/hooks/useIsMobile';

const { Option } = Select;

interface CustomPaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  onShowSizeChange: (size: number) => void;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  current,
  total,
  pageSize,
  onChange,
  onShowSizeChange,
}) => {
  const handlePageChange = (page: number) => {
    onChange(page, pageSize);
  };

  const handleSizeChange = (value: number) => {
    onShowSizeChange(value);
  };

  const totalPages = Math.ceil(total / pageSize);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`w-8 h-8 flex items-center justify-center rounded-[10px] ${
              current === i
                ? 'bg-[#F8F8F8] text-foreground '
                : 'bg-surface-card text-foreground'
            }`}
          >
            {i}
          </button>,
        );
      }
    } else {
      // Always show first page
      pageNumbers.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`w-8 h-8 flex items-center justify-center rounded-[10px] ${
            current === 1
              ? 'bg-[#F8F8F8] text-foreground'
              : 'bg-surface-card text-foreground'
          }`}
        >
          1
        </button>,
      );

      // Calculate the range of pages to show around current page
      let startPage = Math.max(2, current - 1);
      let endPage = Math.min(totalPages - 1, current + 1);

      // Adjust if we're near the start
      if (current <= 3) {
        endPage = Math.min(4, totalPages - 1);
      }
      // Adjust if we're near the end
      if (current >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push(
          <span key="leftEllipsis" className="px-2">
            ...
          </span>,
        );
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`w-8 h-8 flex items-center justify-center rounded-[10px] ${
              current === i
                ? 'bg-[#F8F8F8] text-foreground '
                : 'bg-surface-card text-foreground '
            }`}
          >
            {i}
          </button>,
        );
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <span key="rightEllipsis" className="px-2">
            ...
          </span>,
        );
      }

      // Always show last page
      pageNumbers.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`w-8 h-8 flex items-center justify-center  rounded-[10px] ${
            current === totalPages
              ? 'bg-[#F8F8F8] text-foreground '
              : 'bg-surface-card text-foreground  hover:bg-muted'
          }`}
        >
          {totalPages}
        </button>,
      );
    }

    return pageNumbers;
  };

  const { isMobile } = useIsMobile();
  return (
    <div className="flex justify-between items-center py-6 px-4  bg-surface-card">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => current > 1 && handlePageChange(current - 1)}
          disabled={current === 1}
          className={`w-8 h-8 flex items-center justify-center border rounded-[10px] ${
            current === 1
              ? 'text-foreground border-border'
              : 'text-foreground border-border hover:bg-muted'
          }`}
        >
          <LeftOutlined />
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => current < totalPages && handlePageChange(current + 1)}
          disabled={current === totalPages}
          className={`w-8 h-8 flex items-center justify-center border rounded-[10px] ${
            current === totalPages
              ? 'text-foreground border-border'
              : 'text-foreground border-border hover:bg-muted'
          }`}
        >
          <RightOutlined />
        </button>
      </div>
      <div className="flex items-center">
        {!isMobile && (
          <span className="mr-2 text-xs text-[#718096]">
            Showing {Math.min(total, (current - 1) * pageSize + 1)} -{' '}
            {Math.min(total, current * pageSize)} out of {total} entries
          </span>
        )}
        <Select
          value={pageSize}
          className="w-24 h-8"
          onChange={(value) => handleSizeChange(value)}
        >
          <Option value={4}>
            <span className="text-xs text-foreground">Show 4</span>
          </Option>
          <Option value={10}>
            <span className="text-xs text-foreground">Show 10</span>
          </Option>
          <Option value={25}>
            <span className="text-xs text-foreground">Show 25</span>
          </Option>
          <Option value={50}>
            <span className="text-xs text-foreground">Show 50</span>
          </Option>
          <Option value={75}>
            <span className="text-xs text-foreground">Show 75</span>
          </Option>
          <Option value={100}>
            <span className="text-xs text-foreground">Show 100</span>
          </Option>
        </Select>
      </div>
    </div>
  );
};

export default CustomPagination;
