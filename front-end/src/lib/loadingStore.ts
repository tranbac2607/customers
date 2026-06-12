/**
 * Module-level counter that tracks the number of in-flight HTTP requests.
 *
 * Used by axios interceptors to start/end a count, and by a React component
 * (via useSyncExternalStore) to render a global loading overlay.
 *
 * Why a counter, not a boolean: parallel API calls must not cancel each
 * other out (e.g. a list request + a separate /me probe).
 */

let pendingCount = 0;
const listeners = new Set<() => void>();

const notify = (): void => {
  listeners.forEach((l) => l());
};

export const loadingStore = {
  start(): void {
    pendingCount += 1;
    notify();
  },

  end(): void {
    pendingCount = Math.max(0, pendingCount - 1);
    notify();
  },

  getSnapshot(): number {
    return pendingCount;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
