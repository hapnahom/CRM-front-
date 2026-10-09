'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CatalogFormField,
  catalogControlClass,
} from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { ProductSelector } from '@/modules/product-catalog/components/ProductSelector';
import { VendorSelector } from '@/modules/product-catalog/components/VendorSelector';
import { ImplementationPartnerSelector } from '@/modules/product-catalog/components/ImplementationPartnerSelector';
import type {
  CatalogProduct,
  DealRegistrationStatus,
  ImplementationPartner,
  OpportunityProductLine,
  OpportunityProductRegistration,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import {
  createEmptyOpportunityProductLine,
  DEAL_REGISTRATION_STATUS_OPTIONS,
  defaultProductRegistration,
  formatCatalogMoney,
  isRegistrationExpiredAttention,
  parseMoneyInput,
  registrationFieldsEnabled,
} from '@/modules/product-catalog/utils';
import { cn } from '@/lib/utils';

export type ProductDialogMode = 'add' | 'edit';

export function ProductConfigurationDialog({
  open,
  onOpenChange,
  mode = 'edit',
  line,
  products,
  families,
  product,
  family,
  vendors,
  partners,
  excludedProductIds = [],
  opportunityValue,
  currency = 'USD',
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: ProductDialogMode;
  /** Required in edit mode; ignored in add mode */
  line: OpportunityProductLine | null;
  products: CatalogProduct[];
  families: ProductFamily[];
  /** Resolved product for edit mode (optional shortcut) */
  product?: CatalogProduct;
  family?: ProductFamily;
  vendors: Vendor[];
  partners: ImplementationPartner[];
  excludedProductIds?: string[];
  opportunityValue: number;
  currency?: string;
  onSave: (next: OpportunityProductLine) => void;
}) {
  const isAdd = mode === 'add';
  const [productId, setProductId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [registration, setRegistration] =
    useState<OpportunityProductRegistration>(defaultProductRegistration());

  useEffect(() => {
    if (!open) return;
    if (isAdd) {
      setProductId(null);
      setVendorId(null);
      setPartnerId(null);
      setAmount('');
      setRegistration(defaultProductRegistration());
      return;
    }
    if (!line) return;
    setProductId(line.productId);
    setVendorId(line.vendorId);
    setPartnerId(line.implementationPartnerId);
    setAmount(line.amount > 0 ? String(line.amount) : '');
    setRegistration({ ...line.registration });
  }, [open, isAdd, line]);

  const selectedProduct = useMemo(() => {
    if (isAdd) {
      return products.find((p) => p.id === productId) ?? null;
    }
    return product ?? products.find((p) => p.id === line?.productId) ?? null;
  }, [isAdd, products, productId, product, line?.productId]);

  const selectedFamily = useMemo(() => {
    if (family) return family;
    if (!selectedProduct) return undefined;
    const vendorById = new Map(vendors.map((v) => [v.id, v]));
    for (const vendorId of selectedProduct.vendorIds ?? []) {
      for (const familyId of vendorById.get(vendorId)?.productFamilyIds ?? []) {
        const match = families.find((f) => f.id === familyId);
        if (match) return match;
      }
    }
    return undefined;
  }, [selectedProduct, family, families, vendors]);

  const fieldsEnabled = registrationFieldsEnabled(registration.status);
  const detailsLocked = !selectedProduct && isAdd;

  const draftLine = useMemo((): OpportunityProductLine | null => {
    if (!productId && !line?.productId) return null;
    const base =
      line ?? (productId ? createEmptyOpportunityProductLine(productId) : null);
    if (!base) return null;
    return {
      ...base,
      productId: productId ?? base.productId,
      vendorId,
      implementationPartnerId: partnerId,
      amount: parseMoneyInput(amount),
      registration,
    };
  }, [line, productId, vendorId, partnerId, amount, registration]);

  const expiredAttention = draftLine
    ? isRegistrationExpiredAttention(draftLine)
    : false;

  const handleProductChange = (nextId: string | null) => {
    setProductId(nextId);
    if (isAdd) {
      setVendorId(null);
      setPartnerId(null);
    }
  };

  const handleSave = () => {
    if (isAdd && !productId) {
      toast.error('Select a product to continue');
      return;
    }
    if (!draftLine) return;

    let nextRegistration = { ...registration };
    if (!registrationFieldsEnabled(nextRegistration.status)) {
      nextRegistration = {
        ...nextRegistration,
        registrationDate: null,
        expirationDate: null,
        registrationNumber: null,
      };
    }

    onSave({
      ...draftLine,
      vendorId,
      implementationPartnerId: partnerId,
      amount: parseMoneyInput(amount),
      registration: nextRegistration,
    });
    onOpenChange(false);
  };

  const setStatus = (status: DealRegistrationStatus) => {
    setRegistration((prev) => {
      const next = { ...prev, status };
      if (!registrationFieldsEnabled(status)) {
        return {
          ...next,
          registrationDate: null,
          expirationDate: null,
          registrationNumber: null,
        };
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,880px)] w-full flex-col gap-0 overflow-visible p-0',
          'max-w-[calc(100%-1.5rem)] sm:max-w-3xl',
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 rounded-t-xl border-b border-border px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Package size={18} />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {isAdd ? 'Add product' : 'Configure product'}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                {isAdd
                  ? 'Choose a product from the catalog. Vendor, amount, and registration can be completed now or later.'
                  : 'Update product details and deal registration. All fields remain optional.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <Panel
            title="Product"
            description={
              isAdd
                ? 'Required to add this line item.'
                : 'Catalog product for this opportunity.'
            }
          >
            {isAdd ? (
              <CatalogFormField
                label="Product"
                required
                hint="Search by name or browse the catalog."
              >
                <ProductSelector
                  products={products}
                  value={productId}
                  excludedProductIds={excludedProductIds}
                  onChange={handleProductChange}
                  placeholder="Search products…"
                />
              </CatalogFormField>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-card px-3.5 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Package size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedProduct?.name ?? 'Unknown product'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {selectedFamily?.name ?? '—'}
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Commercial details"
            description="Optional. Capture vendor, partner, and allocated amount when known."
          >
            <div
              className={cn(
                'grid gap-4 sm:grid-cols-2',
                detailsLocked && 'opacity-60',
              )}
            >
              <CatalogFormField label="Vendor">
                <VendorSelector
                  product={selectedProduct}
                  vendors={vendors}
                  value={vendorId}
                  onChange={setVendorId}
                  disabled={detailsLocked}
                />
              </CatalogFormField>

              <CatalogFormField label="Implementation partner">
                <ImplementationPartnerSelector
                  product={selectedProduct}
                  partners={partners}
                  value={partnerId}
                  onChange={setPartnerId}
                  disabled={detailsLocked}
                />
              </CatalogFormField>

              <CatalogFormField
                label="Product amount"
                className="sm:col-span-2"
                hint="Portion of the opportunity value attributed to this product."
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn(catalogControlClass, 'tabular-nums')}
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={detailsLocked}
                  />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-surface-elevated/50 px-3 py-2 text-[11px] text-muted-foreground sm:min-w-[260px]">
                    <span>
                      Opportunity{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCatalogMoney(opportunityValue, currency)}
                      </span>
                    </span>
                    <span className="hidden text-border sm:inline">|</span>
                    <span>
                      This product{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCatalogMoney(parseMoneyInput(amount), currency)}
                      </span>
                    </span>
                  </div>
                </div>
              </CatalogFormField>
            </div>
          </Panel>

          <Panel
            title="Deal registration"
            description="Optional. Leave as Not Registered until vendor registration is needed."
          >
            <div
              className={cn(
                'grid gap-4 sm:grid-cols-2',
                detailsLocked && 'opacity-60',
              )}
            >
              <CatalogFormField label="Status" className="sm:col-span-2">
                <Select
                  value={registration.status}
                  onValueChange={(value) =>
                    setStatus(value as DealRegistrationStatus)
                  }
                  disabled={detailsLocked}
                >
                  <SelectTrigger
                    className={cn(catalogControlClass, 'max-w-md')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_REGISTRATION_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CatalogFormField>

              <CatalogFormField
                label="Registration date"
                className={cn(!fieldsEnabled && 'opacity-60')}
              >
                <Input
                  type="date"
                  disabled={!fieldsEnabled || detailsLocked}
                  value={registration.registrationDate ?? ''}
                  onChange={(e) =>
                    setRegistration((prev) => ({
                      ...prev,
                      registrationDate: e.target.value || null,
                    }))
                  }
                  className={catalogControlClass}
                />
              </CatalogFormField>

              <CatalogFormField
                label="Expiration date"
                className={cn(!fieldsEnabled && 'opacity-60')}
              >
                <Input
                  type="date"
                  disabled={!fieldsEnabled || detailsLocked}
                  value={registration.expirationDate ?? ''}
                  onChange={(e) =>
                    setRegistration((prev) => ({
                      ...prev,
                      expirationDate: e.target.value || null,
                    }))
                  }
                  className={catalogControlClass}
                />
              </CatalogFormField>

              <CatalogFormField
                label="Registration number"
                className={cn('sm:col-span-2', !fieldsEnabled && 'opacity-60')}
                hint=""
              >
                <Input
                  disabled={!fieldsEnabled || detailsLocked}
                  value={registration.registrationNumber ?? ''}
                  onChange={(e) =>
                    setRegistration((prev) => ({
                      ...prev,
                      registrationNumber: e.target.value || null,
                    }))
                  }
                  className={cn(catalogControlClass, 'max-w-md')}
                  placeholder="e.g. DR-12345"
                />
              </CatalogFormField>
            </div>

            {expiredAttention ? (
              <p className="mt-4 inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Expiration date is in the past while status is Approved.
                Registration may need attention.
              </p>
            ) : null}
          </Panel>
        </div>

        <DialogFooter className="shrink-0 rounded-b-xl border-t border-border bg-surface-elevated/40 px-6 py-4 sm:justify-between">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            {isAdd
              ? 'You can edit details anytime after adding.'
              : 'Changes apply to this opportunity only.'}
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={handleSave}
              disabled={isAdd && !productId}
            >
              {isAdd ? 'Add product' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated/25 p-4 sm:p-5">
      <div className="mb-4 space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
