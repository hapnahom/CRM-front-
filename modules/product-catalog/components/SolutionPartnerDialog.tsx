'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';
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
import { AmountCurrencyFields } from '@/modules/product-catalog/components/AmountCurrencyFields';
import { VendorSelector } from '@/modules/product-catalog/components/VendorSelector';
import type {
  DealRegistrationStatus,
  OpportunityProductRegistration,
  OpportunitySolutionVendor,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import {
  createEmptySolutionVendor,
  DEAL_REGISTRATION_STATUS_OPTIONS,
  defaultProductRegistration,
  familyPartnerIdsForRole,
  isRegistrationExpiredAttention,
  parseMoneyInput,
  registrationFieldsEnabled,
} from '@/modules/product-catalog/utils';
import { cn } from '@/lib/utils';
import type { PartnerRole } from '@/modules/partners/roles/types';
import { DEFAULT_BEFORE_PRODUCT_SLOT } from '@/modules/product-catalog/hooks/useSolutionWorkflow';

export function SolutionPartnerDialog({
  open,
  onOpenChange,
  mode,
  partnerLine,
  catalogPartners,
  excludedPartnerIds = [],
  currency = 'USD',
  currencyOptions = [],
  family = null,
  roleSlot,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  partnerLine: OpportunitySolutionVendor | null;
  /** Kept for call-site compatibility. */
  familyId?: string;
  family?: ProductFamily | null;
  roleSlot?: PartnerRole;
  catalogPartners: Vendor[];
  excludedPartnerIds?: string[];
  currency?: string;
  currencyOptions?: string[];
  onSave: (next: OpportunitySolutionVendor) => void | Promise<void>;
}) {
  const isAdd = mode === 'add';
  const slot = roleSlot ?? DEFAULT_BEFORE_PRODUCT_SLOT;
  const roleLabel = slot.name;
  const roleLabelLower = roleLabel.toLowerCase();
  const showDealRegistration = slot.solutionFieldSet === 'deal_registration';
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );
  const [amount, setAmount] = useState('');
  const [lineCurrency, setLineCurrency] = useState(currency);
  const [registration, setRegistration] =
    useState<OpportunityProductRegistration>(defaultProductRegistration());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      return;
    }
    if (isAdd) {
      setSelectedPartnerId(null);
      setAmount('');
      setLineCurrency(currency);
      setRegistration(defaultProductRegistration());
      return;
    }
    if (!partnerLine) return;
    setSelectedPartnerId(partnerLine.vendorId);
    setAmount(partnerLine.amount > 0 ? String(partnerLine.amount) : '');
    setLineCurrency(partnerLine.currency || currency);
    setRegistration({ ...partnerLine.registration });
  }, [open, isAdd, partnerLine, currency]);

  const available = useMemo(() => {
    let eligible = catalogPartners.filter((p) => p.status === 'active');
    if (slot.filterByProductLink && family) {
      const allowed = new Set(familyPartnerIdsForRole(family, slot.code));
      eligible = eligible.filter((p) => allowed.has(p.id));
    }
    const excluded = new Set(excludedPartnerIds);
    if (!isAdd && partnerLine) excluded.delete(partnerLine.vendorId);
    return eligible
      .filter((p) => !excluded.has(p.id) || p.id === selectedPartnerId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    catalogPartners,
    excludedPartnerIds,
    isAdd,
    partnerLine,
    selectedPartnerId,
    slot.filterByProductLink,
    slot.code,
    family,
  ]);

  const fieldsEnabled = registrationFieldsEnabled(registration.status);
  const draftForAttention: OpportunitySolutionVendor | null = selectedPartnerId
    ? {
        ...(partnerLine ??
          createEmptySolutionVendor(selectedPartnerId, slot.id, lineCurrency)),
        partnerRoleId: slot.id,
        vendorId: selectedPartnerId,
        amount: parseMoneyInput(amount),
        currency: lineCurrency,
        registration,
      }
    : null;
  const expiredAttention = draftForAttention
    ? isRegistrationExpiredAttention({
        id: draftForAttention.id,
        productId: '',
        vendorId: draftForAttention.vendorId,
        implementationPartnerId: null,
        amount: draftForAttention.amount,
        registration: draftForAttention.registration,
      })
    : false;

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

  const handleSave = async () => {
    if (!selectedPartnerId) {
      toast.error(`Select a ${roleLabelLower}`);
      return;
    }
    if (!lineCurrency) {
      toast.error('Select a currency');
      return;
    }
    let nextRegistration = { ...registration };
    if (!registrationFieldsEnabled(nextRegistration.status)) {
      nextRegistration = {
        ...nextRegistration,
        registrationDate: null,
        expirationDate: null,
        registrationNumber: null,
      };
    }
    const base =
      partnerLine ??
      createEmptySolutionVendor(selectedPartnerId, slot.id, lineCurrency);
    setSaving(true);
    try {
      await onSave({
        ...base,
        partnerRoleId: slot.id,
        vendorId: selectedPartnerId,
        amount: parseMoneyInput(amount),
        currency: lineCurrency,
        registration: nextRegistration,
      });
      onOpenChange(false);
    } catch {
      // Parent surfaces the error toast; keep dialog open for retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,820px)] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {isAdd ? `Add ${roleLabel}` : `Edit ${roleLabel}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isAdd
                  ? `Select a ${roleLabelLower} and optional registration details`
                  : `Update ${roleLabelLower} details`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <CatalogFormField label={roleLabel} required>
            <VendorSelector
              vendors={available}
              value={selectedPartnerId}
              onChange={setSelectedPartnerId}
              roleLabel={roleLabel}
              roleCodes={slot.code}
              disabled={!isAdd || saving}
              allowEmpty={false}
              placeholder={
                available.length
                  ? `Select ${roleLabelLower}`
                  : `No active ${roleLabelLower}s`
              }
            />
          </CatalogFormField>

          <fieldset
            disabled={saving}
            className="min-w-0 space-y-5 border-0 p-0"
          >
            <AmountCurrencyFields
              amountLabel={`${roleLabel} value`}
              amount={amount}
              onAmountChange={setAmount}
              currency={lineCurrency}
              onCurrencyChange={setLineCurrency}
              currencyOptions={currencyOptions}
            />

            {showDealRegistration ? (
              <section className="space-y-3 rounded-xl border border-border bg-white p-4 dark:bg-surface-card">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Deal registration
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CatalogFormField label="Status" className="sm:col-span-2">
                    <Select
                      value={registration.status}
                      onValueChange={(value) =>
                        setStatus(value as DealRegistrationStatus)
                      }
                      disabled={saving}
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
                      disabled={!fieldsEnabled || saving}
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
                      disabled={!fieldsEnabled || saving}
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
                    className={cn(
                      'sm:col-span-2',
                      !fieldsEnabled && 'opacity-60',
                    )}
                  >
                    <Input
                      disabled={!fieldsEnabled || saving}
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
                  <p className="inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    Expiration date is in the past while status is Approved.
                  </p>
                ) : null}
              </section>
            ) : null}
          </fieldset>
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-surface-elevated/40 px-6 py-4">
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
            disabled={!selectedPartnerId || saving}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {isAdd ? 'Adding…' : 'Saving…'}
              </>
            ) : isAdd ? (
              `Add ${roleLabel}`
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
