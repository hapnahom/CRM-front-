'use client';

// TODO: Replace localStorage-backed activity with a server-backed activity API.

import { useCallback, useEffect, useState } from 'react';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  appendCustomerActivityLog,
  createActivityLogEntry,
  readCustomerActivityLog,
  type CustomerActivityKind,
  type CustomerActivityLogEntry,
} from '@/utils/customerActivityLog';

export function useCustomerActivityLog(customerId: string) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const [entries, setEntries] = useState<CustomerActivityLogEntry[]>([]);

  const reload = useCallback(() => {
    if (!tenantId || !customerId) {
      setEntries([]);
      return;
    }
    setEntries(readCustomerActivityLog(tenantId, customerId));
  }, [tenantId, customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const logActivity = useCallback(
    (text: string, kind: CustomerActivityKind) => {
      if (!tenantId || !customerId) return;
      const entry = appendCustomerActivityLog(
        tenantId,
        customerId,
        createActivityLogEntry(text, kind),
      );
      setEntries((prev) => [entry, ...prev]);
    },
    [tenantId, customerId],
  );

  const logActivities = useCallback(
    (items: { text: string; kind: CustomerActivityKind; date?: string }[]) => {
      if (!tenantId || !customerId) return;
      const created: CustomerActivityLogEntry[] = [];
      for (const item of items) {
        const ts = item.date ? new Date(item.date) : new Date();
        created.push(
          appendCustomerActivityLog(
            tenantId,
            customerId,
            createActivityLogEntry(item.text, item.kind, ts),
          ),
        );
      }
      setEntries((prev) => [...created.reverse(), ...prev]);
    },
    [tenantId, customerId],
  );

  return {
    entries,
    logActivity,
    logActivities,
    reload,
  };
}
