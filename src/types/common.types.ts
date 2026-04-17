// Shared common types
export interface CommonResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
