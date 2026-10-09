'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelineContacts } from '@/store/server/features/leads/pipeline/queries';
import {
  typeAppliesToLead,
  useOpportunityTypes,
} from '@/store/server/features/opportunity-types/queries';
import { useCreatePipelineLead } from '@/store/server/features/leads/pipeline/mutations';
import { isModuleEnabled } from '@/config/modules';
import { useMarketingCampaigns } from '@/store/server/features/marketing/queries';
import type {
  LeadCurrency,
  PipelineContactSummary,
  PipelineStage,
} from '@/store/server/features/leads/pipeline/types';
import { usePipelineCurrencies } from '@/hooks/usePipelineCurrencies';
import { AddCustomerModal } from '@/components/customer-management/AddCustomerModal';
import { AddContactModal } from '@/components/customer-management/AddContactModal';
import { CustomerVectorGroupedSelect } from '@/components/pipeline/CustomerVectorGroupedSelect';
import { useGetCustomers } from '@/store/server/features/customers/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useQueryClient } from 'react-query';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import {
  EntityCustomFieldsForm,
  applyCustomFieldDefaults,
  customFieldValuesToPayload,
  pruneCustomFieldValues,
} from '@/components/pipeline/EntityCustomFieldsForm';
import {
  EntityAssignmentRolesFields,
  buildEntityRoleAssignmentsForSubmit,
  pruneRoleAssignmentsToStage,
  validateRequiredRoleAssignments,
  type RoleAssignmentValue,
} from '@/components/pipeline/EntityAssignmentRolesFields';
import {
  fetchPipelineRolesForStage,
  usePipelineRolesForStage,
} from '@/store/server/features/pipeline-roles/queries';
import { validateFields } from '@/modules/custom-fields/validation/engine';
import type { ValidationRule } from '@/modules/custom-fields/validation/types';
import type { CurrencyCode } from '@/lib/currency';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import {
  issuesToErrorMap,
  splitValidationIssues,
  validationSummaryFromIssues,
} from '@/lib/pipeline/validation-exception';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { OpportunitySolutionsSection } from '@/modules/product-catalog/components/OpportunitySolutionsSection';
import type { OpportunitySolution } from '@/modules/product-catalog/types';
import { toOpportunitySolutionPayload } from '@/store/server/features/product-catalog/mutations';
import {
  useCatalogProducts,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import { EntityCollaborationStep } from '@/components/collaboration/entity-collaboration-step';
import { COLLABORATION_LEAD_ENTITY_TYPE } from '@/utils/collaboration';
import { FiscalPeriodFields } from '@/components/pipeline/FiscalPeriodFields';
import {
  OpportunityOriginatorField,
  emptyOriginatorValue,
  originatorPayloadFromValue,
  type OpportunityOriginatorValue,
} from '@/components/pipeline/OpportunityOriginatorField';
import { usePartners } from '@/store/server/features/partners/queries';
import { usePrmCatalogPartners } from '@/store/server/features/partners/usePrmCatalogPartners';

function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function contactDisplayName(contact: PipelineContactSummary) {
  return `${contact.firstName} ${contact.lastName}`.trim() || '—';
}

function StageOptionLabel({
  stage,
  index,
}: {
  stage: PipelineStage;
  index: number;
}) {
  const appearance = pipelineStageAppearance(stage, index);
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{
          backgroundColor: stage.color || appearance.borderColor,
          borderColor: appearance.borderColor,
        }}
      />
      {stage.name}
    </span>
  );
}

