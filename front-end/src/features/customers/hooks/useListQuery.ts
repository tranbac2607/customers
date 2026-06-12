'use client';

import { useCallback, useState } from 'react';

/**
 * Generic list query state. `Q` is the screen-specific query shape
 * (e.g. for customers: `{ fullName?, gender?, phone? }`; for a future
 * orders screen it would be `{ status?, from?, to? }` etc.). The hook
 * is purely about state management — no Redux, no fetch — so it can
 * be reused by any list screen.
 */
export interface ListQueryState<Q> {
  query: Q;
  page: number;
  limit: number;
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface UseListQueryOptions {
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultOrder?: 'asc' | 'desc';
}

export interface UseListQueryApi<Q> {
  state: ListQueryState<Q>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sortBy: string, order: 'asc' | 'desc') => void;
  /**
   * Replace one or more query fields and reset to page 1. Use this
   * when the user types into a search input or changes a filter — the
   * intent is always "show the first page of the new result set".
   */
  patchQuery: (patch: Partial<Q>) => void;
  /** Clear all query fields and go back to page 1. */
  reset: () => void;
  /** Apply the current state as-is (used by the explicit Search button). */
  commit: () => ListQueryState<Q>;
}

const DEFAULT_LIMIT = 10;

export function useListQuery<Q extends object>(
  initialQuery: Q,
  options: UseListQueryOptions = {},
): UseListQueryApi<Q> {
  const [state, setState] = useState<ListQueryState<Q>>(() => ({
    query: initialQuery,
    page: 1,
    limit: options.defaultLimit ?? DEFAULT_LIMIT,
    sortBy: options.defaultSortBy ?? 'createdAt',
    order: options.defaultOrder ?? 'desc',
  }));

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, page: Math.max(1, page) }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((s) => ({ ...s, limit, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: string, order: 'asc' | 'desc') => {
    setState((s) => ({ ...s, sortBy, order, page: 1 }));
  }, []);

  const patchQuery = useCallback((patch: Partial<Q>) => {
    setState((s) => ({ ...s, query: { ...s.query, ...patch }, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, query: initialQuery, page: 1 }));
  }, [initialQuery]);

  const commit = useCallback(() => state, [state]);

  return { state, setPage, setLimit, setSort, patchQuery, reset, commit };
}
