import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { CRM_URL } from '@/utils/constants';
import { CreateLeadInput, LeadResponse } from './leadMutations';
import {
  DuplicateResponse,
  DuplicateLeadModalState,
} from '@/types/leads/duplicateTypes';

/**
 * Enhanced lead creation service that handles duplicate detection
 * Uses the existing confirmModal for user confirmation
 */
export const useCreateLeadWithDuplicateHandling = (
  onSuccess?: (data: any) => void,
) => {
  const queryClient = useQueryClient();

  const {} = useAuthenticationStore();

  const [modalState, setModalState] = useState<DuplicateLeadModalState>({
    isOpen: false,
    duplicateInfo: null,
    pendingLeadData: null,
    isLoading: false,
  });

  // Create lead mutation with duplicate handling
  const createLeadMutation = useMutation(createLead, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['leads']);
      handleSuccessMessage('POST');

      // Call custom success handler if provided
      if (onSuccess) {
        onSuccess(data);
      }

      // Close modal and reset state
      setModalState({
        isOpen: false,
        duplicateInfo: null,
        pendingLeadData: null,
        isLoading: false,
      });
    },
    onError: (error: any) => {
      // Handle 422 duplicate response
      if (error?.response?.status === 422) {
        const duplicateInfo: DuplicateResponse = error.response.data;
        setModalState((prev) => ({
          ...prev,
          duplicateInfo,
          isOpen: true,
          isLoading: false,
        }));
      } else {
        // Handle other errors normally

        setModalState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    },
  });

  // Handle duplicate confirmation - retry with allowDuplicates: true
  const handleDuplicateConfirm = () => {
    if (modalState.pendingLeadData) {
      setModalState((prev) => ({ ...prev, isLoading: true }));

      // Retry with allowDuplicates: true
      createLeadMutation.mutate({
        ...modalState.pendingLeadData,
        allowDuplicates: true,
      });
    }
  };

  // Handle duplicate cancellation
  const handleDuplicateCancel = () => {
    setModalState({
      isOpen: false,
      duplicateInfo: null,
      pendingLeadData: null,
      isLoading: false,
    });
  };

  // Main function to create lead with duplicate handling
  const createLeadWithDuplicateHandling = (data: CreateLeadInput) => {
    setModalState((prev) => ({
      ...prev,
      pendingLeadData: data,
      isLoading: true,
    }));

    // First attempt without allowDuplicates
    createLeadMutation.mutate(data);
  };

  // Get duplicate messages for display
  const getDuplicateMessages = (): string[] => {
    if (!modalState.duplicateInfo?.duplicates) return [];

    return Object.values(modalState.duplicateInfo.duplicates)
      .filter((dup) => dup.exists)
      .map((dup) => dup.message);
  };

  // Get modal description text
  const getModalDescription = (): string => {
    const messages = getDuplicateMessages();
    if (messages.length === 0) {
      return 'The lead you have just created is duplicate. Would you like to continue?';
    }

    return `The following duplicates were found:\n\n${messages.join('\n')}\n\nDo you want to proceed anyway?`;
  };

  return {
    // State
    modalState,

    // Actions
    createLeadWithDuplicateHandling,
    handleDuplicateConfirm,
    handleDuplicateCancel,

    // Computed values
    getDuplicateMessages,
    getModalDescription,

    // Loading state
    isLoading: modalState.isLoading || createLeadMutation.isLoading,
  };
};

/**
 * Creates a new lead with duplicate handling
 * This is the same function as in leadMutations.ts but isolated for clarity
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
      //skipEncryption: true, // Disable encryption for this request
    });

    return response;
  } catch (error) {
    throw error;
  }
};
