'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EntityCustomFieldsForm,
  applyCustomFieldDefaults,
  customFieldValuesToPayload,
  pruneCustomFieldValues,
} from '@/components/pipeline/EntityCustomFieldsForm';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import { useConvertLead } from '@/store/server/features/leads/pipeline/mutations';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import {
  typeAppliesToDeal,
  useOpportunityTypes,
} from '@/store/server/features/opportunity-types/queries';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import { validateFields } from '@/modules/custom-fields/validation/engine';
import type { ValidationRule } from '@/modules/custom-fields/validation/types';
import {
  issuesToErrorMap,
  splitValidationIssues,
  validationSummaryFromIssues,
} from '@/lib/pipeline/validation-exception';
import { cn } from '@/lib/utils';
import { BoundOpportunitySolutions } from '@/modules/product-catalog/components/BoundOpportunitySolutions';
import { useOpportunitySolutions } from '@/store/server/features/product-catalog/queries';

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

interface ConvertLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: PipelineLead;
  onConverted?: (result?: {
    dealId?: string;
    pendingApproval?: boolean;
  }) => void;
}

export function ConvertLeadModal({
  open,
  onOpenChange,
  lead,
  onConverted,
}: ConvertLeadModalProps) {
  const convertLead = useConvertLead();
  const { data: dealStagesData = [] } = useDealStages();
  const { data: allOpportunityTypes = [] } = useOpportunityTypes({
    enabled: open,
  });
  const opportunityTypes = useMemo(
    () => allOpportunityTypes.filter(typeAppliesToDeal),
    [allOpportunityTypes],
  );
  const { data: leadSolutions = [] } = useOpportunitySolutions('lead', lead.id);
  const leadSolutionCount = leadSolutions.length;

  const [dealName, setDealName] = useState('');
  const [dealStageId, setDealStageId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [exceptionPrompt, setExceptionPrompt] = useState<{
    summary: string;
    ruleMessages: Record<string, string>;
  } | null>(null);

  const dealStages = useMemo(
    () =>
      [...dealStagesData]
        .filter((s) => s.category === 'open')
        .sort((a, b) => a.order - b.order),
    [dealStagesData],
  );

  const selectedStage = useMemo(
    () => dealStages.find((s) => s.id === dealStageId),
    [dealStages, dealStageId],
  );

  const stageFieldsQuery = useFieldsForStage('DEAL', dealStageId || null);
  const stageFields = useMemo(
    () => (stageFieldsQuery.data ?? []).map(apiResponseToConfig),
    [stageFieldsQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    setDealName(lead.name?.trim() ? `${lead.name.trim()} - Deal` : '');
    setDescription(lead.description ?? '');
    setTypeId(lead.typeId ?? '');
    setCustomValues({});
    setCustomErrors({});
    setFormError(null);
    setExceptionPrompt(null);
    const openStage = dealStages[0];
    setDealStageId(openStage?.id ?? '');
  }, [open, lead.name, lead.description, dealStages]);

  useEffect(() => {
    if (dealStages.length === 0) return;
    const isValid = dealStages.some((s) => s.id === dealStageId);
    if (!isValid) {
      setDealStageId(dealStages[0]!.id);
    }
  }, [dealStages, dealStageId]);

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
    setExceptionPrompt(null);
  }, [stageFields]);

  const convert = (opts?: { allowValidationException?: boolean }) => {
    setFormError(null);
    setCustomErrors({});

    if (!dealName.trim()) {
      setFormError('Deal name is required.');
      return;
    }
    if (!dealStageId) {
      setFormError('Choose a deal pipeline stage.');
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

    const needsStageApproval = Boolean(selectedStage?.requiresApproval);
    const allowValidationException = Boolean(opts?.allowValidationException);

    if (needsStageApproval && !selectedStage?.approvalWorkflowId) {
      setFormError(
        'This stage has no configured approval workflow. Ask an admin to set one in Deals Settings.',
      );
      return;
    }

    const fieldValues = customFieldValuesToPayload(customValues);
    const validationSummary = allowValidationException
      ? (exceptionPrompt?.summary ?? validationSummaryFromIssues(ruleFailed))
      : undefined;

    convertLead.mutate(
      {
        leadId: lead.id,
        data: {
          dealName: dealName.trim(),
          dealStageId,
          typeId: typeId || undefined,
          description: description.trim() || undefined,
          expectedClose: lead.expectedClose || undefined,
          fieldValues: fieldValues.length ? fieldValues : undefined,
          allowValidationException: allowValidationException || undefined,
          validationSummary,
        },
      },
      {
        onSuccess: (response) => {
          const dealId = (response as { dealId?: string })?.dealId;
          onOpenChange(false);
          onConverted?.({
            dealId,
            pendingApproval: needsStageApproval || allowValidationException,
          });
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
                  'Failed to convert lead. Please try again.',
          );
        },
      },
    );
  };

  const isSaving = convertLead.isLoading;
  const stageNeedsApproval = Boolean(selectedStage?.requiresApproval);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert to Deal</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto scrollbar-hide py-1">
          <FormField label="Deal name" required>
            <Input
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="h-9 border-border"
              placeholder="Deal name"
            />
          </FormField>

          <FormField label="Deal pipeline stage" required>
            <Select value={dealStageId} onValueChange={setDealStageId}>
              <SelectTrigger className="h-9 border-border">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {dealStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.requiresApproval ? ' (requires approval)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {opportunityTypes.length > 0 ? (
            <FormField label="Type">
              <Select
                value={typeId || '__none__'}
                onValueChange={(value) =>
                  setTypeId(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger className="h-9 border-border">
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

          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px] border-border"
              placeholder="Optional deal description"
            />
          </FormField>

          <div className="space-y-2 rounded-lg border border-border bg-surface-elevated/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Solutions
            </p>
            <p className="text-[11px] text-muted-foreground">
              {leadSolutionCount > 0
                ? `${leadSolutionCount} solution${leadSolutionCount === 1 ? '' : 's'} will carry over to the deal. You do not need to re-select them.`
                : 'No solutions on this lead. You can add solutions on the deal after conversion.'}
            </p>
            {leadSolutionCount > 0 ? (
              <BoundOpportunitySolutions
                entityType="lead"
                entityId={lead.id}
                opportunityValue={Number(lead.value) || 0}
                currency={lead.currency || 'USD'}
                readOnly
              />
            ) : null}
          </div>

          {stageFieldsQuery.isLoading && dealStageId ? (
            <p className="text-xs text-muted-foreground">
              Loading stage fields…
            </p>
          ) : stageFields.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Stage custom fields
              </p>
              <EntityCustomFieldsForm
                fields={stageFields}
                values={customValues}
                errors={customErrors}
                onChange={(fieldId, value) => {
                  setCustomValues((prev) => ({ ...prev, [fieldId]: value }));
                  setCustomErrors((prev) => {
                    if (!prev[fieldId]) return prev;
                    const next = { ...prev };
                    delete next[fieldId];
                    return next;
                  });
                  setExceptionPrompt(null);
                }}
              />
            </div>
          ) : null}

          {stageNeedsApproval ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This deal stage requires approval. The deal will be created in a
              pending state until the configured approver reviews it.
            </p>
          ) : null}

          {exceptionPrompt ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              One or more custom-field validation rules are failing. Fix the
              values, or continue with an exception for approval.
            </p>
          ) : null}

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
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
              onClick={() => convert({ allowValidationException: true })}
              disabled={isSaving || !dealStageId}
            >
              {isSaving ? 'Converting…' : 'Convert with Exception'}
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={() => convert()}
            disabled={isSaving || !dealStageId}
          >
            {isSaving
              ? 'Converting…'
              : stageNeedsApproval
                ? 'Convert & submit for approval'
                : 'Convert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
