import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'sonner';
import { crudRequest } from '@/utils/crudRequest';
import { MARKETING_URL, marketingAuthHeaders } from './api';
import type {
  MarketingAudience,
  MarketingActivity,
  MarketingCampaign,
} from './types';

function apiErrorMessage(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

function isTimelineClashMessage(message: string) {
  return /timeline|campaign dates|before .* start|after .* end|Change the event timeline|Adjust the event dates/i.test(
    message,
  );
}

function invalidateMarketing(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries(['marketing-overview']);
  void queryClient.invalidateQueries(['marketing-campaigns']);
  void queryClient.invalidateQueries(['marketing-campaign']);
  void queryClient.invalidateQueries(['marketing-audiences']);
  void queryClient.invalidateQueries(['marketing-audience']);
  void queryClient.invalidateQueries(['marketing-assets']);
  void queryClient.invalidateQueries(['marketing-events']);
  void queryClient.invalidateQueries(['marketing-event']);
  void queryClient.invalidateQueries(['marketing-integrations']);
  void queryClient.invalidateQueries(['marketing-mailboxes']);
}

async function request<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  data?: unknown,
): Promise<T> {
  const headers = await marketingAuthHeaders();
  return crudRequest({
    url: `${MARKETING_URL}${path}`,
    method,
    headers,
    data,
  }) as Promise<T>;
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation(
    (body: Record<string, unknown>) =>
      request<MarketingCampaign>('/campaigns', 'POST', body),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Campaign created');
      },
      onError: () => {
        toast.error('Failed to create campaign');
      },
    },
  );
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      request<MarketingCampaign>(`/campaigns/${id}`, 'PATCH', body),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Campaign updated');
      },
      onError: (err: unknown) => {
        toast.error(apiErrorMessage(err, 'Failed to update campaign'));
      },
    },
  );
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation(
    (id: string) => request<void>(`/campaigns/${id}`, 'DELETE'),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        void queryClient.invalidateQueries(['communication-tasks']);
        void queryClient.invalidateQueries(['communication-calendar-events']);
        toast.success('Campaign deleted');
      },
      onError: (err: unknown) => {
        toast.error(apiErrorMessage(err, 'Failed to delete campaign'));
      },
    },
  );
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    ({
      campaignId,
      activityId,
      body,
    }: {
      campaignId: string;
      activityId: string;
      body: Record<string, unknown>;
    }) =>
      request<MarketingActivity>(
        `/campaigns/${campaignId}/activities/${activityId}`,
        'PATCH',
        body,
      ),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        void queryClient.invalidateQueries(['communication-tasks']);
        void queryClient.invalidateQueries(['communication-calendar-events']);
        toast.success('Activity updated');
      },
      onError: (err: unknown) => {
        const msg = apiErrorMessage(err, 'Failed to update activity');
        if (isTimelineClashMessage(msg)) return;
        toast.error(msg);
      },
    },
  );
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ campaignId, activityId }: { campaignId: string; activityId: string }) =>
      request<void>(
        `/campaigns/${campaignId}/activities/${activityId}`,
        'DELETE',
      ),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        void queryClient.invalidateQueries(['communication-tasks']);
        void queryClient.invalidateQueries(['communication-calendar-events']);
        toast.success('Activity deleted');
      },
      onError: (err: unknown) => {
        toast.error(apiErrorMessage(err, 'Failed to delete activity'));
      },
    },
  );
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation(
    ({
      campaignId,
      body,
    }: {
      campaignId: string;
      body: Record<string, unknown>;
    }) => request(`/campaigns/${campaignId}/activities`, 'POST', body),
    {
      onSuccess: (createdActivity, vars) => {
        invalidateMarketing(queryClient);
        void queryClient.invalidateQueries(['communication-tasks']);
        void queryClient.invalidateQueries(['communication-calendar-events']);
        const isEmail = vars.body.channelType === 'Email';
        const status = vars.body.status;
        if (isEmail && status === 'Active') {
          const created = createdActivity as { status?: string };
          toast.success(
            created?.status === 'Sent'
              ? 'Email activity created and sent'
              : 'Email activity created. Send did not finish — retry Send from the activity.',
          );
        } else if (isEmail && status === 'Scheduled') {
          toast.success('Email activity scheduled');
        } else {
          toast.success('Activity created');
        }
      },
      onError: (err: unknown) => {
        invalidateMarketing(queryClient);
        const msg = apiErrorMessage(err, 'Failed to create activity');
        if (isTimelineClashMessage(msg)) return;
        toast.error(msg);
      },
    },
  );
}

