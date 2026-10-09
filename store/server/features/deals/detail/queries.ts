import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import type { CurrencyCode } from '@/lib/currency';
import {
  authHeaders,
  DEALS_BASE_URL,
  retryUnlessUnauthorized,
} from '../pipeline/api';

interface BackendUserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface DealDetailResponse {
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
  typeId?: string | null;
  type?: { id: string; name: string } | null;
  stageId: string;
  previousStageId?: string | null;
  stage?: {
    id: string;
    name: string;
    category: 'open' | 'won' | 'lost' | 'inactive';
    order: number;
    color?: string | null;
    borderColor?: string | null;
    requiresApproval?: boolean;
    approvalWorkflowId?: string | null;
  } | null;
  stageEnteredAt?: string | null;
  stageExpiresAt?: string | null;
  stageExpired?: boolean;
  stageExpirationStatus?: 'none' | 'active' | 'approaching' | 'expired';
  status: string;
  pendingApproval?: boolean;
  value: number;
  currency: string;
  baseValue: number;
  exactValue?: number | null;
  probability: number;
  expectedClose?: string | null;
  responsibleUserId?: string | null;
  responsibleUser?: BackendUserSummary | null;
  createdBy?: string | null;
  createdByUser?: BackendUserSummary | null;
  observerUserIds?: string[];
  observers?: BackendUserSummary[];
  team?: { id: string; name: string } | null;
  sessionId?: string | null;
  description?: string | null;
  sourceLeadId?: string | null;
  createdFromLead?: boolean;
  leadConvertedAt?: string | null;
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  originatorUserId?: string | null;
  originatorUser?: (BackendUserSummary & { avatarUrl?: string | null }) | null;
  originatorPartnerId?: string | null;
  originatorPartner?: {
    id: string;
    name: string;
    tier?: string | null;
    status?: string | null;
  } | null;
}

export interface DealActivityResponse {
  id: string;
  dealId: string;
  activityTypeId?: string | null;
  activityType?: { id: string; name: string; icon?: string | null } | null;
  title: string;
  date: string;
  note?: string | null;
  assignedToUserId?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
}

export type DealActivity = {
  id: string;
  kind: string;
  title: string;
  date: string;
  note?: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
};

export type CrmDeal = {
  id: string;
  name: string;
  customerId: string;
  contactId?: string;
  typeId?: string;
  typeName?: string;
  value: number;
  currency: CurrencyCode;
  baseValue: number;
  exactValue?: number | null;
  expectedClose: string;
  stageId: string;
  previousStageId?: string | null;
  stageEnteredAt: string;
  responsible: string;
  responsibleUserId?: string;
  createdBy: string;
  createdByUserId?: string;
  observers: string[];
  observerUserIds: string[];
  description?: string;
  team?: string;
  sessionId?: string;
  sourceLeadId?: string;
  createdFromLead?: boolean;
  leadConvertedAt?: string;
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | '';
  campaignId?: string;
  campaignName?: string;
  originatorUserId?: string;
  originatorUserName?: string;
  originatorUserAvatarUrl?: string | null;
  originatorPartnerId?: string;
  originatorPartnerName?: string;
  originatorPartnerTier?: string;
  activities: DealActivity[];
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).split('T')[0] ?? '';
}

export function mapActivity(a: DealActivityResponse): DealActivity {
  return {
    id: a.id,
    kind: a.activityType?.name ?? 'Activity',
    title: a.title,
    date: toDateInput(a.date),
    note: a.note ?? undefined,
    assignedTo: a.assignedToUserId ?? undefined,
    dueDate: toDateInput(a.dueDate),
    completedAt: toDateInput(a.completedAt),
  };
}

export function mapBackendDealToCrmDeal(
  dto: DealDetailResponse,
  activities: DealActivityResponse[] = [],
): CrmDeal {
  return {
    id: dto.id,
    name: dto.name,
    customerId: dto.customerId,
    contactId: dto.contactId ?? undefined,
    typeId: dto.typeId ?? '',
    typeName: dto.type?.name ?? '',
    value: Number(dto.value) || 0,
    currency: (dto.currency as CurrencyCode) ?? '',
    baseValue: Number(dto.baseValue) || 0,
    exactValue: dto.exactValue != null ? Number(dto.exactValue) : null,
    expectedClose: toDateInput(dto.expectedClose),
    stageId: dto.stageId,
    previousStageId: dto.previousStageId ?? null,
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
    sessionId: dto.sessionId ?? undefined,
    sourceLeadId: dto.sourceLeadId ?? undefined,
    createdFromLead: dto.createdFromLead,
    leadConvertedAt: toDateInput(dto.leadConvertedAt),
    originatorType:
      dto.originatorType ?? (dto.campaignId || dto.campaign ? 'CAMPAIGN' : ''),
    campaignId: dto.campaignId ?? dto.campaign?.id ?? '',
    campaignName: dto.campaign?.name ?? '',
    originatorUserId: dto.originatorUserId ?? dto.originatorUser?.id ?? '',
    originatorUserName:
      dto.originatorUser?.name ?? dto.originatorUser?.email ?? '',
    originatorUserAvatarUrl: dto.originatorUser?.avatarUrl ?? null,
    originatorPartnerId:
      dto.originatorPartnerId ?? dto.originatorPartner?.id ?? '',
    originatorPartnerName: dto.originatorPartner?.name ?? '',
    originatorPartnerTier: dto.originatorPartner?.tier ?? '',
    activities: activities.map(mapActivity),
  };
}

export function useDealDetail(id: string, options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['deal-detail', id, tenantId],
    queryFn: async (): Promise<DealDetailResponse | null> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${DEALS_BASE_URL}/${id}`,
        method: 'GET',
        headers,
      });
      return (response as DealDetailResponse) ?? null;
    },
    enabled: enabled && Boolean(tenantId) && Boolean(id),
    retry: retryUnlessUnauthorized,
  });
}

export function useDealActivities(id: string) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['deal-activities', id, tenantId],
    queryFn: async (): Promise<DealActivityResponse[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${DEALS_BASE_URL}/${id}/activities`,
        method: 'GET',
        headers,
      });
      return Array.isArray(response)
        ? (response as DealActivityResponse[])
        : [];
    },
    enabled: Boolean(tenantId) && Boolean(id),
    retry: retryUnlessUnauthorized,
  });
}
