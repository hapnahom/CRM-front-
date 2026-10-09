'use client';

import { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SelectedProductCard } from '@/modules/product-catalog/components/SelectedProductCard';
import { ProductConfigurationDialog } from '@/modules/product-catalog/components/ProductConfigurationDialog';
import { ProductValueSummary } from '@/modules/product-catalog/components/ProductValueSummary';
import type {
  CatalogProduct,
  ImplementationPartner,
  OpportunityProductLine,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import { cn } from '@/lib/utils';

export interface OpportunityProductsSectionProps {
  lines: OpportunityProductLine[];
  onChange: (lines: OpportunityProductLine[]) => void;
  products: CatalogProduct[];
  families: ProductFamily[];
  vendors: Vendor[];
  partners: ImplementationPartner[];
  opportunityValue: number;
  currency?: string;
  readOnly?: boolean;
  title?: string;
  /** Hide the section title row (e.g. when wrapped in DetailSection) */
  hideHeader?: boolean;
  /** Optional demo notice (e.g. conversion carry-over) */
  footerNote?: string;
}

type DialogState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; lineId: string };

export function OpportunityProductsSection({
  lines,
  onChange,
  products,
  families,
  vendors,
  partners,
  opportunityValue,
  currency = 'USD',
  readOnly,
  title = 'Products',
  hideHeader,
  footerNote,
}: OpportunityProductsSectionProps) {
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const isEmpty = lines.length === 0;

  const productById = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const familyById = useMemo(() => {
    const map = new Map<string, ProductFamily>();
    for (const f of families) map.set(f.id, f);
    return map;
  }, [families]);

  const vendorById = useMemo(() => {
    const map = new Map<string, Vendor>();
    for (const v of vendors) map.set(v.id, v);
    return map;
  }, [vendors]);

  const familyForProduct = (product: CatalogProduct | undefined) => {
    if (!product) return undefined;
    for (const vendorId of product.vendorIds ?? []) {
      for (const familyId of vendorById.get(vendorId)?.productFamilyIds ?? []) {
        const family = familyById.get(familyId);
        if (family) return family;
      }
    }
    return undefined;
  };

  const excludedIds = useMemo(() => lines.map((l) => l.productId), [lines]);
  const editingLine =
    dialog.mode === 'edit'
      ? (lines.find((l) => l.id === dialog.lineId) ?? null)
      : null;
  const editingProduct = editingLine
    ? productById.get(editingLine.productId)
    : undefined;
  const editingFamily = familyForProduct(editingProduct);

  const openAdd = () => setDialog({ mode: 'add' });
  const closeDialog = () => setDialog({ mode: 'closed' });

  return (
    <section className="space-y-3">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {title}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isEmpty
                ? 'Optional — link catalog products to this opportunity'
                : `${lines.length} product${lines.length === 1 ? '' : 's'} · details optional`}
            </p>
          </div>
          {!readOnly && !isEmpty ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={openAdd}
            >
              <Plus size={14} className="mr-1.5" />
              Add product
            </Button>
          ) : null}
        </div>
      ) : !readOnly && !isEmpty ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={openAdd}
          >
            <Plus size={14} className="mr-1.5" />
            Add product
          </Button>
        </div>
      ) : null}

      {isEmpty ? (
        <div
          className={cn(
            'flex flex-col items-stretch gap-3 rounded-xl border border-dashed border-border bg-surface-elevated/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5',
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
              <Package size={16} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {readOnly ? 'No products linked' : 'No products added'}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {readOnly
                  ? 'This opportunity has no catalog products yet.'
                  : 'Add products to track vendor, amount, and deal registration.'}
              </p>
            </div>
          </div>
          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-brand text-brand-foreground hover:bg-brand-hover sm:self-center"
              onClick={openAdd}
            >
              <Plus size={14} className="mr-1.5" />
              Add product
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-card divide-y divide-border">
          {lines.map((line) => {
            const product = productById.get(line.productId);
            const family = familyForProduct(product);
            return (
              <SelectedProductCard
                key={line.id}
                line={line}
                product={product}
                family={family}
                vendors={vendors}
                partners={partners}
                currency={currency}
                readOnly={readOnly}
                onConfigure={() => setDialog({ mode: 'edit', lineId: line.id })}
                onRemove={() => onChange(lines.filter((l) => l.id !== line.id))}
              />
            );
          })}
        </div>
      )}

      {!isEmpty ? (
        <ProductValueSummary
          lines={lines}
          opportunityValue={opportunityValue}
          currency={currency}
        />
      ) : null}

      {footerNote ? (
        <p className="text-[11px] text-muted-foreground">{footerNote}</p>
      ) : null}

      <ProductConfigurationDialog
        open={dialog.mode !== 'closed'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        mode={dialog.mode === 'add' ? 'add' : 'edit'}
        line={editingLine}
        products={products}
        families={families}
        product={editingProduct}
        family={editingFamily}
        vendors={vendors}
        partners={partners}
        excludedProductIds={excludedIds}
        opportunityValue={opportunityValue}
        currency={currency}
        onSave={(next) => {
          if (dialog.mode === 'add') {
            if (lines.some((l) => l.productId === next.productId)) {
              toast.error('This product is already added');
              return;
            }
            onChange([...lines, next]);
            toast.success('Product added');
            return;
          }
          onChange(lines.map((l) => (l.id === next.id ? next : l)));
          toast.success('Product updated');
        }}
      />
    </section>
  );
}
