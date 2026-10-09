import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  ContactResponse,
  CreateContactPayload,
  UpdateContactPayload,
} from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

/** POST /contacts — backend CreateContactDto */
export async function createContactApi(
  payload: CreateContactPayload,
): Promise<ContactResponse> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/contacts`,
    method: 'POST',
    headers,
    data: payload,
  }) as Promise<ContactResponse>;
}

export async function updateContactApi(
  id: string,
  payload: UpdateContactPayload,
): Promise<ContactResponse> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/contacts/${id}`,
    method: 'PATCH',
    headers,
    data: payload,
  }) as Promise<ContactResponse>;
}

export async function deleteContactApi(
  id: string,
): Promise<{ message: string }> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/contacts/${id}`,
    method: 'DELETE',
    headers,
  }) as Promise<{ message: string }>;
}

/** PATCH /contacts/:contactId/assign/:customerId */
export async function assignContactToCustomerApi(
  contactId: string,
  customerId: string,
): Promise<ContactResponse> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/contacts/${contactId}/assign/${customerId}`,
    method: 'PATCH',
    headers,
  }) as Promise<ContactResponse>;
}
