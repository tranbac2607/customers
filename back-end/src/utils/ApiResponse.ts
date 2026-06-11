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

export const ok = <T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> => {
  const result: ApiSuccess<T> = { success: true, data };
  if (meta) result.meta = meta;
  return result;
};
