import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';

// --- Interfaces ---
export enum CustomFieldType {
  CHECKBOX = 'checkbox',
  INPUTFIELD = 'inputfield',
  DROPDOWN = 'dropdown',
}

export enum CustomFieldAssociation {
  LEAD = 'lead',
  DEAL = 'deal',
  BOTH = 'both',
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType; // Match backend enum exactly
  fieldValues?: any[]; // Optional array for dropdown values
  isRequired: boolean;
  association?: CustomFieldAssociation; // Field association enum
  description?: string; // Optional field description
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldsResponse {
  data: CustomField[];
  total: number;
  page: number;
  limit: number;
}

// --- API Functions ---
const fetchCustomFields = async (): Promise<CustomField[]> => {
  try {
    const token = await getCurrentToken();

    // Get tenant ID for authentication
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
      url: `${CRM_URL}/custom-fields`,
      method: 'GET',
      headers,
    });

    // Handle different response structures
    if (Array.isArray(response)) {
      return response;
    } else if (response?.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response?.items && Array.isArray(response.items)) {
      return response.items;
    }

    return [];
  } catch (error) {
    return [];
  }
};

// --- React Query Hooks ---
export const useGetCustomFields = () => {
  const query = useQuery({
    queryKey: ['customFields'],
    queryFn: fetchCustomFields,
    staleTime: 0, // Always consider data stale for immediate updates
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return query;
};

// --- Utility Functions ---
export const separateCustomFields = (customFields: CustomField[]) => {
  if (!customFields || !Array.isArray(customFields)) {
    return { required: [], optional: [] };
  }

  const required = customFields.filter((field) => field.isRequired);
  const optional = customFields.filter((field) => !field.isRequired);

  return { required, optional };
};
