'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  loadTabFilters,
  saveTabFilters,
  type SalesHubTabId,
  type TabFiltersByTab,
} from '@/modules/sales-pipeline/tab-filter-preferences';

export function usePersistedSalesHubTabFilters<T extends SalesHubTabId>(
  tab: T,
  defaults: TabFiltersByTab[T],
): [
  TabFiltersByTab[T],
  (
    update:
      | Partial<TabFiltersByTab[T]>
      | ((prev: TabFiltersByTab[T]) => TabFiltersByTab[T]),
  ) => void,
] {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);
  const hydratedRef = useRef(false);
  const [state, setState] = useState<TabFiltersByTab[T]>(defaults);

  useEffect(() => {
    if (hydratedRef.current || !tenantId || !userId) return;
    const stored = loadTabFilters(tenantId, userId, tab);
    if (stored) {
      setState((prev) => ({ ...prev, ...stored }));
    }
    hydratedRef.current = true;
  }, [tab, tenantId, userId]);

  useEffect(() => {
    if (!hydratedRef.current || !tenantId || !userId) return;
    saveTabFilters(tenantId, userId, tab, state);
  }, [state, tab, tenantId, userId]);

  const update = useCallback(
    (
      update:
        | Partial<TabFiltersByTab[T]>
        | ((prev: TabFiltersByTab[T]) => TabFiltersByTab[T]),
    ) => {
      setState((prev) => {
        const next =
          typeof update === 'function'
            ? update(prev)
            : ({ ...prev, ...update } as TabFiltersByTab[T]);
        return next;
      });
    },
    [],
  );

  return [state, update];
}
