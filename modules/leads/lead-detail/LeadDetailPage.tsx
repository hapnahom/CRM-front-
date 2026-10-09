'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleDollarSign,
  Edit2,
  Loader2,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  LEAD_SETTINGS_STAGE_PRESETS,
  pipelineStageAppearance,
} from '@/lib/stage-presets';
import { DetailPageSkeleton } from '@/components/loading/skeleton-screens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConvertLeadModal } from '@/modules/leads/components/ConvertLeadModal';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ContactCard,
  DetailField,
  DetailFieldGrid,
  DetailSection,
  EntityDetailActivitySidebar,
  EntityDetailHero,
  EntityDetailLayout,
  EntityNotFound,
  formatEntityMoney,
  HeroMetaItem,
  ObserverChips,
  PersonRow,
  StageProgress,
} from '@/components/entity-detail';
import { type CrmLead, type DealCurrency } from './types';
import { usePipelineCurrencies } from '@/hooks/usePipelineCurrencies';
import { BoundOpportunitySolutions } from '@/modules/product-catalog/components/BoundOpportunitySolutions';
import { usePipelineFieldAccess } from '@/hooks/usePipelineFieldAccess';
import { ConfirmDialog } from '@/components/pipeline/ConfirmDialog';
import { MoreActionsMenu } from '@/components/pipeline/MoreActionsMenu';
import {
  mapBackendLeadToCrmLead,
  useLeadDetail,
} from '@/store/server/features/leads/detail/queries';
import { useUpdateLead } from '@/store/server/features/leads/detail/mutations';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import {
  typeAppliesToLead,
  useOpportunityTypes,
} from '@/store/server/features/opportunity-types/queries';
import { useMarketingCampaigns } from '@/store/server/features/marketing/queries';
import { usePartners } from '@/store/server/features/partners/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { isModuleEnabled } from '@/config/modules';
import {
  OpportunityOriginatorField,
  OriginatorSummaryLabel,
  originatorPayloadFromValue,
  type OpportunityOriginatorValue,
} from '@/components/pipeline/OpportunityOriginatorField';
import {
  useChangeLeadStage,
  useDeleteLead,
} from '@/store/server/features/leads/pipeline/mutations';
import { EntityCollaborationTarget } from '@/components/collaboration/entity-collaboration-target';
import { COLLABORATION_LEAD_ENTITY_TYPE } from '@/utils/collaboration';
import { OpportunityCustomFieldsList } from '@/components/pipeline/OpportunityCustomFieldsList';
import { StageExpirationBanner } from '@/components/pipeline/StageExpirationBanner';
import { normalizeStoredFieldValue } from '@/modules/custom-fields/field-value-with-description';
import { ApprovalRequestDeepLinkHost } from '@/components/pipeline/PipelineApprovalRequestsCard';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import {
  useEntityFieldValues,
  useUpsertEntityFieldValues,
} from '@/store/server/features/entity-fields/values';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import AccessGuard from '@/utils/permissionGuard';
import { toast } from 'sonner';
import { useStageTransitionGate } from '@/hooks/useStageTransitionGate';
import { parseCustomFieldValidationError } from '@/lib/pipeline/validation-exception';
import { useQueryClient } from 'react-query';
import { usePipelineSettings } from '@/store/server/features/pipeline/settings';
import { FiscalPeriodFields } from '@/components/pipeline/FiscalPeriodFields';
import { CustomerVectorGroupedSelect } from '@/components/pipeline/CustomerVectorGroupedSelect';
import {
  EntityAssignmentRolesFields,
  buildEntityRoleAssignmentsForSubmit,
  mergeRoleAssignmentValues,
  validateRequiredRoleAssignments,
  type RoleAssignmentValue,
} from '@/components/pipeline/EntityAssignmentRolesFields';
import {
  fetchPipelineRolesForStage,
  usePipelineRoleAssignments,
} from '@/store/server/features/pipeline-roles/queries';

function mapRoleAssignmentsFromQuery(
  rows: Array<{ roleId: string; userId: string }> | undefined,
): RoleAssignmentValue[] {
  return (rows ?? []).map((row) => ({
    roleId: row.roleId,
    userId: row.userId,
  }));
}
import { useUpsertPipelineRoleAssignments } from '@/store/server/features/pipeline-roles/mutations';
import { useGetCustomers } from '@/store/server/features/customers/queries';
import { usePipelineContacts } from '@/store/server/features/leads/pipeline/queries';
import type { PipelineContactSummary } from '@/store/server/features/leads/pipeline/types';
import { Label } from '@/components/ui/label';

function contactDisplayName(contact: PipelineContactSummary) {
  return `${contact.firstName} ${contact.lastName}`.trim() || '—';
}

