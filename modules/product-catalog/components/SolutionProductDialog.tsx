'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CatalogFormField } from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { AmountCurrencyFields } from '@/modules/product-catalog/components/AmountCurrencyFields';
import { ProductSelector } from '@/modules/product-catalog/components/ProductSelector';
import { ImplementationPartnerSelector } from '@/modules/product-catalog/components/ImplementationPartnerSelector';
import { QuickCreateProductDialog } from '@/modules/product-catalog/components/QuickCreateProductDialog';
import type {
  CatalogProduct,
  ImplementationPartner,
  OpportunitySolutionProduct,
} from '@/modules/product-catalog/types';
import {
  createEmptySolutionProduct,
  parseMoneyInput,
} from '@/modules/product-catalog/utils';
import type { PartnerRole } from '@/modules/partners/roles/types';

export function SolutionProductDialog({
  open,
  onOpenChange,
  mode,
  productLine,
  products,
  partners,
  excludedProductIds = [],
  currency = 'USD',
  currencyOptions = [],
  afterProductSlots = [],
  afterProductRoleCodes = ['implementation_partner'],
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  productLine: OpportunitySolutionProduct | null;
  products: CatalogProduct[];
  partners: ImplementationPartner[];
  /** Kept for call-site compatibility; products are no longer vendor-filtered. */
  vendorId?: string | null;
  excludedProductIds?: string[];
  currency?: string;
  currencyOptions?: string[];
  afterProductSlots?: PartnerRole[];
  afterProductRoleCodes?: string[];
  onSave: (next: OpportunitySolutionProduct) => void | Promise<void>;
}) {
  const isAdd = mode === 'add';
  const [productId, setProductId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [lineCurrency, setLineCurrency] = useState(currency);
  const [saving, setSaving] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [extraProducts, setExtraProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setAddProductOpen(false);
      setExtraProducts([]);
      return;
    }
    if (isAdd) {
      setProductId(null);
      setPartnerId(null);
      setAmount('');
      setLineCurrency(currency);
      return;
    }
    if (!productLine) return;
    setProductId(productLine.productId);
    setPartnerId(productLine.implementationPartnerId);
    setAmount(productLine.amount > 0 ? String(productLine.amount) : '');
    setLineCurrency(productLine.currency || currency);
  }, [open, isAdd, productLine, currency]);

  const allProducts = useMemo(() => {
    const byId = new Map<string, CatalogProduct>();
    for (const product of products) byId.set(product.id, product);
    for (const product of extraProducts) byId.set(product.id, product);
    return [...byId.values()];
  }, [products, extraProducts]);

  const scopedProducts = useMemo(() => {
    const excluded = new Set(excludedProductIds);
    if (!isAdd && productLine) excluded.delete(productLine.productId);
    return allProducts
      .filter(
        (p) =>
          p.status === 'active' && (!excluded.has(p.id) || p.id === productId),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, excludedProductIds, isAdd, productLine, productId]);

  const selectedProduct = useMemo(
    () => scopedProducts.find((p) => p.id === productId) ?? null,
    [scopedProducts, productId],
  );

  const partnerFieldLabel = useMemo(() => {
    if (afterProductSlots.length === 1) {
      return afterProductSlots[0]!.name;
    }
    if (afterProductSlots.length > 1) {
      return afterProductSlots.map((slot) => slot.name).join(' / ');
    }
    return 'Implementation partner';
  }, [afterProductSlots]);

  const handleProductChange = (nextId: string | null) => {
    setProductId(nextId);
    if (isAdd) setPartnerId(null);
  };

  const handleSave = async () => {
    if (!productId) {
      toast.error('Select a product');
      return;
    }
    if (!lineCurrency) {
      toast.error('Select a currency');
      return;
    }
    const base =
      productLine ?? createEmptySolutionProduct(productId, lineCurrency);
    setSaving(true);
    try {
      await onSave({
        ...base,
        productId,
        implementationPartnerId: partnerId,
        amount: parseMoneyInput(amount),
        currency: lineCurrency,
      });
      onOpenChange(false);
    } catch {
      // Parent surfaces the error toast; keep dialog open for retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (saving && !nextOpen) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-xl gap-0 overflow-visible p-0">
          <DialogHeader className="space-y-1 rounded-t-xl border-b border-border px-6 py-5 pr-14 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Package size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {isAdd ? 'Add product' : 'Edit product'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {isAdd ? 'Select a product' : 'Update product details'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <CatalogFormField label="Product" required>
              {isAdd ? (
                <ProductSelector
                  products={scopedProducts}
                  value={productId}
                  excludedProductIds={excludedProductIds}
                  onChange={handleProductChange}
                  placeholder="Select product"
                  disabled={saving}
                  onAddProduct={() => setAddProductOpen(true)}
                />
              ) : (
                <div className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium dark:bg-surface-card">
                  {selectedProduct?.name ??
                    productLine?.productName ??
                    'Product'}
                </div>
              )}
            </CatalogFormField>

            <CatalogFormField label={partnerFieldLabel}>
              <ImplementationPartnerSelector
                product={selectedProduct}
                partners={partners}
                value={partnerId}
                onChange={setPartnerId}
                roleCodes={afterProductRoleCodes}
                roleLabel={partnerFieldLabel}
                disabled={saving || (!selectedProduct && isAdd)}
              />
            </CatalogFormField>

            <AmountCurrencyFields
              amountLabel="Product amount"
              amount={amount}
              onAmountChange={setAmount}
              currency={lineCurrency}
              onCurrencyChange={setLineCurrency}
              currencyOptions={currencyOptions}
              disabled={saving || (!selectedProduct && isAdd)}
            />
          </div>

          <DialogFooter className="rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={() => void handleSave()}
              disabled={(isAdd && !productId) || saving}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {isAdd ? 'Adding…' : 'Saving…'}
                </>
              ) : isAdd ? (
                'Add product'
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickCreateProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onCreated={(created) => {
          setExtraProducts((prev) => [...prev, created]);
          setProductId(created.id);
          if (isAdd) setPartnerId(null);
        }}
      />
    </>
  );
}
