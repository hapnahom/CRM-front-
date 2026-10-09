import type { CurrencyCode } from '@/lib/currency';
import type { ActivityType, PipelineStage } from '@/modules/pipeline/types';

export type { CurrencyCode as DealCurrency };
export { STAGE_AGING_WARNING_DAYS } from '@/store/server/features/deals/pipeline/types';
export type { PipelineStage, ActivityType };
export type { PipelineStageCategory } from '@/modules/pipeline/types';

export type DealActivityKind = string;

export type DealActivity = {
  id: string;
  kind: DealActivityKind;
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
  createdBy?: string;
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
