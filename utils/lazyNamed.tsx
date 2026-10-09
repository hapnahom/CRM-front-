'use client';

import dynamic, { type DynamicOptions } from 'next/dynamic';
import type { ComponentType } from 'react';

type LazyNamedOptions = Pick<DynamicOptions, 'ssr' | 'loading'>;

/**
 * Code-split a named export with Next `dynamic`, without repeating
 * `.then((m) => ({ default: m.Foo }))` at every call site.
 */
export function lazyNamed<
  TModule extends Record<string, unknown>,
  TKey extends keyof TModule,
>(
  loader: () => Promise<TModule>,
  exportName: TKey,
  options: LazyNamedOptions = {},
) {
  return dynamic(
    async () => {
      const mod = await loader();
      const Component = mod[exportName];
      if (typeof Component !== 'function' && typeof Component !== 'object') {
        throw new Error(
          `lazyNamed: export "${String(exportName)}" is not a component`,
        );
      }
      return { default: Component as ComponentType<any> };
    },
    {
      ssr: options.ssr ?? true,
      loading: options.loading,
    },
  );
}
