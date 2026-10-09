import { useQuery, type QueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  CustomerFilters,
  PaginatedCustomersResponse,
  CustomerDetail,
  CustomerListItem,
  CustomerPrimaryContact,
  CustomerVectorSummary,
  CustomerJourneyStageSummary,
  CustomerOwnerSummary,
  OrganizationSizeListResponse,
  CityListResponse,
  CountryListResponse,
  CountryOption,
  CustomerDashboardResponse,
  CustomerJourneyStage,
  CustomerNextAction,
  CustomerNameCheckResponse,
} from './types';
import {
  ALL_CURRENCIES,
  isAllCurrencies,
} from '@/modules/sales-pipeline/pipeline-filter';

function asMoneyMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const money: Record<string, number> = {};
  for (const [code, amount] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const numeric = Number(amount);
    if (!code || !Number.isFinite(numeric)) continue;
    money[code.trim().toUpperCase()] = numeric;
  }
  return money;
}

function resolveOrganizationSize(
  raw: Record<string, unknown>,
): string | undefined {
  const candidate =
    raw.organizationSize ?? raw.organization_size ?? raw.size ?? raw.orgSize;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }

  if (candidate && typeof candidate === 'object') {
    const nested = candidate as Record<string, unknown>;
    const value = nested.value ?? nested.label ?? nested.name;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
}

function normalizePrimaryContact(
  raw: unknown,
): CustomerPrimaryContact | null | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const contact = raw as Record<string, unknown>;
  return {
    id: String(contact.id),
    firstName: String(contact.firstName ?? contact.first_name ?? ''),
    lastName: String(contact.lastName ?? contact.last_name ?? ''),
    email: String(contact.email ?? ''),
    phoneNumber: String(contact.phoneNumber ?? contact.phone_number ?? ''),
    role:
      typeof contact.role === 'string' && contact.role.trim()
        ? contact.role
        : undefined,
  };
}

function normalizeVector(
  raw: unknown,
): CustomerVectorSummary | null | undefined {
  if (!raw || typeof raw !== 'object') return null;
  const vector = raw as Record<string, unknown>;
  if (!vector.id) return null;
  return {
    id: String(vector.id),
    name: String(vector.name ?? ''),
    description:
      typeof vector.description === 'string' ? vector.description : null,
  };
}

/** Coerce list API rows to the shape the UI expects (field-name tolerant). */
export function normalizeCustomerListItem(raw: unknown): CustomerListItem {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;

  const vector = normalizeVector(record.vector);
  const vectorId =
    typeof record.vectorId === 'string'
      ? record.vectorId
      : (vector?.id ?? null);

  return {
    id: String(record.id ?? ''),
    accountName: String(record.accountName ?? record.account_name ?? ''),
    city:
      typeof record.city === 'string' && record.city.trim()
        ? record.city
        : undefined,
    country: String(record.country ?? ''),
    vectorId,
    vector: vector ?? null,
    organizationSize: resolveOrganizationSize(record),
    leadsCount: Number(record.leadsCount ?? record.leads_count ?? 0),
    dealsCount: Number(record.dealsCount ?? record.deals_count ?? 0),
    website:
      typeof record.website === 'string' && record.website.trim()
        ? record.website
        : undefined,
    primaryContact: normalizePrimaryContact(
      record.primaryContact ?? record.primary_contact,
    ),
    journeyStageId:
      typeof record.journeyStageId === 'string' ? record.journeyStageId : null,
    journeyStage: normalizeJourneyStage(record.journeyStage),
    ownerUserId:
      typeof record.ownerUserId === 'string' ? record.ownerUserId : null,
    owner: normalizeOwner(record.owner),
    logoUrl: typeof record.logoUrl === 'string' ? record.logoUrl : null,
    openPipelineByCurrency: asMoneyMap(record.openPipelineByCurrency),
    openPipelineLabel:
      typeof record.openPipelineLabel === 'string'
        ? record.openPipelineLabel
        : '',
    lastActivityAt:
      typeof record.lastActivityAt === 'string' ? record.lastActivityAt : null,
    daysInStage: Number(record.daysInStage ?? 0),
    createdAt:
      typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

function normalizeJourneyStage(
  raw: unknown,
): CustomerJourneyStageSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const stage = raw as Record<string, unknown>;
  if (!stage.id) return null;
  return {
    id: String(stage.id),
    name: String(stage.name ?? ''),
    color: typeof stage.color === 'string' ? stage.color : null,
    sortOrder: Number(stage.sortOrder ?? 0),
    isTerminal: Boolean(stage.isTerminal),
    lifecycleGroup:
      typeof stage.lifecycleGroup === 'string' ? stage.lifecycleGroup : '',
  };
}

function normalizeOwner(raw: unknown): CustomerOwnerSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const owner = raw as Record<string, unknown>;
  if (!owner.id) return null;
  return {
    id: String(owner.id),
    selamnewId: typeof owner.selamnewId === 'string' ? owner.selamnewId : null,
    name: typeof owner.name === 'string' ? owner.name : null,
    firstName: typeof owner.firstName === 'string' ? owner.firstName : null,
    middleName: typeof owner.middleName === 'string' ? owner.middleName : null,
    lastName: typeof owner.lastName === 'string' ? owner.lastName : null,
    email: typeof owner.email === 'string' ? owner.email : null,
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403 || status === 404) {
    return false;
  }
  return failureCount < 3;
};

