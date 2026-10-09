'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  Cpu,
  Plus,
  Trash2,
  Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { countries } from '@/utils/countries';
import { useGetActiveFiscalYears } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { useGetEnabledCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import type { CreatePartnerPayload } from '@/store/server/features/partners/types';
import { useProductFamilies } from '@/store/server/features/product-catalog/queries';
import { ReportMultiSelect } from '@/modules/sales-pipeline/report/ReportMultiSelect';
import {
  PartnerRoleCheckboxGroup,
  PartnerRoleFieldsForm,
  PartnerRoleBadges,
  validateRoleScopedFieldValues,
  useFieldsForPartnerRoles,
} from '../roles';
import { usePartnerTiers } from '../tiers';
import { usePartnerPartnershipTypes } from '../partnership-types';
import {
  PartnerCurrencyTargetsEditor,
  toCurrencyTargetDrafts,
  type PartnerCurrencyTargetDraft,
} from './profile/PartnerCurrencyTargetsEditor';

interface AddPartnerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPartner: (
    payload: CreatePartnerPayload,
    options?: { productFamilyIds?: string[] },
  ) => void | Promise<void>;
}

type ContactDraft = {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
};

const STEPS = [
  { id: 1, label: 'Company', icon: Building2 },
  { id: 2, label: 'Contacts', icon: Users2 },
  { id: 3, label: 'Capabilities', icon: Cpu },
  { id: 4, label: 'Commercial', icon: CircleDollarSign },
] as const;

const FIELD =
  'h-[31.5px] border-border bg-white text-[12.25px] shadow-none dark:bg-surface-card';

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

function createEmptyContact(isPrimary = false): ContactDraft {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    position: '',
    email: '',
    phone: '',
    role: isPrimary ? 'Primary' : 'Technical',
    isPrimary,
  };
}

function evenlyDistribute(annual: number, count: number): number[] {
  if (count <= 0) return [];
  if (!Number.isFinite(annual) || annual <= 0) return Array(count).fill(0);
  const base = Math.floor((annual / count) * 100) / 100;
  const values = Array(count).fill(base);
  const allocated = base * count;
  values[count - 1] = Math.round((annual - allocated + base) * 100) / 100;
  return values;
}

