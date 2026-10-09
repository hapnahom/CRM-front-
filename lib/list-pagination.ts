export const LIST_PAGE_SIZES = [10, 25, 50, 100] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];
export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 25;

export interface ListPaginationMeta {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export function emptyListPagination(
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
): ListPaginationMeta {
  return {
    totalItems: 0,
    currentPage: 1,
    itemsPerPage: pageSize,
    totalPages: 0,
  };
}
