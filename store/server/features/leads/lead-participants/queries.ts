import { useQuery, useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';

export const useLeadParticipantsQuery = (leadId: string) => {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['lead-participants', leadId],
    queryFn: async () => {
      const token = await getCurrentToken();
      const response = await crudRequest({
        url: `${CRM_URL}/lead-participants/lead/${leadId}`,
        method: 'GET',
        headers: { tenantId, Authorization: `Bearer ${token}` },
      });
      return response;
    },
    enabled: !!leadId && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateLeadParticipantsMutation = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      leadId,
      participants,
    }: {
      leadId: string;
      participants: any[];
    }) => {
      const token = await getCurrentToken();

      // Get existing participants
      const existingParticipants = await crudRequest({
        url: `${CRM_URL}/lead-participants/lead/${leadId}`,
        method: 'GET',
        headers: { tenantId, Authorization: `Bearer ${token}` },
      });

      // Delete existing participants
      for (const participant of existingParticipants) {
        await crudRequest({
          url: `${CRM_URL}/lead-participants/${participant.id}`,
          method: 'DELETE',
          headers: { tenantId, Authorization: `Bearer ${token}` },
        });
      }

      // Small delay only if we have participants to delete
      if (existingParticipants.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Create new participants - only if there are participants to create
      if (participants && participants.length > 0) {
        const creationResults: Array<{
          success: boolean;
          participant: any;
          response?: any;
          error?: string;
          isBackendLimitation?: boolean;
        }> = [];

        // Try to create all participants first (for when backend supports multiple roles per user)
        for (let i = 0; i < participants.length; i++) {
          const participant = participants[i];
          if (participant.roleId && participant.userId) {
            try {
              const response = await crudRequest({
                url: `${CRM_URL}/lead-participants`,
                method: 'POST',
                data: {
                  leadId: leadId,
                  roleId: participant.roleId,
                  userId: participant.userId,
                },
                headers: { tenantId, Authorization: `Bearer ${token}` },
              });
              creationResults.push({ success: true, participant, response });
            } catch (error: any) {
              // Check if this is the backend limitation (409 Conflict with "already exists" message)
              if (
                error?.response?.status === 409 &&
                error?.response?.data?.message?.includes('already exists')
              ) {
                creationResults.push({
                  success: false,
                  participant,
                  error: 'Backend limitation: Only one role per user supported',
                  isBackendLimitation: true,
                });
              } else {
                // Other errors
                creationResults.push({
                  success: false,
                  participant,
                  error: error.message,
                });
              }
            }
          }
        }

        // If we have backend limitation errors, try the fallback approach
        const backendLimitationErrors = creationResults.filter(
          (r) => r.isBackendLimitation,
        );
        if (backendLimitationErrors.length > 0) {
          // Group participants by userId and create only one per user
          const participantsByUser = participants.reduce(
            (acc, participant) => {
              const userId = participant.userId;
              if (!acc[userId]) {
                acc[userId] = [];
              }
              acc[userId].push(participant);
              return acc;
            },
            {} as Record<
              string,
              { roleId: string; userId: string; tenantId: string }[]
            >,
          );

          // Clear previous results and start fresh with fallback approach
          creationResults.length = 0;

          for (const [, userParticipants] of Object.entries(
            participantsByUser,
          )) {
            const typedUserParticipants = userParticipants as {
              roleId: string;
              userId: string;
              tenantId: string;
            }[];
            const firstParticipant = typedUserParticipants[0];

            if (firstParticipant.roleId && firstParticipant.userId) {
              try {
                const response = await crudRequest({
                  url: `${CRM_URL}/lead-participants`,
                  method: 'POST',
                  data: {
                    leadId: leadId,
                    roleId: firstParticipant.roleId,
                    userId: firstParticipant.userId,
                  },
                  headers: { tenantId, Authorization: `Bearer ${token}` },
                });
                creationResults.push({
                  success: true,
                  participant: firstParticipant,
                  response,
                });
              } catch (error: any) {
                creationResults.push({
                  success: false,
                  participant: firstParticipant,
                  error: error.message,
                });
              }
            }
          }
        }
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch lead participants
      queryClient.invalidateQueries(['lead-participants', variables.leadId]);
      // Also invalidate lead detail to refresh the lead data
      queryClient.invalidateQueries(['lead-detail', variables.leadId]);
    },
  });
};