export function AddPartnerWizardModal({
  isOpen,
  onClose,
  onAddPartner,
}: AddPartnerWizardModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [rolesError, setRolesError] = useState('');
  const [companyNameError, setCompanyNameError] = useState('');
  const [country, setCountry] = useState('Ethiopia');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const [contacts, setContacts] = useState<ContactDraft[]>([
    createEmptyContact(true),
  ]);

  const [roleFieldValues, setRoleFieldValues] = useState<
    Record<string, unknown>
  >({});
  const [roleFieldErrors, setRoleFieldErrors] = useState<
    Record<string, string>
  >({});

  const [partnerTierId, setPartnerTierId] = useState('');
  const [partnershipTypeId, setPartnershipTypeId] = useState('');
  const [accountManager, setAccountManager] = useState('');
  const [selectedProductFamilyIds, setSelectedProductFamilyIds] = useState<
    string[]
  >([]);
  const [currencyTargets, setCurrencyTargets] = useState<
    PartnerCurrencyTargetDraft[]
  >([]);

  const { activeTiers } = usePartnerTiers();
  const { activeTypes } = usePartnerPartnershipTypes();
  const familiesQuery = useProductFamilies();
  const productFamilyOptions = useMemo(
    () =>
      (familiesQuery.data ?? [])
        .filter((family) => family.status === 'active')
        .map((family) => ({ id: family.id, name: family.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [familiesQuery.data],
  );
  // API-backed role-scoped fields — drives both rendering and validation.
  const roleFieldGroups = useFieldsForPartnerRoles(selectedRoleIds);
  const { data: enabledCurrencies = [] } = useGetEnabledCurrencies({
    enabled: isOpen,
  });

  const fiscalYearQuery = useGetActiveFiscalYears({ enabled: isOpen });
  const sessions = useMemo(
    () =>
      [...(fiscalYearQuery.data?.sessions ?? [])].sort((a, b) =>
        String(a.startDate ?? a.name ?? '').localeCompare(
          String(b.startDate ?? b.name ?? ''),
        ),
      ),
    [fiscalYearQuery.data?.sessions],
  );
  const fiscalYearName = fiscalYearQuery.data?.name ?? 'Active fiscal year';

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSubmitting(false);
    setCompanyName('');
    setSelectedRoleIds([]);
    setRolesError('');
    setCompanyNameError('');
    setCountry('Ethiopia');
    setAddress('');
    setWebsite('');
    setRegistrationNumber('');
    setContacts([createEmptyContact(true)]);
    setRoleFieldValues({});
    setRoleFieldErrors({});
    setPartnerTierId('');
    setPartnershipTypeId('');
    setAccountManager('');
    setSelectedProductFamilyIds([]);
    setCurrencyTargets([]);
    // Reset only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only reset
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !enabledCurrencies.length) return;
    setCurrencyTargets((prev) => {
      if (prev.length) return prev;
      const next = toCurrencyTargetDrafts(
        undefined,
        enabledCurrencies,
        undefined,
      );
      // Avoid setState with a fresh [] when already empty (prevents update loops).
      return next.length ? next : prev;
    });
  }, [isOpen, enabledCurrencies]);

  const applySessionTargetsFromAnnual = (
    drafts: PartnerCurrencyTargetDraft[],
  ): PartnerCurrencyTargetDraft[] => {
    if (!sessions.length) return drafts;
    return drafts.map((row) => {
      const values = evenlyDistribute(row.annualAmount, sessions.length);
      return {
        ...row,
        sessionTargets: sessions.map((session, index) => ({
          sessionId: session.id,
          amount: values[index],
        })),
      };
    });
  };

  const updateContact = (
    id: string,
    field: keyof ContactDraft,
    value: string,
  ) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const addContact = () => {
    setContacts((prev) => [...prev, createEmptyContact(false)]);
  };

  const removeContact = (id: string) => {
    setContacts((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((c) => c.id !== id);
      if (!next.some((c) => c.isPrimary) && next[0]) {
        next[0] = { ...next[0], isPrimary: true, role: 'Primary' };
      }
      return next;
    });
  };

  const validateStep = (current: number): boolean => {
    if (current === 1) {
      let ok = true;
      if (!companyName.trim()) {
        setCompanyNameError('Company name is required');
        ok = false;
      } else {
        setCompanyNameError('');
      }
      if (selectedRoleIds.length === 0) {
        setRolesError('Select at least one partner role');
        ok = false;
      } else {
        setRolesError('');
      }
      return ok;
    }

    if (current === 2) {
      const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
      if (!primary?.name.trim()) {
        toast.error('Primary contact name is required');
        return false;
      }
      return true;
    }

    if (current === 3) {
      const fieldErrors = validateRoleScopedFieldValues(
        roleFieldGroups,
        roleFieldValues,
      );
      if (Object.keys(fieldErrors).length > 0) {
        setRoleFieldErrors(fieldErrors);
        toast.error('Fill required capability fields');
        return false;
      }
      setRoleFieldErrors({});
      return true;
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setStep(1);
      return;
    }

    const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
    const targetsWithSessions = applySessionTargetsFromAnnual(currencyTargets);
    const payload: CreatePartnerPayload = {
      name: companyName.trim(),
      roleIds: selectedRoleIds,
      tierId: partnerTierId || undefined,
      partnershipTypeId: partnershipTypeId || undefined,
      status: 'Active',
      accountManager: accountManager.trim() || undefined,
      annualTarget: targetsWithSessions[0]?.annualAmount || undefined,
      currencyTargets: targetsWithSessions
        .filter((row) => row.annualAmount > 0)
        .map((row) => ({
          currencyId: row.currencyId,
          annualAmount: row.annualAmount,
          sessionTargets: row.sessionTargets,
        })),
      partnershipStartDate: new Date().toISOString().split('T')[0],
      geographicCoverage: country ? [country] : [],
      website: website.trim() || undefined,
      address: address.trim() || undefined,
      registrationNumber: registrationNumber.trim() || undefined,
      primaryContact: primary?.name
        ? {
            name: primary.name.trim(),
            email: primary.email.trim() || undefined,
            phone: primary.phone.trim() || undefined,
            position: primary.position.trim() || undefined,
          }
        : undefined,
      fieldValues: Object.entries(roleFieldValues)
        .filter(
          ([, value]) => value !== '' && value !== undefined && value !== null,
        )
        .map(([entityFieldId, value]) => ({ entityFieldId, value })),
    };

    setSubmitting(true);
    try {
      await onAddPartner(payload, {
        productFamilyIds: selectedProductFamilyIds,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogHeader className="shrink-0 space-y-3 border-b border-border px-5 py-4 sm:px-6">
          <DialogTitle className="text-[16px] font-semibold">
            Add New Partner
          </DialogTitle>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const active = step === item.id;
              const done = step > item.id;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id < step || validateStep(step)) {
                        if (item.id > step) {
                          for (let s = step; s < item.id; s += 1) {
                            if (!validateStep(s)) return;
                          }
                        }
                        setStep(item.id);
                      }
                    }}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                      active && 'bg-brand text-brand-foreground',
                      done && !active && 'bg-emerald-50 text-emerald-800',
                      !active &&
                        !done &&
                        'bg-surface-elevated text-muted-foreground',
                    )}
                  >
                    {done && !active ? <Check size={12} /> : <Icon size={12} />}
                    {item.label}
                  </button>
                  {index < STEPS.length - 1 ? (
                    <span className="mx-0.5 h-px w-3 shrink-0 bg-border" />
                  ) : null}
                </React.Fragment>
              );
            })}
          </nav>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  label="Company name"
                  required
                  className="sm:col-span-2"
                  error={companyNameError}
                >
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (e.target.value.trim()) setCompanyNameError('');
                    }}
                    placeholder="e.g. Horizon Systems"
                    className={FIELD}
                    autoFocus
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <PartnerRoleCheckboxGroup
                    selectedRoleIds={selectedRoleIds}
                    error={rolesError}
                    onChange={(ids) => {
                      setSelectedRoleIds(ids);
                      setRolesError('');
                    }}
                  />
                </div>

                <FormField label="Product families" className="sm:col-span-2">
                  <ReportMultiSelect
                    items={productFamilyOptions}
                    value={selectedProductFamilyIds}
                    onChange={setSelectedProductFamilyIds}
                    allLabel="Select product families"
                    searchPlaceholder="Search product families…"
                    emptyLabel="No active product families found"
                    className={FIELD}
                  />
                  <p className="m-0 text-[11px] text-muted-foreground">
                    Optional. Links this partner to the selected families.
                  </p>
                </FormField>

                <FormField label="Country / Headquarters" required>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className={FIELD}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {countries.map((item) => (
                        <SelectItem key={item.code} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Registration / Tax ID">
                  <Input
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Optional"
                    className={FIELD}
                  />
                </FormField>

                <FormField label="Website" className="sm:col-span-2">
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    className={FIELD}
                  />
                </FormField>

                <FormField label="Address" className="sm:col-span-2">
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city"
                    className={FIELD}
                  />
                </FormField>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="m-0 text-[12px] font-semibold text-foreground">
                      {contact.isPrimary
                        ? 'Primary contact'
                        : `Contact ${index + 1}`}
                    </p>
                    {!contact.isPrimary ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeContact(contact.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Full name" required>
                      <Input
                        value={contact.name}
                        onChange={(e) =>
                          updateContact(contact.id, 'name', e.target.value)
                        }
                        placeholder="Name"
                        className={FIELD}
                      />
                    </FormField>
                    <FormField label="Title">
                      <Input
                        value={contact.position}
                        onChange={(e) =>
                          updateContact(contact.id, 'position', e.target.value)
                        }
                        placeholder="e.g. Channel Manager"
                        className={FIELD}
                      />
                    </FormField>
                    <FormField label="Email">
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          updateContact(contact.id, 'email', e.target.value)
                        }
                        placeholder="name@company.com"
                        className={FIELD}
                      />
                    </FormField>
                    <FormField label="Phone">
                      <Input
                        value={contact.phone}
                        onChange={(e) =>
                          updateContact(contact.id, 'phone', e.target.value)
                        }
                        placeholder="+251 …"
                        className={FIELD}
                      />
                    </FormField>
                    {!contact.isPrimary ? (
                      <FormField label="Role" className="sm:col-span-2">
                        <Select
                          value={contact.role}
                          onValueChange={(value) =>
                            updateContact(contact.id, 'role', value)
                          }
                        >
                          <SelectTrigger className={FIELD}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Technical">Technical</SelectItem>
                            <SelectItem value="Commercial">
                              Commercial
                            </SelectItem>
                            <SelectItem value="Executive">Executive</SelectItem>
                            <SelectItem value="Operations">
                              Operations
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    ) : null}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addContact}
                className="inline-flex items-center gap-1.5 text-[12.25px] font-medium text-brand hover:underline"
              >
                <Plus size={14} />
                Add another contact
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-elevated/50 px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Roles
                </span>
                <PartnerRoleBadges roleIds={selectedRoleIds} compact />
              </div>

              {selectedRoleIds.length === 0 ? (
                <p className="m-0 text-[12.25px] text-muted-foreground">
                  Select partner roles in the Company step to load capability
                  fields.
                </p>
              ) : (
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
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Partner tier">
                  <Select
                    value={partnerTierId || undefined}
                    onValueChange={setPartnerTierId}
                  >
                    <SelectTrigger className={FIELD}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Partnership type">
                  <Select
                    value={partnershipTypeId || undefined}
                    onValueChange={setPartnershipTypeId}
                  >
                    <SelectTrigger className={FIELD}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Account manager" className="sm:col-span-2">
                  <Input
                    value={accountManager}
                    onChange={(e) => setAccountManager(e.target.value)}
                    placeholder="Internal owner"
                    className={FIELD}
                  />
                </FormField>
              </div>

              <div className="space-y-3 rounded-md border border-border p-3">
                <div>
                  <p className="m-0 text-[12px] font-semibold text-foreground">
                    Revenue targets by currency
                  </p>
                  <p className="m-0 text-[11px] text-muted-foreground">
                    Optional · {fiscalYearName}
                    {sessions.length
                      ? ` · ${sessions.length} sessions will receive an even split`
                      : ''}
                  </p>
                </div>
                {enabledCurrencies.length ? (
                  <PartnerCurrencyTargetsEditor
                    currencies={enabledCurrencies}
                    value={currencyTargets}
                    onChange={(next) =>
                      setCurrencyTargets(applySessionTargetsFromAnnual(next))
                    }
                    optionalHint="Add one annual amount per currency you want to track."
                  />
                ) : (
                  <p className="m-0 text-[12px] text-muted-foreground">
                    Enable tenant currencies to set partner revenue targets.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-surface-elevated px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-[31.5px] text-[12.25px]"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <div className="flex flex-1 items-center justify-end gap-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="h-[31.5px] gap-1 text-[12.25px]"
                onClick={() => setStep((prev) => prev - 1)}
                disabled={submitting}
              >
                <ArrowLeft size={13} />
                Back
              </Button>
            ) : null}
            {step < STEPS.length ? (
              <Button
                type="button"
                className="h-[31.5px] gap-1 bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                onClick={handleContinue}
              >
                Continue
                <ArrowRight size={13} />
              </Button>
            ) : (
              <Button
                type="button"
                className="h-[31.5px] gap-1 bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                <Check size={14} />
                {submitting ? 'Creating…' : 'Create Partner'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
