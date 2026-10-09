'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZES,
  type ListPaginationMeta,
} from '@/lib/list-pagination';

type ListPaginationProps = {
  pagination: ListPaginationMeta;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
};

export function ListPagination({
  pagination,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = LIST_PAGE_SIZES,
  className,
}: ListPaginationProps) {
  if (pagination.totalItems <= 0) return null;

  const itemsPerPage =
    pageSize ?? pagination.itemsPerPage ?? DEFAULT_LIST_PAGE_SIZE;
  const start = (pagination.currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(
    pagination.currentPage * itemsPerPage,
    pagination.totalItems,
  );

  return (
    <div
      className={
        className ??
        'flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3'
      }
    >
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {pagination.totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={pagination.currentPage <= 1}
          onClick={() => onPageChange(pagination.currentPage - 1)}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {pagination.currentPage} of {Math.max(1, pagination.totalPages)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={pagination.currentPage >= pagination.totalPages}
          onClick={() => onPageChange(pagination.currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
