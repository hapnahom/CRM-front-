import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { InvitationDecisionData } from './types';
import { crudRequest } from '@/utils/crudRequest';

const fetchInvitationDecisionData = async (
  token: string,
): Promise<InvitationDecisionData> => {
  return crudRequest({
    url: `${CRM_URL}/invitations/decision`,
    method: 'GET',
    params: { token },
  });
};

export const useGetInvitationDecisionData = (token: string | null) =>
  useQuery<InvitationDecisionData>(
    ['invitation-decision', token],
    () => fetchInvitationDecisionData(token!),
    {
      enabled: Boolean(token?.trim()),
      retry: false,
      staleTime: Infinity,
    },
  );
