import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { ActivityDocument } from './types';

// --- API Service Functions ---

/**
 * Fetches all activity documents for the current tenant.
 */
const getAllActivityDocuments = async (): Promise<ActivityDocument[]> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

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
      url: `${CRM_URL}/activity-documents`,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches activity documents for a specific activity.
 */
const getActivityDocumentsByActivity = async (
  activityId: string,
): Promise<ActivityDocument[]> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    if (!activityId) {
      throw new Error('Activity ID is required.');
    }

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/activity-documents/activity/${activityId}`,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches a single activity document by ID.
 */
const getActivityDocumentById = async (
  id: string,
): Promise<ActivityDocument> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    if (!id) {
      throw new Error('Document ID is required.');
    }

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/activity-documents/${id}`,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Hooks ---

/**
 * Hook for fetching all activity documents.
 */
export const useGetAllActivityDocuments = () => {
  return useQuery<ActivityDocument[]>(
    ['activityDocuments'],
    getAllActivityDocuments,
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      // eslint-disable-next-line
      onError: (error: any) => {},
    },
  );
};

/**
 * Hook for fetching activity documents by activity ID.
 */
export const useGetActivityDocumentsByActivity = (activityId: string) => {
  return useQuery<ActivityDocument[]>(
    ['activityDocuments', 'byActivity', activityId],
    () => getActivityDocumentsByActivity(activityId),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      enabled: !!activityId,
      // eslint-disable-next-line
      onError: (error: any) => {},
    },
  );
};

/**
 * Hook for fetching a single activity document by ID.
 */
export const useGetActivityDocumentById = (id: string) => {
  return useQuery<ActivityDocument>(
    ['activityDocument', id],
    () => getActivityDocumentById(id),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      enabled: !!id,
      // eslint-disable-next-line
      onError: (error: any) => {},
    },
  );
};
