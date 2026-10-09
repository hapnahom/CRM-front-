import { useQuery } from 'react-query';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  EngagementStage,
  Company,
  Source,
  Solution,
  Sector,
  Currency,
  Role,
} from '../interface';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';

export function useEngagementStagesQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['engagement-stages', tenantId],
    queryFn: async (): Promise<EngagementStage[]> => {
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
          url: `${CRM_URL}/engagement-stage`,
          method: 'GET',
          headers,
        });

        // Handle different response formats
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
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}

export function useCompaniesQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['companies', tenantId],
    queryFn: async (): Promise<Company[]> => {
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
          url: `${CRM_URL}/companies`,
          method: 'GET',
          headers,
        });

        // Handle different response formats
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
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}

export function useCampaignsQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['marketing-campaigns', tenantId],
    queryFn: async (): Promise<Source[]> => {
      try {
        const token = await getCurrentToken();

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
          url: `${CRM_URL}/marketing/campaigns`,
          method: 'GET',
          headers,
        });

        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        return rows.map((campaign: { id: string; name: string }) => ({
          id: campaign.id,
          name: campaign.name,
        }));
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}

/** @deprecated Use useCampaignsQuery — lead sources were replaced by marketing campaigns. */
export function useSourcesQuery() {
  return useCampaignsQuery();
}

export function useSolutionsQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['solutions', tenantId],
    queryFn: async (): Promise<Solution[]> => {
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
          url: `${CRM_URL}/solution`,
          method: 'GET',
          headers,
        });

        // Handle paginated response from backend
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }

        // Fallback for direct array response
        if (Array.isArray(response)) {
          return response;
        }

        // If no valid data structure found
        return [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}

export function useSectorsQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['sectors', tenantId],
    queryFn: async (): Promise<Sector[]> => {
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
          url: `${CRM_URL}/sectors`,
          method: 'GET',
          headers,
        });

        // Handle different response formats
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
    staleTime: 10 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}

export function useCurrenciesQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['currencies', tenantId],
    queryFn: async (): Promise<Currency[]> => {
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
          url: `${CRM_URL}/currencies`,
          method: 'GET',
          headers,
        });

        // Handle different response formats
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
    staleTime: 10 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}

export function useRolesQuery() {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['roles', tenantId],
    queryFn: async (): Promise<Role[]> => {
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
          url: `${CRM_URL}/roles`,
          method: 'GET',
          headers,
        });

        // Handle different response formats
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
    staleTime: 10 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId,
  });
}
