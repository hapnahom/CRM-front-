'use client';

import { useEffect } from 'react';
import {
  setRequestSalesWorkflowMode,
  syncSalesWorkflowCookie,
  type SalesWorkflowMode,
} from '@/config/salesWorkflow';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/**
 * Reloads once when this organization's saved workflow differs from the
 * cookie used for server render (tenant switch, or a cleared cookie).
 */
export function SalesWorkflowProvider({
  mode,
  children,
}: {
  mode: SalesWorkflowMode;
  children: React.ReactNode;
}) {
  if (typeof window === 'undefined') {
    setRequestSalesWorkflowMode(mode);
  }

  const tenantId = useAuthenticationStore((state) => state.tenantId);

  useEffect(() => {
    if (!tenantId) return;
    const guardKey = 'crm-sales-workflow-sync';
    if (!syncSalesWorkflowCookie(tenantId)) {
      window.sessionStorage.removeItem(guardKey);
      return;
    }
    if (window.sessionStorage.getItem(guardKey) === tenantId) return;
    window.sessionStorage.setItem(guardKey, tenantId);
    window.location.reload();
  }, [tenantId]);

  return children;
}
