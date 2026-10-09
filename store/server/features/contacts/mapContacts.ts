import type {
  AccountContactAssociation,
  CustomerContact,
} from '@/data/customerManagementData';
import type {
  ContactsCatalog,
  ContactsCatalogAccount,
  ContactResponse,
} from './types';

/** Maps GET /contacts response to the contacts tab catalog shape. */
export function mapContactsToCatalog(
  apiContacts: ContactResponse[],
): ContactsCatalog {
  const accountsById = new Map<string, ContactsCatalogAccount>();
  const contacts: CustomerContact[] = [];
  const associations: AccountContactAssociation[] = [];
  const contactIdsByDisplayId: Record<string, string[]> = {};

  for (const apiContact of apiContacts) {
    const contact: CustomerContact = {
      id: apiContact.id,
      firstName: apiContact.firstName,
      lastName: apiContact.lastName,
      email: apiContact.email,
      roleTitle: apiContact.role?.trim() ?? '',
      phone: apiContact.phoneNumber?.trim() ?? '',
    };

    contacts.push(contact);
    contactIdsByDisplayId[contact.id] = [apiContact.id];

    const customerId = apiContact.customerId;
    if (customerId) {
      const accountName =
        apiContact.customer?.accountName ?? 'Unknown customer';

      if (!accountsById.has(customerId)) {
        accountsById.set(customerId, { id: customerId, name: accountName });
      }

      associations.push({
        id: `assoc-${contact.id}-${customerId}`,
        accountId: customerId,
        contactId: contact.id,
      });
    }
  }

  return {
    contacts,
    associations,
    accounts: Array.from(accountsById.values()),
    contactIdsByDisplayId,
  };
}
