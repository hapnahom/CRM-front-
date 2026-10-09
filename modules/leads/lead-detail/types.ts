import type { CurrencyCode } from '@/lib/currency';

export type { CurrencyCode as PipelineCurrency };
export type { CurrencyCode as DealCurrency };

export type LeadActivityKind = string;

export type LeadActivity = {
  id: string;
  kind: LeadActivityKind;
  title: string;
  date: string;
  note?: string;
};

export type CrmLead = {
  id: string;
  name: string;
  customerId: string;
  contactId?: string;
  typeId?: string;
  typeName?: string;
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | '';
  campaignId?: string;
  campaignName?: string;
  originatorUserId?: string;
  originatorUserName?: string;
  originatorUserAvatarUrl?: string | null;
  originatorPartnerId?: string;
  originatorPartnerName?: string;
  originatorPartnerTier?: string;
  value: number;
  currency: CurrencyCode;
  baseValue: number;
  expectedClose: string;
  stageId: string;
  stageEnteredAt: string;
  responsible: string;
  responsibleUserId?: string;
  createdBy?: string;
  createdByUserId?: string;
  observers: string[];
  observerUserIds: string[];
  description?: string;
  team?: string;
  solutionCategory?: string;
  sessionId?: string;
  currentState?: string;
  nextStep?: string;
  activities: LeadActivity[];
  pqqTotalScore?: number;
  pqqStatus?: string;
  pqq?: import('./data/pqqData').DealPqq;
  pqqFormValues?: import('./data/pqqTemplateData').PqqFormValues;
};

export {
  STAGE_AGING_WARNING_DAYS,
  type PipelineStage,
  type LeadStageCategory as PipelineStageCategory,
} from '@/store/server/features/leads/pipeline/types';

export type { ActivityType } from '@/modules/pipeline/types';
