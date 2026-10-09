import type {
  AccountContactAssociation,
  CustomerContact,
} from '@/data/customerManagementData';

/** Minimal account shape for the contacts catalog (id + display name only). */
export interface ContactsCatalogAccount {
  id: string;
  name: string;
}

export interface CustomerListItemResponse {
  id: string;
  accountName: string;
}

export interface PaginatedCustomersResponse {
  data: CustomerListItemResponse[];
}

export interface CustomerContactDetailResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role?: string;
}

export interface CustomerDetailResponse {
  id: string;
  accountName: string;
  contacts: CustomerContactDetailResponse[];
}

export interface ContactsCatalog {
  contacts: CustomerContact[];
  associations: AccountContactAssociation[];
  accounts: ContactsCatalogAccount[];
  /** Backend contact ids grouped under each displayed contact row */
  contactIdsByDisplayId: Record<string, string[]>;
}

export interface CreateContactPayload {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  isPrimaryContact?: boolean;
  customerId?: string | null;
}

export type CreateContactDto = CreateContactPayload;

export interface ContactCustomerSummary {
  id: string;
  accountName: string;
}

export interface ContactResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role?: string;
  isPrimaryContact: boolean;
  customerId?: string | null;
  tenantId?: string;
  customer?: ContactCustomerSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  isPrimaryContact?: boolean;
  customerId?: string | null;
}

export type UpdateContactDto = UpdateContactPayload;
