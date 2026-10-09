import { crudRequest } from '@/utils/crudRequest';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Company,
  DealType,
  DealSource,
  DealStage,
  Sector,
  Solution,
  Supplier,
  Role,
  Employee,
  DealWithDetails,
  CreateDealRequest,
} from '@/types/deals';
import { Currency } from '@/types/tenant-management';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';

// Removed PaginatedResponse interface as pagination is not needed

const getHeaders = async () => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;

  if (!tenantId) {
    throw new Error(
      'Tenant ID not found. Please ensure you are properly authenticated.',
    );
  }

  return {
    tenantId: tenantId,
    Authorization: `Bearer ${token}`,
  };
};

// Company queries
export const useGetCompanies = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Company[]>(
    ['companies', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/companies`,
          method: 'GET',
          headers,
        });

        // Backend returns paginated data: { data: Company[], pagination: {...} }
        // Extract just the data array for the frontend
        return response?.data || [];
      } catch (error) {
        return [];
      }
    },
    {
      keepPreviousData: true,
      staleTime: 0, // Always consider data stale for immediate updates
      cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      enabled: !!tenantId,
    },
  );
};

// Deal Type queries
export const useGetDealTypes = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<DealType[]>(
    ['dealTypes', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/opportunity-types`,
          method: 'GET',
          headers,
        });

        const isDealScoped = (t: { appliesTo?: string }) =>
          !t.appliesTo || t.appliesTo === 'DEAL' || t.appliesTo === 'BOTH';

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data.filter(isDealScoped);
        }
        if (Array.isArray(response)) {
          return response.filter(isDealScoped);
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      enabled: !!tenantId,
    },
  );
};

// Deal Source queries
export const useGetDealSources = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<DealSource[]>(
    ['dealSources', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/source`,
          method: 'GET',
          headers,
        });

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Deal Stage queries
export const useGetDealStages = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<DealStage[]>(
    ['deal-stages', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/deal-stage`,
          method: 'GET',
          headers,
        });

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      enabled: !!tenantId, // Only run query if tenantId is available
    },
  );
};

// Sector queries
export const useGetSectors = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Sector[]>(
    ['sectors', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/sectors`,
          method: 'GET',
          headers,
        });

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Solution queries
export const useGetSolutions = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Solution[]>(
    ['solutions', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/solution`,
          method: 'GET',
          headers,
        });

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Supplier queries
export const useGetSuppliers = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Supplier[]>(
    ['suppliers', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/suppliers`,
          method: 'GET',
          headers,
        });

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Role queries
export const useGetRoles = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Role[]>(
    ['roles', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/roles`,
          method: 'GET',
          headers,
        });

        // Handle different response formats consistently
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Employee queries — CRM users from the CRM backend
export const useGetEmployees = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Employee[]>(
    ['employees', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/users?pageSize=1000`,
          method: 'GET',
          headers,
        });

        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      enabled: !!tenantId,
    },
  );
};

// Currency queries — org-enabled currencies from tenant_currencies
export const useGetCurrencies = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Currency[]>(
    ['currencies', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/tenant-currency`,
          method: 'GET',
          headers,
        });

        const tenantCurrencies = Array.isArray(response) ? response : [];
        return tenantCurrencies
          .map((entry: { currency?: Currency }) => entry.currency)
          .filter((currency): currency is Currency => Boolean(currency));
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Organizational Structure queries — CRM-owned departments (local DB)
export const useGetDepartments = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<any[]>(
    ['departments', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/departments`,
          method: 'GET',
          headers,
          params: { page: 1, pageSize: 100 },
        });

        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

export const useGetBranches = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<any[]>(
    ['branches', tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/org-structure/branches`,
          method: 'GET',
          headers,
        });

        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      enabled: !!tenantId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );
};

