export interface RequestCommonQueryData {
  limit?: number | string;
  page?: number | string;
  cacheQueries?: string;
  countQueries?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  paginationType?: 'limit' | 'take';
}
