'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  CatalogProduct,
  ImplementationPartner,
} from '@/modules/product-catalog/types';
import { productPartnerIdsForRole } from '@/modules/product-catalog/utils';
import { catalogControlClass } from '@/modules/product-catalog/components/CatalogFormPrimitives';

const EMPTY_VALUE = '__none__';

export interface ImplementationPartnerSelectorProps {
  product: CatalogProduct | null;
  partners: ImplementationPartner[];
  value: string | null;
  onChange: (partnerId: string | null) => void;
  /** Partner role code(s) used for product-link filtering. */
  roleCodes?: string | string[];
  /** Display name for the configured partner role(s). */
  roleLabel?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  error?: string;
}

/**
 * Implementation partner selector scoped to a Product's associated partners.
 */
export function ImplementationPartnerSelector({
  product,
  partners,
  value,
  onChange,
  roleCodes = 'implementation_partner',
  roleLabel = 'Implementation partner',
  disabled,
  className,
  placeholder,
  error,
}: ImplementationPartnerSelectorProps) {
  const available = useMemo(() => {
    if (!product) return [];
    const allowed = new Set(productPartnerIdsForRole(product, roleCodes));
    return partners
      .filter(
        (p) => allowed.has(p.id) && (p.status === 'active' || p.id === value),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [product, partners, value, roleCodes]);

  const labelLower = roleLabel.toLowerCase();
  const resolvedPlaceholder = placeholder ?? `Select ${labelLower}`;
  const isDisabled = Boolean(disabled) || !product || available.length === 0;
  const triggerPlaceholder = !product
    ? 'Select a product first'
    : available.length === 0
      ? `No ${labelLower}s for this product`
      : resolvedPlaceholder;

  return (
    <div className={cn('w-full', className)}>
      <Select
        value={value ?? EMPTY_VALUE}
        onValueChange={(next) => onChange(next === EMPTY_VALUE ? null : next)}
        disabled={isDisabled}
      >
        <SelectTrigger className={cn(catalogControlClass, 'w-full')}>
          <SelectValue placeholder={triggerPlaceholder} />
        </SelectTrigger>
        <SelectContent
          className="w-[var(--radix-select-trigger-width)]"
          position="popper"
          align="start"
        >
          <SelectItem value={EMPTY_VALUE}>Not specified</SelectItem>
          {available.map((partner) => (
            <SelectItem key={partner.id} value={partner.id}>
              {partner.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="mt-1.5 text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
