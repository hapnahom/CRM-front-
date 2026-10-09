import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/utils/firebaseConfig';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken, isTokenFresh } from '@/utils/getCurrentToken';

let isRefreshing = false;

type QueueItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let refreshQueue: QueueItem[] = [];

function flushQueue(err: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) =>
    err ? reject(err) : resolve(token as string),
  );
  refreshQueue = [];
}

/**
 * Force-refresh the Firebase ID token via the SDK refresh token.
 * Waits for auth persistence restore before treating the session as dead.
 */
async function refreshIdToken(): Promise<string> {
  await auth.authStateReady();

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('no-current-user');
  }

  const newToken = await getCurrentToken(true);
  if (!newToken || !isTokenFresh(newToken, 0)) {
    throw new Error('token-refresh-failed');
  }

  useAuthenticationStore.getState().setToken(newToken);
  return newToken;
}

const apiClient = axios.create();

// Ensure every outbound request carries a fresh Bearer token when possible.
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getCurrentToken();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Leave existing Authorization header if refresh is unavailable.
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retryRequest?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retryRequest) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        originalRequest._retryRequest = true;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;
    originalRequest._retryRequest = true;

    try {
      const newToken = await refreshIdToken();

      if (originalRequest.headers) {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      }

      flushQueue(null, newToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);

      // Only force logout when Firebase session is truly gone / unrefreshable.
      const { performLogout } = await import('@/utils/logout');
      performLogout(true);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
