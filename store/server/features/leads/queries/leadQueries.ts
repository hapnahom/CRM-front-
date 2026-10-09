import { useQuery } from 'react-query';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  PaginatedResponse,
  LeadFilters,
  Lead,
  LeadAttachment,
} from '../interface';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';

export function useLeadsQuery(filters: LeadFilters) {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['leads', filters, tenantId],
    queryFn: async (): Promise<PaginatedResponse<Lead> | Lead[]> => {
      try {
        const token = await getCurrentToken();

        // Validate that tenant ID exists
        if (!tenantId) {
          throw new Error(
            'Tenant ID not found. Please ensure you are properly authenticated.',
          );
        }

        const headers = {
          tenantId: tenantId,
          Authorization: `Bearer ${token}`,
        };

        const response = await crudRequest({
          url: `${CRM_URL}/leads`,
          method: 'GET',
          headers,
          params: filters,
        });

        return response;
      } catch (error: any) {
        if (error.response?.status === 204) {
          return {
            data: [],
            pagination: {
              totalItems: 0,
              currentPage: 1,
              itemsPerPage: 10,
              totalPages: 0,
            },
          };
        } else if (error.response?.status === 404) {
          throw new Error('No leads found matching your search criteria');
        } else if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (error.response?.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(
            error.response?.data?.message || 'Failed to fetch leads',
          );
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    enabled: !!tenantId,
  });
}

export function useLeadsWithNamesQuery(filters: LeadFilters) {
  const leadsResponse = useLeadsQuery(filters);

  if (leadsResponse.isLoading || leadsResponse.error) {
    return leadsResponse;
  }

  try {
    const result = {
      ...leadsResponse,
      data: leadsResponse.data,
    };

    return result;
  } catch (error) {
    return leadsResponse;
  }
}

export function useGetLeadDetail(leadId: string) {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['lead-detail', leadId, tenantId],
    queryFn: async (): Promise<Lead> => {
      try {
        const token = await getCurrentToken();

        // Validate that tenant ID exists
        if (!tenantId) {
          throw new Error(
            'Tenant ID not found. Please ensure you are properly authenticated.',
          );
        }

        const headers = {
          tenantId: tenantId,
          Authorization: `Bearer ${token}`,
        };

        const response = await crudRequest({
          url: `${CRM_URL}/leads/${leadId}`,
          method: 'GET',
          headers,
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!leadId && !!tenantId,
  });
}

export function useGetLeadAttachments(leadId: string) {
  const { tenantId } = useAuthenticationStore();
  return useQuery({
    queryKey: ['lead-attachments', leadId, tenantId],
    queryFn: async (): Promise<LeadAttachment[]> => {
      try {
        const token = await getCurrentToken();

        // Validate that tenant ID exists
        if (!tenantId) {
          throw new Error(
            'Tenant ID not found. Please ensure you are properly authenticated.',
          );
        }

        const headers = {
          tenantId: tenantId,
          Authorization: `Bearer ${token}`,
        };

        const response = await crudRequest({
          url: `${CRM_URL}/leads/${leadId}`,
          method: 'GET',
          headers,
        });

        return response.attachments || [];
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!leadId && !!tenantId,
  });
}

const getLeads = async (): Promise<Lead[]> => {
  try {
    const token = await getCurrentToken();

    // Get tenant ID dynamically inside the function
    const tenantId = useAuthenticationStore.getState().tenantId;

    // Validate that tenant ID exists
    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/leads?page=1&size=1000`, // Request large page size to get all leads
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * @deprecated Use `usePipelineLeadOptions` from pipeline/queries for paginated lead dropdowns.
 */
export const useGetLeads = () => {
  return useQuery<Lead[]>(['leads'], getLeads, {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    // eslint-disable-next-line
    onError: (error: any) => {
      // Error handling will be done in components using handleNetworkError
    },
  });
};
