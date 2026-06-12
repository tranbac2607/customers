'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has been stable for `delay` ms.
 * Used by list pages to avoid dispatching one fetch per keystroke when
 * the user is typing in a search input.
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
