import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import type { TodoItem } from '@/modules/communication/data/mockData';

export type CrmRelatedLink = {
  type: 'deal' | 'lead' | 'contact' | 'customer';
  id: string;
  name: string;
  customerId?: string | null;
};

export function crmRelatedHref(link: {
  type: string;
  id: string;
  customerId?: string | null;
}): string | null {
  if (link.type === 'deal') return `/deals/${link.id}`;
  if (link.type === 'lead') return `/leads/${link.id}`;
  if (link.type === 'customer') {
    return `/customers/${encodeURIComponent(link.id)}`;
  }
  if (link.type === 'contact') {
    const customerId = link.customerId;
    if (!customerId) return '/customers';
    return `/customers/${encodeURIComponent(customerId)}`;
  }
  return null;
}

/** Prefer enriched relatedLinks; fall back to raw FKs with generic labels. */
export function collectCrmRelatedLinks(
  source:
    | {
        relatedLinks?: Array<{
          type: string;
          id: string;
          name: string;
          customerId?: string | null;
        }>;
        leadId?: string | null;
        dealId?: string | null;
        customerId?: string | null;
        contactId?: string | null;
      }
    | null
    | undefined,
): CrmRelatedLink[] {
  if (!source) return [];
  if (source.relatedLinks?.length) {
    return source.relatedLinks
      .filter((l) => l.id)
      .map((l) => ({
        type: l.type as CrmRelatedLink['type'],
        id: l.id,
        name: l.name,
        customerId:
          l.customerId ?? (l.type === 'contact' ? source.customerId : null),
      }));
  }

  const links: CrmRelatedLink[] = [];
  if (source.dealId) {
    links.push({
      type: 'deal',
      id: source.dealId,
      name: dealUiLabel(),
    });
  }
  if (source.leadId && isLeadsEnabled()) {
    links.push({ type: 'lead', id: source.leadId, name: 'Lead' });
  }
  if (source.contactId) {
    links.push({
      type: 'contact',
      id: source.contactId,
      name: 'Contact',
      customerId: source.customerId || null,
    });
  } else if (source.customerId) {
    links.push({
      type: 'customer',
      id: source.customerId,
      name: 'Customer',
    });
  }
  return links;
}

export function mergeCrmLinkSources(
  primary: TodoItem | null | undefined,
  secondary?: {
    leadId?: string | null;
    dealId?: string | null;
    customerId?: string | null;
    contactId?: string | null;
  } | null,
): CrmRelatedLink[] {
  const fromPrimary = collectCrmRelatedLinks(primary);
  if (fromPrimary.length) return fromPrimary;
  return collectCrmRelatedLinks(secondary);
}