export function LeadDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { canView, canEdit, access } = usePipelineFieldAccess('LEAD');
  const currentUserId = useAuthenticationStore((s) => s.userId);

  const { data: leadDto, isLoading: leadLoading } = useLeadDetail(id);
  const { data: stagesData = [] } = useLeadStages();
  const { data: allOpportunityTypes = [] } = useOpportunityTypes();
  const marketingEnabled = isModuleEnabled('marketing');
  const { data: marketingCampaigns = [] } = useMarketingCampaigns(
    marketingEnabled ? {} : undefined,
  );
  const { data: partnersData } = usePartners(
    marketingEnabled ? { page: 1, pageSize: 1000 } : {},
  );
  const partners = marketingEnabled ? (partnersData?.partners ?? []) : [];
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
    status: 'active',
  });
  const platformUsers = platformUsersData?.data ?? [];
  const opportunityTypes = useMemo(() => {
    const filtered = allOpportunityTypes.filter(typeAppliesToLead);
    const currentId = leadDto?.typeId;
    if (currentId && !filtered.some((t) => t.id === currentId)) {
      const current = allOpportunityTypes.find((t) => t.id === currentId);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [allOpportunityTypes, leadDto?.typeId]);
  const updateLeadMutation = useUpdateLead();
  const upsertFieldValuesMutation = useUpsertEntityFieldValues();
  const upsertRoleAssignments = useUpsertPipelineRoleAssignments();
  const queryClient = useQueryClient();
  const [ruleExceptionPrompt, setRuleExceptionPrompt] = useState<{
    fieldId: string;
    value: unknown;
    summary: string;
  } | null>(null);
  const changeLeadStageMutation = useChangeLeadStage();
  const deleteLeadMutation = useDeleteLead();
  const { currencyOptions } = usePipelineCurrencies();
  const settingsQuery = usePipelineSettings('LEAD');
  const movementPolicy = settingsQuery.data?.movementPolicy ?? 'any';
  const users = platformUsers;
  const { data: customersData } = useGetCustomers(
    { page: 1, pageSize: 200 },
    true,
  );
  const customers = customersData?.data ?? [];
  const { data: contacts = [] } = usePipelineContacts();
  const roleAssignmentsQuery = usePipelineRoleAssignments('LEAD', id);

  const [detailDraft, setDetailDraft] = useState<CrmLead | null>(null);

  const stages = useMemo(
    () => [...stagesData].sort((a, b) => a.order - b.order),
    [stagesData],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<CrmLead | null>(null);
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customValuesDraft, setCustomValuesDraft] = useState<
    Record<string, unknown>
  >({});
  const [customValuesSnapshot, setCustomValuesSnapshot] = useState<
    Record<string, unknown>
  >({});
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentValue[]>(
    [],
  );
  const [roleAssignmentsSnapshot, setRoleAssignmentsSnapshot] = useState<
    RoleAssignmentValue[]
  >([]);
  const [customerLabelById, setCustomerLabelById] = useState<
    Record<string, string>
  >({});
  const [contactSelectOpen, setContactSelectOpen] = useState(false);

  useEffect(() => {
    if (!leadDto || isEditing) return;
    setDetailDraft(mapBackendLeadToCrmLead(leadDto));
  }, [leadDto, isEditing]);

  useEffect(() => {
    if (!leadDto?.stageId || !detailDraft) return;
    if (leadDto.stageId === detailDraft.stageId) return;
    setDetailDraft((draft) =>
      draft
        ? {
            ...draft,
            stageId: leadDto.stageId,
            stageEnteredAt: leadDto.stageEnteredAt
              ? String(leadDto.stageEnteredAt).split('T')[0]!
              : draft.stageEnteredAt,
          }
        : draft,
    );
  }, [leadDto?.stageId, leadDto?.stageEnteredAt, detailDraft?.stageId]); // eslint-disable-line react-hooks/exhaustive-deps -- sync stage from server; full detailDraft would loop

  const startEdit = () => {
    if (!detailDraft) return;
    setEditSnapshot({ ...detailDraft });
    setCustomValuesSnapshot(customValues);
    setCustomValuesDraft(customValues);
    const currentRoles = mapRoleAssignmentsFromQuery(roleAssignmentsQuery.data);
    setRoleAssignments(currentRoles);
    setRoleAssignmentsSnapshot(currentRoles);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (leadDto) {
      setDetailDraft(mapBackendLeadToCrmLead(leadDto));
    } else if (editSnapshot) {
      setDetailDraft(editSnapshot);
    }
    setCustomValuesDraft(customValuesSnapshot);
    setRoleAssignments(roleAssignmentsSnapshot);
    setIsEditing(false);
    setEditSnapshot(null);
    setCustomValuesSnapshot({});
    setRoleAssignmentsSnapshot([]);
  };

  const saveEdit = async () => {
    try {
      await persistDetailDraft();
      setIsEditing(false);
      setEditSnapshot(null);
      toast.success('Lead updated successfully.');
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message || error?.message || 'Failed to update lead.',
      );
    }
  };

  const stageById = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages],
  );

  const stageId = detailDraft?.stageId ?? leadDto?.stageId ?? null;
  const stageFieldsQuery = useFieldsForStage('LEAD', stageId);
  const valuesQuery = useEntityFieldValues('LEAD', id);
  const canEditCustomFields = canEdit('customFields');
  const opportunityOwnerId =
    detailDraft?.responsibleUserId ??
    leadDto?.responsibleUserId ??
    leadDto?.responsibleUser?.id ??
    null;
  const stageFields = useMemo(
    () =>
      (stageFieldsQuery.data ?? []).map((f) => {
        const meta = valuesQuery.data?.find((v) => v.entityFieldId === f.id);
        const assigneeIds =
          Array.isArray(meta?.responsibleUserIds) &&
          meta!.responsibleUserIds!.length
            ? meta!.responsibleUserIds!
            : meta?.responsibleUserId
              ? [meta.responsibleUserId]
              : [];
        const isFieldAssignee = Boolean(
          currentUserId && assigneeIds.includes(currentUserId),
        );
        const canEditThisValue = isFieldAssignee || canEditCustomFields;
        return {
          ...apiResponseToConfig(f),
          readOnly: !canEditThisValue,
        };
      }),
    [
      stageFieldsQuery.data,
      valuesQuery.data,
      currentUserId,
      canEditCustomFields,
    ],
  );
  const customValues = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const field of stageFields) {
      const row = valuesQuery.data?.find((v) => v.entityFieldId === field.id);
      out[field.id] = normalizeStoredFieldValue(row?.value ?? null, field);
    }
    return out;
  }, [valuesQuery.data, stageFields]);

  useEffect(() => {
    if (isEditing) return;
    setCustomValuesDraft((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(customValues);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => Object.is(prev[key], customValues[key]))
      ) {
        return prev;
      }
      return customValues;
    });
  }, [customValues, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    const nextAssignments = mapRoleAssignmentsFromQuery(
      roleAssignmentsQuery.data,
    );
    setRoleAssignments((current) => {
      const currentJson = JSON.stringify(current);
      const nextJson = JSON.stringify(nextAssignments);
      return currentJson === nextJson ? current : nextAssignments;
    });
  }, [roleAssignmentsQuery.data, isEditing]);

  const selectedCustomerContacts = useMemo(() => {
    const customerId = detailDraft?.customerId;
    if (!customerId) return [];
    return contacts.filter((c) => c.customerId === customerId);
  }, [contacts, detailDraft?.customerId]);

  const selectedCustomerName =
    (detailDraft?.customerId
      ? customerLabelById[detailDraft.customerId]
      : undefined) ??
    customers.find((c) => c.id === detailDraft?.customerId)?.accountName ??
    leadDto?.customer?.accountName;

  const leadContact = useMemo(() => {
    if (!leadDto?.contact) return null;
    const c = leadDto.contact;
    return {
      name: `${c.firstName} ${c.lastName}`.trim() || c.email || '—',
      email: c.email ?? '',
      phone: c.phoneNumber ?? '',
      role: c.role ?? '',
    };
  }, [leadDto]);

  const persistDetailDraft = async () => {
    if (!detailDraft) return;
    const data: Record<string, unknown> = {};
    if (canEdit('core')) {
      data.name = detailDraft.name;
      data.solutionCategory = detailDraft.solutionCategory;
      data.description = detailDraft.description;
      data.typeId = detailDraft.typeId || undefined;
      const originatorFields = originatorPayloadFromValue({
        originatorType: (detailDraft.originatorType || '') as
          | 'CAMPAIGN'
          | 'USER'
          | 'PARTNER'
          | '',
        campaignId: detailDraft.campaignId || '',
        originatorUserId: detailDraft.originatorUserId || '',
        originatorPartnerId: detailDraft.originatorPartnerId || '',
      });
      if (Object.keys(originatorFields).length) {
        Object.assign(data, originatorFields);
      } else {
        data.originatorType = null;
        data.campaignId = null;
        data.originatorUserId = null;
        data.originatorPartnerId = null;
      }
      data.sessionId = detailDraft.sessionId || null;
      data.expectedClose = detailDraft.expectedClose || undefined;
    }
    if (canEdit('value')) {
      data.value = detailDraft.value;
      data.currency = detailDraft.currency;
    }
    if (canEdit('customer')) {
      data.customerId = detailDraft.customerId || undefined;
      data.contactId = detailDraft.contactId || null;
    }
    if (canEdit('assignment')) {
      const rolesForStage = await fetchPipelineRolesForStage(
        'LEAD',
        detailDraft.stageId,
      );
      const existingAssignments = mapRoleAssignmentsFromQuery(
        roleAssignmentsQuery.data,
      );
      const assignmentsForSubmit = buildEntityRoleAssignmentsForSubmit(
        rolesForStage,
        mergeRoleAssignmentValues(existingAssignments, roleAssignments),
        detailDraft.responsibleUserId,
      );
      const roleValidationError = validateRequiredRoleAssignments(
        rolesForStage,
        assignmentsForSubmit,
        existingAssignments,
      );
      if (roleValidationError) {
        throw new Error(roleValidationError);
      }
      const primaryRole = rolesForStage.find((r) => r.isPrimary);
      const primaryUserId =
        assignmentsForSubmit.find((a) => a.roleId === primaryRole?.id)
          ?.userId || detailDraft.responsibleUserId;
      data.responsibleUserId = primaryUserId || undefined;

      if (detailDraft.stageId) {
        await upsertRoleAssignments.mutateAsync({
          entityType: 'LEAD',
          entityId: detailDraft.id,
          stageId: detailDraft.stageId,
          assignments: assignmentsForSubmit,
        });
      }
    }
    if (Object.keys(data).length > 0) {
      await updateLeadMutation.mutateAsync({
        id: detailDraft.id,
        data,
      });
    }
    if (canEdit('customFields')) {
      // Always persist by real custom-field UUID ↔ this lead id.
      const fieldValues = stageFields.map((field) => ({
        entityFieldId: field.id,
        value: customValuesDraft[field.id] ?? null,
      }));
      if (fieldValues.length) {
        await upsertFieldValuesMutation.mutateAsync({
          entityType: 'LEAD',
          entityId: detailDraft.id,
          values: fieldValues,
        });
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteLeadMutation.mutateAsync(id);
      toast.success('Lead moved out of the active pipeline.');
      window.location.assign('/sales-hub?tab=leads');
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message || error?.message || 'Failed to delete lead.',
      );
    }
  };

  const isLeadConverted =
    Boolean(leadDto?.convertedAt || leadDto?.convertedDealId) ||
    leadDto?.status === 'Converted';

  const moveLeadToStage = useCallback(
    (payload: {
      entityId: string;
      stageId: string;
      fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
      roleAssignments?: Array<{ roleId: string; userId: string }>;
      allowValidationException?: boolean;
      validationSummary?: string;
      validationExceptionFieldIds?: string[];
    }) => {
      if (!detailDraft || detailDraft.stageId === payload.stageId) return;
      const stage = stageById.get(payload.stageId);
      if (stage?.isConversion && !isLeadConverted) {
        if (leadDto?.pendingApproval) {
          toast.error(
            'This lead is locked pending approval and cannot be converted.',
          );
          return;
        }
        setIsConversionOpen(true);
        return;
      }
      setDetailDraft((d) =>
        d
          ? {
              ...d,
              stageId: payload.stageId,
              stageEnteredAt: new Date().toISOString().split('T')[0]!,
            }
          : d,
      );
      changeLeadStageMutation.mutate(
        {
          leadId: payload.entityId,
          stageId: payload.stageId,
          fieldValues: payload.fieldValues,
          roleAssignments: payload.roleAssignments,
          allowValidationException: payload.allowValidationException,
          validationSummary: payload.validationSummary,
          validationExceptionFieldIds: payload.validationExceptionFieldIds,
        },
        {
          onSuccess: () => {
            if (stage?.requiresApproval || payload.allowValidationException) {
              toast.success(
                'Lead moved and submitted for approval. It will stay pending until approved.',
              );
            } else {
              toast.success('Lead moved to new stage.');
            }
          },
          onError: (error: unknown) => {
            const err = error as {
              response?: { data?: { message?: string | string[] } };
              message?: string;
            };
            const message = err?.response?.data?.message;
            toast.error(
              Array.isArray(message)
                ? message.join(', ')
                : message ||
                    err?.message ||
                    'Failed to move lead. Please try again.',
            );
          },
        },
      );
    },
    [
      detailDraft,
      stageById,
      isLeadConverted,
      leadDto?.pendingApproval,
      changeLeadStageMutation,
    ],
  );

  const { requestStageChange, checking, stageTransitionModal } =
    useStageTransitionGate({
      entityType: 'LEAD',
      onTransition: moveLeadToStage,
      isSubmitting: changeLeadStageMutation.isLoading,
      getEntityName: () => detailDraft?.name,
      getStageName: (stageId) => stageById.get(stageId)?.name,
      getStageMeta: (stageId) => {
        const targetStage = stageById.get(stageId);
        return {
          requiresApproval: targetStage?.requiresApproval,
          approvalWorkflowId: targetStage?.approvalWorkflowId,
        };
      },
      movementPolicy,
      getStageOrder: (stageId) => stageById.get(stageId)?.order,
      getEntityStageId: () => detailDraft?.stageId,
      getOwnerUserId: () =>
        leadDto?.responsibleUserId ?? leadDto?.responsibleUser?.id ?? null,
      isPendingApproval: () => Boolean(leadDto?.pendingApproval),
    });

  const handleStageClick = useCallback(
    (stageId: string) => {
      if (!detailDraft || stageId === detailDraft.stageId) return;
      void requestStageChange(detailDraft.id, stageId);
    },
    [detailDraft, requestStageChange],
  );

  const convertModalLead = useMemo((): PipelineLead | null => {
    if (!leadDto) return null;
    return {
      id: leadDto.id,
      name: leadDto.name,
      customerId: leadDto.customerId,
      stageId: leadDto.stageId,
      stageEnteredAt: leadDto.stageEnteredAt ?? '',
      status: leadDto.status ?? 'New',
      value: Number(leadDto.value) || 0,
      currency: (leadDto.currency || 'ETB') as PipelineLead['currency'],
      baseValue: Number(leadDto.baseValue) || 0,
      description: leadDto.description ?? null,
      expectedClose: leadDto.expectedClose ?? null,
      convertedAt: leadDto.convertedAt,
      convertedDealId: leadDto.convertedDealId,
    };
  }, [leadDto]);

  if (leadLoading) {
    return <DetailPageSkeleton />;
  }

  if (!detailDraft) {
    return (
      <EntityNotFound
        title="Lead not found"
        description="The lead ID might be incorrect or has been removed."
        backLabel="Back to Leads"
        backHref="/sales-hub?tab=leads"
      />
    );
  }

  const stage = stageById.get(detailDraft.stageId);
  const stageIndex = stage ? stages.findIndex((s) => s.id === stage.id) : 0;
  const stageAppearance = stage
    ? pipelineStageAppearance(stage, stageIndex, LEAD_SETTINGS_STAGE_PRESETS)
    : null;
  const isSavingDetail =
    updateLeadMutation.isLoading ||
    upsertFieldValuesMutation.isLoading ||
    upsertRoleAssignments.isLoading ||
    changeLeadStageMutation.isLoading;
  const customerName = selectedCustomerName || '—';
  const canEditAny =
    canEdit('core') ||
    canEdit('value') ||
    canEdit('customer') ||
    canEdit('assignment') ||
    canEdit('customFields');
  const canDeleteLead = AccessGuard.checkAnyAccess({
    permissions: ['delete-leads'],
  });
  const canShowEditLead =
    canEditAny && AccessGuard.checkAnyAccess({ permissions: ['edit-leads'] });
  const showMoreActions = canShowEditLead || canDeleteLead;
  const coreEditable = canEdit('core');
  const valueEditable = canEdit('value');
  const customerEditable = canEdit('customer');
  const assignmentEditable = canEdit('assignment');

  return (
    <EntityDetailLayout
      backLabel="Leads"
      backHref="/sales-hub?tab=leads"
      breadcrumb={detailDraft.name}
      badges={
        <>
          {stage && stageAppearance ? (
            <Badge
              variant="outline"
              className="ml-1 rounded-full border px-2 py-0 text-xs font-medium text-foreground"
              style={{
                backgroundColor: stageAppearance.backgroundColor,
                borderColor: stageAppearance.borderColor,
              }}
            >
              {stage.name}
            </Badge>
          ) : null}
          <EntityCollaborationTarget
            entityType={COLLABORATION_LEAD_ENTITY_TYPE}
            entityId={id}
            entityName={detailDraft.name}
            entityLabel="lead"
            module="leads"
            subtitle="Lead space"
          />
        </>
      }
    >
      <EntityDetailHero
        name={detailDraft.name}
        fallbackInitial="L"
        meta={
          <>
            {canView('customer') ? (
              <>
                <HeroMetaItem icon={Building2}>{customerName}</HeroMetaItem>
                {(canView('assignment') || canView('value')) && (
                  <span className="hidden text-border sm:inline" aria-hidden>
                    ·
                  </span>
                )}
              </>
            ) : null}
            {canView('assignment') ? (
              <>
                <HeroMetaItem icon={User}>
                  {detailDraft.responsible || 'Unassigned'}
                </HeroMetaItem>
                {canView('value') && (
                  <span className="hidden text-border sm:inline" aria-hidden>
                    ·
                  </span>
                )}
              </>
            ) : null}
            {canView('value') ? (
              <HeroMetaItem icon={CircleDollarSign}>
                {formatEntityMoney(detailDraft.value, detailDraft.currency)}
              </HeroMetaItem>
            ) : null}
          </>
        }
        actions={
          <>
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-border px-3"
                  onClick={cancelEdit}
                  disabled={isSavingDetail}
                >
                  <X size={13} className="mr-1.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-brand px-3 text-brand-foreground hover:bg-brand-hover"
                  onClick={saveEdit}
                  disabled={isSavingDetail}
                >
                  {isSavingDetail ? (
                    <>
                      <Loader2 size={13} className="mr-1.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={13} className="mr-1.5" />
                      Save changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {!isLeadConverted && !leadDto?.pendingApproval ? (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-brand px-3 text-brand-foreground hover:bg-brand-hover"
                    onClick={() => setIsConversionOpen(true)}
                  >
                    <ArrowUpRight size={13} />
                    Convert to Deal
                  </Button>
                ) : null}
                {showMoreActions ? (
                  <MoreActionsMenu
                    items={[
                      ...(canShowEditLead
                        ? [
                            {
                              key: 'edit',
                              label: 'Edit',
                              icon: <Edit2 size={13} />,
                              onSelect: startEdit,
                            },
                          ]
                        : []),
                      ...(canDeleteLead
                        ? [
                            {
                              key: 'delete',
                              label: 'Delete',
                              icon: <Trash2 size={13} />,
                              destructive: true,
                              disabled:
                                Boolean(leadDto?.pendingApproval) ||
                                deleteLeadMutation.isLoading,
                              title: leadDto?.pendingApproval
                                ? 'This lead is locked pending approval.'
                                : 'Delete lead',
                              onSelect: () => setDeleteDialogOpen(true),
                            },
                          ]
                        : []),
                    ]}
                  />
                ) : null}
              </>
            )}
          </>
        }
        footer={
          <div>
            <StageProgress
              stages={stages}
              currentStageId={detailDraft.stageId}
              presets={LEAD_SETTINGS_STAGE_PRESETS}
              onStageClick={handleStageClick}
              disabled={
                isEditing ||
                checking ||
                changeLeadStageMutation.isLoading ||
                Boolean(leadDto?.pendingApproval)
              }
            />
            <StageExpirationBanner
              stageEnteredAt={
                leadDto?.stageEnteredAt ?? detailDraft.stageEnteredAt
              }
              stageExpiresAt={leadDto?.stageExpiresAt}
              stageExpired={leadDto?.stageExpired}
              stageExpirationStatus={leadDto?.stageExpirationStatus}
            />
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {canView('core') ? (
            <DetailSection
              title="Lead information"
              description="Qualification details and opportunity sizing"
            >
              <DetailFieldGrid>
                <DetailField
                  label="Lead name"
                  value={detailDraft.name}
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                >
                  <Input
                    value={detailDraft.name}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, name: e.target.value } : d,
                      )
                    }
                    className="h-9 border-border"
                  />
                </DetailField>
                <DetailField
                  label="Stage"
                  value={stage?.name ?? '—'}
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                >
                  <Select
                    value={detailDraft.stageId}
                    onValueChange={(v) => {
                      if (!detailDraft || v === detailDraft.stageId) return;
                      void requestStageChange(detailDraft.id, v);
                    }}
                  >
                    <SelectTrigger className="h-9 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailField>
                {opportunityTypes.length > 0 ? (
                  <DetailField
                    label="Type"
                    value={detailDraft.typeName || '—'}
                    isEditing={isEditing}
                    readOnly={!coreEditable}
                  >
                    <Select
                      value={detailDraft.typeId || '__none__'}
                      onValueChange={(v) =>
                        setDetailDraft((d) =>
                          d
                            ? {
                                ...d,
                                typeId: v === '__none__' ? '' : v,
                                typeName:
                                  opportunityTypes.find((t) => t.id === v)
                                    ?.name ?? '',
                              }
                            : d,
                        )
                      }
                    >
                      <SelectTrigger className="h-9 border-border">
                        <SelectValue />
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
                  </DetailField>
                ) : null}
                <DetailField
                  label="Originated from"
                  value={
                    <OriginatorSummaryLabel
                      type={
                        detailDraft.originatorType === 'CAMPAIGN' ||
                        detailDraft.originatorType === 'USER' ||
                        detailDraft.originatorType === 'PARTNER'
                          ? detailDraft.originatorType
                          : null
                      }
                      campaign={
                        detailDraft.campaignName
                          ? { name: detailDraft.campaignName }
                          : null
                      }
                      user={
                        detailDraft.originatorUserId
                          ? {
                              name: detailDraft.originatorUserName,
                              avatarUrl: detailDraft.originatorUserAvatarUrl,
                            }
                          : null
                      }
                      partner={
                        detailDraft.originatorPartnerId
                          ? {
                              name:
                                detailDraft.originatorPartnerName || 'Partner',
                              tier: detailDraft.originatorPartnerTier,
                            }
                          : null
                      }
                    />
                  }
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                >
                  <OpportunityOriginatorField
                    value={
                      {
                        originatorType: (detailDraft.originatorType ||
                          '') as OpportunityOriginatorValue['originatorType'],
                        campaignId: detailDraft.campaignId || '',
                        originatorUserId: detailDraft.originatorUserId || '',
                        originatorPartnerId:
                          detailDraft.originatorPartnerId || '',
                      } satisfies OpportunityOriginatorValue
                    }
                    onChange={(next) =>
                      setDetailDraft((d) =>
                        d
                          ? {
                              ...d,
                              originatorType: next.originatorType,
                              campaignId: next.campaignId,
                              campaignName:
                                marketingCampaigns.find(
                                  (c) => c.id === next.campaignId,
                                )?.name ?? '',
                              originatorUserId: next.originatorUserId,
                              originatorUserName:
                                platformUsers.find(
                                  (u) =>
                                    u.id === next.originatorUserId ||
                                    u.selamnewId === next.originatorUserId,
                                )?.name ?? '',
                              originatorUserAvatarUrl:
                                platformUsers.find(
                                  (u) =>
                                    u.id === next.originatorUserId ||
                                    u.selamnewId === next.originatorUserId,
                                )?.avatarUrl ?? null,
                              originatorPartnerId: next.originatorPartnerId,
                              originatorPartnerName:
                                partners.find(
                                  (p) => p.id === next.originatorPartnerId,
                                )?.name ?? '',
                              originatorPartnerTier:
                                partners.find(
                                  (p) => p.id === next.originatorPartnerId,
                                )?.tier ?? '',
                            }
                          : d,
                      )
                    }
                    campaigns={marketingCampaigns}
                    users={platformUsers}
                    partners={partners}
                    showCampaign={marketingEnabled}
                    showPartner={marketingEnabled}
                    controlClassName="h-9 border-border"
                  />
                </DetailField>
                <DetailField
                  label="Solution category"
                  value={detailDraft.solutionCategory ?? '—'}
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                >
                  <Input
                    value={detailDraft.solutionCategory ?? ''}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, solutionCategory: e.target.value } : d,
                      )
                    }
                    className="h-9 border-border"
                    placeholder="e.g. Infrastructure"
                  />
                </DetailField>
                <DetailField
                  label="Session"
                  value={detailDraft.sessionId ?? '—'}
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                >
                  <FiscalPeriodFields
                    sessionId={detailDraft.sessionId ?? ''}
                    onSessionIdChange={(sessionId) =>
                      setDetailDraft((d) => (d ? { ...d, sessionId } : d))
                    }
                    autoSelectCurrent={false}
                    required={false}
                    controlClassName="h-9 border-border"
                  />
                </DetailField>
                <DetailField
                  label="Expected close"
                  value={detailDraft.expectedClose || '—'}
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                >
                  <Input
                    type="date"
                    value={detailDraft.expectedClose || ''}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, expectedClose: e.target.value } : d,
                      )
                    }
                    className="h-9 border-border"
                  />
                </DetailField>
                <DetailField
                  label="Description"
                  value={
                    detailDraft.description?.trim() ? (
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {detailDraft.description}
                      </p>
                    ) : (
                      '—'
                    )
                  }
                  isEditing={isEditing}
                  readOnly={!coreEditable}
                  span={2}
                >
                  <Textarea
                    value={detailDraft.description ?? ''}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, description: e.target.value } : d,
                      )
                    }
                    className="min-h-[88px] border-border"
                    placeholder="Add context about this lead…"
                  />
                </DetailField>
              </DetailFieldGrid>
            </DetailSection>
          ) : null}

          {canView('value') ? (
            <DetailSection
              title="Value"
              description="Estimated opportunity value"
            >
              <DetailFieldGrid>
                <DetailField
                  label="Estimated value"
                  value={formatEntityMoney(
                    detailDraft.value,
                    detailDraft.currency,
                  )}
                  isEditing={isEditing}
                  readOnly={!valueEditable}
                >
                  <Input
                    type="number"
                    value={String(detailDraft.value)}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      setDetailDraft((d) => (d ? { ...d, value } : d));
                    }}
                    className="h-9 border-border"
                  />
                </DetailField>
                <DetailField
                  label="Currency"
                  value={detailDraft.currency}
                  isEditing={isEditing}
                  readOnly={!valueEditable}
                >
                  <Select
                    value={detailDraft.currency}
                    onValueChange={(v) => {
                      const currency = v as DealCurrency;
                      setDetailDraft((d) => (d ? { ...d, currency } : d));
                    }}
                  >
                    <SelectTrigger className="h-9 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailField>
              </DetailFieldGrid>
            </DetailSection>
          ) : null}

          {canView('customer') ? (
            <DetailSection title="Account & contact">
              <div className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Customer
                      </Label>
                      <CustomerVectorGroupedSelect
                        value={detailDraft.customerId ?? ''}
                        customers={customers}
                        selectedLabel={selectedCustomerName}
                        controlClass="h-9 border-border"
                        disabled={!customerEditable}
                        onValueChange={(customerId, customer) => {
                          if (!customerEditable) return;
                          setCustomerLabelById((prev) => ({
                            ...prev,
                            [customer.id]: customer.accountName,
                          }));
                          setDetailDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  customerId,
                                  contactId: '',
                                }
                              : d,
                          );
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Contact
                      </Label>
                      <Select
                        open={contactSelectOpen}
                        onOpenChange={setContactSelectOpen}
                        value={detailDraft.contactId || undefined}
                        onValueChange={(value) => {
                          if (!customerEditable) return;
                          setDetailDraft((d) =>
                            d ? { ...d, contactId: value } : d,
                          );
                        }}
                        disabled={!customerEditable || !detailDraft.customerId}
                      >
                        <SelectTrigger className="h-9 border-border">
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCustomerContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contactDisplayName(contact)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                        <Building2 size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Customer
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">
                          {customerName}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Contact person
                      </p>
                      {leadContact ? (
                        <ContactCard
                          name={leadContact.name}
                          email={leadContact.email}
                          phone={leadContact.phone}
                          role={leadContact.role}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No contact linked yet.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </DetailSection>
          ) : null}

          {canView('assignment') ? (
            <DetailSection
              title="People"
              description="Ownership and people with visibility on this lead"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <PersonRow
                      label="Created by"
                      name={detailDraft.createdBy}
                      subtitle="Opportunity creator"
                    />
                    <EntityAssignmentRolesFields
                      entityType="LEAD"
                      stageId={detailDraft.stageId}
                      users={users}
                      value={roleAssignments}
                      onChange={setRoleAssignments}
                      hideWhenEmpty={false}
                      disabled={!assignmentEditable}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Observers</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Solution assignees and user custom fields
                    </p>
                    <div className="mt-1.5">
                      <ObserverChips names={detailDraft.observers ?? []} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PersonRow
                    label="Responsible / Account Executive"
                    name={detailDraft.responsible}
                    subtitle="Lead owner"
                  />
                  <PersonRow
                    label="Created by"
                    name={detailDraft.createdBy}
                    subtitle="Opportunity creator"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Observers</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Solution assignees and user custom fields
                    </p>
                    <div className="mt-1.5">
                      <ObserverChips names={detailDraft.observers ?? []} />
                    </div>
                  </div>
                </div>
              )}
            </DetailSection>
          ) : null}

          {canView('solutions') ? (
            <DetailSection
              title="Solutions"
              description="Product families, vendors, and products for this opportunity"
              contentClassName="px-0 py-0 sm:px-0"
            >
              <div className="px-4 py-4 sm:px-5">
                <BoundOpportunitySolutions
                  entityType="lead"
                  entityId={id}
                  opportunityValue={Number(detailDraft.value) || 0}
                  currency={detailDraft.currency || 'USD'}
                  readOnly={!canEdit('solutions')}
                  hideHeader
                />
              </div>
            </DetailSection>
          ) : null}

          {canView('customFields') ? (
            <DetailSection
              title="Custom fields"
              contentClassName="px-0 py-0 sm:px-0"
            >
              {stageFieldsQuery.isLoading && stageId ? (
                <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                  Loading fields…
                </p>
              ) : stageFields.length > 0 ? (
                <OpportunityCustomFieldsList
                  embedded
                  fields={stageFields}
                  values={customValuesDraft}
                  valueRows={valuesQuery.data}
                  ownerName={detailDraft.responsible}
                  ownerUserId={opportunityOwnerId}
                  entityType="LEAD"
                  entityId={id}
                  currentUserId={currentUserId}
                  canEditCustomFields={canEditCustomFields}
                  onChange={(fieldId, value) => {
                    setCustomValuesDraft((current) => ({
                      ...current,
                      [fieldId]: value,
                    }));
                  }}
                  onSaveValue={async (fieldId, value) => {
                    const meta = valuesQuery.data?.find(
                      (v) => v.entityFieldId === fieldId,
                    );
                    const assigneeIds =
                      Array.isArray(meta?.responsibleUserIds) &&
                      meta!.responsibleUserIds!.length
                        ? meta!.responsibleUserIds!
                        : meta?.responsibleUserId
                          ? [meta.responsibleUserId]
                          : [];
                    const isFieldAssignee = Boolean(
                      currentUserId && assigneeIds.includes(currentUserId),
                    );
                    const canEditThisValue =
                      isFieldAssignee || canEditCustomFields;
                    if (!canEditThisValue) return false;

                    try {
                      const result =
                        (await upsertFieldValuesMutation.mutateAsync({
                          entityType: 'LEAD',
                          entityId: id,
                          values: [{ entityFieldId: fieldId, value }],
                        })) as { pendingApproval?: boolean } | unknown;
                      if (
                        result &&
                        typeof result === 'object' &&
                        'pendingApproval' in result &&
                        (result as { pendingApproval?: boolean })
                          .pendingApproval
                      ) {
                        toast.success(
                          'Exception approval requested. The value is not saved until approved.',
                        );
                        void queryClient.invalidateQueries({
                          queryKey: ['pipeline-approval-requests'],
                        });
                        await valuesQuery.refetch();
                        return false;
                      }
                      return true;
                    } catch (error: unknown) {
                      const data = parseCustomFieldValidationError(error);
                      if (
                        data?.canRequestException &&
                        data.exceptionApprovalWorkflowId
                      ) {
                        const summary =
                          data.errors
                            ?.map((e) => e.message)
                            .filter(Boolean)
                            .join('; ') ||
                          'This value does not meet the field validation rules.';
                        setRuleExceptionPrompt({
                          fieldId,
                          value,
                          summary,
                        });
                        return false;
                      }
                      throw error;
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No custom fields for this stage.
                </p>
              )}
            </DetailSection>
          ) : null}
        </div>

        <EntityDetailActivitySidebar
          className="lg:col-span-4"
          entityType="LEAD"
          commentEntityType="LEAD"
          entityId={id}
          entityName={detailDraft.name}
          canViewActivities={access.activities.view}
          canViewComments={access.comments.view}
          canCreateActivity={access.createActivity}
          canCreateComment={access.createComment}
        />
      </div>

      {stageTransitionModal}
      {convertModalLead ? (
        <ConvertLeadModal
          open={isConversionOpen}
          onOpenChange={setIsConversionOpen}
          lead={convertModalLead}
          onConverted={(result) => {
            setIsConversionOpen(false);
            if (result?.dealId) {
              router.push(`/deals/${result.dealId}`);
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(ruleExceptionPrompt)}
        onOpenChange={(open) => {
          if (!open) setRuleExceptionPrompt(null);
        }}
        title="Request validation exception?"
        description={
          <>
            {ruleExceptionPrompt?.summary}
            <br />
            <br />
            The value will not be saved as completed until the exception is
            approved.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Request approval"
        onConfirm={() => {
          if (!ruleExceptionPrompt) return;
          const pending = ruleExceptionPrompt;
          setRuleExceptionPrompt(null);
          void (async () => {
            try {
              const result = (await upsertFieldValuesMutation.mutateAsync({
                entityType: 'LEAD',
                entityId: id,
                values: [
                  {
                    entityFieldId: pending.fieldId,
                    value: pending.value,
                  },
                ],
                allowValidationException: true,
              })) as { pendingApproval?: boolean } | unknown;
              if (
                result &&
                typeof result === 'object' &&
                'pendingApproval' in result &&
                (result as { pendingApproval?: boolean }).pendingApproval
              ) {
                toast.success(
                  'Exception approval requested. The value is not saved until approved.',
                );
              } else {
                toast.success('Custom field value saved.');
              }
              void queryClient.invalidateQueries({
                queryKey: ['pipeline-approval-requests'],
              });
              await valuesQuery.refetch();
            } catch (error: unknown) {
              const message =
                parseCustomFieldValidationError(error)?.message ||
                (error as { message?: string })?.message ||
                'Failed to request exception approval.';
              toast.error(
                typeof message === 'string'
                  ? message
                  : 'Failed to request exception approval.',
              );
            }
          })();
        }}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this lead?"
        description={
          <>
            “{detailDraft.name}” will be removed from the active pipeline. Its
            audit history is preserved, but it will no longer appear in lead
            lists or reports.
          </>
        }
        cancelLabel="Keep lead"
        confirmLabel="Delete lead"
        confirmingLabel="Deleting…"
        confirming={deleteLeadMutation.isLoading}
        confirmVariant="destructive"
        onConfirm={() => void confirmDelete()}
      />
      <ApprovalRequestDeepLinkHost entityType="LEAD" />
    </EntityDetailLayout>
  );
}