const fetchCustomers = async (
  filters: CustomerFilters,
): Promise<PaginatedCustomersResponse> => {
  const headers = await authHeaders();
  const params: Record<string, string | number> = {};

  if (filters.page != null) params.page = filters.page;
  if (filters.pageSize != null) params.pageSize = filters.pageSize;
  if (filters.searchTerm) params.searchTerm = filters.searchTerm;
  if (filters.city) params.city = filters.city;
  if (filters.country) params.country = filters.country;
  if (filters.vectorId) params.vectorId = filters.vectorId;
  if (filters.organizationSize) {
    params.organizationSize = filters.organizationSize;
  }
  if (filters.journeyStageId) params.journeyStageId = filters.journeyStageId;
  if (filters.ownerUserId) params.ownerUserId = filters.ownerUserId;
  if (filters.currency && !isAllCurrencies(filters.currency)) {
    params.currency = filters.currency.toUpperCase();
  }
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;

  const response = await crudRequest({
    url: `${CRM_URL}/customers`,
    method: 'GET',
    headers,
    params,
  });

  const rows = Array.isArray(response?.data) ? response.data : [];
  return {
    ...response,
    data: rows.map(normalizeCustomerListItem),
  };
};

export const useGetCustomers = (filters: CustomerFilters, enabled = true) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery<PaginatedCustomersResponse>(
    ['customers', filters, tenantId],
    () => fetchCustomers(filters),
    {
      keepPreviousData: true,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
      enabled: Boolean(tenantId) && enabled,
    },
  );
};

const fetchCustomerDetail = async (id: string): Promise<CustomerDetail> => {
  const headers = await authHeaders();
  const payload = await crudRequest({
    url: `${CRM_URL}/customers/${id}`,
    method: 'GET',
    headers,
  });
  return {
    ...payload,
    openPipelineByCurrency: asMoneyMap(payload?.openPipelineByCurrency),
    openPipelineLabel:
      typeof payload?.openPipelineLabel === 'string'
        ? payload.openPipelineLabel
        : '',
    wonRevenueByCurrency: asMoneyMap(payload?.wonRevenueByCurrency),
    wonRevenueLabel:
      typeof payload?.wonRevenueLabel === 'string'
        ? payload.wonRevenueLabel
        : '',
  };
};

