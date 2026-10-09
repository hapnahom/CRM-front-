import { useMutation } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';

const acceptInvitation = async (
  token: string,
): Promise<{ status: string; userId: string }> => {
  return crudRequest({
    url: `${CRM_URL}/invitations/accept`,
    method: 'POST',
    data: { token },
  });
};

const declineInvitation = async (
  token: string,
): Promise<{ status: 'declined' }> => {
  return crudRequest({
    url: `${CRM_URL}/invitations/decline`,
    method: 'POST',
    data: { token },
  });
};

export const useAcceptInvitation = () =>
  useMutation((token: string) => acceptInvitation(token));

export const useDeclineInvitation = () =>
  useMutation((token: string) => declineInvitation(token));
