import { useQuery } from 'react-query';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { LeadDocument } from '../interface';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';

export function useLeadDocumentsQuery(leadId: string) {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['lead-documents', leadId, tenantId],
    queryFn: async (): Promise<LeadDocument[]> => {
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
          url: `${CRM_URL}/lead-documents/lead/${leadId}`,
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
    enabled: !!leadId && !!tenantId,
  });
}

export function useLeadDocumentQuery(
  leadDocumentId: string | null | undefined,
) {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['lead-document', leadDocumentId, tenantId],
    queryFn: async (): Promise<LeadDocument | null> => {
      if (!leadDocumentId) return null;

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
          url: `${CRM_URL}/lead-documents/${leadDocumentId}`,
          method: 'GET',
          headers,
        });

        return response;
      } catch (error) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!tenantId && !!leadDocumentId,
  });
}
