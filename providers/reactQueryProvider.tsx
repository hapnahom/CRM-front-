'use client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactNode, Suspense, useState } from 'react';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { Spin } from 'antd';

interface ReactQueryWrapperProps {
  children: ReactNode;
}

const FullPageSpinner = () => (
  <div className="w-full h-full fixed top-0 left-0 bg-surface-card opacity-75 z-50 flex justify-center items-center">
    <Spin size="large" />
  </div>
);

/**
 * When a request goes through apiClient, 401s are already handled transparently:
 * the interceptor force-refreshes the token and retries once. React Query only
 * sees a 401 error when:
 *   (a) the axios interceptor already tried to refresh and it failed (session dead), or
 *   (b) the request bypassed apiClient entirely.
 *
 * In case (a) the interceptor already called performLogout — nothing left to do here.
 * In case (b) we surface the error so the user sees something actionable.
 */
async function handle401(error: any): Promise<void> {
  // The interceptor already called performLogout if it ran and refresh failed.
  void error;
}

const ReactQueryWrapper: React.FC<ReactQueryWrapperProps> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prefer cache until stale; remounts / tab focus should not hammer the API.
            staleTime: 60_000,
            cacheTime: 10 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            retry: 1,
            onError: async (error: any) => {
              if (error?.response?.status === 401) {
                await handle401(error);
              } else if (process.env.NODE_ENV !== 'production') {
                // Expected client/business errors (4xx) are handled by feature UI.
                const status = error?.response?.status;
                if (!status || status >= 500) {
                  handleNetworkError(error);
                }
              }
            },
          },
          mutations: {
            onError: async (error: any) => {
              if (error?.response?.status === 401) {
                await handle401(error);
              } else if (process.env.NODE_ENV !== 'production') {
                const status = error?.response?.status;
                if (!status || status >= 500) {
                  handleNetworkError(error);
                }
              }
            },
            onSuccess: (data: any, variables: any, context: any) => {
              if (context?.skipSuccessMessage) return;
              const method =
                context?.method?.toUpperCase() ||
                variables?.method?.toUpperCase();
              const customMessage = context?.customMessage || undefined;
              handleSuccessMessage(method, customMessage);
            },
          },
        },
      }),
  );

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Suspense>
  );
};

export default ReactQueryWrapper;
