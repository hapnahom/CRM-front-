'use client';

import { ListPagination } from '@/components/ui/list-pagination';
import type { PipelinePagination } from '@/lib/pipeline/list-query';

type PipelineListPaginationProps = {
  pagination: PipelinePagination;
  onPageChange: (page: number) => void;
};

/** Pipeline list pager — thin wrapper around the shared ListPagination. */
export function PipelineListPagination({
  pagination,
  onPageChange,
}: PipelineListPaginationProps) {
  return <ListPagination pagination={pagination} onPageChange={onPageChange} />;
}
