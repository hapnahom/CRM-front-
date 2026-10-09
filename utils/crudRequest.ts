import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { AxiosRequestConfig, Method, ResponseType } from 'axios';
import apiClient from './apiClient';
import { getCurrentToken } from './getCurrentToken';
import { tenantHeadersFromStoreTenantId } from './serviceRequestTenantHeaders';

interface RequestParams {
  url: string;
  method: Method;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  responseType?: ResponseType;
}

/**
 * Authenticated CRM HTTP helper.
 *
 * All calls go through `apiClient`, which:
 *  1. Attaches a fresh Firebase ID token on the way out
 *  2. On 401, force-refreshes via Firebase refresh token and retries once
 *  3. Logs out only if that refresh fails (session truly dead)
 */
export const crudRequest = async ({
  url,
  method,
  data,
  headers = {},
  params,
  responseType,
}: RequestParams) => {
  const { userId, tenantId } = useAuthenticationStore.getState();
  const requestTenantId = headers.tenantId ?? tenantId;
  const explicitTenantHeader = headers.tenantId;
  const hasExplicitTenantHeader = Boolean(explicitTenantHeader);
  const restHeaders = headers;
  const tenantHeaders = hasExplicitTenantHeader
    ? { tenantId: String(explicitTenantHeader).trim() }
    : tenantHeadersFromStoreTenantId(requestTenantId);

  // Proactively refresh near-expiry tokens so callers with a stale Bearer
  // from an earlier getCurrentToken() still succeed without a 401 round-trip.
  const token = await getCurrentToken();

  headers = {
    ...restHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeaders,
  };

  try {
    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      params,
    };

    if (data) config.data = data;
    if (responseType) config.responseType = responseType;

    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    throw error;
  }
};
