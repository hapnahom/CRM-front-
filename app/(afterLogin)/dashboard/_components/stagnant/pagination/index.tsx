'use client';

import { tokens } from '@/lib/design-tokens';

import { Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface StagnantDealsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function StagnantDealsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: StagnantDealsPaginationProps) {
  const handlePageChange = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex items-center justify-end mt-6">
      <div className="flex items-center gap-1">
        <Button
          type="default"
          size="small"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 p-0"
          style={{
            borderColor: tokens.color.borderStrong,
            color: tokens.color.textMuted,
            backgroundColor: tokens.color.surfaceElevated,
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const button = e.currentTarget as HTMLButtonElement;
            if (!button.disabled) {
              button.style.borderColor = tokens.color.blue;
              button.style.color = tokens.color.blue;
              button.style.backgroundColor = tokens.color.brandMuted;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = tokens.color.borderStrong;
            e.currentTarget.style.color = tokens.color.textMuted;
            e.currentTarget.style.backgroundColor =
              tokens.color.surfaceElevated;
          }}
          icon={<LeftOutlined />}
        />

        {(() => {
          const pages = [];
          const maxVisiblePages = 5;
          let startPage = Math.max(
            1,
            currentPage - Math.floor(maxVisiblePages / 2),
          );
          const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

          if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
          }

          if (startPage > 1) {
            pages.push(
              <Button
                key={1}
                type="default"
                size="small"
                onClick={() => handlePageChange(1)}
                className="w-8 h-8 p-0"
                style={{
                  borderColor: tokens.color.borderStrong,
                  color: tokens.color.textMuted,
                  backgroundColor: tokens.color.surfaceCard,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.color.blue;
                  e.currentTarget.style.color = tokens.color.blue;
                  e.currentTarget.style.backgroundColor =
                    tokens.color.brandMuted;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tokens.color.borderStrong;
                  e.currentTarget.style.color = tokens.color.textMuted;
                  e.currentTarget.style.backgroundColor =
                    tokens.color.surfaceCard;
                }}
              >
                1
              </Button>,
            );

            if (startPage > 2) {
              pages.push(
                <span
                  key="ellipsis-start"
                  className="px-2 text-muted-foreground"
                >
                  ...
                </span>,
              );
            }
          }

          for (let i = startPage; i <= endPage; i++) {
            const isCurrentPage = i === currentPage;
            pages.push(
              <Button
                key={i}
                type="default"
                size="small"
                onClick={() => handlePageChange(i)}
                className={`w-8 h-8 p-0 ${isCurrentPage ? 'bg-primary hover:bg-primary-hover' : ''}`}
                style={{
                  borderColor: isCurrentPage
                    ? tokens.color.blue
                    : tokens.color.borderStrong,
                  color: isCurrentPage
                    ? tokens.color.surfaceCard
                    : tokens.color.textMuted,
                  backgroundColor: isCurrentPage
                    ? tokens.color.blue
                    : tokens.color.surfaceCard,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentPage) {
                    e.currentTarget.style.borderColor = tokens.color.blue;
                    e.currentTarget.style.color = tokens.color.blue;
                    e.currentTarget.style.backgroundColor =
                      tokens.color.brandMuted;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrentPage) {
                    e.currentTarget.style.borderColor =
                      tokens.color.borderStrong;
                    e.currentTarget.style.color = tokens.color.textMuted;
                    e.currentTarget.style.backgroundColor =
                      tokens.color.surfaceCard;
                  }
                }}
              >
                {i}
              </Button>,
            );
          }

          if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
              pages.push(
                <span key="ellipsis-end" className="px-2 text-muted-foreground">
                  ...
                </span>,
              );
            }

            pages.push(
              <Button
                key={totalPages}
                type="default"
                size="small"
                onClick={() => handlePageChange(totalPages)}
                className="w-8 h-8 p-0"
                style={{
                  borderColor: tokens.color.borderStrong,
                  color: tokens.color.textMuted,
                  backgroundColor: tokens.color.surfaceCard,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.color.blue;
                  e.currentTarget.style.color = tokens.color.blue;
                  e.currentTarget.style.backgroundColor =
                    tokens.color.brandMuted;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tokens.color.borderStrong;
                  e.currentTarget.style.color = tokens.color.textMuted;
                  e.currentTarget.style.backgroundColor =
                    tokens.color.surfaceCard;
                }}
              >
                {totalPages}
              </Button>,
            );
          }

          return pages;
        })()}

        <Button
          type="default"
          size="small"
          onClick={() =>
            handlePageChange(Math.min(totalPages, currentPage + 1))
          }
          disabled={currentPage === totalPages}
          className="w-8 h-8 p-0"
          style={{
            borderColor: tokens.color.borderStrong,
            color: tokens.color.textMuted,
            backgroundColor: tokens.color.surfaceElevated,
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const button = e.currentTarget as HTMLButtonElement;
            if (!button.disabled) {
              button.style.borderColor = tokens.color.blue;
              button.style.color = tokens.color.blue;
              button.style.backgroundColor = tokens.color.brandMuted;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = tokens.color.borderStrong;
            e.currentTarget.style.color = tokens.color.textMuted;
            e.currentTarget.style.backgroundColor =
              tokens.color.surfaceElevated;
          }}
          icon={<RightOutlined />}
        />
      </div>
    </div>
  );
}
