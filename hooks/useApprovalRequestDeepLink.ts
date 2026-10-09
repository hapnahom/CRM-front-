'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const APPROVAL_REQUEST_QUERY_KEY = 'approvalRequestId';

/** Read / clear `?approvalRequestId=` from the current URL for deep-link UX. */
export function useApprovalRequestDeepLink() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const approvalRequestId = useMemo(() => {
    const raw = searchParams.get(APPROVAL_REQUEST_QUERY_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  }, [searchParams]);

  const clearApprovalRequestId = useCallback(() => {
    if (!searchParams.has(APPROVAL_REQUEST_QUERY_KEY)) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete(APPROVAL_REQUEST_QUERY_KEY);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const setApprovalRequestId = useCallback(
    (requestId: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(APPROVAL_REQUEST_QUERY_KEY, requestId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    approvalRequestId,
    clearApprovalRequestId,
    setApprovalRequestId,
  };
}
