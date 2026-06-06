'use client';

import { useMemo, DependencyList } from 'react';

/**
 * A specialized version of useMemo for Firebase references/queries.
 * It ensures that the reference is only recreated when the actual
 * dependencies change, preventing infinite loops in hooks like
 * useCollection and useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
