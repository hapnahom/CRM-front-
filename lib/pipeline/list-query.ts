export const PIPELINE_KANBAN_PAGE_SIZE = 200;
export const PIPELINE_LIST_PAGE_SIZE = 25;

export interface PipelineListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  stageId?: string;
  teamId?: string;
  responsibleUserId?: string;
  affectedUserId?: string;
  departmentId?: string;
  currency?: string;
  sessionId?: string;
  sessionIds?: string;
}

export interface PipelinePagination {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export function buildPipelineListRequestParams(
  params?: PipelineListQueryParams,
): Record<string, string | number> {
  const request: Record<string, string | number> = {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? PIPELINE_KANBAN_PAGE_SIZE,
  };

  const search = params?.search?.trim();
  if (search) request.search = search;
  if (params?.stageId && params.stageId !== 'all') {
    request.stageId = params.stageId;
  }
  if (params?.teamId && params.teamId !== 'all') {
    request.teamId = params.teamId;
  }
  if (params?.responsibleUserId && params.responsibleUserId !== 'all') {
    request.responsibleUserId = params.responsibleUserId;
  }
  if (params?.affectedUserId && params.affectedUserId !== 'all') {
    request.affectedUserId = params.affectedUserId;
  }
  if (params?.departmentId && params.departmentId !== 'all') {
    request.departmentId = params.departmentId;
  }
  if (params?.currency && params.currency !== 'all') {
    request.currency = params.currency;
  }
  if (params?.sessionId) {
    request.sessionId = params.sessionId;
  } else if (params?.sessionIds) {
    request.sessionIds = params.sessionIds;
  }

  return request;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
}

export function parsePipelinePagination(
  response: unknown,
  fallbackCount: number,
  fallbackPage: number,
  fallbackPageSize: number,
): PipelinePagination {
  const pagination = (response as { pagination?: Partial<PipelinePagination> })
    ?.pagination;

  const totalItems = toNumber(pagination?.totalItems, fallbackCount);
  const itemsPerPage = toNumber(pagination?.itemsPerPage, fallbackPageSize);
  const currentPage = toNumber(pagination?.currentPage, fallbackPage);
  const totalPages = toNumber(
    pagination?.totalPages,
    Math.max(1, Math.ceil(totalItems / Math.max(itemsPerPage, 1))),
  );

  return { totalItems, currentPage, itemsPerPage, totalPages };
}

export function patchPaginatedPipelineCache<T>(
  old: unknown,
  patch: (items: T[]) => T[],
): unknown {
  if (Array.isArray(old)) return patch(old);
  if (
    old &&
    typeof old === 'object' &&
    Array.isArray((old as { data?: T[] }).data)
  ) {
    const paginated = old as { data: T[]; pagination?: PipelinePagination };
    return { ...paginated, data: patch(paginated.data) };
  }
  return old;
}
