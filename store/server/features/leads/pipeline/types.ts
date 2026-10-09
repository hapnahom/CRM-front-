// Types for the redesigned (pipeline) Leads experience.
// These mirror the new CRM backend lead module (LeadResponseDto, LeadStageResponseDto,
// CustomerListItemDto, ContactResponseDto) rather than the
// legacy lead schema still used by the older Ant Design screens.

import type { CurrencyCode } from '@/lib/currency';
import type { PipelinePagination } from '@/lib/pipeline/list-query';
import type {
  OpportunityProductLine,
  OpportunitySolution,
} from '@/modules/product-catalog/types';

export type { PipelinePagination };

export type LeadStageCategory = 'open' | 'won' | 'lost';

export type LeadCurrency = CurrencyCode;

export const STAGE_AGING_WARNING_DAYS = 4;

export interface PipelineStage {
  id: string;
  name: string;
  category: LeadStageCategory;
  order: number;
  color?: string | null;
  borderColor?: string | null;
  isConversion?: boolean;
  requiresApproval?: boolean;
  approvalWorkflowId?: string | null;
  expirationDays?: number | null;
  expirationAction?: 'mark_expired' | 'move_to_lost' | null;
  expirationLostStageId?: string | null;
}

export interface PipelineCustomerSummary {
  id: string;
  accountName: string;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface PipelineContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  isPrimaryContact?: boolean;
  customerId?: string | null;
}

export interface PipelineUserSummary {
  id: string;
  selamnewId?: string | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface PipelineTeamSummary {
  id: string;
  name: string;
  branch?: string | null;
}

export interface PipelineType {
  id: string;
  name: string;
}

export interface PipelineCampaign {
  id: string;
  name: string;
}

export interface PipelineLead {
  id: string;
  name: string;

  customerId: string;
  customer?: PipelineCustomerSummary | null;

  contactId?: string | null;
  contact?: PipelineContactSummary | null;

  typeId?: string | null;
  type?: PipelineType | null;

  campaignId?: string | null;
  campaign?: PipelineCampaign | null;

  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | null;
  originatorUserId?: string | null;
  originatorUser?: PipelineUserSummary | null;
  originatorPartnerId?: string | null;
  originatorPartner?: {
    id: string;
    name: string;
    tier?: string | null;
    status?: string | null;
  } | null;

  stageId: string;
  previousStageId?: string | null;
  stage?: PipelineStage;
  stageEnteredAt: string;
  stageExpiresAt?: string | null;
  stageExpired?: boolean;
  stageExpirationStatus?: 'none' | 'active' | 'approaching' | 'expired';

  status: string;
  pendingApproval?: boolean;
  convertedAt?: string | null;
  convertedDealId?: string | null;

  value: number;
  currency: LeadCurrency;
  baseValue: number;

  expectedClose?: string | null;

  responsibleUserId?: string | null;
  responsibleUser?: PipelineUserSummary | null;
  observerUserIds?: string[];
  observers?: PipelineUserSummary[];

  teamId?: string | null;
  team?: PipelineTeamSummary | null;

  solutionCategory?: string | null;
  sessionId?: string | null;
  currentState?: string | null;
  nextStep?: string | null;
  description?: string | null;

  createdAt?: string;
  updatedAt?: string;

  products?: OpportunityProductLine[];
  solutions?: OpportunitySolution[];
  roleAssignments?: Array<{
    roleId: string;
    userId: string;
    roleName?: string;
    isPrimary?: boolean;
    user?: {
      id: string;
      selamnewId?: string | null;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    } | null;
  }>;
}

export interface PaginatedLeads {
  data: PipelineLead[];
  pagination: PipelinePagination;
}

export interface CreatePipelineLeadInput {
  name: string;
  customerId: string;
  contactId?: string;
  typeId?: string;
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER';
  campaignId?: string;
  originatorUserId?: string;
  originatorPartnerId?: string;
  sessionId?: string;
  stageId?: string;
  value?: number;
  currency?: LeadCurrency;
  expectedClose?: string;
  responsibleUserId?: string;
  observerUserIds?: string[];
  roleAssignments?: Array<{ roleId: string; userId: string }>;
  solutionCategory?: string;
  currentState?: string;
  nextStep?: string;
  description?: string;
  fieldValues?: Array<{ entityFieldId: string; value?: unknown }>;
  allowValidationException?: boolean;
  validationSummary?: string;
  validationExceptionFieldIds?: string[];
  products?: Array<{
    productId: string;
    vendorId?: string | null;
    implementationPartnerId?: string | null;
    amount?: number;
    registration?: OpportunityProductLine['registration'];
  }>;
  solutions?: Array<{
    id?: string;
    productFamilyId: string;
    amount?: number;
    vendors?: Array<{
      id?: string;
      vendorId: string;
      amount?: number;
      registration?: OpportunityProductLine['registration'];
      products?: Array<{
        id?: string;
        productId: string;
        amount?: number;
        implementationPartnerId?: string | null;
      }>;
    }>;
    products?: Array<{
      id?: string;
      productId: string;
      amount?: number;
      implementationPartnerId?: string | null;
    }>;
  }>;
}