// Deal queries with details
export const useGetDealsWithDetails = (filters?: any) => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<DealWithDetails[]>(
    ['dealsWithDetails', filters, tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const params = new URLSearchParams();

        // Add pagination parameters to get all deals
        params.append('page', '1');
        params.append('limit', '1000'); // Large limit to get all deals

        // Add filters
        if (filters) {
          Object.keys(filters).forEach((key) => {
            if (
              filters[key] !== undefined &&
              filters[key] !== null &&
              filters[key] !== ''
            ) {
              params.append(key, filters[key].toString());
            }
          });
        }

        const url = `${CRM_URL}/deals/with-details?${params.toString()}`;
        const response = await crudRequest({
          url,
          method: 'GET',
          headers,
        });

        // Handle paginated response format from backend
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Fallback for non-paginated response
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      enabled: !!tenantId,
    },
  );
};

// Filtered deals query with parameters
export const useGetFilteredDeals = (filters?: {
  engagementStageId?: string;
  companyId?: string;
  dealTypeId?: string;
  owner?: string;
  source?: string;
  sector?: string;
  supplier?: string;
  solution?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  return useQuery(
    ['filteredDeals', filters],
    async () => {
      const headers = await getHeaders();

      // Build query string from filters
      const queryParams = new URLSearchParams();

      if (filters?.engagementStageId)
        queryParams.append('engagementStageId', filters.engagementStageId);
      if (filters?.companyId)
        queryParams.append('companyId', filters.companyId);
      if (filters?.dealTypeId)
        queryParams.append('dealTypeId', filters.dealTypeId);
      if (filters?.owner) queryParams.append('owner', filters.owner);
      if (filters?.source) queryParams.append('source', filters.source);
      if (filters?.sector) queryParams.append('sector', filters.sector);
      if (filters?.supplier) queryParams.append('supplier', filters.supplier);
      if (filters?.solution) queryParams.append('solution', filters.solution);
      if (filters?.currency) queryParams.append('currency', filters.currency);
      if (filters?.minAmount)
        queryParams.append('minAmount', filters.minAmount.toString());
      if (filters?.maxAmount)
        queryParams.append('maxAmount', filters.maxAmount.toString());
      if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters?.sortOrder)
        queryParams.append('sortOrder', filters.sortOrder);

      const queryString = queryParams.toString();
      const url = queryString
        ? `${CRM_URL}/deals/with-details?${queryString}`
        : `${CRM_URL}/deals/with-details`;

      return await crudRequest({
        url,
        method: 'GET',
        headers,
      });
    },
    {
      enabled: !!filters && Object.keys(filters).length > 0,
      keepPreviousData: true, // Keep previous results while loading new ones
    },
  );
};

// Get individual deal details
export const useGetDealDetails = (dealId: string) => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<DealWithDetails>(
    ['dealDetails', dealId, tenantId],
    async () => {
      try {
        const headers = await getHeaders();
        const response = await crudRequest({
          url: `${CRM_URL}/deals/${dealId}`,
          method: 'GET',
          headers,
        });

        // Handle response format consistently - backend returns direct object
        if (response && response.data) {
          return response.data;
        }
        return response;
      } catch (error) {
        throw error;
      }
    },
    {
      enabled: !!dealId && !!tenantId, // Only fetch if dealId and tenantId are provided
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
};

// Get deal activities/history
export const useGetDealActivities = (dealId: string) => {
  return useQuery(
    ['dealActivities', dealId],
    async () => {
      const headers = await getHeaders();
      return await crudRequest({
        url: `${CRM_URL}/deals/${dealId}/activities`,
        method: 'GET',
        headers,
      });
    },
    {
      enabled: !!dealId, // Only fetch if dealId is provided
    },
  );
};

// Update deal stage
export const useUpdateDealStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ dealId, newStageId }: { dealId: string; newStageId: string }) => {
      const headers = await getHeaders();
      return await crudRequest({
        url: `${CRM_URL}/deals/${dealId}`,
        method: 'PATCH',
        headers,
        data: {
          engagementStageId: newStageId,
        },
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('dealsWithDetails');
      },
    },
  );
};

