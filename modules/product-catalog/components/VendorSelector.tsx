'use client';

import { useMemo, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import type { CatalogProduct, Vendor } from '@/modules/product-catalog/types';
import { productPartnerIdsForRole } from '@/modules/product-catalog/utils';
import { catalogControlClass } from '@/modules/product-catalog/components/CatalogFormPrimitives';

export interface VendorSelectorProps {
  vendors: Vendor[];
  value: string | null;
  onChange: (vendorId: string | null) => void;
  /**
   * When set, only vendors linked to this product are shown.
   * When omitted, `vendors` is shown as-is (caller may pre-filter by family).
   */
  product?: CatalogProduct | null;
  /** Partner role code(s) used for product-link filtering (default: vendor). */
  roleCodes?: string | string[];
  /**
   * Display name of the partner role being selected (e.g. "Cloud Service Provider").
   * Used for placeholders and empty states instead of hardcoded "vendor".
   */
  roleLabel?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  error?: string;
  /** Allow clearing the selection (default true). */
  allowEmpty?: boolean;
  emptyLabel?: string;
  onAddVendor?: () => void;
  footer?: ReactNode;
}

/**
 * Vendor selector using SearchableSelect (same pattern as create opportunity contacts).
 * Scope with `product` for product-linked vendors, or pass a pre-filtered list.
 */
export function VendorSelector({
  product,
  vendors,
  value,
  onChange,
  disabled,
  className,
  roleLabel = 'Vendor',
  placeholder,
  error,
  allowEmpty = true,
  emptyLabel = 'Not specified',
  roleCodes = 'vendor',
  onAddVendor,
  footer,
}: VendorSelectorProps) {
  const labelLower = roleLabel.toLowerCase();
  const resolvedPlaceholder = placeholder ?? `Select ${labelLower}`;
  const emptyMessage = `No ${labelLower}s available`;

  const options = useMemo(() => {
    let list = vendors.filter((v) => v.status === 'active' || v.id === value);
    if (product) {
      const allowed = new Set(productPartnerIdsForRole(product, roleCodes));
      list = list.filter((v) => allowed.has(v.id) || v.id === value);
    }
    return list
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
        keywords: vendor.description ?? '',
      }));
  }, [product, vendors, value, roleCodes]);

  const waitingOnProduct = product === null;
  const isDisabled = Boolean(disabled) || waitingOnProduct;
  const triggerPlaceholder = waitingOnProduct
    ? 'Select a product first'
    : resolvedPlaceholder;

  const addFooter =
    footer ??
    (onAddVendor && !waitingOnProduct ? (
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs text-brand hover:bg-muted"
        onClick={onAddVendor}
      >
        <Plus size={13} />
        Add {labelLower}
      </button>
    ) : null);

  return (
    <div className={cn('w-full', className)}>
      <SearchableSelect
        value={value ?? ''}
        onValueChange={(next) => onChange(next || null)}
        options={options}
        placeholder={triggerPlaceholder}
        searchPlaceholder={`Search ${labelLower}s…`}
        emptyText={waitingOnProduct ? 'Select a product first' : emptyMessage}
        disabled={isDisabled}
        triggerClassName={catalogControlClass}
        allowClear={allowEmpty && !waitingOnProduct}
        clearLabel={emptyLabel}
        footer={addFooter}
      />
      {error ? (
        <p className="mt-1.5 text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
