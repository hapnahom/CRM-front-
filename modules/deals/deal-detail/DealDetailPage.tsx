'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CircleDollarSign,
  Edit2,
  Loader2,
  Trash2,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  DEALS_STAGE_COLOR_PRESETS,
  pipelineStageAppearance,
} from '@/lib/stage-presets';
import { DetailPageSkeleton } from '@/components/loading/skeleton-screens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContactCard,
  DetailField,
  DetailFieldGrid,
  DetailSection,
  EntityDetailActivitySidebar,
  EntityDetailHero,
  EntityDetailLayout,
  EntityNotFound,
  PersonRow,
  formatEntityDate,
  formatEntityMoney,
  HeroMetaItem,
  StageProgress,
} from '@/components/entity-detail';
import { type CrmDeal, type DealCurrency } from './types';
import { usePipelineCurrencies } from '@/hooks/usePipelineCurrencies';
import { usePipelineFieldAccess } from '@/hooks/usePipelineFieldAccess';
import { BoundOpportunitySolutions } from '@/modules/product-catalog/components/BoundOpportunitySolutions';
import { WonSolutionExactAmountsPanel } from '@/modules/deals/deal-detail/WonSolutionExactAmountsPanel';
import { DealOpportunityInformationSection } from '@/modules/deals/deal-detail/DealOpportunityInformationSection';
import { useOpportunitySolutions } from '@/store/server/features/product-catalog/queries';
import { resolveDealAchievementValue } from '@/lib/deals/achievement-value';
import { ConfirmDialog } from '@/components/pipeline/ConfirmDialog';
import { MoreActionsMenu } from '@/components/pipeline/MoreActionsMenu';
import {
  mapBackendDealToCrmDeal,
  useDealDetail,
} from '@/store/server/features/deals/detail/queries';
import { useUpdateDeal } from '@/store/server/features/deals/detail/mutations';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import {
  typeAppliesToDeal,
  useOpportunityTypes,
} from '@/store/server/features/opportunity-types/queries';
import {
  useChangeDealStage,
  useDeleteDeal,
} from '@/store/server/features/deals/pipeline/mutations';
import { EntityCollaborationTarget } from '@/components/collaboration/entity-collaboration-target';
import { COLLABORATION_DEAL_ENTITY_TYPE } from '@/utils/collaboration';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { OpportunityCustomFieldsList } from '@/components/pipeline/OpportunityCustomFieldsList';
import { StageExpirationBanner } from '@/components/pipeline/StageExpirationBanner';
import { normalizeStoredFieldValue } from '@/modules/custom-fields/field-value-with-description';
import { ApprovalRequestDeepLinkHost } from '@/components/pipeline/PipelineApprovalRequestsCard';
import { useFieldsForStage } from '@/store/server/features/entity-fields/queries';
import {
  useEntityFieldValues,
  useUpsertEntityFieldValues,
} from '@/store/server/features/entity-fields/values';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import AccessGuard from '@/utils/permissionGuard';
import { toast } from 'sonner';
import { useStageTransitionGate } from '@/hooks/useStageTransitionGate';
import { parseCustomFieldValidationError } from '@/lib/pipeline/validation-exception';
import { useQueryClient } from 'react-query';
import { usePipelineSettings } from '@/store/server/features/pipeline/settings';
import type { PipelineFieldGroup } from '@/lib/pipeline/field-access';
import { originatorPayloadFromValue } from '@/components/pipeline/OpportunityOriginatorField';
import { isModuleEnabled } from '@/config/modules';
import { useMarketingCampaigns } from '@/store/server/features/marketing/queries';
import { usePartners } from '@/store/server/features/partners/queries';
import { CustomerVectorGroupedSelect } from '@/components/pipeline/CustomerVectorGroupedSelect';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
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
import { usePipelineContacts } from '@/store/server/features/deals/pipeline/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { PipelineContactSummary } from '@/store/server/features/deals/pipeline/types';
import { Label } from '@/components/ui/label';

