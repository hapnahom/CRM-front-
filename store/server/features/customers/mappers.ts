import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import type {
  CustomerAccount,
  AccountContactAssociation,
  CustomerContact,
  PipelineLead,
  PipelineDeal,
  AssociationRole,
} from '@/data/customerManagementData';
import type {
  CustomerListItem,
  CustomerDetail,
  CustomerContactDetail,
  CustomerAccountFormState,
  CreateCustomerDto,
  CustomerVectorSummary,
} from './types';

export function formatDealLeadBadge(
  dealsCount: number,
  leadsCount: number,
): string {
  return `${dealsCount}D ${leadsCount}L`;
}

export function formatOrganizationSizeLabel(
  value: string | undefined,
  labelMap?: Record<string, string>,
): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  if (labelMap?.[trimmed]) return labelMap[trimmed];
  return trimmed;
}

export function formatPrimaryContactName(
  contact: { firstName: string; lastName: string } | null | undefined,
): string {
  if (!contact) return '—';
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return name || '—';
}

export function formatVectorLabel(
  vector: CustomerVectorSummary | null | undefined,
): string {
  return vector?.name?.trim() || '';
}

export function mapCustomerListItemToAccount(
  item: CustomerListItem,
  sizeLabelMap?: Record<string, string>,
): CustomerAccount {
  return {
    id: item.id,
    name: item.accountName,
    location: item.city ?? '—',
    city: item.city ?? '',
    country: item.country,
    industry: formatVectorLabel(item.vector),
    vectorId: item.vectorId ?? item.vector?.id ?? null,
    vectorName: formatVectorLabel(item.vector),
    size: formatOrganizationSizeLabel(item.organizationSize, sizeLabelMap),
    website: item.website ?? '',
    dealLeadBadge: formatDealLeadBadge(item.dealsCount, item.leadsCount),
    dealsCount: item.dealsCount,
    leadsCount: item.leadsCount,
    primaryContact: formatPrimaryContactName(item.primaryContact),
    primaryContactId: item.primaryContact?.id,
    primaryContactEmail: item.primaryContact?.email?.trim() || undefined,
    primaryContactPhone: item.primaryContact?.phoneNumber?.trim() || undefined,
  };
}

export function mapAccountFormToCreateDto(
  form: CustomerAccountFormState,
): CreateCustomerDto {
  return {
    accountName: form.name.trim(),
    vectorId: form.vectorId.trim() || null,
    ...(form.size.trim() ? { organizationSize: form.size } : {}),
    city: form.city.trim() || undefined,
    country: form.country.trim() || undefined,
    website: form.website.trim() || undefined,
  };
}

export function mapCustomerDetailToAccount(
  detail: CustomerDetail,
): CustomerAccount {
  const primary =
    detail.contacts.find((c) => c.isPrimaryContact) ??
    detail.contacts[0] ??
    null;

  return {
    id: detail.id,
    name: detail.accountName,
    location: detail.city ?? '—',
    city: detail.city ?? '',
    country: detail.country,
    industry: formatVectorLabel(detail.vector),
    vectorId: detail.vectorId ?? detail.vector?.id ?? null,
    vectorName: formatVectorLabel(detail.vector),
    size: detail.organizationSize,
    website: detail.website ?? '',
    dealLeadBadge: formatDealLeadBadge(
      detail.deals?.length ?? 0,
      detail.leads?.length ?? 0,
    ),
    primaryContact: formatPrimaryContactName(primary),
    primaryContactId: primary?.id,
    primaryContactEmail: primary?.email?.trim() || undefined,
    primaryContactPhone: primary?.phoneNumber?.trim() || undefined,
  };
}

export function mapDetailContactToCustomerContact(
  contact: CustomerContactDetail,
): CustomerContact {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    roleTitle: contact.role ?? '',
    email: contact.email,
    phone: contact.phoneNumber,
    status: 'Active',
    createdAt: contact.createdAt?.split('T')[0],
  };
}

export function mapDetailContactsToAccountContacts(
  customerId: string,
  contacts: CustomerContactDetail[],
): { association: AccountContactAssociation; contact: CustomerContact }[] {
  return contacts.map((contact) => ({
    association: {
      id: `assoc-${contact.id}`,
      accountId: customerId,
      contactId: contact.id,
      role: contact.role as AssociationRole | undefined,
      isPrimary: contact.isPrimaryContact,
    },
    contact: mapDetailContactToCustomerContact(contact),
  }));
}

export function mapDetailLeadsToPipeline(
  leads: Record<string, unknown>[],
  accountId: string,
): PipelineLead[] {
  return leads.map((lead) => {
    const source = lead.source as { name?: string } | undefined;
    const engagementStage = lead.engagementStage as
      | { name?: string }
      | undefined;
    const deletedAt = lead.deletedAt as string | null | undefined;
    const isClosed =
      Boolean(deletedAt) ||
      engagementStage?.name?.toLowerCase().includes('closed');

    return {
      id: String(lead.id),
      accountId,
      title: String(
        lead.name ??
          (isLeadsEnabled() ? 'Untitled Lead' : 'Untitled Opportunity'),
      ),
      status: isClosed ? 'Closed' : 'Active',
      source: source?.name ?? '—',
      createdAt: String(lead.createdAt ?? '').split('T')[0],
    };
  });
}

export function mapDetailDealsToPipeline(
  deals: Record<string, unknown>[],
  accountId: string,
): PipelineDeal[] {
  return deals.map((deal) => {
    const engagementStage = deal.engagementStage as
      | { name?: string }
      | undefined;
    const budget = deal.budget as { amount?: number } | undefined;
    const deletedAt = deal.deletedAt as string | null | undefined;
    const isClosed =
      Boolean(deletedAt) ||
      engagementStage?.name?.toLowerCase().includes('closed');

    return {
      id: String(deal.id),
      accountId,
      title: String(deal.dealName ?? `Untitled ${dealUiLabel()}`),
      status: isClosed ? 'Closed' : 'Active',
      stage: engagementStage?.name ?? '—',
      value: Number(budget?.amount ?? 0),
      closedAt: isClosed
        ? String(deal.updatedAt ?? deal.createdAt ?? '').split('T')[0]
        : undefined,
    };
  });
}

export function buildOrganizationSizeLabelMap(
  sizes: { value: string; label: string }[],
): Record<string, string> {
  return Object.fromEntries(sizes.map((item) => [item.value, item.label]));
}