export function useSendMarketingEmail() {
  const queryClient = useQueryClient();
  return useMutation(
    (activityId: string) =>
      request<{ sent?: number; failed?: number }>(
        `/activities/${activityId}/send`,
        'POST',
      ),
    {
      onSuccess: (result: { sent?: number; failed?: number }) => {
        invalidateMarketing(queryClient);
        toast.success(
          `Email send complete · ${result?.sent ?? 0} sent${result?.failed ? `, ${result.failed} failed` : ''}`,
        );
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string | string[] } } })
            ?.response?.data?.message || 'Failed to send email';
        toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
      },
    },
  );
}

export function useCancelScheduledEmail() {
  const queryClient = useQueryClient();
  return useMutation(
    (activityId: string) => request(`/activities/${activityId}/cancel`, 'POST'),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Scheduled email cancelled');
      },
      onError: (err: unknown) => {
        toast.error(apiErrorMessage(err, 'Failed to cancel scheduled email'));
      },
    },
  );
}

export function useCreateAudience() {
  const queryClient = useQueryClient();
  return useMutation(
    (body: Record<string, unknown>) => request('/audiences', 'POST', body),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Audience created');
      },
      onError: () => {
        toast.error('Failed to create audience');
      },
    },
  );
}

export function useUpdateAudience() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      request<MarketingAudience>(`/audiences/${id}`, 'PATCH', body),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Audience saved');
      },
      onError: () => {
        toast.error('Failed to save audience');
      },
    },
  );
}

export function useDeleteAudience() {
  const queryClient = useQueryClient();
  return useMutation((id: string) => request(`/audiences/${id}`, 'DELETE'), {
    onSuccess: () => {
      invalidateMarketing(queryClient);
      toast.success('Audience deleted');
    },
    onError: () => {
      toast.error('Failed to delete audience');
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation(
    (body: Record<string, unknown>) => request('/assets', 'POST', body),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Asset added');
      },
      onError: () => {
        toast.error('Failed to add asset');
      },
    },
  );
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation(
    (body: Record<string, unknown>) => request('/events', 'POST', body),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        void queryClient.invalidateQueries(['communication-tasks']);
        void queryClient.invalidateQueries(['communication-calendar-events']);
        toast.success('Event created');
      },
      onError: (err: unknown) => {
        const msg = apiErrorMessage(err, 'Failed to create event');
        if (isTimelineClashMessage(msg)) return;
        toast.error(msg);
      },
    },
  );
}

export function useSelectMarketingMailbox() {
  const queryClient = useQueryClient();
  return useMutation(
    (accountId: string) =>
      request('/integrations/email/select', 'POST', { accountId }),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Marketing mailbox selected');
      },
      onError: () => {
        toast.error('Failed to select mailbox');
      },
    },
  );
}

export function useDisconnectMarketingEmail() {
  const queryClient = useQueryClient();
  return useMutation(() => request('/integrations/email/disconnect', 'POST'), {
    onSuccess: () => {
      invalidateMarketing(queryClient);
      toast.success('Marketing email disconnected');
    },
    onError: () => {
      toast.error('Failed to disconnect');
    },
  });
}

export function useConnectMarketingMicrosoft() {
  return useMutation(
    async (input: {
      redirectUrl: string;
      provider?: 'microsoft365' | 'gmail';
    }) => {
      const headers = await marketingAuthHeaders();
      return crudRequest({
        url: `${MARKETING_URL}/integrations/email/connect`,
        method: 'POST',
        headers,
        data: {
          provider: input.provider ?? 'microsoft365',
          redirectSuccessUrl: input.redirectUrl,
          redirectFailureUrl: input.redirectUrl,
        },
      }) as Promise<{ authorizationUrl?: string }>;
    },
    {
      onError: () => {
        toast.error('Failed to start mailbox connection');
      },
    },
  );
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation((id: string) => request<void>(`/assets/${id}`, 'DELETE'), {
    onSuccess: () => {
      invalidateMarketing(queryClient);
      toast.success('Asset deleted');
    },
    onError: () => {
      toast.error('Failed to delete asset');
    },
  });
}

export function useRecordActivityResults() {
  const queryClient = useQueryClient();
  return useMutation(
    ({
      campaignId,
      activityId,
      body,
    }: {
      campaignId: string;
      activityId: string;
      body: Record<string, unknown>;
    }) =>
      request<MarketingActivity>(
        `/campaigns/${campaignId}/activities/${activityId}/results`,
        'POST',
        body,
      ),
    {
      onSuccess: () => {
        invalidateMarketing(queryClient);
        toast.success('Activity results saved');
      },
      onError: (err: unknown) => {
        toast.error(apiErrorMessage(err, 'Failed to save activity results'));
      },
    },
  );
}
