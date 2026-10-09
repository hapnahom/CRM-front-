import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import type { ActivityKind } from './types';

const KIND_LABELS: Record<ActivityKind, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  note: 'Note',
  follow_up: 'Follow-up',
  stage_change: 'Stage change',
  deal_won: 'Deal won',
  deal_lost: 'Deal lost',
  lead_converted: 'Lead converted',
  lead_disqualified: 'Lead disqualified',
  customer_stage_change: 'Customer stage change',
  contact_linked: 'Contact linked',
  proposal_sent: 'Proposal sent',
  campaign_sent: 'Campaign sent',
  campaign_engaged: 'Campaign engaged',
  approval_requested: 'Approval requested',
  approval_step_approved: 'Approval step approved',
  approval_approved: 'Approval granted',
  approval_rejected: 'Approval rejected',
  approval_cancelled: 'Approval cancelled',
  approval_resubmitted: 'Approval resubmitted',
  approval_reassigned: 'Approval reassigned',
  field_change: 'Field change',
  other: 'Activity',
};

export function activityKindLabel(kind: ActivityKind): string {
  if (kind === 'deal_won') {
    return isLeadsEnabled() ? 'Deal won' : `${dealUiLabel()} won`;
  }
  if (kind === 'deal_lost') {
    return isLeadsEnabled() ? 'Deal lost' : `${dealUiLabel()} lost`;
  }
  return KIND_LABELS[kind] ?? 'Activity';
}

export function formatActivityDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** @deprecated Legacy helper — use buildActivityQueryParams from api.ts */
export function buildActivityQueryString(
  params: Record<string, string | number | boolean | undefined> = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'size') {
        search.set('pageSize', String(value));
      } else {
        search.set(key, String(value));
      }
    }
  }
  const qs = search.toString();
  return qs ? qs : '';
}
