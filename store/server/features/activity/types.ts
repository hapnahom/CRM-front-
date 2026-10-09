export type ActivityKind =
  | 'call'
  | 'meeting'
  | 'email'
  | 'note'
  | 'follow_up'
  | 'stage_change'
  | 'deal_won'
  | 'deal_lost'
  | 'lead_converted'
  | 'lead_disqualified'
  | 'customer_stage_change'
  | 'contact_linked'
  | 'proposal_sent'
  | 'campaign_sent'
  | 'campaign_engaged'
  | 'approval_requested'
  | 'approval_step_approved'
  | 'approval_approved'
  | 'approval_rejected'
  | 'approval_cancelled'
  | 'approval_resubmitted'
  | 'approval_reassigned'
  | 'field_change'
  | 'other';

export type ActivityOrigin = 'manual' | 'system' | 'outbound' | 'linked';

export type ActivityEntityType =
  | 'CUSTOMER'
  | 'LEAD'
  | 'DEAL'
  | 'CONTACT'
  | 'CAMPAIGN';

export interface Activity {
  id: string;
  tenantId: string;
  subject: string;
  summary?: string | null;
  kind: ActivityKind;
  origin: ActivityOrigin;
  occurredAt: string;
  actorId?: string | null;
  entityType: ActivityEntityType;
  entityId: string;
  customerId?: string | null;
  contactId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface ActivityQueryParams {
  page?: number;
  pageSize?: number;
  kind?: ActivityKind;
  origin?: ActivityOrigin;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  sourceId?: string;
  sortBy?: 'occurredAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  /** Legacy filter — maps to entity-scoped endpoint */
  leadId?: string;
  dealId?: string;
  entityType?: 'lead' | 'deal';
  /** @deprecated Legacy alias for pageSize */
  size?: number;
  search?: string;
}

/** @deprecated Legacy filter shape used by older activity pages */
export type ActivityFilters = Pick<
  ActivityQueryParams,
  | 'kind'
  | 'origin'
  | 'actorId'
  | 'startDate'
  | 'endDate'
  | 'leadId'
  | 'dealId'
  | 'entityType'
>;

export interface PaginatedActivities {
  data: Activity[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface CreateManualActivityRequest {
  subject: string;
  summary?: string;
  kind: ActivityKind;
  entityType: ActivityEntityType;
  entityId: string;
  contactId?: string;
  occurredAt?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
