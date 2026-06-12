import type { UserResponse } from '@/store/auth/authTypes';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * The login API still returns the tokens in the response body (kept for
 * backwards compatibility and non-browser clients), but the browser FE
 * does not read them — it relies on the httpOnly cookies set by the BE.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}
