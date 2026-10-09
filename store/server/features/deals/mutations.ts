import { dealUiLabel } from '@/config/salesWorkflow';
import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { requestHeader } from '@/helpers/requestHeader';
import { Deal, CreateDealRequest } from '@/types/deals';
import { invalidateCustomersDashboard } from '@/store/server/features/customers/queries';

// Create Deal Mutation
export const useCreateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation<Deal, Error, CreateDealRequest>(
    async (dealData: CreateDealRequest) => {
      const headers = await requestHeader();

      // Handle file upload with FormData
      if (dealData.dealDocument && dealData.dealDocument instanceof File) {
        const formData = new FormData();

        // Add all non-file fields
        Object.keys(dealData).forEach((key) => {
          if (key !== 'dealDocument') {
            const value = (dealData as any)[key];
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                value.forEach((item) => formData.append(key, item));
              } else {
                formData.append(key, value);
              }
            }
          }
        });

        // Add the file
        formData.append('dealDocument', dealData.dealDocument);

        // Remove Content-Type header to let browser set it with boundary for FormData
        const {
          'Content-Type': contentTypeHeader, // eslint-disable-line @typescript-eslint/no-unused-vars
          ...headersWithoutContentType
        } = headers as any;

        return await crudRequest({
          url: `${CRM_URL}/deals`,
          method: 'POST',
          headers: headersWithoutContentType,
          data: formData,
        });
      } else {
        // No file upload, send as regular JSON
        return await crudRequest({
          url: `${CRM_URL}/deals`,
          method: 'POST',
          headers,
          data: dealData,
        });
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals');
        queryClient.invalidateQueries('companies');
        queryClient.invalidateQueries('dealTypes');
        queryClient.invalidateQueries('dealSources');
        queryClient.invalidateQueries('dealStages');
        queryClient.invalidateQueries('sectors');
        queryClient.invalidateQueries('solutions');
        queryClient.invalidateQueries('suppliers');
        queryClient.invalidateQueries('roles');
        invalidateCustomersDashboard(queryClient);
      },
      // Provide method and custom message for global success handler
      onMutate: () => {
        return {
          method: 'POST',
          customMessage: `${dealUiLabel()} created successfully!`,
        };
      },
    },
  );
};

// Update Deal Mutation
export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Deal,
    Error,
    { id: string; data: Partial<CreateDealRequest> }
  >(
    async ({ id, data }) => {
      const headers = await requestHeader();
      return await crudRequest({
        url: `${CRM_URL}/deals/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    {
      onSuccess: () => {
        // Invalidate and refetch deals list
        queryClient.invalidateQueries('deals');
        invalidateCustomersDashboard(queryClient);
      },
    },
  );
};

// Delete Deal Mutation
export const useDeleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>(
    async (dealId: string) => {
      const headers = await requestHeader();
      return await crudRequest({
        url: `${CRM_URL}/deals/${dealId}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => {
        // Invalidate and refetch deals list
        queryClient.invalidateQueries('deals');
        invalidateCustomersDashboard(queryClient);
      },
    },
  );
};
