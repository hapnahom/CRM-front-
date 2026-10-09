import type { OpportunityProductLine } from '@/modules/product-catalog/types';

export function contactDisplayName(
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null,
): string {
  if (!contact) return '—';
  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  return name || '—';
}

export function observerDisplayNames(
  observers?: Array<{
    name?: string | null;
    email?: string | null;
    selamnewId?: string | null;
  }>,
): string[] {
  return (observers ?? [])
    .map(
      (observer) =>
        observer.name || observer.email || observer.selamnewId || '',
    )
    .map((name) => name.trim())
    .filter(Boolean);
}

export function productDisplayNames(
  products?: Array<Pick<OpportunityProductLine, 'productId' | 'productName'>>,
): string[] {
  return (products ?? [])
    .map((product) => product.productName?.trim() || '')
    .filter(Boolean);
}
