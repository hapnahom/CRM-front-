'use client';

import { useSyncExternalStore } from 'react';

const subscribeNoop = () => () => {};

/**
 * SSR-safe client detection without a post-mount useEffect flash.
 * Server + first client render: false. After hydration: true.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
