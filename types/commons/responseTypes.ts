export interface ResponseMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  error: string;
  meta: ResponseMeta;
  items: T[];
  item: T;
  file?: string;
}
export interface SingleApiResponse<T> {
  statusCode: number;
  message: string;
  items: T;
}
export interface SingleLogResponse<T> {
  statusCode: number;
  message?: string;
  items: T[];
}