const EDITABLE_FIELD_GROUPS: PipelineFieldGroup[] = [
  'core',
  'customer',
  'value',
  'solutions',
  'assignment',
  'customFields',
];

function contactDisplayName(contact: PipelineContactSummary) {
  return `${contact.firstName} ${contact.lastName}`.trim() || '—';
}

export function DealDetailPage({ id }: { id: string }) {
  const { canView, canEdit, access } = usePipelineFieldAccess('DEAL');
  const currentUserId = useAuthenticationStore(
    (s) => s.userId || s.userData?.id || null,
  );

  const [dealRemoved, setDealRemoved] = useState(false);
  const { data: dealDto, isLoading: dealLoading } = useDealDetail(id, {
    enabled: !dealRemoved,
  });
  const { data: stagesData = [] } = useDealStages();
  const { data: allOpportunityTypes = [] } = useOpportunityTypes();
  const opportunityTypes = useMemo(() => {
    const filtered = allOpportunityTypes.filter(typeAppliesToDeal);
    const currentId = dealDto?.typeId;
    if (currentId && !filtered.some((t) => t.id === currentId)) {
      const current = allOpportunityTypes.find((t) => t.id === currentId);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [allOpportunityTypes, dealDto?.typeId]);
  const updateDealMutation = useUpdateDeal();
  const upsertFieldValuesMutation = useUpsertEntityFieldValues();
  const upsertRoleAssignments = useUpsertPipelineRoleAssignments();
  const queryClient = useQueryClient();
  const [ruleExceptionPrompt, setRuleExceptionPrompt] = useState<{
    fieldId: string;
    value: unknown;
    summary: string;
  } | null>(null);
  const changeDealStageMutation = useChangeDealStage();
  const deleteDealMutation = useDeleteDeal();
  const { currencyOptions } = usePipelineCurrencies();
  const settingsQuery = usePipelineSettings('DEAL');
  const movementPolicy = settingsQuery.data?.movementPolicy ?? 'any';
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
  const users = platformUsersData?.data ?? [];
  const { data: customersData } = useGetCustomers(
    { page: 1, pageSize: 200 },
    true,
  );
  const customers = customersData?.data ?? [];
  const { data: contacts = [] } = usePipelineContacts();
  const roleAssignmentsQuery = usePipelineRoleAssignments('DEAL', id);

  const [detailDraft, setDetailDraft] = useState<CrmDeal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<CrmDeal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exactValueRecalcOpen, setExactValueRecalcOpen] = useState(false);
  const [pendingExactValueSave, setPendingExactValueSave] = useState<
    number | null
  >(null);
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

  const canEditAny = EDITABLE_FIELD_GROUPS.some((group) => canEdit(group));
  const canDeleteDeal = AccessGuard.checkAccess({
    permissions: ['delete-deals'],
  });
  const showMoreActions = canEditAny || canDeleteDeal;

  const stages = useMemo(
    () => [...stagesData].sort((a, b) => a.order - b.order),
    [stagesData],
  );

  useEffect(() => {
    if (!dealDto || isEditing) return;
    setDetailDraft(mapBackendDealToCrmDeal(dealDto));
  }, [dealDto, isEditing]);

  useEffect(() => {
    if (!dealDto?.stageId || !detailDraft) return;
    if (dealDto.stageId === detailDraft.stageId) return;
    setDetailDraft((draft) =>
      draft
        ? {
            ...draft,
            stageId: dealDto.stageId,
            stageEnteredAt: dealDto.stageEnteredAt
              ? String(dealDto.stageEnteredAt).split('T')[0]!
              : draft.stageEnteredAt,
          }
        : draft,
    );
  }, [dealDto?.stageId, dealDto?.stageEnteredAt, detailDraft?.stageId]); // eslint-disable-line react-hooks/exhaustive-deps -- sync stage from server; full detailDraft would loop

  const stageById = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages],
  );

  const stageId = detailDraft?.stageId ?? dealDto?.stageId ?? null;
  const isWonDeal =
    dealDto?.status === 'Won' || dealDto?.stage?.category === 'won';
  const currentStageCategory = stageId
    ? stageById.get(stageId)?.category
    : undefined;
  const isLostStage = currentStageCategory === 'lost';
  const { data: dealSolutions = [] } = useOpportunitySolutions(
    'deal',
    isWonDeal ? id : undefined,
  );
  const stageFieldsQuery = useFieldsForStage('DEAL', stageId, {
    mode: 'detail',
  });
  const valuesQuery = useEntityFieldValues('DEAL', id);
  const canEditCustomFields = access.customFields.edit;
  const opportunityOwnerId =
    detailDraft?.responsibleUserId ??
    dealDto?.responsibleUserId ??
    dealDto?.responsibleUser?.id ??
    null;

  const stageFields = useMemo(
    () =>
      (stageFieldsQuery.data ?? [])
        .map((f) => {
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
          const config = apiResponseToConfig(f);
          // On lost: prior-stage fields stay editable but not required (only lost-stage fields enforce).
          const required =
            isLostStage && config.dealStageId && config.dealStageId !== stageId
              ? false
              : config.required;
          return {
            ...config,
            required,
            readOnly: !canEditThisValue,
          };
        })
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [
      stageFieldsQuery.data,
      valuesQuery.data,
      currentUserId,
      canEditCustomFields,
      isLostStage,
      stageId,
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
    setCustomValuesDraft((current) => {
      const currentJson = JSON.stringify(current);
      const nextJson = JSON.stringify(customValues);
      return currentJson === nextJson ? current : customValues;
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
    dealDto?.customer?.accountName;

  const customerName = selectedCustomerName || '—';

  const dealContact = useMemo(() => {
    if (!dealDto?.contact) return null;
    const c = dealDto.contact;
    return {
      name: `${c.firstName} ${c.lastName}`.trim() || c.email || '—',
      email: c.email ?? '',
      phone: c.phoneNumber ?? '',
      role: c.role ?? '',
    };
  }, [dealDto]);

  const persistDetailDraft = async (exactValueOverride?: number) => {
    if (!detailDraft) return;

    const data: {
      name?: string;
      value?: number;
      currency?: DealCurrency;
      expectedClose?: string;
      description?: string;
      typeId?: string;
      exactValue?: number;
      customerId?: string;
      contactId?: string | null;
      sessionId?: string | null;
      responsibleUserId?: string;
      originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | null;
      campaignId?: string | null;
      originatorUserId?: string | null;
      originatorPartnerId?: string | null;
    } = {};

    if (canEdit('core')) {
      data.name = detailDraft.name;
      data.description = detailDraft.description;
      data.typeId = detailDraft.typeId || undefined;
      data.sessionId = detailDraft.sessionId || null;
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
    }

    if (canEdit('value')) {
      data.value = detailDraft.value;
      data.currency = detailDraft.currency;
      data.expectedClose = detailDraft.expectedClose || undefined;
      const exactValueToSave =
        exactValueOverride ??
        (detailDraft.exactValue != null ? detailDraft.exactValue : undefined);
      if (isWonDeal && exactValueToSave != null) {
        data.exactValue = exactValueToSave;
      }
    }

    if (canEdit('customer')) {
      data.customerId = detailDraft.customerId || undefined;
      data.contactId = detailDraft.contactId || null;
    }

    if (canEdit('assignment')) {
      const rolesForStage = await fetchPipelineRolesForStage(
        'DEAL',
        detailDraft.stageId,
        'detail',
      );
      const existingAssignments = mapRoleAssignmentsFromQuery(
        roleAssignmentsQuery.data,
      );
      const assignmentsForSubmit = buildEntityRoleAssignmentsForSubmit(
        rolesForStage,
        mergeRoleAssignmentValues(existingAssignments, roleAssignments),
        detailDraft.responsibleUserId,
      );
      const stageIsLost =
        stageById.get(detailDraft.stageId)?.category === 'lost';
      const rolesForRequired = stageIsLost
        ? rolesForStage.filter((r) => r.dealStageId === detailDraft.stageId)
        : rolesForStage;
      const roleValidationError = validateRequiredRoleAssignments(
        rolesForRequired,
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
          entityType: 'DEAL',
          entityId: detailDraft.id,
          stageId: detailDraft.stageId,
          assignments: assignmentsForSubmit,
        });
      }
    }

    if (Object.keys(data).length > 0) {
      await updateDealMutation.mutateAsync({
        id: detailDraft.id,
        data,
      });
    }

    if (canEdit('customFields')) {
      // Always persist by real custom-field UUID ↔ this opportunity id.
      const fieldValues = stageFields.map((field) => ({
        entityFieldId: field.id,
        value: customValuesDraft[field.id] ?? null,
      }));
      if (fieldValues.length) {
        await upsertFieldValuesMutation.mutateAsync({
          entityType: 'DEAL',
          entityId: detailDraft.id,
          values: fieldValues,
        });
      }
    }
  };

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
    if (dealDto) {
      setDetailDraft(mapBackendDealToCrmDeal(dealDto));
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

  const saveEdit = async (skipExactValuePrompt = false) => {
    if (
      !skipExactValuePrompt &&
      canEdit('value') &&
      isWonDeal &&
      detailDraft &&
      editSnapshot &&
      detailDraft.exactValue != null &&
      detailDraft.exactValue !== editSnapshot.exactValue
    ) {
      setPendingExactValueSave(detailDraft.exactValue);
      setExactValueRecalcOpen(true);
      return;
    }

    try {
      await persistDetailDraft();
      setIsEditing(false);
      setEditSnapshot(null);
      toast.success(`${dealUiLabel()} updated successfully.`);
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message ||
              error?.message ||
              `Failed to update ${dealUiLabel({ lowercase: true })}.`,
      );
    }
  };

  const confirmExactValueSave = async () => {
    try {
      await persistDetailDraft(pendingExactValueSave ?? undefined);
      setIsEditing(false);
      setEditSnapshot(null);
      setExactValueRecalcOpen(false);
      setPendingExactValueSave(null);
      toast.success(
        `${dealUiLabel()} exact value updated. Target achievement will recalculate.`,
      );
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message ||
              error?.message ||
              `Failed to update ${dealUiLabel({ lowercase: true })}.`,
      );
    }
  };

  const confirmDelete = async () => {
    if (deleteDealMutation.isLoading) return;
    try {
      await deleteDealMutation.mutateAsync(id);
      setDealRemoved(true);
      setDeleteDialogOpen(false);
      toast.success(`${dealUiLabel()} moved out of the active pipeline.`);
      // Hard navigation — client router.replace was leaving us stuck on /deals/[id].
      window.location.assign('/sales-hub?tab=deals');
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message ||
              error?.message ||
              `Failed to delete ${dealUiLabel({ lowercase: true })}.`,
      );
    }
  };

  const moveDealToStage = useCallback(
    (payload: {
      entityId: string;
      stageId: string;
      fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
      roleAssignments?: Array<{ roleId: string; userId: string }>;
      allowValidationException?: boolean;
      validationSummary?: string;
      validationExceptionFieldIds?: string[];
      exactValue?: number;
      solutionExactAmounts?: Array<{ solutionId: string; exactAmount: number }>;
    }) => {
      if (!detailDraft || detailDraft.stageId === payload.stageId) return;
      const stage = stageById.get(payload.stageId);
      const priorStageId = detailDraft.stageId;
      const priorPreviousStageId = detailDraft.previousStageId ?? null;
      const priorStageEnteredAt = detailDraft.stageEnteredAt;
      const today = new Date().toISOString().split('T')[0]!;

      setDetailDraft((draft) =>
        draft
          ? {
              ...draft,
              stageId: payload.stageId,
              previousStageId: priorStageId,
              stageEnteredAt: today,
            }
          : draft,
      );

      changeDealStageMutation.mutate(
        {
          dealId: payload.entityId,
          stageId: payload.stageId,
          fieldValues: payload.fieldValues,
          roleAssignments: payload.roleAssignments,
          allowValidationException: payload.allowValidationException,
          validationSummary: payload.validationSummary,
          validationExceptionFieldIds: payload.validationExceptionFieldIds,
          exactValue: payload.exactValue,
          solutionExactAmounts: payload.solutionExactAmounts,
        },
        {
          onSuccess: () => {
            if (stage?.requiresApproval || payload.allowValidationException) {
              toast.success(
                `${dealUiLabel()} moved and submitted for approval. It will stay pending until approved.`,
              );
            } else {
              toast.success(`${dealUiLabel()} moved to new stage.`);
            }
          },
          onError: (error: unknown) => {
            setDetailDraft((draft) =>
              draft
                ? {
                    ...draft,
                    stageId: priorStageId,
                    previousStageId: priorPreviousStageId,
                    stageEnteredAt: priorStageEnteredAt,
                  }
                : draft,
            );
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
                    `Failed to move ${dealUiLabel({ lowercase: true })} to the new stage.`,
            );
          },
        },
      );
    },
    [detailDraft, stageById, changeDealStageMutation],
  );

  const { requestStageChange, checking, stageTransitionModal } =
    useStageTransitionGate({
      entityType: 'DEAL',
      onTransition: moveDealToStage,
      isSubmitting: changeDealStageMutation.isLoading,
      getEntityName: () => detailDraft?.name,
      getStageName: (stageId) => stageById.get(stageId)?.name,
      getStageMeta: (stageId) => {
        const targetStage = stageById.get(stageId);
        return {
          requiresApproval: targetStage?.requiresApproval,
          approvalWorkflowId: targetStage?.approvalWorkflowId,
          category: targetStage?.category,
        };
      },
      movementPolicy,
      getStageOrder: (stageId) => stageById.get(stageId)?.order,
      getEntityStageId: () => detailDraft?.stageId,
      getOwnerUserId: () =>
        dealDto?.responsibleUserId ?? dealDto?.responsibleUser?.id ?? null,
      isPendingApproval: () => Boolean(dealDto?.pendingApproval),
    });

  const handleStageClick = useCallback(
    (stageId: string) => {
      if (!detailDraft || stageId === detailDraft.stageId) return;
      void requestStageChange(detailDraft.id, stageId);
    },
    [detailDraft, requestStageChange],
  );

  const coreEditable = canEdit('core');
  const valueEditable = canEdit('value');
  const customerEditable = canEdit('customer');
  const assignmentEditable = canEdit('assignment');

  if (dealLoading) {
    return <DetailPageSkeleton />;
  }

  if (!detailDraft) {
    return (
      <EntityNotFound
        title={`${dealUiLabel()} not found`}
        description={`The ${dealUiLabel({ lowercase: true })} ID might be incorrect or has been removed.`}
        backLabel={`Back to ${dealUiLabel({ plural: true })}`}
        backHref="/sales-hub?tab=deals"
      />
    );
  }

  const stage = stageById.get(detailDraft.stageId);
  const previousStage = detailDraft.previousStageId
    ? stageById.get(detailDraft.previousStageId)
    : undefined;
  const stageIndex = stage ? stages.findIndex((s) => s.id === stage.id) : 0;
  const previousStageIndex = previousStage
    ? stages.findIndex((s) => s.id === previousStage.id)
    : -1;
  const stageAppearance = stage
    ? pipelineStageAppearance(stage, stageIndex, DEALS_STAGE_COLOR_PRESETS)
    : null;
  const isSavingDetail =
    updateDealMutation.isLoading ||
    upsertFieldValuesMutation.isLoading ||
    upsertRoleAssignments.isLoading ||
    changeDealStageMutation.isLoading;

  const heroMetaItems = [
    canView('customer') ? (
      <HeroMetaItem key="customer" icon={Building2}>
        {customerName}
      </HeroMetaItem>
    ) : null,
    canView('assignment') ? (
      <HeroMetaItem key="owner" icon={User}>
        {detailDraft.responsible || 'Unassigned'}
      </HeroMetaItem>
    ) : null,
    canView('value') ? (
      <HeroMetaItem key="value" icon={CircleDollarSign}>
        {formatEntityMoney(detailDraft.value, detailDraft.currency)}
      </HeroMetaItem>
    ) : null,
  ].filter(Boolean);

  return (
    <EntityDetailLayout
      backLabel={dealUiLabel({ plural: true })}
      backHref="/sales-hub?tab=deals"
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
          {isLeadsEnabled() && detailDraft.createdFromLead ? (
            <Badge
              variant="outline"
              className="ml-1 rounded-full border-violet-200 bg-violet-50 px-2 py-0 text-xs font-medium text-violet-900"
            >
              Converted from lead
            </Badge>
          ) : null}
          <EntityCollaborationTarget
            entityType={COLLABORATION_DEAL_ENTITY_TYPE}
            entityId={id}
            entityName={detailDraft.name}
            entityLabel={dealUiLabel({ lowercase: true })}
            module="deals"
            subtitle={`${dealUiLabel()} space`}
          />
        </>
      }
    >
      <EntityDetailHero
        name={detailDraft.name}
        fallbackInitial="D"
        meta={
          <>
            {heroMetaItems.map((item, index) => (
              <span key={index} className="contents">
                {index > 0 ? (
                  <span className="hidden text-border sm:inline" aria-hidden>
                    ·
                  </span>
                ) : null}
                {item}
              </span>
            ))}
          </>
        }
        actions={
          isEditing ? (
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
                onClick={() => void saveEdit()}
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
          ) : showMoreActions ? (
            <MoreActionsMenu
              items={[
                ...(canEditAny
                  ? [
                      {
                        key: 'edit',
                        label: 'Edit',
                        icon: <Edit2 size={13} />,
                        onSelect: startEdit,
                      },
                    ]
                  : []),
                ...(canDeleteDeal
                  ? [
                      {
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 size={13} />,
                        destructive: true,
                        disabled:
                          Boolean(dealDto?.pendingApproval) ||
                          deleteDealMutation.isLoading,
                        title: dealDto?.pendingApproval
                          ? `This ${dealUiLabel({ lowercase: true })} is locked pending approval.`
                          : `Delete ${dealUiLabel({ lowercase: true })}`,
                        onSelect: () => setDeleteDialogOpen(true),
                      },
                    ]
                  : []),
              ]}
            />
          ) : null
        }
        footer={
          <div>
            <StageProgress
              stages={stages}
              currentStageId={detailDraft.stageId}
              presets={DEALS_STAGE_COLOR_PRESETS}
              onStageClick={handleStageClick}
              disabled={
                isEditing ||
                checking ||
                changeDealStageMutation.isLoading ||
                Boolean(dealDto?.pendingApproval)
              }
            />
            <StageExpirationBanner
              stageEnteredAt={
                dealDto?.stageEnteredAt ?? detailDraft.stageEnteredAt
              }
              stageExpiresAt={dealDto?.stageExpiresAt}
              stageExpired={dealDto?.stageExpired}
              stageExpirationStatus={dealDto?.stageExpirationStatus}
            />
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {canView('core') ? (
            <DealOpportunityInformationSection
              detailDraft={detailDraft}
              isEditing={isEditing}
              coreEditable={coreEditable}
              stages={stages}
              stage={stage}
              stageIndex={stageIndex}
              previousStage={previousStage}
              previousStageIndex={previousStageIndex}
              opportunityTypes={opportunityTypes}
              stageColorPresets={DEALS_STAGE_COLOR_PRESETS}
              campaigns={marketingCampaigns}
              users={users}
              partners={partners}
              showCampaign={marketingEnabled}
              showPartner={marketingEnabled}
              onNameChange={(name) =>
                setDetailDraft((d) => (d ? { ...d, name } : d))
              }
              onTypeChange={(typeId, typeName) =>
                setDetailDraft((d) => (d ? { ...d, typeId, typeName } : d))
              }
              onSessionChange={(sessionId) =>
                setDetailDraft((d) => (d ? { ...d, sessionId } : d))
              }
              onDescriptionChange={(description) =>
                setDetailDraft((d) => (d ? { ...d, description } : d))
              }
              onStageChange={(v) => {
                if (!detailDraft || !v || v === detailDraft.stageId) return;
                void requestStageChange(detailDraft.id, v);
              }}
              onOriginatorChange={(next) =>
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
                          users.find(
                            (u) =>
                              u.id === next.originatorUserId ||
                              u.selamnewId === next.originatorUserId,
                          )?.name ?? '',
                        originatorUserAvatarUrl:
                          users.find(
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
            />
          ) : null}

          {canView('value') ? (
            <DetailSection
              title="Value"
              description={`${dealUiLabel()} amount, currency, and close timing`}
            >
              <DetailFieldGrid>
                <DetailField
                  label="Value"
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
                {isWonDeal ? (
                  <DetailField
                    label="Exact value"
                    value={
                      detailDraft.exactValue != null
                        ? formatEntityMoney(
                            detailDraft.exactValue,
                            detailDraft.currency,
                          )
                        : formatEntityMoney(
                            resolveDealAchievementValue(detailDraft),
                            detailDraft.currency,
                          ) + ' (estimated fallback)'
                    }
                    isEditing={isEditing}
                    readOnly={!valueEditable}
                  >
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={
                        detailDraft.exactValue != null
                          ? String(detailDraft.exactValue)
                          : ''
                      }
                      onChange={(e) => {
                        const exactValue = Number(e.target.value) || 0;
                        setDetailDraft((d) => (d ? { ...d, exactValue } : d));
                      }}
                      className="h-9 border-border"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used for target achievement. Estimated value above stays
                      unchanged.
                    </p>
                  </DetailField>
                ) : null}
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
                <DetailField
                  label="Expected close"
                  value={formatEntityDate(detailDraft.expectedClose)}
                  isEditing={isEditing}
                  readOnly={!valueEditable}
                >
                  <Input
                    type="date"
                    value={detailDraft.expectedClose}
                    onChange={(e) =>
                      setDetailDraft((d) =>
                        d ? { ...d, expectedClose: e.target.value } : d,
                      )
                    }
                    className="h-9 border-border"
                  />
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
                      {dealContact ? (
                        <ContactCard
                          name={dealContact.name}
                          email={dealContact.email}
                          phone={dealContact.phone}
                          role={dealContact.role}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No contact linked yet.
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div
                  className={cn(
                    'grid gap-3 border-t border-border pt-3',
                    isLeadsEnabled() ? 'grid-cols-2' : 'grid-cols-1',
                  )}
                >
                  {isLeadsEnabled() ? (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Created from lead
                      </p>
                      {detailDraft.createdFromLead ? (
                        detailDraft.sourceLeadId ? (
                          <Link
                            href={`/leads/${detailDraft.sourceLeadId}`}
                            className="text-sm font-medium text-violet-900 underline underline-offset-2 hover:text-violet-950"
                          >
                            Yes — view lead
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-foreground">
                            Yes
                          </p>
                        )
                      ) : (
                        <p className="text-sm font-medium text-foreground">
                          No
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs text-muted-foreground">Campaign</p>
                    <p className="text-sm font-medium text-foreground">
                      {detailDraft.campaignName || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </DetailSection>
          ) : null}

          {canView('assignment') ? (
            <DetailSection title="People">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <PersonRow
                  label="Created by"
                  name={detailDraft.createdBy}
                  subtitle={`${dealUiLabel({ lowercase: true })} creator`}
                />
                <EntityAssignmentRolesFields
                  entityType="DEAL"
                  stageId={detailDraft.stageId}
                  users={users}
                  value={roleAssignments}
                  onChange={setRoleAssignments}
                  hideWhenEmpty={false}
                  disabled={!assignmentEditable || !isEditing}
                  readOnly={!isEditing}
                  forStageMode="detail"
                  enforceRequiredForStageId={
                    isLostStage ? detailDraft.stageId : undefined
                  }
                />
              </div>
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
                  entityType="deal"
                  entityId={id}
                  opportunityValue={Number(detailDraft.value) || 0}
                  currency={detailDraft.currency || 'USD'}
                  readOnly={!canEdit('solutions')}
                  hideHeader
                />
                {isWonDeal ? (
                  <WonSolutionExactAmountsPanel
                    entityId={id}
                    currency={detailDraft.currency || 'USD'}
                    solutions={dealSolutions}
                  />
                ) : null}
              </div>
            </DetailSection>
          ) : null}

          {canView('customFields') ? (
            <DetailSection
              title="Stage requirements"
              description={
                isLostStage
                  ? 'Fill any remaining fields from earlier stages (optional), plus required fields for this lost stage'
                  : stage
                    ? `Complete the required information for ${stage.name}`
                    : 'Complete the required information for this stage'
              }
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
                  entityType="DEAL"
                  entityId={id}
                  currentUserId={currentUserId}
                  canEditCustomFields={canEditCustomFields}
                  pageEditing={isEditing}
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
                          entityType: 'DEAL',
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
                <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                  No requirements configured for this stage.
                </p>
              )}
            </DetailSection>
          ) : null}
        </div>

        <EntityDetailActivitySidebar
          className="lg:col-span-4"
          entityType="DEAL"
          commentEntityType="DEAL"
          entityId={id}
          entityName={detailDraft.name}
          canViewActivities={canView('activities')}
          canViewComments={canView('comments')}
          canCreateActivity={access.createActivity}
          canCreateComment={access.createComment}
        />
      </div>

      {stageTransitionModal}
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
                entityType: 'DEAL',
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
        open={exactValueRecalcOpen}
        onOpenChange={setExactValueRecalcOpen}
        title="Update exact value?"
        description="Changing the exact value will recalculate target achievement for the owner, credited users, teams, departments, and company totals."
        cancelLabel="Cancel"
        confirmLabel="Save and recalculate"
        onConfirm={() => void confirmExactValueSave()}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (deleteDealMutation.isLoading) return;
          setDeleteDialogOpen(open);
        }}
        title={`Delete this ${dealUiLabel({ lowercase: true })}?`}
        description={
          <>
            “{detailDraft.name}” will be removed from the active pipeline. Its
            audit history is preserved, but it will no longer appear in{' '}
            {dealUiLabel({ plural: true, lowercase: true })} lists or reports.
          </>
        }
        cancelLabel={`Keep ${dealUiLabel({ lowercase: true })}`}
        confirmLabel={`Delete ${dealUiLabel({ lowercase: true })}`}
        confirmingLabel="Deleting…"
        confirming={deleteDealMutation.isLoading}
        confirmVariant="destructive"
        onConfirm={() => void confirmDelete()}
      />
      <ApprovalRequestDeepLinkHost entityType="DEAL" />
    </EntityDetailLayout>
  );
}
