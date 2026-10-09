import { useMutation } from 'react-query';
import { toast } from 'sonner';
import { crudRequest } from '@/utils/crudRequest';
import { AI_INTELLIGENCE_URL, aiIntelligenceAuthHeaders } from './api';
import type {
  AiInsightsResponse,
  GenerateCustomersInsightsBody,
  GenerateDashboardInsightsBody,
  GeneratePipelineInsightsBody,
} from './types';

function apiErrorMessage(err: unknown, fallback: string) {
  const response = (
    err as {
      response?: {
        status?: number;
        data?: {
          message?: string | string[];
          retryAfterSeconds?: number;
        };
      };
    }
  )?.response;

  if (response?.status === 429) {
    const retryAfter = response.data?.retryAfterSeconds;
    if (typeof retryAfter === 'number' && retryAfter > 0) {
      return `Too many AI requests. Try again in ${retryAfter}s.`;
    }
    return 'Too many AI requests. Please wait a moment and try again.';
  }

  const msg = response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

async function postGenerate<TBody>(
  path: string,
  body?: TBody,
): Promise<AiInsightsResponse> {
  const headers = await aiIntelligenceAuthHeaders();
  return crudRequest({
    url: `${AI_INTELLIGENCE_URL}${path}`,
    method: 'POST',
    headers,
    data: body ?? {},
  }) as Promise<AiInsightsResponse>;
}

export function useGenerateDashboardInsights() {
  return useMutation(
    (body: GenerateDashboardInsightsBody = {}) =>
      postGenerate('/dashboard/generate', body),
    {
      onError: (err) => {
        toast.error(
          apiErrorMessage(err, 'Failed to generate dashboard insights'),
        );
      },
    },
  );
}

export function useGeneratePipelineInsights() {
  return useMutation(
    (body: GeneratePipelineInsightsBody = {}) =>
      postGenerate('/sales-hub/pipeline/generate', body),
    {
      onError: (err) => {
        toast.error(
          apiErrorMessage(err, 'Failed to generate pipeline insights'),
        );
      },
    },
  );
}

export function useGenerateCustomersInsights() {
  return useMutation(
    (body: GenerateCustomersInsightsBody = {}) =>
      postGenerate('/customers/generate', body),
    {
      onError: (err) => {
        toast.error(
          apiErrorMessage(err, 'Failed to generate customer insights'),
        );
      },
    },
  );
}
