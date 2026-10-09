'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Partner, PartnerStatus } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  PartnerRoleCheckboxGroup,
  PartnerRoleFieldsForm,
  normalizePartnerRoleIds,
  validateRoleScopedFieldValues,
  useFieldsForPartnerRoles,
} from '../../roles';
import { usePartnerTiers } from '../../tiers';
import { usePartnerPartnershipTypes } from '../../partnership-types';
import { useUpdatePartner } from '@/store/server/features/partners/mutations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EditPartnerModalProps {
  isOpen: boolean;
  partner: Partner;
  onClose: () => void;
  onSave: (updatedPartner: Partner) => void;
}

const FIELD =
  'h-[31.5px] border-border bg-white text-[12.25px] shadow-none dark:bg-surface-card';

const STATUS_OPTIONS: PartnerStatus[] = [
  'Active',
  'Onboarding',
  'Under Review',
  'Suspended',
  'Inactive',
];

function FormField({
  label,
  required,
  children,
  className,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[12px] font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="m-0 text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

type PartnerFormState = {
  name: string;
  legalName: string;
  tierId: string;
  tier: string;
  partnershipTypeId: string;
  partnershipType: string;
  status: PartnerStatus;
  accountManager: string;
  website: string;
  address: string;
  registrationNumber: string;
  annualTarget: number;
  targetAccountsFocus: string;
  solutionFocus: string;
  primaryContact: Partner['primaryContact'];
};

function buildFormState(partner: Partner): PartnerFormState {
  return {
    name: partner.name,
    legalName: partner.legalName,
    tierId: partner.tierId ?? '',
    tier: partner.tier ?? '',
    partnershipTypeId: partner.partnershipTypeId ?? '',
    partnershipType: partner.partnershipType ?? '',
    status: partner.status,
    accountManager: partner.accountManager,
    website: partner.website,
    address: partner.address,
    registrationNumber: partner.registrationNumber,
    annualTarget: partner.annualTarget ?? partner.scorecard?.revenueTarget ?? 0,
    targetAccountsFocus: partner.targetAccountsFocus || '',
    solutionFocus: partner.solutionFocus || '',
    primaryContact: { ...partner.primaryContact },
  };
}

export function EditPartnerModal({
  isOpen,
  partner,
  onClose,
  onSave,
}: EditPartnerModalProps) {
  const updatePartner = useUpdatePartner();
  const { tiers, activeTiers } = usePartnerTiers();
  const { types, activeTypes } = usePartnerPartnershipTypes();

  const initialFieldValues = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const group of partner.fieldGroups ?? []) {
      for (const field of group.fields ?? []) {
        if (field.id && field.value !== undefined) {
          map[field.id] = field.value;
        }
      }
    }
    return map;
  }, [partner.fieldGroups]);

  const [form, setForm] = useState<PartnerFormState>(() =>
    buildFormState(partner),
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(() =>
    normalizePartnerRoleIds(partner.roleIds),
  );
  const roleFieldGroups = useFieldsForPartnerRoles(selectedRoleIds);
  const [roleFieldValues, setRoleFieldValues] =
    useState<Record<string, unknown>>(initialFieldValues);
  const [roleFieldErrors, setRoleFieldErrors] = useState<
    Record<string, string>
  >({});
  const [rolesError, setRolesError] = useState('');
  const [productsInput, setProductsInput] = useState(
    partner.productsAndSolutions.join(', '),
  );

  const tierOptions = useMemo(() => {
    const options = [...activeTiers];
    const currentId = form.tierId || partner.tierId;
    if (currentId && !options.some((tier) => tier.id === currentId)) {
      const current = tiers.find((tier) => tier.id === currentId);
      if (current) options.unshift(current);
    }
    return options;
  }, [activeTiers, form.tierId, partner.tierId, tiers]);

  const partnershipTypeOptions = useMemo(() => {
    const options = [...activeTypes];
    const currentId = form.partnershipTypeId || partner.partnershipTypeId;
    if (currentId && !options.some((type) => type.id === currentId)) {
      const current = types.find((type) => type.id === currentId);
      if (current) options.unshift(current);
    }
    return options;
  }, [activeTypes, form.partnershipTypeId, partner.partnershipTypeId, types]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildFormState(partner));
    setSelectedRoleIds(normalizePartnerRoleIds(partner.roleIds));
    setRoleFieldValues(initialFieldValues);
    setRoleFieldErrors({});
    setRolesError('');
    setProductsInput(partner.productsAndSolutions.join(', '));
  }, [isOpen, partner, initialFieldValues]);

  const patchForm = (patch: Partial<PartnerFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    if (selectedRoleIds.length === 0) {
      setRolesError('Select at least one partner role');
      return;
    }

    const fieldErrors = validateRoleScopedFieldValues(
      roleFieldGroups,
      roleFieldValues,
    );
    if (Object.keys(fieldErrors).length > 0) {
      setRoleFieldErrors(fieldErrors);
      return;
    }

    const productsArray = productsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const validFieldIds = new Set(
      roleFieldGroups.flatMap((group) => group.fields.map((field) => field.id)),
    );
    const cleanedFieldValues = Object.entries(roleFieldValues)
      .filter(([fieldId]) => validFieldIds.has(fieldId))
      .map(([entityFieldId, value]) => ({ entityFieldId, value }));

    try {
      const updated = await updatePartner.mutateAsync({
        id: partner.id,
        payload: {
          name: form.name.trim(),
          legalName: form.legalName.trim() || form.name.trim(),
          roleIds: selectedRoleIds,
          tierId: form.tierId || null,
          partnershipTypeId: form.partnershipTypeId || null,
          status: form.status || partner.status,
          annualTarget: form.annualTarget,
          targetAccountsFocus: form.targetAccountsFocus,
          solutionFocus: form.solutionFocus,
          accountManager: form.accountManager || partner.accountManager,
          website: form.website || partner.website,
          address: form.address || partner.address,
          registrationNumber:
            form.registrationNumber || partner.registrationNumber,
          primaryContact: {
            name: form.primaryContact?.name ?? partner.primaryContact.name,
            email: form.primaryContact?.email ?? partner.primaryContact.email,
            phone: form.primaryContact?.phone ?? partner.primaryContact.phone,
            position:
              form.primaryContact?.position ?? partner.primaryContact.position,
          },
          productsAndSolutions:
            productsArray.length > 0
              ? productsArray
              : partner.productsAndSolutions,
          fieldValues: cleanedFieldValues,
        },
      });
      toast.success('Partner updated');
      onSave(updated);
      onClose();
    } catch {
      toast.error('Failed to update partner');
    }
  };

  const saving = updatePartner.isLoading;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 sm:px-6">
          <DialogTitle className="text-[16px] font-semibold">
            Edit partner
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Update profile details for {partner.name}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-partner-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6"
        >
          <FormSection title="Company">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Company / display name"
                required
                className="sm:col-span-2"
              >
                <Input
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  className={FIELD}
                  placeholder="e.g. Horizon Systems"
                  required
                />
              </FormField>

              <FormField
                label="Legal registered entity"
                className="sm:col-span-2"
              >
                <Input
                  value={form.legalName}
                  onChange={(e) => patchForm({ legalName: e.target.value })}
                  className={FIELD}
                  placeholder="Legal company name"
                />
              </FormField>

              <FormField label="Website">
                <Input
                  value={form.website}
                  onChange={(e) => patchForm({ website: e.target.value })}
                  className={FIELD}
                  placeholder="https://"
                />
              </FormField>

              <FormField label="Registration / tax ID">
                <Input
                  value={form.registrationNumber}
                  onChange={(e) =>
                    patchForm({ registrationNumber: e.target.value })
                  }
                  className={FIELD}
                />
              </FormField>

              <FormField label="Address" className="sm:col-span-2">
                <Input
                  value={form.address}
                  onChange={(e) => patchForm({ address: e.target.value })}
                  className={FIELD}
                  placeholder="City, country"
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Roles">
            <PartnerRoleCheckboxGroup
              selectedRoleIds={selectedRoleIds}
              error={rolesError}
              onChange={(ids) => {
                setSelectedRoleIds(ids);
                setRolesError('');
              }}
            />
            <PartnerRoleFieldsForm
              roleIds={selectedRoleIds}
              values={roleFieldValues}
              errors={roleFieldErrors}
              onChange={(fieldId, value) => {
                setRoleFieldValues((prev) => ({
                  ...prev,
                  [fieldId]: value,
                }));
                setRoleFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next[fieldId];
                  return next;
                });
              }}
            />
          </FormSection>

          <FormSection title="Tier, type & status">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Partner tier">
                <Select
                  value={form.tierId || undefined}
                  onValueChange={(value) => {
                    const selected = tierOptions.find(
                      (tier) => tier.id === value,
                    );
                    patchForm({
                      tierId: value,
                      tier: selected?.name ?? form.tier,
                    });
                  }}
                >
                  <SelectTrigger className={FIELD}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Partnership type">
                <Select
                  value={form.partnershipTypeId || undefined}
                  onValueChange={(value) => {
                    const selected = partnershipTypeOptions.find(
                      (type) => type.id === value,
                    );
                    patchForm({
                      partnershipTypeId: value,
                      partnershipType: selected?.name ?? form.partnershipType,
                    });
                  }}
                >
                  <SelectTrigger className={FIELD}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnershipTypeOptions.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Status">
                <Select
                  value={form.status || 'Active'}
                  onValueChange={(value) =>
                    patchForm({ status: value as PartnerStatus })
                  }
                >
                  <SelectTrigger className={FIELD}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Commercial">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Annual revenue quota (USD)">
                <Input
                  type="number"
                  min={0}
                  value={form.annualTarget}
                  onChange={(e) =>
                    patchForm({
                      annualTarget: Number(e.target.value) || 0,
                    })
                  }
                  className={FIELD}
                />
              </FormField>

              <FormField label="Account manager">
                <Input
                  value={form.accountManager}
                  onChange={(e) =>
                    patchForm({ accountManager: e.target.value })
                  }
                  className={FIELD}
                  placeholder="Internal owner"
                />
              </FormField>

              <FormField
                label="Target accounts focus"
                className="sm:col-span-2"
              >
                <Input
                  value={form.targetAccountsFocus}
                  onChange={(e) =>
                    patchForm({ targetAccountsFocus: e.target.value })
                  }
                  className={FIELD}
                  placeholder="Key accounts or segments"
                />
              </FormField>

              <FormField label="Solution focus" className="sm:col-span-2">
                <Input
                  value={form.solutionFocus}
                  onChange={(e) => patchForm({ solutionFocus: e.target.value })}
                  className={FIELD}
                  placeholder="Primary solutions this partner sells"
                />
              </FormField>

              <FormField label="Products & solutions" className="sm:col-span-2">
                <Input
                  value={productsInput}
                  onChange={(e) => setProductsInput(e.target.value)}
                  className={FIELD}
                  placeholder="Comma-separated list"
                />
              </FormField>
            </div>
          </FormSection>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-partner-form"
            disabled={saving}
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
