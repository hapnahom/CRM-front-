import type { CurrencyCode } from '@/lib/currency';

export const MOCK_FISCAL_YEAR = new Date().getFullYear();
export const MOCK_OWNERS_POOL: string[] = [];
export const SALES_TEAMS: string[] = [];
export const AUTOMATION_DEFAULT_LEAD_ROLES = {
  responsible: '',
  observers: [] as string[],
};

export function buildDefaultCreateForm(): {
  name: string;
  customerId: string;
  contactId: string;
  stageId: string;
  value: string;
  currency: CurrencyCode;
  responsibleUserId: string;
  observerUserIds: string[];
} {
  return {
    name: '',
    customerId: '',
    contactId: '',
    stageId: '',
    value: '',
    currency: '',
    responsibleUserId: '',
    observerUserIds: [],
  };
}

export function buildDefaultDealCreateForm(): {
  name: string;
  customerId: string;
  contactId: string;
  stageId: string;
  value: string;
  currency: CurrencyCode;
  expectedClose: string;
  pqqScore: string;
  responsibleUserId: string;
  observerUserIds: string[];
} {
  return {
    name: '',
    customerId: '',
    contactId: '',
    stageId: '',
    value: '',
    currency: '',
    expectedClose: '',
    pqqScore: '',
    responsibleUserId: '',
    observerUserIds: [],
  };
}
