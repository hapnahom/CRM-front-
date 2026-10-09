import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import type { CurrencyCode } from '@/lib/currency';
import type { CrmLead, LeadActivity } from '@/modules/leads/lead-detail/types';
import {
  authHeaders,
  LEADS_BASE_URL,
  retryUnlessUnauthorized,
} from '../pipeline/api';

interface BackendUserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface LeadDetailResponse {
  id: string;
  name: string;
  customerId: string;
  customer?: { id: string; accountName: string } | null;
  contactId?: string | null;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phoneNumber?: string | null;
    role?: string | null;
    isPrimaryContact?: boolean;
  } | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | null;
  originatorUserId?: string | null;
  originatorUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  originatorPartnerId?: string | null;
  originatorPartner?: {
    id: string;
    name: string;
    tier?: string | null;
    status?: string | null;
  } | null;
  typeId?: string | null;
  type?: { id: string; name: string } | null;
  stageId: string;
  stage?: {
    id: string;
    name: string;
    category: 'open' | 'won' | 'lost';
    order: number;
    color?: string | null;
    borderColor?: string | null;
    isConversion?: boolean;
    requiresApproval?: boolean;
    approvalWorkflowId?: string | null;
  } | null;
  stageEnteredAt?: string | null;
  stageExpiresAt?: string | null;
  stageExpired?: boolean;
  stageExpirationStatus?: 'none' | 'active' | 'approaching' | 'expired';
  status?: string;
  pendingApproval?: boolean;
  value: number;
  currency: string;
  baseValue: number;
  probability: number;
  expectedClose?: string | null;
  responsibleUserId?: string | null;
  responsibleUser?: BackendUserSummary | null;
  createdBy?: string | null;
  createdByUser?: BackendUserSummary | null;
  observerUserIds?: string[];
  observers?: BackendUserSummary[];
  team?: { id: string; name: string } | null;
  solutionCategory?: string | null;
  sessionId?: string | null;
  currentState?: string | null;
  nextStep?: string | null;
  description?: string | null;
  convertedAt?: string | null;
  convertedDealId?: string | null;
}

export interface LeadActivityResponse {
  id: string;
  leadId: string;
  activityTypeId?: string | null;
  activityType?: { id: string; name: string; icon?: string | null } | null;
  title: string;
  date: string;
  note?: string | null;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).split('T')[0] ?? '';
}

export function mapActivity(a: LeadActivityResponse): LeadActivity {
  return {
    id: a.id,
    kind: a.activityType?.name ?? 'Activity',
    title: a.title,
    date: toDateInput(a.date),
    note: a.note ?? undefined,
  };
}

export function mapBackendLeadToCrmLead(
  dto: LeadDetailResponse,
  activities: LeadActivityResponse[] = [],
): CrmLead {
  return {
    id: dto.id,
    name: dto.name,
    customerId: dto.customerId,
    contactId: dto.contactId ?? undefined,
    typeId: dto.typeId ?? '',
    typeName: dto.type?.name ?? '',
    originatorType: dto.originatorType ?? (dto.campaignId ? 'CAMPAIGN' : ''),
    campaignId: dto.campaignId ?? '',
    campaignName: dto.campaign?.name ?? '',
    originatorUserId: dto.originatorUserId ?? dto.originatorUser?.id ?? '',
    originatorUserName:
      dto.originatorUser?.name ?? dto.originatorUser?.email ?? '',
    originatorUserAvatarUrl: dto.originatorUser?.avatarUrl ?? null,
    originatorPartnerId:
      dto.originatorPartnerId ?? dto.originatorPartner?.id ?? '',
    originatorPartnerName: dto.originatorPartner?.name ?? '',
    originatorPartnerTier: dto.originatorPartner?.tier ?? '',
    value: Number(dto.value) || 0,
    currency: (dto.currency as CurrencyCode) ?? '',
    baseValue: Number(dto.baseValue) || 0,
    expectedClose: toDateInput(dto.expectedClose),
    stageId: dto.stageId,
    stageEnteredAt: toDateInput(dto.stageEnteredAt),
    responsible: dto.responsibleUser?.name ?? dto.responsibleUser?.email ?? '',
    responsibleUserId:
      dto.responsibleUserId ?? dto.responsibleUser?.id ?? undefined,
    createdBy: dto.createdByUser?.name ?? dto.createdByUser?.email ?? '',
    createdByUserId: dto.createdBy ?? dto.createdByUser?.id ?? undefined,
    observers: (dto.observers ?? []).map((o) => o.name ?? o.email ?? o.id),
    observerUserIds:
      dto.observerUserIds ?? (dto.observers ?? []).map((o) => o.id),
    description: dto.description ?? undefined,
    team: dto.team?.name ?? undefined,
    solutionCategory: dto.solutionCategory ?? undefined,
    sessionId: dto.sessionId ?? undefined,
    currentState: dto.currentState ?? undefined,
    nextStep: dto.nextStep ?? undefined,
    activities: activities.map(mapActivity),
  };
}

export function useLeadDetail(id: string, options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['lead-detail', id, tenantId],
    queryFn: async (): Promise<LeadDetailResponse | null> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${LEADS_BASE_URL}/${id}`,
        method: 'GET',
        headers,
      });
      return (response as LeadDetailResponse) ?? null;
    },
    enabled: enabled && Boolean(tenantId) && Boolean(id),
    retry: retryUnlessUnauthorized,
  });
}

export function useLeadActivities(id: string) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['lead-activities', id, tenantId],
    queryFn: async (): Promise<LeadActivityResponse[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${LEADS_BASE_URL}/${id}/activities`,
        method: 'GET',
        headers,
      });
      return Array.isArray(response)
        ? (response as LeadActivityResponse[])
        : [];
    },
    enabled: Boolean(tenantId) && Boolean(id),
    retry: retryUnlessUnauthorized,
  });
}