export const useGetCustomerDetail = (id: string | null) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery<CustomerDetail>(
    ['customer-detail', id, tenantId],
    () => fetchCustomerDetail(id as string),
    {
      enabled: Boolean(id && tenantId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

const fetchCustomerOrganizationSizes =
  async (): Promise<OrganizationSizeListResponse> => {
    const headers = await authHeaders();
    return crudRequest({
      url: `${CRM_URL}/customers/organization-sizes`,
      method: 'GET',
      headers,
    });
  };

export const useGetCustomerOrganizationSizes = () => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery<OrganizationSizeListResponse>(
    ['customer-organization-sizes', tenantId],
    fetchCustomerOrganizationSizes,
    {
      staleTime: 60_000 * 10,
      enabled: Boolean(tenantId),
    },
  );
};

const fetchCustomerCities = async (
  country?: string,
): Promise<CityListResponse> => {
  const headers = await authHeaders();
  const params: Record<string, string> = {};
  if (country) params.country = country;

  return crudRequest({
    url: `${CRM_URL}/customers/cities`,
    method: 'GET',
    headers,
    params,
  }) as Promise<CityListResponse>;
};

export const useGetCustomerCities = (country?: string) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery<CityListResponse>(
    ['customer-cities', country, tenantId],
    () => fetchCustomerCities(country),
    {
      staleTime: 60_000 * 5,
      enabled: Boolean(tenantId),
      retry: retryUnlessUnauthorized,
    },
  );
};

export const useGetCustomerCountries = () => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<CountryListResponse>(
    ['customer-countries', tenantId],
    async () => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/customers/countries`,
        method: 'GET',
        headers,
      });
      const raw = (response?.countries ?? []) as Array<string | CountryOption>;
      return {
        defaultCountry:
          typeof response?.defaultCountry === 'string'
            ? response.defaultCountry
            : 'Ethiopia',
        countries: raw.map((item) =>
          typeof item === 'string'
            ? { name: item, code: '', flag: '' }
            : {
                name: String(item.name ?? ''),
                code: typeof item.code === 'string' ? item.code : '',
                flag: typeof item.flag === 'string' ? item.flag : '',
              },
        ),
      };
    },
    {
      staleTime: 60_000 * 10,
      enabled: Boolean(tenantId),
      retry: retryUnlessUnauthorized,
    },
  );
};

export function invalidateCustomersDashboard(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['customers'] });
  queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
  queryClient.invalidateQueries({ queryKey: ['customer-deals'] });
  queryClient.invalidateQueries({ queryKey: ['customer-leads'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-customers'] });
}

export const useGetCustomersDashboard = (
  enabled = true,
  currency: string = ALL_CURRENCIES,
) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const currencyParam = isAllCurrencies(currency)
    ? 'ALL'
    : currency.toUpperCase();
  return useQuery<CustomerDashboardResponse>(
    ['customers-dashboard', tenantId, currencyParam],
    async () => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/dashboard`,
        method: 'GET',
        headers,
        params: { currency: currencyParam },
      });
    },
    {
      keepPreviousData: true,
      staleTime: 10_000,
      refetchOnMount: true,
      enabled: Boolean(tenantId) && enabled,
      retry: retryUnlessUnauthorized,
    },
  );
};

export async function checkCustomerName(
  accountName: string,
): Promise<CustomerNameCheckResponse> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/customers/name-check`,
    method: 'GET',
    headers,
    params: { accountName },
  });
}

export const useGetJourneyStages = (enabled = true) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<CustomerJourneyStage[]>(
    ['customer-journey-stages', tenantId],
    async () => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/customer-journey-stages`,
        method: 'GET',
        headers,
      });
      return Array.isArray(response) ? response : [];
    },
    {
      staleTime: 60_000,
      enabled: Boolean(tenantId) && enabled,
      retry: retryUnlessUnauthorized,
    },
  );
};

export const useGetCustomerNextAction = (customerId: string | null) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<CustomerNextAction | null>(
    ['customer-next-action', customerId, tenantId],
    async () => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/customers/${customerId}/next-action`,
        method: 'GET',
        headers,
      });
      return response ?? null;
    },
    {
      enabled: Boolean(customerId && tenantId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

export const useGetCustomerDeals = (
  customerId: string | null,
  enabled = true,
) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<Record<string, unknown>[]>(
    ['customer-deals', customerId, tenantId],
    async () => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/deals`,
        method: 'GET',
        headers,
        params: { customerId, page: 1, pageSize: 200 },
      });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      return [];
    },
    {
      enabled: Boolean(customerId && tenantId) && enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

export const useGetCustomerLeads = (
  customerId: string | null,
  enabled = true,
) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<Record<string, unknown>[]>(
    ['customer-leads', customerId, tenantId],
    async () => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/leads`,
        method: 'GET',
        headers,
        params: { customerId, page: 1, pageSize: 200 },
      });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      return [];
    },
    {
      enabled: Boolean(customerId && tenantId) && enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
};