const controlClass = 'h-9 border-border bg-white text-sm dark:bg-surface-card';

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortedStages: PipelineStage[];
  onCreated?: (result?: { pendingApproval?: boolean }) => void;
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  sortedStages,
  onCreated,
}: CreateLeadDialogProps) {
  const queryClient = useQueryClient();
  const createLead = useCreatePipelineLead();
  const currentUserId = useAuthenticationStore((s) => s.userId);

  const [form, setForm] = useState({
    name: '',
    customerId: '',
    contactId: '',
    value: '',
    currency: '' as CurrencyCode,
    responsibleUserId: currentUserId || '',
    observerUserIds: [] as string[],
    stageId: '',
    typeId: '',
    sessionId: '',
  });
  const [originator, setOriginator] =
    useState<OpportunityOriginatorValue>(emptyOriginatorValue);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentValue[]>(
    [],
  );
  // Set once the lead row exists; switches the dialog to the collaboration step.
  const [createdLead, setCreatedLead] = useState<{
    id: string;
    name: string;
    memberUserIds: string[];
  } | null>(null);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [exceptionPrompt, setExceptionPrompt] = useState<{
    summary: string;
    ruleMessages: Record<string, string>;
  } | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [showRoleErrors, setShowRoleErrors] = useState(false);
  const [contactSelectOpen, setContactSelectOpen] = useState(false);
  const [customerLabelById, setCustomerLabelById] = useState<
    Record<string, string>
  >({});
  const [solutions, setSolutions] = useState<OpportunitySolution[]>([]);

  const { data: catalogFamilies = [] } = useProductFamilies();
  const { data: catalogProducts = [] } = useCatalogProducts();
  const { vendors: catalogVendors, implementationPartners: catalogPartners } =
    usePrmCatalogPartners();

  const { data: contacts = [], refetch: refetchContacts } = usePipelineContacts(
    {
      enabled: open,
    },
  );
  const { currencyOptions, defaultCurrencyCode } = usePipelineCurrencies({
    enabled: open,
  });
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const { data: allOpportunityTypes = [] } = useOpportunityTypes({
    enabled: open,
  });
  const marketingEnabled = isModuleEnabled('marketing');
  const { data: marketingCampaigns = [] } = useMarketingCampaigns(
    open && marketingEnabled ? {} : undefined,
  );
  const { data: partnersData } = usePartners(
    open && marketingEnabled ? { page: 1, pageSize: 1000 } : {},
  );
  const partners = marketingEnabled ? (partnersData?.partners ?? []) : [];
  const opportunityTypes = useMemo(
    () => allOpportunityTypes.filter(typeAppliesToLead),
    [allOpportunityTypes],
  );
  const users = platformUsersData?.data ?? [];
  const { data: customersData } = useGetCustomers(
    { page: 1, pageSize: 200 },
    open,
  );
  const customers = customersData?.data ?? [];

  const stageFieldsQuery = useFieldsForStage('LEAD', form.stageId || null);
  const stageFields = useMemo(
    () => (stageFieldsQuery.data ?? []).map(apiResponseToConfig),
    [stageFieldsQuery.data],
  );
  const rolesForStageQuery = usePipelineRolesForStage(
    'LEAD',
    form.stageId || null,
    { enabled: open },
  );
  const rolesForStage = rolesForStageQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    setForm({
      name: '',
      customerId: '',
      contactId: '',
      value: '',
      currency: defaultCurrencyCode || '',
      responsibleUserId: currentUserId || '',
      observerUserIds: [],
      stageId: sortedStages[0]?.id ?? '',
      typeId: '',
      sessionId: '',
    });
    setOriginator(emptyOriginatorValue());
    setCustomValues({});
    setRoleAssignments([]);
    setCustomErrors({});
    setFormError(null);
    setExceptionPrompt(null);
    setSolutions([]);
    setCreatedLead(null);
    setShowRoleErrors(false);
  }, [open, sortedStages, defaultCurrencyCode, currentUserId]);

  useEffect(() => {
    if (!defaultCurrencyCode || form.currency) return;
    setForm((prev) => ({ ...prev, currency: defaultCurrencyCode }));
  }, [defaultCurrencyCode, form.currency]);

  useEffect(() => {
    if (!open || !currentUserId || form.responsibleUserId) return;
    setForm((prev) => ({ ...prev, responsibleUserId: currentUserId }));
  }, [open, currentUserId, form.responsibleUserId]);

  useEffect(() => {
    if (sortedStages.length === 0 || form.stageId) return;
    setForm((prev) => ({ ...prev, stageId: sortedStages[0]!.id }));
  }, [sortedStages, form.stageId]);

  useEffect(() => {
    setCustomValues((prev) =>
      applyCustomFieldDefaults(
        pruneCustomFieldValues(
          prev,
          stageFields.map((f) => f.id),
        ),
        stageFields,
      ),
    );
    setCustomErrors({});
  }, [stageFields]);

  useEffect(() => {
    if (!open || !form.stageId || rolesForStage.length === 0) return;
    setRoleAssignments((prev) =>
      pruneRoleAssignmentsToStage(prev, rolesForStage),
    );
  }, [form.stageId, rolesForStage, open]);

  useEffect(() => {
    const primary = rolesForStage.find((r) => r.isPrimary);
    if (!primary || !form.responsibleUserId) return;
    setRoleAssignments((prev) => {
      const current = prev.find((a) => a.roleId === primary.id)?.userId;
      if (current === form.responsibleUserId) return prev;
      return [
        ...prev.filter((a) => a.roleId !== primary.id),
        { roleId: primary.id, userId: form.responsibleUserId },
      ];
    });
  }, [rolesForStage, form.responsibleUserId]);

  useEffect(() => {
    const primary = rolesForStage.find((r) => r.isPrimary);
    if (!primary) return;
    const assigned = roleAssignments.find(
      (a) => a.roleId === primary.id,
    )?.userId;
    if (assigned && assigned !== form.responsibleUserId) {
      setForm((prev) => ({
        ...prev,
        responsibleUserId: assigned,
        observerUserIds: prev.observerUserIds.filter((id) => id !== assigned),
      }));
    }
  }, [rolesForStage, roleAssignments, form.responsibleUserId]);

  useEffect(() => {
    if (!form.customerId) {
      if (form.contactId) setForm((prev) => ({ ...prev, contactId: '' }));
      return;
    }
    const customerContacts = contacts.filter(
      (contact) => contact.customerId === form.customerId,
    );
    const primary =
      customerContacts.find((contact) => contact.isPrimaryContact) ??
      customerContacts[0];
    if (customerContacts.length === 1 && primary) {
      if (form.contactId !== primary.id) {
        setForm((prev) => ({ ...prev, contactId: primary.id }));
      }
      return;
    }
    if (
      form.contactId &&
      !customerContacts.some((contact) => contact.id === form.contactId)
    ) {
      setForm((prev) => ({ ...prev, contactId: '' }));
    }
  }, [form.customerId, form.contactId, contacts]);

  const selectedCustomerContacts = form.customerId
    ? contacts.filter((c) => c.customerId === form.customerId)
    : [];

  const selectedCustomerName =
    customerLabelById[form.customerId] ??
    customers.find((c) => c.id === form.customerId)?.accountName;

  const selectedStageIndex = sortedStages.findIndex(
    (s) => s.id === form.stageId,
  );
  const selectedStage =
    selectedStageIndex >= 0 ? sortedStages[selectedStageIndex] : undefined;

  useEffect(() => {
    if (addContactOpen) setContactSelectOpen(false);
  }, [addContactOpen]);

  const saveNewLead = async (opts?: { allowValidationException?: boolean }) => {
    setFormError(null);
    setShowRoleErrors(true);
    setCustomErrors({});

    if (!form.name.trim() || !form.customerId) {
      setFormError('Lead name and customer are required.');
      return;
    }
    if (!form.contactId) {
      setFormError('Choose a contact for this lead.');
      return;
    }
    if (!form.stageId) {
      setFormError('Choose a pipeline stage for this lead.');
      return;
    }
    const rolesForSubmit = await fetchPipelineRolesForStage(
      'LEAD',
      form.stageId,
    );
    const assignmentsForSubmit = buildEntityRoleAssignmentsForSubmit(
      rolesForSubmit,
      roleAssignments,
      form.responsibleUserId,
    );
    if (!form.responsibleUserId) {
      const primaryRole = rolesForSubmit.find((r) => r.isPrimary);
      setFormError(
        primaryRole
          ? `Assign a ${primaryRole.name} for this lead.`
          : 'Assign an owner for this lead.',
      );
      return;
    }
    const roleValidationError = validateRequiredRoleAssignments(
      rolesForSubmit,
      assignmentsForSubmit,
    );
    if (roleValidationError) {
      setFormError(roleValidationError);
      return;
    }
    if (!form.sessionId) {
      setFormError('Choose a fiscal year and session for this lead.');
      return;
    }

    const issues = validateFields(
      stageFields.map((f) => ({
        id: f.id,
        label: f.label,
        required: f.required,
        type: f.type,
        validationRules: (f.validation.rules ?? []) as ValidationRule[],
        settings: f.settings as unknown as Record<string, unknown>,
      })),
      customValues,
    );
    const { required, ruleFailed } = splitValidationIssues(issues);

    if (required.length) {
      setCustomErrors(issuesToErrorMap(required));
      setExceptionPrompt(null);
      setFormError('Please complete the required custom fields.');
      return;
    }

    if (ruleFailed.length && !opts?.allowValidationException) {
      const ruleMap = issuesToErrorMap(ruleFailed);
      setCustomErrors(ruleMap);
      setExceptionPrompt({
        summary: validationSummaryFromIssues(ruleFailed),
        ruleMessages: ruleMap,
      });
      setFormError(
        'Some values do not meet validation rules. Fix them or continue with an exception for approval.',
      );
      return;
    }

    const selectedStage = sortedStages.find((s) => s.id === form.stageId);
    const needsStageApproval = Boolean(selectedStage?.requiresApproval);
    const allowValidationException = Boolean(opts?.allowValidationException);
    const validationExceptionFieldIds = Array.from(
      new Set(ruleFailed.map((issue) => issue.entityFieldId).filter(Boolean)),
    );
    if (needsStageApproval && !selectedStage?.approvalWorkflowId) {
      setFormError(
        'This stage has no configured approval workflow. Ask an admin to set one in Leads Settings.',
      );
      return;
    }

    const valueNum = Math.max(0, Number(form.value.replace(/,/g, '')) || 0);
    const validationSummary = allowValidationException
      ? (exceptionPrompt?.summary ?? validationSummaryFromIssues(ruleFailed))
      : undefined;
    const fieldValues = customFieldValuesToPayload(customValues);

    const originatorFields = originatorPayloadFromValue(originator);

    createLead.mutate(
      {
        name: form.name.trim(),
        customerId: form.customerId,
        contactId: form.contactId || undefined,
        stageId: form.stageId,
        typeId: form.typeId || undefined,
        ...originatorFields,
        sessionId: form.sessionId || undefined,
        value: valueNum,
        currency: form.currency as LeadCurrency,
        responsibleUserId: form.responsibleUserId || undefined,
        observerUserIds: form.observerUserIds.filter(
          (id) => id && id !== form.responsibleUserId,
        ),
        roleAssignments: assignmentsForSubmit.length
          ? assignmentsForSubmit
          : undefined,
        fieldValues: fieldValues.length ? fieldValues : undefined,
        allowValidationException: allowValidationException || undefined,
        validationSummary,
        validationExceptionFieldIds:
          allowValidationException && validationExceptionFieldIds.length
            ? validationExceptionFieldIds
            : undefined,
        solutions: solutions.length
          ? toOpportunitySolutionPayload(solutions)
          : undefined,
      },
      {
        onSuccess: (created) => {
          const createdId =
            created?.id ??
            (created as { data?: { id?: string } } | undefined)?.data?.id;
          // The board refreshes now; the dialog stays open on step 2 so the
          // creator can give the lead a collaboration space.
          onCreated?.({
            pendingApproval: needsStageApproval || allowValidationException,
          });
          if (createdId) {
            setCreatedLead({
              id: createdId,
              name: created?.name || form.name.trim(),
              memberUserIds: [
                form.responsibleUserId,
                ...form.observerUserIds,
              ].filter(Boolean),
            });
            return;
          }
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          const err = error as {
            response?: {
              data?: {
                message?: string | string[];
                errors?: Array<{ entityFieldId: string; message: string }>;
              };
            };
            message?: string;
          };
          const apiErrors = err?.response?.data?.errors;
          if (apiErrors?.length) {
            const next: Record<string, string> = {};
            for (const issue of apiErrors) {
              next[issue.entityFieldId] = issue.message;
            }
            setCustomErrors(next);
          }
          const message = err?.response?.data?.message;
          setFormError(
            Array.isArray(message)
              ? message.join(', ')
              : message ||
                  err?.message ||
                  'Failed to create lead. Please try again.',
          );
        },
      },
    );
  };

  const isSaving = createLead.isLoading;
  const stageNeedsApproval = Boolean(
    sortedStages.find((s) => s.id === form.stageId)?.requiresApproval,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-pipeline-create-modal
          className="max-h-[90vh] max-w-[calc(100%-2rem)] gap-0 overflow-visible p-0 sm:max-w-[640px]"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <UserPlus size={17} />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-[15px] leading-snug">
                  Create new lead
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Add a lead to the pipeline with customer, owner, and stage
                  details.
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X size={15} />
            </Button>
          </DialogHeader>

          {createdLead ? (
            <EntityCollaborationStep
              entityType={COLLABORATION_LEAD_ENTITY_TYPE}
              entityId={createdLead.id}
              entityName={createdLead.name}
              entityLabel="lead"
              memberUserIds={createdLead.memberUserIds}
              directory={users}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <>
              <div
                className="space-y-5 overflow-y-auto px-6 py-5 scrollbar-hide"
                style={{ maxHeight: 'calc(90vh - 160px)' }}
              >
                <FormSection title="Lead details">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField
                      label="Lead name"
                      required
                      className="md:col-span-2"
                    >
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className={controlClass}
                        placeholder="e.g. Acme expansion opportunity"
                      />
                    </FormField>

                    <EntityAssignmentRolesFields
                      entityType="LEAD"
                      stageId={form.stageId}
                      users={users}
                      value={roleAssignments}
                      onChange={setRoleAssignments}
                      showRequiredErrors={showRoleErrors}
                    />

                    <FormField label="Stage" required>
                      <Select
                        value={form.stageId}
                        onValueChange={(value) =>
                          setForm((p) => ({ ...p, stageId: value }))
                        }
                      >
                        <SelectTrigger className={controlClass}>
                          <SelectValue placeholder="Select stage">
                            {selectedStage ? (
                              <StageOptionLabel
                                stage={selectedStage}
                                index={Math.max(0, selectedStageIndex)}
                              />
                            ) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          className="w-[var(--radix-select-trigger-width)]"
                          position="popper"
                          align="start"
                        >
                          {sortedStages.map((stage, index) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <StageOptionLabel stage={stage} index={index} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    {opportunityTypes.length > 0 ? (
                      <FormField label="Type">
                        <Select
                          value={form.typeId || '__none__'}
                          onValueChange={(value) =>
                            setForm((p) => ({
                              ...p,
                              typeId: value === '__none__' ? '' : value,
                            }))
                          }
                        >
                          <SelectTrigger className={controlClass}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {opportunityTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    ) : null}

                    {marketingEnabled || users.length > 0 ? (
                      <FormField label="Originated from">
                        <OpportunityOriginatorField
                          value={originator}
                          onChange={setOriginator}
                          campaigns={marketingCampaigns}
                          users={users}
                          partners={partners}
                          showCampaign={marketingEnabled}
                          showPartner={marketingEnabled}
                          controlClassName={controlClass}
                        />
                      </FormField>
                    ) : null}

                    <FiscalPeriodFields
                      sessionId={form.sessionId}
                      onSessionIdChange={(sessionId) =>
                        setForm((p) => ({ ...p, sessionId }))
                      }
                      controlClassName={controlClass}
                    />
                  </div>

                  {stageFieldsQuery.isLoading && form.stageId ? (
                    <p className="text-xs text-muted-foreground">
                      Loading stage fields…
                    </p>
                  ) : stageFields.length > 0 ? (
                    <EntityCustomFieldsForm
                      fields={stageFields}
                      values={customValues}
                      errors={customErrors}
                      onChange={(fieldId, value) => {
                        setCustomValues((prev) => ({
                          ...prev,
                          [fieldId]: value,
                        }));
                        setExceptionPrompt(null);
                        setCustomErrors((prev) => {
                          if (!prev[fieldId]) return prev;
                          const next = { ...prev };
                          delete next[fieldId];
                          return next;
                        });
                      }}
                    />
                  ) : null}
                </FormSection>

                <div className="border-t border-border" />

                <FormSection title="Customer & contact">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField label="Customer" required>
                      <CustomerVectorGroupedSelect
                        value={form.customerId}
                        customers={customers}
                        selectedLabel={selectedCustomerName}
                        controlClass={controlClass}
                        onValueChange={(customerId, customer) => {
                          setCustomerLabelById((prev) => ({
                            ...prev,
                            [customer.id]: customer.accountName,
                          }));
                          setForm((p) => ({
                            ...p,
                            customerId,
                            contactId: '',
                          }));
                        }}
                        onAddCustomer={() => setAddCustomerOpen(true)}
                      />
                    </FormField>

                    <FormField label="Contact" required>
                      <Select
                        open={contactSelectOpen}
                        onOpenChange={setContactSelectOpen}
                        value={form.contactId}
                        onValueChange={(value) =>
                          setForm((p) => ({ ...p, contactId: value }))
                        }
                        disabled={!form.customerId}
                      >
                        <SelectTrigger className={controlClass}>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCustomerContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contactDisplayName(contact)}
                            </SelectItem>
                          ))}
                          {form.customerId ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 border-t border-border px-2 py-2 text-left text-xs text-brand hover:bg-muted"
                              onClick={() => {
                                setContactSelectOpen(false);
                                setAddContactOpen(true);
                              }}
                            >
                              <Plus size={13} />
                              Add contact
                            </button>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>

                <div className="border-t border-border" />

                <FormSection title="Opportunity value">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FormField label="Value">
                      <Input
                        value={form.value}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, value: e.target.value }))
                        }
                        className={controlClass}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </FormField>

                    <FormField label="Currency">
                      <Select
                        value={form.currency}
                        onValueChange={(value) =>
                          setForm((p) => ({
                            ...p,
                            currency: value as CurrencyCode,
                          }))
                        }
                      >
                        <SelectTrigger className={controlClass}>
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencyOptions.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>

                <div className="border-t border-border" />

                <OpportunitySolutionsSection
                  solutions={solutions}
                  onChange={setSolutions}
                  products={catalogProducts}
                  families={catalogFamilies}
                  vendors={catalogVendors}
                  partners={catalogPartners}
                  users={users}
                  opportunityValue={Math.max(
                    0,
                    Number(form.value.replace(/,/g, '')) || 0,
                  )}
                  currency={form.currency || 'USD'}
                  hideValueSummary
                />

                {stageNeedsApproval ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    This stage requires approval. The lead will be created in a
                    pending state until the configured approver reviews it.
                  </p>
                ) : null}

                {formError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="border-t border-border px-6 py-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                {exceptionPrompt ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={() =>
                      saveNewLead({ allowValidationException: true })
                    }
                    disabled={isSaving}
                  >
                    {isSaving ? 'Submitting…' : 'Continue with Exception'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="bg-brand text-brand-foreground hover:bg-brand-hover"
                  onClick={() => saveNewLead()}
                  disabled={isSaving}
                >
                  {isSaving
                    ? 'Creating…'
                    : stageNeedsApproval
                      ? 'Submit for approval'
                      : 'Next'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddCustomerModal
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSuccess={(customer) => {
          if (customer?.id) {
            setCustomerLabelById((prev) => ({
              ...prev,
              [customer.id]: customer.accountName,
            }));
            setForm((p) => ({
              ...p,
              customerId: customer.id,
              contactId: '',
            }));
            queryClient.invalidateQueries(['customers']);
          }
        }}
      />

      {form.customerId ? (
        <AddContactModal
          open={addContactOpen}
          onOpenChange={setAddContactOpen}
          customerId={form.customerId}
          customerName={selectedCustomerName}
          onSuccess={(contact) => {
            if (contact?.id) {
              setForm((p) => ({ ...p, contactId: contact.id }));
              refetchContacts();
            }
          }}
        />
      ) : null}
    </>
  );
}
