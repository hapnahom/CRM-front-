import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { CRM_URL } from '@/utils/constants';
import { Lead } from '../interface';
import NotificationMessage from '@/components/common/notification/notificationMessage';

// --- Interfaces ---
export interface CreateLeadInput {
  name: string;
  contactPersonFName?: string;
  contactPersonLName?: string;
  contactPersonPosition?: string;
  contactPersonEmail?: string;
  contactPersonPhoneNumber?: string;
  companyId?: string;
  supplierId?: string;
  solutionId?: string[];
  leadOwner?: string;
  leadTypeId?: string;
  sectorId?: string;
  campaignId?: string;
  engagementStageId?: string;
  estimatedBudgets?: Array<{ amount: number; currency: string }>;
  additionalInformation?: string;
  leadRate?: number;
  createdDate?: string;
  [key: string]: any;
}

export interface LeadResponse {
  id: string;
  name: string;
  contactPersonFName?: string;
  contactPersonLName?: string;
  contactPersonPosition?: string;
  contactPersonEmail?: string;
  contactPersonPhoneNumber?: string;
  companyId?: string;
  supplierId?: string;
  solutionId?: string[];
  leadOwner?: string;
  leadTypeId?: string;
  sectorId?: string;
  campaignId?: string;
  engagementStageId?: string;
  estimatedBudgets?: Array<{ amount: number; currency: string }>;
  additionalInformation?: string;
  leadRate?: number;
  createdDate?: string;
  tenantId: string;
  [key: string]: any;
}

// --- API Service Function ---

/**
 * Creates a new lead.
 */
const createLead = async (data: CreateLeadInput): Promise<LeadResponse> => {
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
      url: `${CRM_URL}/leads`,
      method: 'POST',
      data: data,
      headers,
      // skipEncryption: true, // Disable encryption for this request
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hooks ---

/**
 * Hook for creating a lead.
 */
export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation(createLead, {
    // eslint-disable-next-line
    onSuccess: (data) => {
      queryClient.invalidateQueries(['leads']);
      handleSuccessMessage('POST');
    },
    // eslint-disable-next-line
    onError: (error: any) => {
      // Error handling - no logging needed
    },
  });
};

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: string;
      data: Partial<Lead>;
    }) => {
      try {
        const token = await getCurrentToken();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await crudRequest({
          url: `${CRM_URL}/leads/${leadId}`,
          method: 'PATCH',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
          data: data,
          signal: controller.signal,
        } as any);

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onMutate: async ({ leadId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      await queryClient.cancelQueries({ queryKey: ['lead-detail', leadId] });

      // Snapshot the previous values
      const previousLeads = queryClient.getQueriesData({ queryKey: ['leads'] });
      const previousLeadDetail = queryClient.getQueryData([
        'lead-detail',
        leadId,
      ]);

      // Optimistically update the lead detail in cache
      queryClient.setQueryData(['lead-detail', leadId], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, ...data };
      });

      // Optimistically update all leads queries in cache
      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) return oldData;

        // If it's a paginated response
        if (oldData.data && Array.isArray(oldData.data)) {
          const updatedData = {
            ...oldData,
            data: oldData.data.map((lead: any) => {
              if (lead.id === leadId) {
                return { ...lead, ...data };
              }
              return lead;
            }),
          };
          return updatedData;
        }

        // If it's a direct array
        if (Array.isArray(oldData)) {
          const updatedData = oldData.map((lead: any) => {
            if (lead.id === leadId) {
              return { ...lead, ...data };
            }
            return lead;
          });
          return updatedData;
        }

        return oldData;
      });

      // Return a context object with the snapshotted values
      return { previousLeads, previousLeadDetail };
    },
    onSuccess: (data, variables) => {
      // Show success notification
      handleSuccessMessage('PATCH', 'Lead updated successfully');

      // Update the cache with the actual response data to ensure consistency
      queryClient.setQueryData(['lead-detail', variables.leadId], data);

      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) return oldData;

        // If it's a paginated response
        if (oldData.data && Array.isArray(oldData.data)) {
          const updatedData = {
            ...oldData,
            data: oldData.data.map((lead: any) => {
              if (lead.id === variables.leadId) {
                return { ...lead, ...data };
              }
              return lead;
            }),
          };
          return updatedData;
        }

        // If it's a direct array
        if (Array.isArray(oldData)) {
          const updatedData = oldData.map((lead: any) => {
            if (lead.id === variables.leadId) {
              return { ...lead, ...data };
            }
            return lead;
          });
          return updatedData;
        }

        return oldData;
      });
    },
    onError: (unusedError, variables, context) => {
      // Show error notification
      NotificationMessage.error({
        message: 'Lead Update Failed',
        description: 'Failed to update lead. Please try again.',
      });

      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousLeadDetail) {
        queryClient.setQueryData(
          ['lead-detail', variables.leadId],
          context.previousLeadDetail,
        );
      }

      if (context?.previousLeads) {
        context.previousLeads.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

export function useDeleteLeadMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (leadId: string) => {
      try {
        const token = await getCurrentToken();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await crudRequest({
          url: `${CRM_URL}/leads/${leadId}`,
          method: 'DELETE',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        } as any);

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, leadId) => {
      // Show success notification
      handleSuccessMessage('DELETE', 'Lead deleted successfully');

      // Remove the lead from all queries
      queryClient.removeQueries({ queryKey: ['lead-detail', leadId] });

      // Update all leads queries to remove the deleted lead
      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) return oldData;

        // If it's a paginated response
        if (oldData.data && Array.isArray(oldData.data)) {
          const updatedData = {
            ...oldData,
            data: oldData.data.filter((lead: any) => lead.id !== leadId),
            pagination: {
              ...oldData.pagination,
              totalItems: oldData.pagination.totalItems - 1,
            },
          };
          return updatedData;
        }

        // If it's a direct array
        if (Array.isArray(oldData)) {
          return oldData.filter((lead: any) => lead.id !== leadId);
        }

        return oldData;
      });
    },
    onError: () => {
      // Show error notification
      NotificationMessage.error({
        message: 'Lead Deletion Failed',
        description: 'Failed to delete lead. Please try again.',
      });
    },
  });
}