// Update stage name
export const useUpdateStageName = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ stageId, newName }: { stageId: string; newName: string }) => {
      const headers = await getHeaders();
      return await crudRequest({
        url: `${CRM_URL}/deal-stage/${stageId}`,
        method: 'PATCH',
        headers,
        data: {
          name: newName,
        },
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deal-stages');
        queryClient.invalidateQueries('deal-stages-settings');
      },
    },
  );
};

// Create new stage
export const useCreateStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      name,
      colorCode,
      level,
    }: {
      name: string;
      colorCode: string;
      level: number;
    }) => {
      const headers = await getHeaders();
      return await crudRequest({
        url: `${CRM_URL}/deal-stage`,
        method: 'POST',
        headers,
        data: {
          name,
          description: `Stage: ${name}`,
          level,
          colorCode,
          tenantId: headers.tenantId,
        },
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deal-stages');
        queryClient.invalidateQueries('deal-stages-settings');
      },
    },
  );
};

// Bulk update stage levels
export const useBulkUpdateStageLevels = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      stageUpdates,
    }: {
      stageUpdates: Array<{ id: string; level: number }>;
    }) => {
      const headers = await getHeaders();

      // Update each stage level
      const updatePromises = stageUpdates.map(({ id, level }) =>
        crudRequest({
          url: `${CRM_URL}/deal-stage/${id}`,
          method: 'PATCH',
          headers,
          data: { level },
        }),
      );

      return await Promise.all(updatePromises);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deal-stages');
        queryClient.invalidateQueries('deal-stages-settings');
      },
    },
  );
};

// Deal CRUD mutations
export const useCreateDeal = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation(
    async (dealData: Partial<CreateDealRequest>) => {
      try {
        const headers = await getHeaders();

        // Create FormData for file upload support
        const formData = new FormData();

        // Validate required fields before sending
        const requiredFields = [
          'dealName',
          'companyId',
          'supplierId',
          'contactPersonName',
          'contactPersonEmail',
          'contactPersonPhoneNumber',
          'sourceId',
          'sectorId',
          'dealTypeId',
          'engagementStageId',
        ];

        for (const field of requiredFields) {
          if (!dealData[field as keyof CreateDealRequest]) {
            throw new Error(`Required field ${field} is missing`);
          }
        }

        // Add all deal fields to FormData
        Object.keys(dealData).forEach((key) => {
          const value = (dealData as any)[key];
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              formData.append(key, value.join(','));
            } else if (value instanceof File) {
              formData.append('dealDocument', value);
            } else {
              formData.append(key, value.toString());
            }
          }
        });

        // Add tenantId
        if (tenantId) {
          formData.append('tenantId', tenantId);
        }

        return await crudRequest({
          url: `${CRM_URL}/deals`,
          method: 'POST',
          headers,
          data: formData,
        });
      } catch (error) {
        throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['dealsWithDetails']);
        queryClient.invalidateQueries(['deals']);
        queryClient.invalidateQueries(['dealDetails']);
      },
      onError: () => {},
    },
  );
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({
      dealId,
      dealData,
    }: {
      dealId: string;
      dealData: Partial<CreateDealRequest>;
    }) => {
      try {
        const headers = await getHeaders();

        return await crudRequest({
          url: `${CRM_URL}/deals/${dealId}`,
          method: 'PATCH',
          headers,
          data: dealData,
        });
      } catch (error) {
        throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['dealsWithDetails']);
        queryClient.invalidateQueries(['deals']);
        queryClient.invalidateQueries(['dealDetails']);
      },
      onError: () => {},
    },
  );
};

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async (dealId: string) => {
      try {
        const headers = await getHeaders();

        return await crudRequest({
          url: `${CRM_URL}/deals/${dealId}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['dealsWithDetails']);
        queryClient.invalidateQueries(['deals']);
        queryClient.invalidateQueries(['dealDetails']);
      },
      onError: () => {},
    },
  );
};
