'use client';

import { useMemo, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import type { CatalogProduct } from '@/modules/product-catalog/types';
import { catalogControlClass } from '@/modules/product-catalog/components/CatalogFormPrimitives';

export interface ProductSelectorProps {
  products: CatalogProduct[];
  value: string | null;
  onChange: (productId: string | null) => void;
  /** Product IDs already on the opportunity — omitted from the list */
  excludedProductIds?: string[];
  /** Only active products by default */
  activeOnly?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  onAddProduct?: () => void;
  footer?: ReactNode;
}

export function ProductSelector({
  products,
  value,
  onChange,
  excludedProductIds = [],
  activeOnly = true,
  placeholder = 'Select product',
  disabled,
  className,
  error,
  onAddProduct,
  footer,
}: ProductSelectorProps) {
  const excluded = useMemo(
    () => new Set(excludedProductIds),
    [excludedProductIds],
  );

  const options = useMemo(() => {
    return products
      .filter((p) =>
        activeOnly ? p.status === 'active' || p.id === value : true,
      )
      .filter((p) => !excluded.has(p.id) || p.id === value)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => ({
        value: product.id,
        label: product.name,
        keywords: product.description ?? '',
      }));
  }, [products, activeOnly, excluded, value]);

  const addFooter =
    footer ??
    (onAddProduct ? (
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs text-brand hover:bg-muted"
        onClick={onAddProduct}
      >
        <Plus size={13} />
        Add product
      </button>
    ) : null);

  return (
    <div className={cn('w-full', className)}>
      <SearchableSelect
        value={value ?? ''}
        onValueChange={(next) => onChange(next || null)}
        options={options}
        placeholder={placeholder}
        searchPlaceholder="Search products…"
        emptyText="No products available"
        disabled={disabled}
        triggerClassName={catalogControlClass}
        footer={addFooter}
      />
      {error ? (
        <p className="mt-1.5 text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
